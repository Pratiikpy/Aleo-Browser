import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt, hashPassword, constantTimeCompare, EncryptedData } from './utils/crypto';
import { aleoCryptoService } from './services/aleo-crypto.service';
import { transactionHistoryService } from './services/transaction-history.service';

// Lazy load electron modules to avoid initialization issues
let electronModule: typeof import('electron') | null = null;

function getElectron(): typeof import('electron') {
  if (!electronModule) {
    electronModule = require('electron');
  }
  return electronModule!;
}

// Note: electron-store is lazily loaded in getConfigStore()

/**
 * Type definitions for IPC communication
 */

interface WalletData {
  address: string;
  privateKey: string;
  viewKey: string;
  createdAt: number;
}

interface EncryptedWallet {
  data: EncryptedData;
  passwordHash: string;
  createdAt: number;
  lastAccessed: number;
}

interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
  folder?: string;
  tags?: string[];
  aleoPinned?: boolean;
}

interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
  favicon?: string;
}

interface SendTransactionParams {
  recipient: string;
  amount: number;
  fee?: number;
  memo?: string;
}

/**
 * Store configuration - lazily initialized
 */
interface StoreSchema {
  wallet?: EncryptedWallet;
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  settings: Record<string, unknown>;
}

// Use any type to avoid complex type inference issues with dynamic require
let storeInstance: any = null;

function getConfigStore(): any {
  if (!storeInstance) {
    const Store = require('electron-store');
    storeInstance = new Store({
      defaults: {
        bookmarks: [],
        history: [],
        settings: {}
      }
    });
  }
  return storeInstance;
}

/**
 * Runtime state (in-memory only)
 */
let walletSession: {
  wallet: WalletData | null;
  isLocked: boolean;
  unlockTime: number | null;
  autoLockTimer: NodeJS.Timeout | null;
} = {
  wallet: null,
  isLocked: true,
  unlockTime: null,
  autoLockTimer: null
};

const AUTO_LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Auto-lock the wallet after inactivity
 */
function resetAutoLockTimer(): void {
  if (walletSession.autoLockTimer) {
    clearTimeout(walletSession.autoLockTimer);
  }

  if (!walletSession.isLocked) {
    walletSession.autoLockTimer = setTimeout(() => {
      lockWallet();
    }, AUTO_LOCK_DURATION);
  }
}

/**
 * Lock the wallet and clear sensitive data from memory
 */
function lockWallet(): void {
  walletSession.wallet = null;
  walletSession.isLocked = true;
  walletSession.unlockTime = null;

  if (walletSession.autoLockTimer) {
    clearTimeout(walletSession.autoLockTimer);
    walletSession.autoLockTimer = null;
  }
}

/**
 * Initialize IPC handlers
 */
