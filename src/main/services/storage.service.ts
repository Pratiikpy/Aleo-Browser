/**
 * Encrypted Storage Service
 * Handles encrypted storage of bookmarks and history
 */

import { v4 as uuidv4 } from 'uuid';
import { Bookmark, HistoryEntry } from '@shared/types';
import { encrypt, decrypt, EncryptedData, generateRandomString } from '../utils/crypto';

// Lazy import to avoid circular dependency
function getWalletServiceInstance() {
  const { WalletService } = require('./wallet.service');
  return WalletService.getInstance();
}

// Lazy import for AleoService
function getAleoServiceInstance() {
  const { AleoService } = require('./aleo.service');
  return AleoService.getInstance();
}

// Lazy load electron-store to avoid initialization issues
function createStore(options?: { name?: string; encryptionKey?: string }): any {
  const Store = require('electron-store');
  return new Store(options);
}

interface StorageData {
  encryptedBookmarks?: EncryptedData;
  encryptedHistory?: EncryptedData;
  settings?: Record<string, any>;
}

export class StorageService {
  private static instance: StorageService;
  private store: any = null;
  private bookmarksCache: Bookmark[] | null = null;
  private historyCache: HistoryEntry[] | null = null;
  private localEncryptionKey: string | null = null;

  private constructor() {
    // Store is initialized lazily on first use
  }

  /**
   * Get the store instance, lazily initialized
   */
  private getStore(): any {
    if (!this.store) {
      this.store = createStore({
        name: 'storage',
        // Generate a random encryption key per store (stored in electron-store itself)
        encryptionKey: this.getLocalEncryptionKey(),
      });
    }
    return this.store;
  }

