/**
 * Wallet Management Service
 * Handles wallet creation, import, storage, and operations
 * Now uses real @provablehq/sdk for cryptographic operations
 */

import crypto from 'crypto';
import { AleoWallet, AleoBalance, WalletState } from '@shared/types';
import { encrypt, decrypt, EncryptedData } from '../utils/crypto';
import { aleoCryptoService, AleoAccount } from './aleo-crypto.service';

// Lazy import to avoid circular dependency
function getAleoServiceInstance() {
  const { AleoService } = require('./aleo.service');
  return AleoService.getInstance();
}

// Lazy load electron-store to avoid initialization issues
function createStore(options?: { name?: string; encryptionKey?: string }): any {
  const Store = require('electron-store');
  return new Store(options);
}

interface WalletStore {
  encryptedWallet?: EncryptedData;
  passwordHash?: string;
}

export class WalletService {
  private static instance: WalletService;
  private store: any = null;
  private currentWallet: AleoWallet | null = null;
  private isLocked: boolean = true;
  private encryptionKey: Buffer | null = null;

  private constructor() {
    // Store is initialized lazily on first use
  }

  /**
   * Get the store instance, lazily initialized
   */
  private getStore(): any {
    if (!this.store) {
      this.store = createStore({
        name: 'wallet',
        encryptionKey: 'aleo-browser-wallet-store',
      });
    }
    return this.store;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Create a new wallet using real @provablehq/sdk
   */
  async createWallet(): Promise<AleoWallet> {
    try {
      // Generate real Aleo account using SDK
      const account = await aleoCryptoService.generateAccount();

      const wallet: AleoWallet = {
        address: account.address,
        privateKey: account.privateKey,
        viewKey: account.viewKey,
      };

      this.currentWallet = wallet;
      this.isLocked = false;

      console.log('Wallet created with real SDK:', account.address);
      return wallet;
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import wallet from private key using real SDK
   */
  async importWallet(privateKey: string): Promise<AleoWallet> {
    try {
      // Validate private key format using real validation
      if (!aleoCryptoService.isValidPrivateKey(privateKey)) {
        throw new Error('Invalid private key format. Must start with "APrivateKey1" and be 59 characters.');
      }

      // Derive view key and address using real SDK
      const account = await aleoCryptoService.importFromPrivateKey(privateKey);

      const wallet: AleoWallet = {
        address: account.address,
        privateKey: account.privateKey,
        viewKey: account.viewKey,
      };

      this.currentWallet = wallet;
      this.isLocked = false;

      console.log('Wallet imported with real SDK:', account.address);
      return wallet;
    } catch (error) {
      throw new Error(`Failed to import wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save wallet encrypted with password
   */
  async saveWallet(password: string): Promise<void> {
    if (!this.currentWallet) {
      throw new Error('No wallet to save');
    }

    try {
      // Validate password
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Serialize wallet
      const walletData = JSON.stringify(this.currentWallet);

      // Encrypt wallet data
      const encryptedWallet = encrypt(walletData, password);

      // Hash password for verification
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      // Store encrypted wallet
      this.getStore().set('encryptedWallet', encryptedWallet);
      this.getStore().set('passwordHash', passwordHash);

      console.log('Wallet saved successfully');
    } catch (error) {
      throw new Error(`Failed to save wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unlock wallet with password
   */
  async unlock(password: string): Promise<AleoWallet> {
    try {
      const encryptedWallet = this.getStore().get('encryptedWallet');
      const storedPasswordHash = this.getStore().get('passwordHash');

      if (!encryptedWallet || !storedPasswordHash) {
        throw new Error('No wallet found');
      }

      // Verify password
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      if (passwordHash !== storedPasswordHash) {
        throw new Error('Invalid password');
      }

      // Decrypt wallet
      const walletData = decrypt(encryptedWallet, password);
      const wallet = JSON.parse(walletData) as AleoWallet;
      this.currentWallet = wallet;
      this.isLocked = false;

      // Derive encryption key from password for storage service
      if (encryptedWallet.salt) {
        const salt = Buffer.from(encryptedWallet.salt, 'hex');
        this.encryptionKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      }

      console.log('Wallet unlocked:', wallet.address);
      return wallet;
    } catch (error) {
      this.currentWallet = null;
      this.isLocked = true;
      this.encryptionKey = null;
      throw new Error(`Failed to unlock wallet: ${error instanceof Error ? error.message : 'Invalid password'}`);
    }
  }

  /**
   * Lock wallet (clear from memory)
   */
  lock(): void {
    // Securely wipe wallet data from memory
    if (this.currentWallet) {
      this.currentWallet = null;
    }

    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
      this.encryptionKey = null;
    }

    this.isLocked = true;
    console.log('Wallet locked');
  }

  /**
   * Get current wallet address
   */
  getAddress(): string | null {
    if (this.isLocked || !this.currentWallet) {
      return null;
    }
    return this.currentWallet.address;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<AleoBalance> {
    if (this.isLocked || !this.currentWallet) {
      throw new Error('Wallet is locked');
    }

    try {
      return await getAleoServiceInstance().getBalance(this.currentWallet.address);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send ALEO tokens
   */
  async send(to: string, amount: number, fee: number = 0.01): Promise<string> {
    if (this.isLocked || !this.currentWallet) {
      throw new Error('Wallet is locked');
    }

    try {
      // Validate recipient address
      getAleoServiceInstance().validateAddress(to);

      // Check balance
      const balance = await this.getBalance();
      const totalAmount = amount + fee;

      if (balance.public < totalAmount) {
        throw new Error(`Insufficient balance. Required: ${totalAmount}, Available: ${balance.public}`);
      }

      // Execute transfer
      const txId = await getAleoServiceInstance().transfer({
        privateKey: this.currentWallet.privateKey,
        to,
        amount,
        fee,
      });

      console.log(`Transfer successful: ${txId}`);
      return txId;
    } catch (error) {
      throw new Error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign a message with private key using real SDK
   */
  async signMessage(message: string): Promise<string> {
    if (this.isLocked || !this.currentWallet) {
      throw new Error('Wallet is locked');
    }

    try {
      // Use real Aleo SDK for proper cryptographic signing
      const signature = await aleoCryptoService.signMessage(
        this.currentWallet.privateKey,
        message
      );

      return signature;
    } catch (error) {
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get encryption key for storage service
   */
  getEncryptionKey(): Buffer | null {
    if (this.isLocked || !this.encryptionKey) {
      return null;
    }
    return this.encryptionKey;
  }

  /**
   * Check if wallet exists
   */
  hasWallet(): boolean {
    return this.getStore().has('encryptedWallet');
  }

  /**
   * Get wallet state
   */
  getState(): WalletState {
    return {
      isUnlocked: !this.isLocked,
      hasWallet: this.hasWallet(),
      address: this.getAddress() || undefined,
    };
  }

  /**
   * Delete wallet (use with caution)
   */
  async deleteWallet(): Promise<void> {
    this.lock();
    this.getStore().clear();
    console.log('Wallet deleted');
  }

  /**
   * Export private key (requires unlocked wallet)
   */
  exportPrivateKey(): string {
    if (this.isLocked || !this.currentWallet) {
      throw new Error('Wallet is locked');
    }
    return this.currentWallet.privateKey;
  }

  /**
   * Export view key (requires unlocked wallet)
   */
  exportViewKey(): string {
    if (this.isLocked || !this.currentWallet) {
      throw new Error('Wallet is locked');
    }
    return this.currentWallet.viewKey;
  }

  // Private helper methods - now using real SDK

  /**
   * Decrypt a record using the view key
   */
  async decryptRecord(ciphertext: string): Promise<string> {
    if (this.isLocked || !this.currentWallet) {
      throw new Error('Wallet is locked');
    }

    try {
      return await aleoCryptoService.decryptRecord(
        this.currentWallet.viewKey,
        ciphertext
      );
    } catch (error) {
      throw new Error(`Failed to decrypt record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a signature
   */
  async verifySignature(message: string, signature: string): Promise<boolean> {
    if (this.isLocked || !this.currentWallet) {
      throw new Error('Wallet is locked');
    }

    try {
      return await aleoCryptoService.verifySignature(
        this.currentWallet.address,
        message,
        signature
      );
    } catch (error) {
      throw new Error(`Failed to verify signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current wallet (for internal use)
   */
  getCurrentWallet(): AleoWallet | null {
    if (this.isLocked) {
      return null;
    }
    return this.currentWallet;
  }
}

// Export singleton instance - safe now because Store is lazily initialized in getStore()
export const walletService = WalletService.getInstance();

// Export lazy getter for flexibility
export function getWalletService(): WalletService {
  return WalletService.getInstance();
}
