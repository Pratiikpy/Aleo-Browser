/**
 * Type-safe IPC client for communicating with main process
 * Wraps window.electron with error handling and type safety
 */

export interface IPCResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface WalletCreateResponse {
  success: boolean;
  address?: string;
  error?: string;
}

export interface WalletBalanceResponse {
  success: boolean;
  balance?: number;
  public?: number;
  private?: number;
  error?: string;
}

export interface WalletSendResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface WalletLockStatusResponse {
  isLocked: boolean;
  hasWallet: boolean;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
  folder?: string;
  tags?: string[];
  aleoPinned?: boolean;
}

export interface BookmarkAddResponse {
  success: boolean;
  bookmark?: Bookmark;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
  favicon?: string;
}

export interface SyncToAleoResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * IPC Client class with error handling
 */
class IPCClient {
  private get api() {
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron;
  }

  // ============================================
  // WALLET METHODS
  // ============================================

  async createWallet(password: string): Promise<WalletCreateResponse> {
    try {
      return await this.api.wallet.create(password);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet'
      };
    }
  }

  async importWallet(privateKey: string, password: string): Promise<WalletCreateResponse> {
    try {
      return await this.api.wallet.import(privateKey, password);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import wallet'
      };
    }
  }

  async getWalletAddress(): Promise<{ success: boolean; address?: string; error?: string }> {
    try {
      return await this.api.wallet.getAddress();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get address'
      };
    }
  }

  async getWalletBalance(): Promise<WalletBalanceResponse> {
    try {
      return await this.api.wallet.getBalance();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get balance'
      };
    }
  }

  async sendTransaction(
    recipient: string,
    amount: number,
    fee?: number,
    memo?: string
  ): Promise<WalletSendResponse> {
    try {
      return await this.api.wallet.send(recipient, amount, fee, memo);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send transaction'
      };
    }
  }

  async lockWallet(): Promise<{ success: boolean }> {
    try {
      return await this.api.wallet.lock();
    } catch (error) {
      return { success: false };
    }
  }

  async unlockWallet(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.api.wallet.unlock(password);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock wallet'
      };
    }
  }

  async getWalletLockStatus(): Promise<WalletLockStatusResponse> {
    try {
      return await this.api.wallet.isLocked();
    } catch (error) {
      return { isLocked: true, hasWallet: false };
    }
  }

  // ============================================
  // BOOKMARKS METHODS
  // ============================================

  async getAllBookmarks(): Promise<Bookmark[]> {
    try {
      return await this.api.bookmarks.getAll();
    } catch (error) {
      console.error('Failed to get bookmarks:', error);
      return [];
    }
  }

  async addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<BookmarkAddResponse> {
    try {
      return await this.api.bookmarks.add(bookmark);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add bookmark'
      };
    }
  }

  async updateBookmark(
    id: string,
    updates: Partial<Bookmark>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.api.bookmarks.update(id, updates);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update bookmark'
      };
    }
  }

  async deleteBookmark(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.api.bookmarks.delete(id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete bookmark'
      };
    }
  }

  async syncBookmarksToAleo(): Promise<SyncToAleoResponse> {
    try {
      return await this.api.bookmarks.syncToAleo();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync bookmarks'
      };
    }
  }

  // ============================================
  // HISTORY METHODS
  // ============================================

  async getAllHistory(limit?: number): Promise<HistoryEntry[]> {
    try {
      return await this.api.history.getAll(limit);
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  async addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'visitedAt'>): Promise<{ success: boolean }> {
    try {
      return await this.api.history.add(entry);
    } catch (error) {
      console.error('Failed to add history entry:', error);
      return { success: false };
    }
  }

  async deleteHistoryEntry(id: string): Promise<{ success: boolean }> {
    try {
      return await this.api.history.delete(id);
    } catch (error) {
      console.error('Failed to delete history entry:', error);
      return { success: false };
    }
  }

  async clearHistory(): Promise<{ success: boolean }> {
    try {
      return await this.api.history.clear();
    } catch (error) {
      console.error('Failed to clear history:', error);
      return { success: false };
    }
  }

  // ============================================
  // BROWSER METHODS
  // ============================================

  async navigate(url: string): Promise<{ success: boolean }> {
    try {
      return await this.api.browser.navigate(url);
    } catch (error) {
      console.error('Failed to navigate:', error);
      return { success: false };
    }
  }

  async goBack(): Promise<{ success: boolean }> {
    try {
      return await this.api.browser.goBack();
    } catch (error) {
      console.error('Failed to go back:', error);
      return { success: false };
    }
  }

  async goForward(): Promise<{ success: boolean }> {
    try {
      return await this.api.browser.goForward();
    } catch (error) {
      console.error('Failed to go forward:', error);
      return { success: false };
    }
  }

  async reload(): Promise<{ success: boolean }> {
    try {
      return await this.api.browser.reload();
    } catch (error) {
      console.error('Failed to reload:', error);
      return { success: false };
    }
  }

  async stop(): Promise<{ success: boolean }> {
    try {
      return await this.api.browser.stop();
    } catch (error) {
      console.error('Failed to stop:', error);
      return { success: false };
    }
  }

  async getUrl(): Promise<string> {
    try {
      const result = await this.api.browser.getUrl();
      return result.url || '';
    } catch (error) {
      console.error('Failed to get URL:', error);
      return '';
    }
  }

  async getTitle(): Promise<string> {
    try {
      const result = await this.api.browser.getTitle();
      return result.title || '';
    } catch (error) {
      console.error('Failed to get title:', error);
      return '';
    }
  }

  async newTab(url?: string): Promise<{ success: boolean }> {
    try {
      return await this.api.browser.newTab(url);
    } catch (error) {
      console.error('Failed to create new tab:', error);
      return { success: false };
    }
  }

  async closeTab(): Promise<{ success: boolean }> {
    try {
      return await this.api.browser.closeTab();
    } catch (error) {
      console.error('Failed to close tab:', error);
      return { success: false };
    }
  }

  // ============================================
  // WINDOW METHODS
  // ============================================

  async minimizeWindow(): Promise<{ success: boolean }> {
    try {
      await this.api.window.minimize();
      return { success: true };
    } catch (error) {
      console.error('Failed to minimize window:', error);
      return { success: false };
    }
  }

  async maximizeWindow(): Promise<{ success: boolean }> {
    try {
      await this.api.window.maximize();
      return { success: true };
    } catch (error) {
      console.error('Failed to maximize window:', error);
      return { success: false };
    }
  }

  async closeWindow(): Promise<{ success: boolean }> {
    try {
      await this.api.window.close();
      return { success: true };
    } catch (error) {
      console.error('Failed to close window:', error);
      return { success: false };
    }
  }

  async isWindowMaximized(): Promise<boolean> {
    try {
      const result = await this.api.window.isMaximized();
      return result.isMaximized || false;
    } catch (error) {
      console.error('Failed to check window state:', error);
      return false;
    }
  }

  // ============================================
  // EVENTS
  // ============================================

  get events() {
    return this.api.events;
  }

  get platform() {
    return this.api.platform;
  }

  get versions() {
    return this.api.versions;
  }
}

// Export singleton instance
export const ipc = new IPCClient();