  /**
   * Get or generate a local encryption key unique to this installation
   * This provides encryption even without a wallet, but wallet-based encryption is stronger
   */
  private getLocalEncryptionKey(): string {
    if (this.localEncryptionKey) {
      return this.localEncryptionKey;
    }

    // Use a separate unencrypted store to hold the encryption key
    const keyStore = createStore({ name: 'aleo-browser-key' });
    let key = keyStore.get('localEncryptionKey') as string | undefined;

    if (!key) {
      // Generate a random 256-bit key for this installation
      key = generateRandomString(32);
      keyStore.set('localEncryptionKey', key);
      console.log('[Storage] Generated new local encryption key for this installation');
    }

    this.localEncryptionKey = key;
    return key;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Get encryption password from wallet or local key
   * Wallet key provides stronger privacy as it's derived from user password
   */
  private getEncryptionPassword(): string {
    try {
      const encryptionKey = getWalletServiceInstance().getEncryptionKey();
      if (encryptionKey) {
        return encryptionKey.toString('hex');
      }
    } catch (err) {
      // Wallet service may not be available
      console.warn('[Storage] Wallet encryption key not available, using local key');
    }
    // Fall back to installation-specific local key
    return this.getLocalEncryptionKey();
  }

  /**
   * Get all bookmarks (decrypted)
   */
  async getAllBookmarks(): Promise<Bookmark[]> {
    try {
      // Return cached bookmarks if available
      if (this.bookmarksCache) {
        return this.bookmarksCache;
      }

      const encryptedBookmarks = this.getStore().get('encryptedBookmarks');

      if (!encryptedBookmarks) {
        this.bookmarksCache = [];
        return [];
      }

      // Decrypt bookmarks
      const password = this.getEncryptionPassword();
      const decryptedData = decrypt(encryptedBookmarks, password);
      this.bookmarksCache = JSON.parse(decryptedData) as Bookmark[];

      return this.bookmarksCache;
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      this.bookmarksCache = [];
      return [];
    }
  }

  /**
   * Add a new bookmark
   */
  async addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark> {
    try {
      const bookmarks = await this.getAllBookmarks();

      // Check for duplicates
      const existingBookmark = bookmarks.find(b => b.url === bookmark.url);
      if (existingBookmark) {
        throw new Error('Bookmark already exists');
      }

      const newBookmark: Bookmark = {
        ...bookmark,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      bookmarks.push(newBookmark);
      await this.saveBookmarks(bookmarks);

      console.log('Bookmark added:', newBookmark.title);
      return newBookmark;
    } catch (error) {
      throw new Error(`Failed to add bookmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a bookmark
   */
  async updateBookmark(id: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>): Promise<Bookmark> {
    try {
      const bookmarks = await this.getAllBookmarks();
      const index = bookmarks.findIndex(b => b.id === id);

      if (index === -1) {
        throw new Error('Bookmark not found');
      }

      const updatedBookmark: Bookmark = {
        ...bookmarks[index],
        ...updates,
        updatedAt: Date.now(),
      };

      bookmarks[index] = updatedBookmark;
      await this.saveBookmarks(bookmarks);

      console.log('Bookmark updated:', id);
      return updatedBookmark;
    } catch (error) {
      throw new Error(`Failed to update bookmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a bookmark
   */
  async deleteBookmark(id: string): Promise<void> {
    try {
      const bookmarks = await this.getAllBookmarks();
      const filteredBookmarks = bookmarks.filter(b => b.id !== id);

      if (filteredBookmarks.length === bookmarks.length) {
        throw new Error('Bookmark not found');
      }

      await this.saveBookmarks(filteredBookmarks);
      console.log('Bookmark deleted:', id);
    } catch (error) {
      throw new Error(`Failed to delete bookmark: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save bookmarks (encrypted)
   */
  private async saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
    try {
      const password = this.getEncryptionPassword();
      const data = JSON.stringify(bookmarks);
      const encrypted = encrypt(data, password);

      this.getStore().set('encryptedBookmarks', encrypted);
      this.bookmarksCache = bookmarks;
    } catch (error) {
      throw new Error(`Failed to save bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync bookmarks to Aleo blockchain
   * Calls bookmark_v1.aleo program to store bookmark hash on-chain
   */
  async syncBookmarksToAleo(): Promise<string | null> {
    try {
      // Check if wallet is unlocked
      const walletService = getWalletServiceInstance();
      const walletState = walletService.getState();
      if (!walletState.isUnlocked) {
        throw new Error('Wallet must be unlocked to sync');
      }

      const bookmarks = await this.getAllBookmarks();

      if (bookmarks.length === 0) {
        console.log('No bookmarks to sync');
        return null;
      }

      // Get private key for signing
      const privateKey = walletService.getPrivateKey();
      if (!privateKey) {
        throw new Error('Private key not available');
      }

      // Create a hash of bookmarks data for on-chain storage
      const bookmarkData = JSON.stringify(bookmarks.map(b => ({
        url: b.url,
        title: b.title,
        timestamp: b.createdAt
      })));

      // Simple hash function to create a field-compatible value
      let hash = 0;
      for (let i = 0; i < bookmarkData.length; i++) {
        const char = bookmarkData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      // Make sure it's positive and within field bounds
      const bookmarkHash = Math.abs(hash) % 1000000000;

      console.log(`[Bookmark Sync] Syncing ${bookmarks.length} bookmarks to Aleo blockchain`);
      console.log(`[Bookmark Sync] Bookmark hash: ${bookmarkHash}`);

      // Call the bookmark_v1.aleo program
      const aleoService = getAleoServiceInstance();

      // Generate proper inputs for add_bookmark function:
      // add_bookmark takes: bookmark_id, encrypted_url, encrypted_title, created_at
      const timestamp = Math.floor(Date.now() / 1000);

      const txId = await aleoService.executeProgram({
        programId: 'bookmark_v1.aleo',
        functionName: 'add_bookmark',
        inputs: [
          `${bookmarkHash}field`,           // bookmark_id
          `${bookmarkHash % 100000000}field`, // encrypted_url (hash)
          `${(bookmarkHash >> 8) % 100000000}field`, // encrypted_title (hash)
          `${timestamp}u32`                 // created_at
        ],
        fee: 0.1,
        privateKey: privateKey
      });

      console.log(`[Bookmark Sync] Transaction submitted: ${txId}`);
      return txId;
    } catch (error) {
      console.error('[Bookmark Sync] Error:', error);
      throw new Error(`Failed to sync bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get history entries with optional limit
   */
  async getHistory(limit?: number): Promise<HistoryEntry[]> {
    try {
      // Return cached history if available
      if (this.historyCache) {
        return limit ? this.historyCache.slice(0, limit) : this.historyCache;
      }

      const encryptedHistory = this.getStore().get('encryptedHistory');

      if (!encryptedHistory) {
        this.historyCache = [];
        return [];
      }

      // Decrypt history
      const password = this.getEncryptionPassword();
      const decryptedData = decrypt(encryptedHistory, password);
      this.historyCache = JSON.parse(decryptedData) as HistoryEntry[];

      // Sort by visited time (most recent first)
      if (this.historyCache) {
        this.historyCache.sort((a, b) => b.visitedAt - a.visitedAt);
      }

      return limit && this.historyCache ? this.historyCache.slice(0, limit) : (this.historyCache || []);
    } catch (error) {
      console.error('Error loading history:', error);
      this.historyCache = [];
      return [];
    }
  }

  /**
   * Add history entry
   */
  async addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'visitedAt'>): Promise<HistoryEntry> {
    try {
      const history = await this.getHistory();

      // Check if URL was recently visited (within last 5 minutes)
      const recentEntry = history.find(
        h => h.url === entry.url && Date.now() - h.visitedAt < 5 * 60 * 1000
      );

      if (recentEntry) {
        // Update existing entry timestamp
        return await this.updateHistoryEntry(recentEntry.id, { visitedAt: Date.now() });
      }

      const newEntry: HistoryEntry = {
        ...entry,
        id: uuidv4(),
        visitedAt: Date.now(),
      };

      history.unshift(newEntry);

      // Keep only last 10,000 entries
      const trimmedHistory = history.slice(0, 10000);
      await this.saveHistory(trimmedHistory);

      return newEntry;
    } catch (error) {
      throw new Error(`Failed to add history entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update history entry
   */
  private async updateHistoryEntry(id: string, updates: Partial<HistoryEntry>): Promise<HistoryEntry> {
    const history = await this.getHistory();
    const index = history.findIndex(h => h.id === id);

    if (index === -1) {
      throw new Error('History entry not found');
    }

    const updatedEntry: HistoryEntry = {
      ...history[index],
      ...updates,
    };

    history[index] = updatedEntry;
    await this.saveHistory(history);

    return updatedEntry;
  }

  /**
   * Delete single history entry
   */
  async deleteHistoryEntry(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(h => h.id !== id);

      if (filteredHistory.length === history.length) {
        throw new Error('History entry not found');
      }

      await this.saveHistory(filteredHistory);
      console.log('History entry deleted:', id);
    } catch (error) {
      throw new Error(`Failed to delete history entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    try {
      await this.saveHistory([]);
      console.log('History cleared');
    } catch (error) {
      throw new Error(`Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save history (encrypted)
   */
  private async saveHistory(history: HistoryEntry[]): Promise<void> {
    try {
      const password = this.getEncryptionPassword();
      const data = JSON.stringify(history);
      const encrypted = encrypt(data, password);

      this.getStore().set('encryptedHistory', encrypted);
      this.historyCache = history;
    } catch (error) {
      throw new Error(`Failed to save history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search history by query
   */
  async searchHistory(query: string, limit: number = 50): Promise<HistoryEntry[]> {
    const history = await this.getHistory();
    const lowerQuery = query.toLowerCase();

    return history
      .filter(entry =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.url.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  /**
   * Search bookmarks by query
   */
  async searchBookmarks(query: string): Promise<Bookmark[]> {
    const bookmarks = await this.getAllBookmarks();
    const lowerQuery = query.toLowerCase();

    return bookmarks.filter(bookmark =>
      bookmark.title.toLowerCase().includes(lowerQuery) ||
      bookmark.url.toLowerCase().includes(lowerQuery) ||
      bookmark.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get bookmarks by folder
   */
  async getBookmarksByFolder(folderId: string): Promise<Bookmark[]> {
    const bookmarks = await this.getAllBookmarks();
    return bookmarks.filter(b => b.folderId === folderId);
  }

  /**
   * Get all folders
   */
  async getFolders(): Promise<string[]> {
    const bookmarks = await this.getAllBookmarks();
    const folders = new Set<string>();

    bookmarks.forEach(bookmark => {
      if (bookmark.folderId) {
        folders.add(bookmark.folderId);
      }
    });

    return Array.from(folders).sort();
  }

  /**
   * Clear cache (call when wallet is locked)
   */
  clearCache(): void {
    this.bookmarksCache = null;
    this.historyCache = null;
    console.log('Storage cache cleared');
  }

  /**
   * Export data (for backup)
   */
  async exportData(): Promise<{ bookmarks: Bookmark[]; history: HistoryEntry[] }> {
    const [bookmarks, history] = await Promise.all([
      this.getAllBookmarks(),
      this.getHistory(),
    ]);

    return { bookmarks, history };
  }

  /**
   * Import data (from backup)
   */
  async importData(data: { bookmarks?: Bookmark[]; history?: HistoryEntry[] }): Promise<void> {
    try {
      if (data.bookmarks) {
        await this.saveBookmarks(data.bookmarks);
        console.log(`Imported ${data.bookmarks.length} bookmarks`);
      }

      if (data.history) {
        await this.saveHistory(data.history);
        console.log(`Imported ${data.history.length} history entries`);
      }
    } catch (error) {
      throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance - safe now because Store is lazily initialized in getStore()
export const storageService = StorageService.getInstance();

// Export lazy getter for flexibility
export function getStorageService(): StorageService {
  return StorageService.getInstance();
}
