/**
 * Real Aleo Cryptography Service
 * Uses @provablehq/sdk for actual Aleo key generation and signing
 */

import * as bip39 from 'bip39';
import crypto from 'crypto';

// Dynamic import for the SDK to handle WASM loading
let aleoSdk: any = null;
let sdkInitialized = false;
let sdkInitError: Error | null = null;

/**
 * Initialize the Aleo SDK with proper WASM loading
 */
async function initSdk(): Promise<any> {
  if (sdkInitError) {
    throw sdkInitError;
  }

  if (aleoSdk && sdkInitialized) {
    return aleoSdk;
  }

  try {
    console.log('[Aleo SDK] Starting initialization...');

    // Use new Function to create dynamic import that TypeScript won't transform to require()
    // This is necessary because @provablehq/sdk is a pure ES Module
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    aleoSdk = await dynamicImport('@provablehq/sdk');

    // The SDK may export functions that need to be called before use
    // Try different initialization patterns based on SDK version
    if (typeof aleoSdk.initThreadPool === 'function') {
      console.log('[Aleo SDK] Initializing thread pool...');
      await aleoSdk.initThreadPool();
    }

    if (typeof aleoSdk.initSync === 'function') {
      console.log('[Aleo SDK] Running initSync...');
      aleoSdk.initSync();
    }

    // Verify SDK is working by checking if key classes exist
    const hasPrivateKey = aleoSdk.PrivateKey || aleoSdk.Account;
    if (!hasPrivateKey) {
      throw new Error('SDK loaded but key classes not found');
    }

    sdkInitialized = true;
    console.log('[Aleo SDK] Initialization successful');
    console.log('[Aleo SDK] Available exports:', Object.keys(aleoSdk).slice(0, 20).join(', '));

    return aleoSdk;
  } catch (error) {
    console.error('[Aleo SDK] Initialization failed:', error);
    sdkInitError = new Error(`Failed to initialize Aleo SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw sdkInitError;
  }
}

/**
 * Aleo Account containing private key, view key, and address
 */
export interface AleoAccount {
  privateKey: string;
  viewKey: string;
  address: string;
  seed?: string; // BIP39 mnemonic if generated from seed
}

/**
 * Generate a new Aleo account with real cryptographic keys
 */
export async function generateAccount(): Promise<AleoAccount> {
  try {
    const sdk = await initSdk();

    let privateKeyString: string;
    let viewKeyString: string;
    let addressString: string;

    // Try Account-based API first (newer SDK versions)
    if (sdk.Account) {
      console.log('[Aleo SDK] Using Account-based API');
      const account = new sdk.Account();

      privateKeyString = account.privateKey().to_string();
      viewKeyString = account.viewKey().to_string();
      addressString = account.address().to_string();
    }
    // Fall back to separate class API (older SDK versions)
    else if (sdk.PrivateKey) {
      console.log('[Aleo SDK] Using PrivateKey-based API');
      const privateKey = new sdk.PrivateKey();
      privateKeyString = privateKey.to_string();

      const viewKey = sdk.ViewKey.from_private_key(privateKey);
      viewKeyString = viewKey.to_string();

      const address = sdk.Address.from_private_key(privateKey);
      addressString = address.to_string();
    } else {
      throw new Error('No compatible key generation API found in SDK');
    }

    console.log(`[Aleo SDK] Generated new account: ${addressString}`);

    return {
      privateKey: privateKeyString,
      viewKey: viewKeyString,
      address: addressString
    };
  } catch (error) {
    console.error('[Aleo SDK] Error generating account:', error);
    // SECURITY FIX: Do NOT fall back to fake keys - throw error instead
    throw new Error(`Failed to generate Aleo account: ${error instanceof Error ? error.message : 'SDK initialization failed'}. Please ensure the Aleo SDK is properly installed.`);
  }
}

/**
 * Generate an Aleo account from a BIP39 mnemonic seed
 */
export async function generateAccountFromSeed(mnemonic?: string): Promise<AleoAccount> {
  try {
    // Generate or validate mnemonic
    const seed = mnemonic || bip39.generateMnemonic(256); // 24 words

    if (!bip39.validateMnemonic(seed)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Convert mnemonic to seed bytes
    const seedBuffer = await bip39.mnemonicToSeed(seed);

    const sdk = await initSdk();

    // Use the first 32 bytes of the seed to create a private key
    const seedBytes = new Uint8Array(seedBuffer.buffer.slice(0, 32));
    const privateKey = sdk.PrivateKey.from_seed_unchecked(seedBytes);
    const privateKeyString = privateKey.to_string();

    // Derive view key
    const viewKey = sdk.ViewKey.from_private_key(privateKey);
    const viewKeyString = viewKey.to_string();

    // Derive address
    const address = sdk.Address.from_private_key(privateKey);
    const addressString = address.to_string();

    return {
      privateKey: privateKeyString,
      viewKey: viewKeyString,
      address: addressString,
      seed
    };
  } catch (error) {
    console.error('Error generating account from seed:', error);
    throw new Error(`Failed to generate account from seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Import an Aleo account from an existing private key
 */
export async function importFromPrivateKey(privateKeyString: string): Promise<AleoAccount> {
  try {
    // Validate private key format
    if (!isValidPrivateKey(privateKeyString)) {
      throw new Error('Invalid private key format. Must start with "APrivateKey1"');
    }

    const sdk = await initSdk();

    let viewKeyString: string;
    let addressString: string;

    // Use Account constructor with privateKey parameter (SDK v0.9.15+)
    if (sdk.Account) {
      console.log('[Aleo SDK] Importing with Account constructor');
      const account = new sdk.Account({ privateKey: privateKeyString });

      viewKeyString = account.viewKey().to_string();
      addressString = account.address().to_string();
    } else {
      throw new Error('No compatible import API found in SDK');
    }

    console.log(`[Aleo SDK] Imported account: ${addressString}`);

    return {
      privateKey: privateKeyString,
      viewKey: viewKeyString,
      address: addressString
    };
  } catch (error) {
    console.error('[Aleo SDK] Error importing from private key:', error);
    // SECURITY FIX: Do NOT fall back to fake derivation - throw error instead
    throw new Error(`Failed to import Aleo account: ${error instanceof Error ? error.message : 'SDK initialization failed'}. Please ensure the Aleo SDK is properly installed.`);
  }
}

/**
 * Sign a message using the private key
 */
export async function signMessage(privateKeyString: string, message: string): Promise<string> {
  try {
    const sdk = await initSdk();

    // Parse the private key
    const privateKey = sdk.PrivateKey.from_string(privateKeyString);

    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Sign the message
    const signature = sdk.Signature.sign(privateKey, messageBytes);

    return signature.to_string();
  } catch (error) {
    console.error('Error signing message:', error);
    // SECURITY FIX: Do NOT fall back to fake signatures - throw error instead
    throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'SDK initialization failed'}`);
  }
}

/**
 * Verify a signature
 */
export async function verifySignature(
  addressString: string,
  message: string,
  signatureString: string
): Promise<boolean> {
  try {
    const sdk = await initSdk();

    // Parse address and signature
    const address = sdk.Address.from_string(addressString);
    const signature = sdk.Signature.from_string(signatureString);

    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature
    return signature.verify(address, messageBytes);
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Decrypt a ciphertext using the view key
 */
export async function decryptRecord(viewKeyString: string, ciphertext: string): Promise<string> {
  try {
    const sdk = await initSdk();

    // Parse the view key
    const viewKey = sdk.ViewKey.from_string(viewKeyString);

    // Decrypt the ciphertext
    const plaintext = viewKey.decrypt(ciphertext);

    return plaintext;
  } catch (error) {
    console.error('Error decrypting record:', error);
    throw new Error('Failed to decrypt record. The view key may not have permission.');
  }
}

/**
 * Validate Aleo private key format
 */
export function isValidPrivateKey(privateKey: string): boolean {
  // Aleo private keys start with 'APrivateKey1' and are 59 characters
  return typeof privateKey === 'string' &&
         privateKey.startsWith('APrivateKey1') &&
         privateKey.length === 59;
}

/**
 * Validate Aleo view key format
 */
export function isValidViewKey(viewKey: string): boolean {
  // Aleo view keys start with 'AViewKey1' and are 53 characters
  return typeof viewKey === 'string' &&
         viewKey.startsWith('AViewKey1') &&
         viewKey.length === 53;
}

/**
 * Validate Aleo address format
 */
export function isValidAddress(address: string): boolean {
  // Aleo addresses start with 'aleo1' and are 63 characters
  return typeof address === 'string' &&
         address.startsWith('aleo1') &&
         address.length === 63;
}

// ============================================
// FALLBACK IMPLEMENTATIONS
// ============================================
// These are used when the WASM SDK is not available

/**
 * Fallback account generation (deterministic from random bytes)
 */
function generateAccountFallback(): AleoAccount {
  console.warn('Using fallback account generation (SDK not available)');

  const randomBytes = crypto.randomBytes(32);
  const hash = crypto.createHash('sha256').update(randomBytes).digest('hex');

  // Generate deterministic keys
  const privateKey = `APrivateKey1zkp${hash.substring(0, 44)}`;
  const viewKeyHash = crypto.createHash('sha256').update(privateKey).digest('hex');
  const viewKey = `AViewKey1${viewKeyHash.substring(0, 44)}`;

  const addressHash = crypto.createHash('sha256').update(viewKey).digest('hex');
  const address = `aleo1${addressHash.substring(0, 58)}`;

  return {
    privateKey,
    viewKey,
    address
  };
}

/**
 * Fallback import from private key
 */
function importFromPrivateKeyFallback(privateKeyString: string): AleoAccount {
  console.warn('Using fallback key derivation (SDK not available)');

  if (!privateKeyString.startsWith('APrivateKey1')) {
    throw new Error('Invalid private key format');
  }

  const viewKeyHash = crypto.createHash('sha256').update(privateKeyString).digest('hex');
  const viewKey = `AViewKey1${viewKeyHash.substring(0, 44)}`;

  const addressHash = crypto.createHash('sha256').update(viewKey).digest('hex');
  const address = `aleo1${addressHash.substring(0, 58)}`;

  return {
    privateKey: privateKeyString,
    viewKey,
    address
  };
}

/**
 * Fallback message signing (deterministic hash-based)
 */
function signMessageFallback(privateKeyString: string, message: string): string {
  console.warn('Using fallback message signing (SDK not available)');

  const combinedData = `${privateKeyString}:${message}`;
  const signature = crypto.createHash('sha256').update(combinedData).digest('hex');

  return `sign1${signature}`;
}

// ============================================
// SINGLETON SERVICE
// ============================================

class AleoCryptoService {
  private static instance: AleoCryptoService;
  private initialized: boolean = false;
  private sdkAvailable: boolean = false;
  private initError: Error | null = null;

  private constructor() {}

  static getInstance(): AleoCryptoService {
    if (!AleoCryptoService.instance) {
      AleoCryptoService.instance = new AleoCryptoService();
    }
    return AleoCryptoService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await initSdk();
      this.initialized = true;
      this.sdkAvailable = true;
      console.log('Aleo Crypto Service initialized with SDK');
    } catch (error) {
      console.error('Aleo SDK initialization failed:', error);
      this.initialized = true;
      this.sdkAvailable = false;
      this.initError = error instanceof Error ? error : new Error('SDK initialization failed');
    }
  }

  /**
   * Check if SDK is available - throws if not
   */
  private ensureSdkAvailable(): void {
    if (!this.sdkAvailable) {
      throw new Error(`Aleo SDK not available: ${this.initError?.message || 'Unknown error'}. Please restart the application.`);
    }
  }

  async generateAccount(): Promise<AleoAccount> {
    await this.initialize();
    this.ensureSdkAvailable();
    return generateAccount();
  }

  async generateAccountFromSeed(mnemonic?: string): Promise<AleoAccount> {
    await this.initialize();
    this.ensureSdkAvailable();
    return generateAccountFromSeed(mnemonic);
  }

  async importFromPrivateKey(privateKey: string): Promise<AleoAccount> {
    await this.initialize();
    this.ensureSdkAvailable();
    return importFromPrivateKey(privateKey);
  }

  async signMessage(privateKey: string, message: string): Promise<string> {
    await this.initialize();
    this.ensureSdkAvailable();
    return signMessage(privateKey, message);
  }

  async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
    await this.initialize();
    this.ensureSdkAvailable();
    return verifySignature(address, message, signature);
  }

  async decryptRecord(viewKey: string, ciphertext: string): Promise<string> {
    await this.initialize();
    this.ensureSdkAvailable();
    return decryptRecord(viewKey, ciphertext);
  }

  isValidPrivateKey(privateKey: string): boolean {
    return isValidPrivateKey(privateKey);
  }

  isValidViewKey(viewKey: string): boolean {
    return isValidViewKey(viewKey);
  }

  isValidAddress(address: string): boolean {
    return isValidAddress(address);
  }
}

export const aleoCryptoService = AleoCryptoService.getInstance();
export default AleoCryptoService;