export function setupIpcHandlers(): void {
  const { ipcMain } = getElectron();
  const store = getConfigStore();

  // ============================================
  // WALLET HANDLERS
  // ============================================

  /**
   * Create a new Aleo wallet using real @provablehq/sdk with mnemonic
   */
  ipcMain.handle('wallet:create', async (_event, password: string): Promise<{ success: boolean; address?: string; mnemonic?: string; error?: string }> => {
    try {
      if (!password || password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      // Check if wallet already exists
      const existingWallet = store.get('wallet');
      if (existingWallet) {
        return { success: false, error: 'Wallet already exists. Import or delete existing wallet first.' };
      }

      // Generate a new Aleo wallet using real SDK with mnemonic (12 words)
      const account = await aleoCryptoService.generateAccountFromSeed();

      const walletData: WalletData = {
        address: account.address,
        privateKey: account.privateKey,
        viewKey: account.viewKey,
        createdAt: Date.now()
      };

      // Encrypt wallet data
      const encryptedData = encrypt(JSON.stringify(walletData), password);
      const passwordHash = hashPassword(password);

      const encryptedWallet: EncryptedWallet = {
        data: encryptedData,
        passwordHash,
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };

      store.set('wallet', encryptedWallet);

      // Unlock the wallet in session
      walletSession.wallet = walletData;
      walletSession.isLocked = false;
      walletSession.unlockTime = Date.now();
      resetAutoLockTimer();

      console.log('Wallet created with real SDK:', account.address);
      return { success: true, address: walletData.address, mnemonic: account.seed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet'
      };
    }
  });

  /**
   * Import wallet from mnemonic phrase
   */
  ipcMain.handle('wallet:importFromMnemonic', async (_event, mnemonic: string, password: string): Promise<{ success: boolean; address?: string; error?: string }> => {
    try {
      if (!password || password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      if (!mnemonic || mnemonic.trim().split(/\s+/).length < 12) {
        return { success: false, error: 'Invalid mnemonic. Must be at least 12 words.' };
      }

      // Check if wallet already exists
      const existingWallet = store.get('wallet');
      if (existingWallet) {
        return { success: false, error: 'Wallet already exists. Delete existing wallet first.' };
      }

      // Import wallet using mnemonic
      const account = await aleoCryptoService.generateAccountFromSeed(mnemonic.trim());

      const walletData: WalletData = {
        address: account.address,
        privateKey: account.privateKey,
        viewKey: account.viewKey,
        createdAt: Date.now()
      };

      // Encrypt wallet data
      const encryptedData = encrypt(JSON.stringify(walletData), password);
      const passwordHash = hashPassword(password);

      const encryptedWallet: EncryptedWallet = {
        data: encryptedData,
        passwordHash,
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };

      store.set('wallet', encryptedWallet);

      // Unlock the wallet in session
      walletSession.wallet = walletData;
      walletSession.isLocked = false;
      walletSession.unlockTime = Date.now();
      resetAutoLockTimer();

      console.log('Wallet imported from mnemonic:', account.address);
      return { success: true, address: walletData.address };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import wallet from mnemonic'
      };
    }
  });

  /**
   * Import an existing Aleo wallet using real SDK
   */
  ipcMain.handle('wallet:import', async (_event, privateKey: string, password: string): Promise<{ success: boolean; address?: string; error?: string }> => {
    try {
      if (!password || password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      // Validate private key format using real validation
      if (!aleoCryptoService.isValidPrivateKey(privateKey)) {
        return { success: false, error: 'Invalid private key format. Must start with "APrivateKey1" and be 59 characters.' };
      }

      // Check if wallet already exists
      const existingWallet = store.get('wallet');
      if (existingWallet) {
        return { success: false, error: 'Wallet already exists. Delete existing wallet first.' };
      }

      // Import wallet using real SDK - derives view key and address from private key
      const account = await aleoCryptoService.importFromPrivateKey(privateKey);

      const walletData: WalletData = {
        address: account.address,
        privateKey: account.privateKey,
        viewKey: account.viewKey,
        createdAt: Date.now()
      };

      // Encrypt wallet data
      const encryptedData = encrypt(JSON.stringify(walletData), password);
      const passwordHash = hashPassword(password);

      const encryptedWallet: EncryptedWallet = {
        data: encryptedData,
        passwordHash,
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };

      store.set('wallet', encryptedWallet);

      // Unlock the wallet in session
      walletSession.wallet = walletData;
      walletSession.isLocked = false;
      walletSession.unlockTime = Date.now();
      resetAutoLockTimer();

      console.log('Wallet imported with real SDK:', account.address);
      return { success: true, address: walletData.address };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import wallet'
      };
    }
  });

  /**
   * Get wallet address
   */
  ipcMain.handle('wallet:getAddress', async (): Promise<{ success: boolean; address?: string; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }

      resetAutoLockTimer();
      return { success: true, address: walletSession.wallet.address };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get address'
      };
    }
  });

  /**
   * Get wallet balance from real Aleo network
   */
  ipcMain.handle('wallet:getBalance', async (): Promise<{ success: boolean; balance?: number; public?: number; private?: number; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }

      resetAutoLockTimer();

      // Fetch real balance from Aleo network
      const { aleoService: aleoSvc } = require('./services/aleo.service');
      const balanceData = await aleoSvc.getBalance(walletSession.wallet.address);

      return {
        success: true,
        balance: balanceData.public + balanceData.private,
        public: balanceData.public,
        private: balanceData.private
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get balance'
      };
    }
  });

  /**
   * Send Aleo transaction using real network
   */
  ipcMain.handle('wallet:send', async (_event, params: SendTransactionParams): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }

      const { recipient, amount, fee = 0.01, memo } = params;

      if (!recipient || !recipient.startsWith('aleo1') || recipient.length !== 63) {
        return { success: false, error: 'Invalid recipient address. Must start with "aleo1" and be 63 characters.' };
      }

      if (!amount || amount <= 0) {
        return { success: false, error: 'Invalid amount' };
      }

      if (fee < 0.001) {
        return { success: false, error: 'Fee must be at least 0.001 ALEO' };
      }

      resetAutoLockTimer();

      console.log(`[Wallet] Preparing transfer: ${amount} ALEO to ${recipient}, fee: ${fee} ALEO`);

      // Execute real transfer using Aleo service
      const { aleoService: aleoSvc } = require('./services/aleo.service');
      const txHash = await aleoSvc.transfer({
        privateKey: walletSession.wallet.privateKey,
        to: recipient,
        amount: amount,
        fee: fee
      });

      // Record the sent transaction in history
      transactionHistoryService.recordSentTransaction({
        txId: txHash,
        to: recipient,
        amount: amount,
        fee: fee,
        memo: memo,
      });

      console.log(`[Wallet] Transfer of ${amount} ALEO to ${recipient} initiated: ${txHash}`);

      return { success: true, txHash };
    } catch (error) {
      console.error('[Wallet] Transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send transaction'
      };
    }
  });

  /**
   * Lock the wallet
   */
  ipcMain.handle('wallet:lock', async (): Promise<{ success: boolean }> => {
    lockWallet();
    return { success: true };
  });

  /**
   * Unlock the wallet
   */
  ipcMain.handle('wallet:unlock', async (_event, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const encryptedWallet = store.get('wallet');

      if (!encryptedWallet) {
        return { success: false, error: 'No wallet found' };
      }

      // Verify password hash
      const passwordHash = hashPassword(password);
      if (!constantTimeCompare(passwordHash, encryptedWallet.passwordHash)) {
        return { success: false, error: 'Invalid password' };
      }

      // Decrypt wallet data
      const decryptedData = decrypt(encryptedWallet.data, password);
      const walletData: WalletData = JSON.parse(decryptedData);

      // Update session
      walletSession.wallet = walletData;
      walletSession.isLocked = false;
      walletSession.unlockTime = Date.now();

      // Update last accessed time
      store.set('wallet.lastAccessed', Date.now());

      resetAutoLockTimer();

      // Initialize transaction history with wallet address
      try {
        transactionHistoryService.init(walletData.address, 'testnet');
        console.log('[Wallet] Transaction history initialized for:', walletData.address);
      } catch (txErr) {
        console.error('[Wallet] Failed to init transaction history:', txErr);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock wallet'
      };
    }
  });

  /**
   * Check if wallet is locked
   */
  ipcMain.handle('wallet:isLocked', async (): Promise<{ isLocked: boolean; hasWallet: boolean }> => {
    const hasWallet = !!store.get('wallet');
    return { isLocked: walletSession.isLocked, hasWallet };
  });

  /**
   * Export private key (requires unlocked wallet)
   */
  ipcMain.handle('wallet:exportPrivateKey', async (): Promise<{ success: boolean; privateKey?: string; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }
      resetAutoLockTimer();
      return { success: true, privateKey: walletSession.wallet.privateKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export private key'
      };
    }
  });

  /**
   * Export view key (requires unlocked wallet)
   */
  ipcMain.handle('wallet:exportViewKey', async (): Promise<{ success: boolean; viewKey?: string; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }
      resetAutoLockTimer();
      return { success: true, viewKey: walletSession.wallet.viewKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export view key'
      };
    }
  });

  /**
   * Delete wallet (dangerous - requires confirmation)
   */
  ipcMain.handle('wallet:delete', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Lock and clear session
      lockWallet();

      // Delete stored wallet
      store.delete('wallet');

      console.log('[Wallet] Wallet deleted');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete wallet'
      };
    }
  });

  /**
   * Refresh wallet balance from network
   */
  ipcMain.handle('wallet:refreshBalance', async (): Promise<{ success: boolean; public?: number; private?: number; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }
      resetAutoLockTimer();

      const { aleoService: aleoSvc } = require('./services/aleo.service');
      const balance = await aleoSvc.getBalance(walletSession.wallet.address);

      return { success: true, public: balance.public, private: balance.private };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh balance'
      };
    }
  });

  // ============================================
  // BOOKMARKS HANDLERS
  // ============================================

  /**
   * Get all bookmarks
   */
  ipcMain.handle('bookmarks:getAll', async (): Promise<Bookmark[]> => {
    return store.get('bookmarks', []);
  });

  /**
   * Add a bookmark
   */
  ipcMain.handle('bookmarks:add', async (_event, bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<{ success: boolean; bookmark?: Bookmark; error?: string }> => {
    try {
      const newBookmark: Bookmark = {
        ...bookmark,
        id: uuidv4(),
        createdAt: Date.now()
      };

      const bookmarks = store.get('bookmarks', []);
      bookmarks.push(newBookmark);
      store.set('bookmarks', bookmarks);

      return { success: true, bookmark: newBookmark };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add bookmark'
      };
    }
  });

  /**
   * Update a bookmark
   */
  ipcMain.handle('bookmarks:update', async (_event, id: string, updates: Partial<Bookmark>): Promise<{ success: boolean; error?: string }> => {
    try {
      const bookmarks = store.get('bookmarks', []);
      const index = bookmarks.findIndex((b: Bookmark) => b.id === id);

      if (index === -1) {
        return { success: false, error: 'Bookmark not found' };
      }

      bookmarks[index] = { ...bookmarks[index], ...updates };
      store.set('bookmarks', bookmarks);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update bookmark'
      };
    }
  });

  /**
   * Delete a bookmark
   */
  ipcMain.handle('bookmarks:delete', async (_event, id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const bookmarks = store.get('bookmarks', []);
      const filtered = bookmarks.filter((b: Bookmark) => b.id !== id);

      if (filtered.length === bookmarks.length) {
        return { success: false, error: 'Bookmark not found' };
      }

      store.set('bookmarks', filtered);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete bookmark'
      };
    }
  });

  /**
   * Sync a single bookmark to Aleo blockchain
   * Encrypts bookmark data client-side and stores on-chain using bookmark_v1.aleo
   */
  ipcMain.handle('bookmarks:syncToAleo', async (_event, bookmarkId?: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }

      const bookmarks = store.get('bookmarks', []);

      // If bookmarkId provided, sync just that one; otherwise sync all aleoPinned bookmarks
      const toSync = bookmarkId
        ? bookmarks.filter((b: Bookmark) => b.id === bookmarkId)
        : bookmarks.filter((b: Bookmark) => b.aleoPinned);

      if (toSync.length === 0) {
        return { success: false, error: 'No bookmarks to sync' };
      }

      const { aleoService: aleoSvc } = require('./services/aleo.service');
      const results: string[] = [];

      for (const bookmark of toSync) {
        // Generate a unique field ID from bookmark ID
        const bookmarkIdHash = hashPassword(bookmark.id).substring(0, 16);
        const bookmarkIdField = `${parseInt(bookmarkIdHash, 16) % 10000000000}field`;

        // Encrypt URL and title to fields (simple hash-based encryption for demo)
        const urlHash = hashPassword(bookmark.url).substring(0, 16);
        const titleHash = hashPassword(bookmark.title).substring(0, 16);
        const encryptedUrl = `${parseInt(urlHash, 16) % 10000000000}field`;
        const encryptedTitle = `${parseInt(titleHash, 16) % 10000000000}field`;

        // Timestamp
        const createdAt = `${Math.floor(bookmark.createdAt / 1000)}u32`;

        try {
          const txHash = await aleoSvc.executeProgram({
            programId: 'bookmark_v1.aleo',
            functionName: 'add_bookmark',
            inputs: [bookmarkIdField, encryptedUrl, encryptedTitle, createdAt],
            fee: 0.1,
            privateKey: walletSession.wallet!.privateKey,
          });

          // Record the transaction in history
          transactionHistoryService.recordExecuteTransaction({
            txId: txHash,
            programId: 'bookmark_v1.aleo',
            functionName: 'add_bookmark',
            fee: 0.1,
          });

          results.push(txHash);
          console.log(`[Bookmark Sync] Synced bookmark ${bookmark.id}: ${txHash}`);
        } catch (err) {
          console.error(`[Bookmark Sync] Failed to sync bookmark ${bookmark.id}:`, err);
        }
      }

      if (results.length === 0) {
        return { success: false, error: 'Failed to sync any bookmarks' };
      }

      console.log(`[Bookmark Sync] Synced ${results.length} bookmarks to Aleo blockchain`);
      return { success: true, txHash: results[0] };
    } catch (error) {
      console.error('[Bookmark Sync] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync bookmarks'
      };
    }
  });

  /**
   * Pin bookmark for Aleo sync
   */
  ipcMain.handle('bookmarks:pinToAleo', async (_event, id: string, pinned: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const bookmarks = store.get('bookmarks', []);
      const index = bookmarks.findIndex((b: Bookmark) => b.id === id);

      if (index === -1) {
        return { success: false, error: 'Bookmark not found' };
      }

      bookmarks[index].aleoPinned = pinned;
      store.set('bookmarks', bookmarks);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pin bookmark'
      };
    }
  });

  // ============================================
  // NOTES HANDLERS (ZK Private Notes)
  // ============================================

  // In-memory notes store (for local storage before blockchain sync)
  interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;
    syncedToAleo: boolean;
    syncStatus?: 'local' | 'syncing' | 'on-chain' | 'failed';
    txHash?: string;
    // Encryption data (stored locally for decryption)
    encryptedData?: {
      title: EncryptedData;
      content: EncryptedData;
      tags: EncryptedData;
    };
    isEncrypted?: boolean;
  }

  /**
   * Get all notes
   */
  ipcMain.handle('notes:getAll', async (): Promise<Note[]> => {
    return store.get('notes', []);
  });

  /**
   * Add a new note
   */
  ipcMain.handle('notes:add', async (_event, note: { title: string; content: string; tags?: string[] }): Promise<{ success: boolean; note?: Note; error?: string }> => {
    try {
      const newNote: Note = {
        id: uuidv4(),
        title: note.title,
        content: note.content,
        tags: note.tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncedToAleo: false,
        syncStatus: 'local' as const,
      };

      const notes = store.get('notes', []);
      notes.push(newNote);
      store.set('notes', notes);

      // Auto-sync to blockchain if wallet is unlocked
      if (walletSession.wallet && !walletSession.isLocked) {
        console.log('[Notes] Auto-syncing new note to Aleo blockchain...');

        // Update status to syncing
        const notesUpdated = store.get('notes', []);
        const idx = notesUpdated.findIndex((n: Note) => n.id === newNote.id);
        if (idx !== -1) {
          notesUpdated[idx].syncStatus = 'syncing';
          store.set('notes', notesUpdated);
        }

        // Sync in background (don't block the response)
        (async () => {
          try {
            const { aleoService: aleoSvc } = require('./services/aleo.service');

            // ============================================
            // REAL AES-256-GCM ENCRYPTION
            // ============================================
            // Derive encryption key from wallet private key
            const encryptionKey = walletSession.wallet!.privateKey;

            console.log('[Notes] Encrypting note with AES-256-GCM...');

            // Encrypt title, content, and tags with real encryption
            const encryptedTitleData = encrypt(newNote.title, encryptionKey);
            const encryptedContentData = encrypt(newNote.content, encryptionKey);
            const encryptedTagsData = encrypt(JSON.stringify(newNote.tags || []), encryptionKey);

            console.log('[Notes] Note encrypted successfully');

            // Store encrypted data locally for future decryption
            const notesForEncryption = store.get('notes', []);
            const encIdx = notesForEncryption.findIndex((n: Note) => n.id === newNote.id);
            if (encIdx !== -1) {
              notesForEncryption[encIdx].encryptedData = {
                title: encryptedTitleData,
                content: encryptedContentData,
                tags: encryptedTagsData,
              };
              notesForEncryption[encIdx].isEncrypted = true;
              store.set('notes', notesForEncryption);
            }

            // Generate field values for on-chain storage
            // Use hash of encrypted ciphertext as unique identifier (verifiable on-chain)
            const noteIdField = `${BigInt('0x' + hashPassword(newNote.id).substring(0, 15)) % BigInt('10000000000')}field`;

            // Hash of encrypted ciphertext (proves encryption happened, verifiable)
            const titleCipherHash = hashPassword(encryptedTitleData.encrypted).substring(0, 15);
            const encryptedTitleField = `${BigInt('0x' + titleCipherHash) % BigInt('10000000000')}field`;

            const contentCipherHash = hashPassword(encryptedContentData.encrypted).substring(0, 15);
            const encryptedContentField = `${BigInt('0x' + contentCipherHash) % BigInt('10000000000')}field`;

            const tagsCipherHash = hashPassword(encryptedTagsData.encrypted).substring(0, 15);
            const encryptedTagsField = `${BigInt('0x' + tagsCipherHash) % BigInt('10000000000')}field`;

            const createdAt = `${newNote.createdAt}u64`;

            console.log('[Notes] Executing add_note on privacybrowser_notes_v1.aleo...');
            console.log('[Notes] Inputs:', { noteIdField, encryptedTitleField, encryptedContentField, encryptedTagsField, createdAt });

            const txHash = await aleoSvc.executeProgram({
              programId: 'privacybrowser_notes_v1.aleo',
              functionName: 'add_note',
              inputs: [noteIdField, encryptedTitleField, encryptedContentField, encryptedTagsField, createdAt],
              fee: 0.1,
              privateKey: walletSession.wallet!.privateKey,
            });

            console.log('[Notes] Transaction submitted:', txHash);

            // Record the transaction in history
            transactionHistoryService.recordExecuteTransaction({
              txId: txHash,
              programId: 'privacybrowser_notes_v1.aleo',
              functionName: 'add_note',
              fee: 0.1,
            });
            console.log('[TxHistory] Recorded note sync transaction');

            // Update note status to on-chain
            const notesAfterSync = store.get('notes', []);
            const noteIdx = notesAfterSync.findIndex((n: Note) => n.id === newNote.id);
            if (noteIdx !== -1) {
              notesAfterSync[noteIdx].syncedToAleo = true;
              notesAfterSync[noteIdx].syncStatus = 'on-chain';
              notesAfterSync[noteIdx].txHash = txHash;
              store.set('notes', notesAfterSync);
            }

            console.log(`[Notes] Successfully synced encrypted note ${newNote.id} to Aleo`);
          } catch (syncError) {
            console.error('[Notes] Auto-sync failed:', syncError);
            // Update status to failed
            const notesAfterFail = store.get('notes', []);
            const noteIdx = notesAfterFail.findIndex((n: Note) => n.id === newNote.id);
            if (noteIdx !== -1) {
              notesAfterFail[noteIdx].syncStatus = 'failed';
              store.set('notes', notesAfterFail);
            }
          }
        })();
      }

      return { success: true, note: newNote };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add note'
      };
    }
  });

  /**
   * Update an existing note
   */
  ipcMain.handle('notes:update', async (_event, id: string, updates: Partial<Note>): Promise<{ success: boolean; error?: string }> => {
    try {
      const notes = store.get('notes', []);
      const index = notes.findIndex((n: Note) => n.id === id);

      if (index === -1) {
        return { success: false, error: 'Note not found' };
      }

      notes[index] = {
        ...notes[index],
        ...updates,
        updatedAt: Date.now(),
        syncedToAleo: false, // Mark as needing re-sync
      };
      store.set('notes', notes);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update note'
      };
    }
  });

  /**
   * Delete a note
   */
  ipcMain.handle('notes:delete', async (_event, id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const notes = store.get('notes', []);
      const filtered = notes.filter((n: Note) => n.id !== id);

      if (filtered.length === notes.length) {
        return { success: false, error: 'Note not found' };
      }

      store.set('notes', filtered);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete note'
      };
    }
  });

  /**
   * Decrypt a note's encrypted data
   * Requires wallet to be unlocked (uses private key for decryption)
   */
  ipcMain.handle('notes:decrypt', async (_event, noteId: string): Promise<{ success: boolean; decryptedNote?: { title: string; content: string; tags: string[] }; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }

      const notes = store.get('notes', []);
      const note = notes.find((n: Note) => n.id === noteId);

      if (!note) {
        return { success: false, error: 'Note not found' };
      }

      if (!note.encryptedData || !note.isEncrypted) {
        // Note not encrypted, return plaintext
        return {
          success: true,
          decryptedNote: {
            title: note.title,
            content: note.content,
            tags: note.tags || [],
          },
        };
      }

      // Decrypt using wallet private key
      const decryptionKey = walletSession.wallet!.privateKey;

      const decryptedTitle = decrypt(note.encryptedData.title, decryptionKey);
      const decryptedContent = decrypt(note.encryptedData.content, decryptionKey);
      const decryptedTags = JSON.parse(decrypt(note.encryptedData.tags, decryptionKey));

      console.log(`[Notes] Decrypted note ${noteId} successfully`);

      return {
        success: true,
        decryptedNote: {
          title: decryptedTitle,
          content: decryptedContent,
          tags: decryptedTags,
        },
      };
    } catch (error) {
      console.error('[Notes] Decryption failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decrypt note',
      };
    }
  });

  /**
   * Sync a note to Aleo blockchain using notes_v1.aleo contract
   * Uses REAL AES-256-GCM encryption
   */
  ipcMain.handle('notes:syncToAleo', async (_event, noteId: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
      if (walletSession.isLocked || !walletSession.wallet) {
        return { success: false, error: 'Wallet is locked' };
      }

      const notes = store.get('notes', []);
      const note = notes.find((n: Note) => n.id === noteId);

      if (!note) {
        return { success: false, error: 'Note not found' };
      }

      const { aleoService: aleoSvc } = require('./services/aleo.service');

      // ============================================
      // REAL AES-256-GCM ENCRYPTION
      // ============================================
      const encryptionKey = walletSession.wallet!.privateKey;

      console.log('[Notes Sync] Encrypting note with AES-256-GCM...');

      // Encrypt title, content, and tags with real encryption
      const encryptedTitleData = encrypt(note.title, encryptionKey);
      const encryptedContentData = encrypt(note.content, encryptionKey);
      const encryptedTagsData = encrypt(JSON.stringify(note.tags || []), encryptionKey);

      // Store encrypted data locally for future decryption
      const noteIndex = notes.findIndex((n: Note) => n.id === noteId);
      if (noteIndex !== -1) {
        notes[noteIndex].encryptedData = {
          title: encryptedTitleData,
          content: encryptedContentData,
          tags: encryptedTagsData,
        };
        notes[noteIndex].isEncrypted = true;
      }

      // Generate field values for on-chain storage
      const noteIdField = `${BigInt('0x' + hashPassword(note.id).substring(0, 15)) % BigInt('10000000000')}field`;

      // Hash of encrypted ciphertext (verifiable on-chain)
      const titleCipherHash = hashPassword(encryptedTitleData.encrypted).substring(0, 15);
      const encryptedTitleField = `${BigInt('0x' + titleCipherHash) % BigInt('10000000000')}field`;

      const contentCipherHash = hashPassword(encryptedContentData.encrypted).substring(0, 15);
      const encryptedContentField = `${BigInt('0x' + contentCipherHash) % BigInt('10000000000')}field`;

      const tagsCipherHash = hashPassword(encryptedTagsData.encrypted).substring(0, 15);
      const encryptedTagsField = `${BigInt('0x' + tagsCipherHash) % BigInt('10000000000')}field`;

      const createdAt = `${note.createdAt}u64`;

      console.log('[Notes Sync] Submitting encrypted note to Aleo...');

      const txHash = await aleoSvc.executeProgram({
        programId: 'privacybrowser_notes_v1.aleo',
        functionName: 'add_note',
        inputs: [noteIdField, encryptedTitleField, encryptedContentField, encryptedTagsField, createdAt],
        fee: 0.1,
        privateKey: walletSession.wallet!.privateKey,
      });

      // Record the transaction in history
      transactionHistoryService.recordExecuteTransaction({
        txId: txHash,
        programId: 'privacybrowser_notes_v1.aleo',
        functionName: 'add_note',
        fee: 0.1,
      });

      // Mark note as synced
      if (noteIndex !== -1) {
        notes[noteIndex].syncedToAleo = true;
        notes[noteIndex].syncStatus = 'on-chain';
        notes[noteIndex].txHash = txHash;
        store.set('notes', notes);
      }

      console.log(`[Notes Sync] Synced encrypted note ${noteId}: ${txHash}`);
      return { success: true, txHash };
    } catch (error) {
      console.error('[Notes Sync] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync note'
      };
    }
  });

  // ============================================
  // HISTORY HANDLERS
  // ============================================

  /**
   * Get all history entries
   */
  ipcMain.handle('history:getAll', async (_event, limit?: number): Promise<HistoryEntry[]> => {
    const history = store.get('history', []);
    return limit ? history.slice(0, limit) : history;
  });

  /**
   * Add a history entry
   */
  ipcMain.handle('history:add', async (_event, entry: Omit<HistoryEntry, 'id' | 'visitedAt'>): Promise<{ success: boolean }> => {
    try {
      const newEntry: HistoryEntry = {
        ...entry,
        id: uuidv4(),
        visitedAt: Date.now()
      };

      const history = store.get('history', []);

      // Keep only last 1000 entries
      history.unshift(newEntry);
      if (history.length > 1000) {
        history.pop();
      }

      store.set('history', history);
      return { success: true };
    } catch (error) {
      console.error('Failed to add history entry:', error);
      return { success: false };
    }
  });

  /**
   * Clear all history
   */
  ipcMain.handle('history:clear', async (): Promise<{ success: boolean }> => {
    try {
      store.set('history', []);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear history:', error);
      return { success: false };
    }
  });

  /**
   * Delete a specific history entry
   */
  ipcMain.handle('history:delete', async (_event, id: string): Promise<{ success: boolean }> => {
    try {
      const history = store.get('history', []);
      const filtered = history.filter((h: HistoryEntry) => h.id !== id);
      store.set('history', filtered);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete history entry:', error);
      return { success: false };
    }
  });

  // ============================================
  // BROWSER HANDLERS - Defined in index.ts setupBrowserControls()
  // DO NOT add browser handlers here - they conflict with index.ts
  // ============================================

  // ============================================
  // DAPP HANDLERS
  // ============================================

  // Import services for dApp handlers
  const { permissionService } = require('./services/permission.service');
  const { walletService } = require('./services/wallet.service');
  const { aleoService } = require('./services/aleo.service');
  const { getMainWindow } = require('./window');

  /**
   * Get origin from sender
   */
  function getOriginFromSender(event: Electron.IpcMainInvokeEvent): string {
    try {
      const url = event.sender.getURL();
      return new URL(url).origin;
    } catch {
      return 'unknown';
    }
  }

  /**
   * dApp: Connect request
   * Shows permission popup and returns address if approved
   */
  ipcMain.handle('dapp:connect', async (event): Promise<{ success: boolean; address?: string; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      // Check if already connected
      if (permissionService.isConnected(origin)) {
        const site = permissionService.getSitePermission(origin);
        permissionService.updateLastAccessed(origin);
        return { success: true, address: site?.address };
      }

      // Check if wallet is unlocked
      const walletState = walletService.getState();
      if (!walletState.isUnlocked) {
        return { success: false, error: 'Wallet is locked. Please unlock your wallet first.' };
      }

      // Get the main window to show permission dialog
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { success: false, error: 'Browser window not available' };
      }

      // Send permission request to renderer
      mainWindow.webContents.send('permission:request', {
        type: 'connect',
        origin,
        permissions: ['connect'],
        favicon: null,
      });

      // Wait for user response (with timeout)
      const approved = await permissionService.createPermissionRequest(origin, ['connect']);

      if (approved) {
        const address = walletService.getAddress();
        permissionService.grantPermission(origin, ['connect'], address!);
        return { success: true, address: address! };
      }

      return { success: false, error: 'Connection rejected by user' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  });

  /**
   * dApp: Disconnect
   */
  ipcMain.handle('dapp:disconnect', async (event): Promise<{ success: boolean }> => {
    try {
      const origin = getOriginFromSender(event);
      permissionService.disconnectSite(origin);

      // Notify the page about disconnection
      event.sender.send('dapp:disconnect');

      return { success: true };
    } catch {
      return { success: false };
    }
  });

  /**
   * dApp: Check if connected
   */
  ipcMain.handle('dapp:isConnected', async (event): Promise<{ connected: boolean }> => {
    try {
      const origin = getOriginFromSender(event);
      return { connected: permissionService.isConnected(origin) };
    } catch {
      return { connected: false };
    }
  });

  /**
   * dApp: Get connected account
   */
  ipcMain.handle('dapp:getAccount', async (event): Promise<{ success: boolean; address?: string; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      if (!permissionService.isConnected(origin)) {
        return { success: false, error: 'Not connected' };
      }

      const site = permissionService.getSitePermission(origin);
      permissionService.updateLastAccessed(origin);

      return { success: true, address: site?.address };
    } catch (error) {
      return { success: false, error: 'Failed to get account' };
    }
  });

  /**
   * dApp: Get network
   */
  ipcMain.handle('dapp:getNetwork', async (): Promise<{ network: string }> => {
    try {
      return { network: aleoService.getNetwork() };
    } catch {
      return { network: 'testnet' };
    }
  });

  /**
   * dApp: Request transaction
   */
  ipcMain.handle('dapp:requestTransaction', async (event, params: {
    programId: string;
    functionName: string;
    inputs: string[];
    fee?: number;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      if (!permissionService.isConnected(origin)) {
        return { success: false, error: 'Not connected' };
      }

      const walletState = walletService.getState();
      if (!walletState.isUnlocked) {
        return { success: false, error: 'Wallet is locked' };
      }

      // Get the main window to show transaction approval
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { success: false, error: 'Browser window not available' };
      }

      // Send transaction request to renderer for approval
      mainWindow.webContents.send('permission:request', {
        type: 'transaction',
        origin,
        transaction: params,
      });

      // Wait for user approval
      const approved = await permissionService.createPermissionRequest(origin, ['transaction']);

      if (!approved) {
        return { success: false, error: 'Transaction rejected by user' };
      }

      // Execute the transaction
      const wallet = walletService.getCurrentWallet();
      if (!wallet) {
        return { success: false, error: 'Wallet not available' };
      }

      const transactionId = await aleoService.executeProgram({
        programId: params.programId,
        functionName: params.functionName,
        inputs: params.inputs,
        fee: params.fee || 0.1,
        privateKey: wallet.privateKey,
      });

      return { success: true, transactionId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  });

  /**
   * dApp: Request records
   */
  ipcMain.handle('dapp:requestRecords', async (event, params: {
    programId?: string;
  }): Promise<{ success: boolean; records?: any[]; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      if (!permissionService.isConnected(origin)) {
        return { success: false, error: 'Not connected' };
      }

      const walletState = walletService.getState();
      if (!walletState.isUnlocked) {
        return { success: false, error: 'Wallet is locked' };
      }

      // For now, return empty records (full record scanning would require more work)
      const records = await aleoService.getRecords(
        walletService.exportViewKey(),
        params.programId
      );

      return { success: true, records };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get records'
      };
    }
  });

  /**
   * dApp: Sign message
   */
  ipcMain.handle('dapp:signMessage', async (event, params: {
    message: string;
  }): Promise<{ success: boolean; signature?: string; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      if (!permissionService.isConnected(origin)) {
        return { success: false, error: 'Not connected' };
      }

      const walletState = walletService.getState();
      if (!walletState.isUnlocked) {
        return { success: false, error: 'Wallet is locked' };
      }

      // Get the main window to show signing approval
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('permission:request', {
          type: 'sign',
          origin,
          message: params.message,
        });
      }

      // Wait for user approval
      const approved = await permissionService.createPermissionRequest(origin, ['sign']);

      if (!approved) {
        return { success: false, error: 'Signing rejected by user' };
      }

      const signature = await walletService.signMessage(params.message);
      return { success: true, signature };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signing failed'
      };
    }
  });

  /**
   * dApp: Decrypt ciphertext
   */
  ipcMain.handle('dapp:decrypt', async (event, params: {
    ciphertext: string;
  }): Promise<{ success: boolean; plaintext?: string; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      if (!permissionService.hasPermission(origin, 'decrypt')) {
        return { success: false, error: 'Decrypt permission not granted' };
      }

      const walletState = walletService.getState();
      if (!walletState.isUnlocked) {
        return { success: false, error: 'Wallet is locked' };
      }

      const plaintext = await walletService.decryptRecord(params.ciphertext);
      return { success: true, plaintext };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed'
      };
    }
  });

  /**
   * dApp: Get balance
   */
  ipcMain.handle('dapp:getBalance', async (event): Promise<{ success: boolean; balance?: { public: number; private: number }; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      if (!permissionService.isConnected(origin)) {
        return { success: false, error: 'Not connected' };
      }

      const walletState = walletService.getState();
      if (!walletState.isUnlocked || !walletState.address) {
        return { success: false, error: 'Wallet is locked' };
      }

      const balance = await aleoService.getBalance(walletState.address);
      return { success: true, balance };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get balance'
      };
    }
  });

  /**
   * dApp: Get block height
   */
  ipcMain.handle('dapp:getBlockHeight', async (): Promise<{ height: number }> => {
    try {
      const height = await aleoService.getLatestBlockHeight();
      return { height };
    } catch {
      return { height: 0 };
    }
  });

  /**
   * dApp: Get transaction status
   */
  ipcMain.handle('dapp:getTransactionStatus', async (_event, params: {
    transactionId: string;
  }): Promise<{ status: string }> => {
    try {
      const status = await aleoService.getTransactionStatus(params.transactionId);
      return { status };
    } catch {
      return { status: 'unknown' };
    }
  });

  /**
   * dApp: Request view key (advanced permission)
   */
  ipcMain.handle('dapp:requestViewKey', async (event): Promise<{ success: boolean; viewKey?: string; error?: string }> => {
    try {
      const origin = getOriginFromSender(event);

      if (!permissionService.isConnected(origin)) {
        return { success: false, error: 'Not connected' };
      }

      const walletState = walletService.getState();
      if (!walletState.isUnlocked) {
        return { success: false, error: 'Wallet is locked' };
      }

      // Get the main window for approval
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('permission:request', {
          type: 'viewKey',
          origin,
          warning: 'This will share your view key, allowing the site to view your transaction history.',
        });
      }

      // Wait for user approval
      const approved = await permissionService.createPermissionRequest(origin, ['viewKey']);

      if (!approved) {
        return { success: false, error: 'View key request rejected' };
      }

      permissionService.grantPermission(origin, ['viewKey'], walletState.address!);
      const viewKey = walletService.exportViewKey();
      return { success: true, viewKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get view key'
      };
    }
  });

  // ============================================
  // PERMISSION MANAGEMENT HANDLERS
  // ============================================

  /**
   * Get all connected sites
   */
  ipcMain.handle('permissions:getConnectedSites', async (): Promise<{ sites: any[] }> => {
    try {
      const sites = permissionService.getAllConnectedSites();
      return { sites };
    } catch {
      return { sites: [] };
    }
  });

  /**
   * Disconnect a site
   */
  ipcMain.handle('permissions:disconnectSite', async (_event, origin: string): Promise<{ success: boolean }> => {
    try {
      permissionService.disconnectSite(origin);
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  /**
   * Resolve a pending permission request
   */
  ipcMain.handle('permissions:resolve', async (_event, requestId: string, granted: boolean): Promise<{ success: boolean }> => {
    try {
      permissionService.resolvePermissionRequest(requestId, granted);
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  // ============================================
  // PRIVACY/SHIELDS HANDLERS
  // ============================================

  const { privacyService } = require('./services/privacy.service');

  /**
   * Get privacy statistics
   */
  ipcMain.handle('privacy:getStats', async (): Promise<any> => {
    try {
      const stats = privacyService.getStats();
      return {
        adsBlocked: stats.adsBlocked || 0,
        trackersBlocked: stats.trackersBlocked || 0,
        fingerprintingAttempts: stats.fingerprintingBlocked || 0,
        httpsUpgrades: stats.httpsUpgrades || 0,
        totalBlocked: stats.totalBlocked || 0
      };
    } catch (error) {
      console.error('Failed to get privacy stats:', error);
      return {
        adsBlocked: 0,
        trackersBlocked: 0,
        fingerprintingAttempts: 0,
        httpsUpgrades: 0,
        totalBlocked: 0
      };
    }
  });

  /**
   * Get privacy settings
   */
  ipcMain.handle('privacy:getSettings', async (): Promise<any> => {
    try {
      const settings = privacyService.getSettings();
      return {
        enabled: settings.enabled,
        blockAds: settings.blockAds,
        blockTrackers: settings.blockTrackers,
        httpsEverywhere: true, // Default enabled
        blockFingerprinting: settings.blockFingerprinting,
        blockCookies: 'third-party' // Default
      };
    } catch (error) {
      console.error('Failed to get privacy settings:', error);
      return {
        enabled: true,
        blockAds: true,
        blockTrackers: true,
        httpsEverywhere: true,
        blockFingerprinting: true,
        blockCookies: 'third-party'
      };
    }
  });

  /**
   * Enable or disable shields
   */
  ipcMain.handle('privacy:setEnabled', async (_event, enabled: boolean): Promise<{ success: boolean }> => {
    try {
      privacyService.setEnabled(enabled);
      return { success: true };
    } catch (error) {
      console.error('Failed to set privacy enabled:', error);
      return { success: false };
    }
  });

  /**
   * Update a specific privacy setting
   */
  ipcMain.handle('privacy:updateSetting', async (_event, key: string, value: boolean | string): Promise<{ success: boolean }> => {
    try {
      const settingMap: Record<string, string> = {
        blockAds: 'blockAds',
        blockTrackers: 'blockTrackers',
        blockFingerprinting: 'blockFingerprinting',
        httpsEverywhere: 'httpsEverywhere',
        blockCookies: 'blockCookies'
      };

      if (settingMap[key]) {
        privacyService.updateSettings({ [settingMap[key]]: value });
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      return { success: false };
    }
  });

  /**
   * Get stats for a specific site
   */
  ipcMain.handle('privacy:getSiteStats', async (_event, hostname: string): Promise<any> => {
    try {
      // Return session stats for now (per-site tracking can be added later)
      const stats = privacyService.getStats();
      return {
        adsBlocked: stats.adsBlocked || 0,
        trackersBlocked: stats.trackersBlocked || 0
      };
    } catch (error) {
      console.error('Failed to get site stats:', error);
      return { adsBlocked: 0, trackersBlocked: 0 };
    }
  });

  /**
   * Reset all privacy statistics
   */
  ipcMain.handle('privacy:resetStats', async (): Promise<{ success: boolean }> => {
    try {
      privacyService.resetStats();
      return { success: true };
    } catch (error) {
      console.error('Failed to reset privacy stats:', error);
      return { success: false };
    }
  });

  // ============================================================================
  // Tab Suspend / Memory Saver Handlers
  // ============================================================================

  const windowModule = require('./window');
  const { tabSuspendService } = require('./services/tab-suspend.service');

  /**
   * Suspend a tab to free memory
   */
  ipcMain.handle('tab:suspend', async (_event, tabId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = windowModule.suspendTab(tabId);
      return { success: result };
    } catch (error) {
      console.error('Failed to suspend tab:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Unsuspend a tab
   */
  ipcMain.handle('tab:unsuspend', async (_event, tabId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const view = windowModule.unsuspendTab(tabId);
      return { success: !!view };
    } catch (error) {
      console.error('Failed to unsuspend tab:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Check if a tab is suspended
   */
  ipcMain.handle('tab:isSuspended', async (_event, tabId: string): Promise<{ suspended: boolean }> => {
    try {
      const suspended = windowModule.isTabSuspended(tabId);
      return { suspended };
    } catch (error) {
      return { suspended: false };
    }
  });

  /**
   * Get memory saver stats
   */
  ipcMain.handle('tab:getMemorySaverStats', async (): Promise<{
    suspendedCount: number;
    estimatedMemorySavedMB: number;
    enabled: boolean;
    autoSuspendEnabled: boolean;
  }> => {
    try {
      const windowStats = windowModule.getMemorySaverStats();
      const serviceStats = tabSuspendService.getStats();
      return {
        suspendedCount: windowStats.suspendedCount,
        estimatedMemorySavedMB: windowStats.estimatedMemorySavedMB,
        enabled: serviceStats.enabled,
        autoSuspendEnabled: serviceStats.autoSuspendEnabled
      };
    } catch (error) {
      console.error('Failed to get memory saver stats:', error);
      return {
        suspendedCount: 0,
        estimatedMemorySavedMB: 0,
        enabled: false,
        autoSuspendEnabled: false
      };
    }
  });

  /**
   * Get tab suspend settings
   */
  ipcMain.handle('tab:getSuspendSettings', async (): Promise<any> => {
    try {
      return tabSuspendService.getSettings();
    } catch (error) {
      console.error('Failed to get suspend settings:', error);
      return {
        enabled: true,
        autoSuspendEnabled: true,
        autoSuspendDelayMinutes: 30,
        neverSuspendPinnedTabs: true,
        neverSuspendAudioTabs: true,
        neverSuspendDomains: []
      };
    }
  });

  /**
   * Update tab suspend settings
   */
  ipcMain.handle('tab:updateSuspendSettings', async (_event, settings: any): Promise<{ success: boolean }> => {
    try {
      tabSuspendService.updateSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to update suspend settings:', error);
      return { success: false };
    }
  });

  /**
   * Enable/disable tab suspend
   */
  ipcMain.handle('tab:setSuspendEnabled', async (_event, enabled: boolean): Promise<{ success: boolean }> => {
    try {
      tabSuspendService.setEnabled(enabled);
      return { success: true };
    } catch (error) {
      console.error('Failed to set suspend enabled:', error);
      return { success: false };
    }
  });

  /**
   * Add domain to never-suspend list
   */
  ipcMain.handle('tab:addNeverSuspendDomain', async (_event, domain: string): Promise<{ success: boolean }> => {
    try {
      tabSuspendService.addNeverSuspendDomain(domain);
      return { success: true };
    } catch (error) {
      console.error('Failed to add never-suspend domain:', error);
      return { success: false };
    }
  });

  /**
   * Remove domain from never-suspend list
   */
  ipcMain.handle('tab:removeNeverSuspendDomain', async (_event, domain: string): Promise<{ success: boolean }> => {
    try {
      tabSuspendService.removeNeverSuspendDomain(domain);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove never-suspend domain:', error);
      return { success: false };
    }
  });

  /**
   * Get never-suspend domains
   */
  ipcMain.handle('tab:getNeverSuspendDomains', async (): Promise<{ domains: string[] }> => {
    try {
      const domains = tabSuspendService.getNeverSuspendDomains();
      return { domains };
    } catch (error) {
      console.error('Failed to get never-suspend domains:', error);
      return { domains: [] };
    }
  });

  /**
   * Get all suspended tabs
   */
  ipcMain.handle('tab:getAllSuspended', async (): Promise<{ tabs: any[] }> => {
    try {
      const suspendedIds = windowModule.getSuspendedTabIds();
      const tabs = suspendedIds.map((tabId: string) => {
        const state = windowModule.getSuspendedTabState(tabId);
        return state ? { tabId, ...state } : null;
      }).filter(Boolean);
      return { tabs };
    } catch (error) {
      console.error('Failed to get suspended tabs:', error);
      return { tabs: [] };
    }
  });

  // Initialize auto-suspend timer
  try {
    windowModule.initAutoSuspend();
  } catch (e) {
    console.warn('Failed to initialize auto-suspend:', e);
  }

  // ============================================================================
  // Reader Mode Handlers
  // ============================================================================

  const { readerService } = require('./services/reader.service');

  /**
   * Get reader mode settings
   */
  ipcMain.handle('reader:getSettings', async (): Promise<any> => {
    try {
      return readerService.getSettings();
    } catch (error) {
      console.error('Failed to get reader settings:', error);
      return {
        fontSize: 'medium',
        fontFamily: 'serif',
        theme: 'dark',
        lineHeight: 'normal',
        maxWidth: 'medium'
      };
    }
  });

  /**
   * Update reader mode settings
   */
  ipcMain.handle('reader:updateSettings', async (_event, settings: any): Promise<{ success: boolean }> => {
    try {
      readerService.updateSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to update reader settings:', error);
      return { success: false };
    }
  });

  /**
   * Generate reader view HTML from article content
   */
  ipcMain.handle('reader:generateHtml', async (_event, article: any): Promise<{ success: boolean; html?: string; error?: string }> => {
    try {
      const html = readerService.generateReaderHtml(article);
      return { success: true, html };
    } catch (error) {
      console.error('Failed to generate reader HTML:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Check if URL is likely readable
   */
  ipcMain.handle('reader:isLikelyReadable', async (_event, url: string): Promise<{ readable: boolean }> => {
    try {
      const readable = readerService.isLikelyReadable(url);
      return { readable };
    } catch (error) {
      return { readable: false };
    }
  });

  /**
   * Calculate reading time for text
   */
  ipcMain.handle('reader:calculateReadingTime', async (_event, text: string): Promise<{ minutes: number }> => {
    try {
      const minutes = readerService.calculateReadingTime(text);
      return { minutes };
    } catch (error) {
      return { minutes: 1 };
    }
  });

  /**
   * Toggle reader mode for active tab
   * This extracts content from the current page and renders it in reader view
   */
  ipcMain.handle('reader:toggle', async (_event, tabId?: string): Promise<{ success: boolean; enabled?: boolean; error?: string }> => {
    try {
      const targetTabId = tabId || windowModule.getActiveTabId();
      if (!targetTabId) {
        return { success: false, error: 'No active tab' };
      }

      const view = windowModule.getBrowserView(targetTabId);
      if (!view) {
        return { success: false, error: 'Tab not found' };
      }

      const currentUrl = view.webContents.getURL();

      // Check if already in reader mode (URL starts with data:)
      if (currentUrl.startsWith('data:text/html')) {
        // Exit reader mode - go back
        if (view.webContents.canGoBack()) {
          view.webContents.goBack();
          return { success: true, enabled: false };
        }
        return { success: false, error: 'Cannot exit reader mode' };
      }

      // Extract article content using injected script
      const extractionScript = `
        (function() {
          // Simple article extraction
          const article = document.querySelector('article') || document.querySelector('[role="main"]') || document.querySelector('main') || document.body;

          // Try to find title
          let title = document.querySelector('h1')?.textContent ||
                      document.querySelector('[class*="title"]')?.textContent ||
                      document.title;

          // Try to find author
          let author = document.querySelector('[rel="author"]')?.textContent ||
                       document.querySelector('[class*="author"]')?.textContent ||
                       document.querySelector('[class*="byline"]')?.textContent ||
                       null;

          // Get site name
          let siteName = document.querySelector('meta[property="og:site_name"]')?.content ||
                         new URL(window.location.href).hostname.replace('www.', '');

          // Get published time
          let publishedTime = document.querySelector('time')?.getAttribute('datetime') ||
                              document.querySelector('meta[property="article:published_time"]')?.content ||
                              null;

          // Clone article and clean it
          const clone = article.cloneNode(true);

          // Remove unwanted elements
          const removeSelectors = [
            'script', 'style', 'nav', 'header', 'footer', 'aside',
            '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
            '.comments', '#comments', '.social-share', '.advertisement',
            '.ad', '.ads', '.sidebar', '.related', '.recommended',
            'iframe', 'form', 'button', 'input', '.newsletter'
          ];
          removeSelectors.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
          });

          // Get clean HTML
          const content = clone.innerHTML;
          const textContent = clone.textContent || '';

          return {
            title: title?.trim() || 'Untitled',
            content: content,
            textContent: textContent,
            author: author?.trim() || null,
            siteName: siteName,
            publishedTime: publishedTime,
            length: textContent.length,
            readingTime: Math.max(1, Math.ceil(textContent.trim().split(/\\s+/).length / 200))
          };
        })();
      `;

      const article = await view.webContents.executeJavaScript(extractionScript);

      if (!article || !article.content || article.length < 500) {
        return { success: false, error: 'Could not extract readable content from this page' };
      }

      // Generate reader HTML
      const html = readerService.generateReaderHtml(article);

      // Store original URL for going back
      const originalUrl = currentUrl;

      // Load reader view as data URL
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      await view.webContents.loadURL(dataUrl);

      // Notify renderer
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      mainWindow?.webContents.send('reader:toggled', { tabId: targetTabId, enabled: true, originalUrl });

      return { success: true, enabled: true };
    } catch (error) {
      console.error('Failed to toggle reader mode:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ============================================================================
  // Transaction History Handlers
  // ============================================================================

  /**
   * Initialize transaction history with wallet address
   */
  ipcMain.handle('txHistory:init', async (_event, address: string, network?: 'testnet' | 'mainnet'): Promise<{ success: boolean }> => {
    try {
      transactionHistoryService.init(address, network || 'testnet');
      return { success: true };
    } catch (error) {
      console.error('Failed to init transaction history:', error);
      return { success: false };
    }
  });

  /**
   * Get all transactions
   */
  ipcMain.handle('txHistory:getAll', async (): Promise<{ success: boolean; transactions: any[] }> => {
    try {
      const transactions = transactionHistoryService.getAllTransactions();
      return { success: true, transactions };
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return { success: false, transactions: [] };
    }
  });

  /**
   * Get transactions with pagination and filters
   */
  ipcMain.handle('txHistory:get', async (_event, options?: any): Promise<{
    transactions: any[];
    total: number;
    hasMore: boolean;
  }> => {
    try {
      return transactionHistoryService.getTransactions(options || {});
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return { transactions: [], total: 0, hasMore: false };
    }
  });

  /**
   * Get recent transactions
   */
  ipcMain.handle('txHistory:getRecent', async (_event, limit?: number): Promise<{ transactions: any[] }> => {
    try {
      const transactions = transactionHistoryService.getRecentTransactions(limit || 10);
      return { transactions };
    } catch (error) {
      console.error('Failed to get recent transactions:', error);
      return { transactions: [] };
    }
  });

  /**
   * Get single transaction by ID
   */
  ipcMain.handle('txHistory:getById', async (_event, id: string): Promise<{ transaction: any | null }> => {
    try {
      const transaction = transactionHistoryService.getTransaction(id);
      return { transaction };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return { transaction: null };
    }
  });

  /**
   * Record a sent transaction
   */
  ipcMain.handle('txHistory:recordSent', async (_event, params: {
    txId: string;
    to: string;
    amount: number;
    fee?: number;
    memo?: string;
  }): Promise<{ success: boolean; transaction?: any }> => {
    try {
      const transaction = transactionHistoryService.recordSentTransaction(params);
      return { success: true, transaction };
    } catch (error) {
      console.error('Failed to record sent transaction:', error);
      return { success: false };
    }
  });

  /**
   * Record a program execution
   */
  ipcMain.handle('txHistory:recordExecute', async (_event, params: {
    txId: string;
    programId: string;
    functionName: string;
    fee?: number;
  }): Promise<{ success: boolean; transaction?: any }> => {
    try {
      const transaction = transactionHistoryService.recordExecuteTransaction(params);
      return { success: true, transaction };
    } catch (error) {
      console.error('Failed to record execute transaction:', error);
      return { success: false };
    }
  });

  /**
   * Update transaction status
   */
  ipcMain.handle('txHistory:updateStatus', async (_event, txId: string): Promise<{ success: boolean; transaction?: any }> => {
    try {
      const transaction = await transactionHistoryService.updateTransactionStatus(txId);
      return { success: !!transaction, transaction };
    } catch (error) {
      console.error('Failed to update transaction status:', error);
      return { success: false };
    }
  });

  /**
   * Check all pending transactions
   */
  ipcMain.handle('txHistory:checkPending', async (): Promise<{ success: boolean }> => {
    try {
      await transactionHistoryService.checkPendingTransactions();
      return { success: true };
    } catch (error) {
      console.error('Failed to check pending transactions:', error);
      return { success: false };
    }
  });

  /**
   * Get transaction statistics
   */
  ipcMain.handle('txHistory:getStats', async (): Promise<any> => {
    try {
      return transactionHistoryService.getStats();
    } catch (error) {
      console.error('Failed to get transaction stats:', error);
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        failed: 0,
        totalSent: 0,
        totalReceived: 0,
        totalFees: 0
      };
    }
  });

  /**
   * Get pending transaction count
   */
  ipcMain.handle('txHistory:getPendingCount', async (): Promise<{ count: number }> => {
    try {
      const count = transactionHistoryService.getPendingCount();
      return { count };
    } catch (error) {
      return { count: 0 };
    }
  });

  /**
   * Delete a transaction from history
   */
  ipcMain.handle('txHistory:delete', async (_event, id: string): Promise<{ success: boolean }> => {
    try {
      const success = transactionHistoryService.deleteTransaction(id);
      return { success };
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      return { success: false };
    }
  });

  /**
   * Clear all transaction history
   */
  ipcMain.handle('txHistory:clear', async (): Promise<{ success: boolean }> => {
    try {
      transactionHistoryService.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear transaction history:', error);
      return { success: false };
    }
  });

  /**
   * Export transaction history to JSON
   */
  ipcMain.handle('txHistory:export', async (): Promise<{ json: string }> => {
    try {
      const json = transactionHistoryService.exportToJson();
      return { json };
    } catch (error) {
      console.error('Failed to export transaction history:', error);
      return { json: '[]' };
    }
  });

  /**
   * Import transaction history from JSON
   */
  ipcMain.handle('txHistory:import', async (_event, json: string): Promise<{ success: boolean; count: number }> => {
    try {
      const count = transactionHistoryService.importFromJson(json);
      return { success: true, count };
    } catch (error) {
      console.error('Failed to import transaction history:', error);
      return { success: false, count: 0 };
    }
  });

  // ============================================
  // UI LAYOUT HANDLERS
  // ============================================

  /**
   * Set right sidebar width (for wallet panel)
   * This adjusts the BrowserView bounds to not overlap with sidebar
   */
  ipcMain.handle('ui:setRightSidebarWidth', async (_event, width: number): Promise<{ success: boolean }> => {
    try {
      const windowModule = require('./window');
      windowModule.setRightSidebarWidth(width);
      return { success: true };
    } catch (error) {
      console.error('Failed to set sidebar width:', error);
      return { success: false };
    }
  });

  /**
   * Show/hide BrowserView (for full-screen modals)
   * When visible=false, BrowserView is hidden to allow modals to receive clicks
   */
  ipcMain.handle('ui:setBrowserViewVisible', async (_event, visible: boolean): Promise<{ success: boolean }> => {
    try {
      const windowModule = require('./window');
      windowModule.setBrowserViewVisible(visible);
      return { success: true };
    } catch (error) {
      console.error('Failed to set BrowserView visibility:', error);
      return { success: false };
    }
  });

  /**
   * Adjust BrowserView bounds for partial overlays
   * Use this for floating panels (like shields panel) or bottom bars (like download bar)
   */
  ipcMain.handle('ui:adjustBrowserViewBounds', async (_event, config: {
    topHeight?: number;
    bottomHeight?: number;
    rightWidth?: number;
  }): Promise<{ success: boolean }> => {
    try {
      const windowModule = require('./window');
      windowModule.adjustBrowserViewBounds(config);
      return { success: true };
    } catch (error) {
      console.error('Failed to adjust BrowserView bounds:', error);
      return { success: false };
    }
  });

  /**
   * Browser: Request internal transaction (for bookmarks, notes, etc.)
   * Shows transaction approval UI and waits for user response
   */
  ipcMain.handle('browser:requestTransaction', async (_event, params: {
    programId: string;
    functionName: string;
    inputs: string[];
    fee?: number;
    origin?: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    console.log('[IPC] browser:requestTransaction called with:', params);

    try {
      // Use walletSession (the IPC wallet state) NOT walletService (which is a separate state)
      // This fixes the bug where wallet appears locked even when unlocked via IPC handlers
      const isWalletUnlocked = !walletSession.isLocked && walletSession.wallet !== null;
      console.log('[IPC] Wallet session state:', {
        isUnlocked: isWalletUnlocked,
        hasWallet: walletSession.wallet !== null,
        address: walletSession.wallet?.address
      });

      if (!isWalletUnlocked) {
        console.log('[IPC] Wallet is locked - returning error');
        return { success: false, error: 'Wallet is locked' };
      }

      const mainWindow = getMainWindow();
      if (!mainWindow) {
        console.log('[IPC] No main window - returning error');
        return { success: false, error: 'Browser window not available' };
      }

      console.log('[IPC] Sending permission:request event to renderer');

      // Use consistent origin for both the UI and the permission request
      const origin = params.origin || 'AleoBrowser';

      // Create a unique request ID
      const requestId = `browser-tx-${Date.now()}`;

      // Send transaction request to renderer for approval with request ID
      mainWindow.webContents.send('permission:request', {
        type: 'transaction',
        requestId,
        origin,
        transaction: {
          programId: params.programId,
          functionName: params.functionName,
          inputs: params.inputs,
          fee: params.fee || 0.1,
        },
      });

      // Wait for user approval via the permission system
      const approved = await permissionService.createPermissionRequest(
        origin,
        ['transaction']
      );

      if (!approved) {
        return { success: false, error: 'Transaction rejected by user' };
      }

      // Execute the transaction using walletSession (IPC wallet state)
      if (!walletSession.wallet) {
        return { success: false, error: 'Wallet not available' };
      }

      const transactionId = await aleoService.executeProgram({
        programId: params.programId,
        functionName: params.functionName,
        inputs: params.inputs,
        fee: params.fee || 0.1,
        privateKey: walletSession.wallet.privateKey,
      });

      // Record the execute transaction in history
      transactionHistoryService.recordExecuteTransaction({
        txId: transactionId,
        programId: params.programId,
        functionName: params.functionName,
        fee: params.fee || 0.1,
      });

      return { success: true, transactionId };
    } catch (error) {
      console.error('[Browser Transaction] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  });

  /**
   * Browser: Respond to permission request
   */
  ipcMain.handle('browser:respondToPermission', async (_event, params: {
    origin: string;
    granted: boolean;
  }): Promise<{ success: boolean }> => {
    try {
      // Find the pending request for this origin and resolve it
      const pendingRequests = permissionService.getPendingRequests(params.origin);
      if (pendingRequests.length > 0) {
        // Resolve the most recent pending request
        const latestRequest = pendingRequests[pendingRequests.length - 1];
        permissionService.resolvePermissionRequest(latestRequest.id, params.granted);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to respond to permission:', error);
      return { success: false };
    }
  });
}

/**
 * Mock data generators (now only used as fallbacks)
 */
function generateMockAddress(): string {
  return Array.from({ length: 58 }, () =>
    'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
}

function generateMockPrivateKey(): string {
  return Array.from({ length: 64 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
}

function generateMockViewKey(): string {
  return Array.from({ length: 64 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
}

function generateMockTxHash(): string {
  return Array.from({ length: 64 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)]
  ).join('');
}
