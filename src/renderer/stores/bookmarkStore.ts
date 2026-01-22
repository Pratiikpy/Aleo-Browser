import { create } from 'zustand';
import { ipc, type Bookmark as IPCBookmark } from '../lib/ipc';

/**
 * Bookmark Interface (extends IPC Bookmark)
 */
export interface Bookmark extends IPCBookmark {
  folder: string;
}

/**
 * Bookmark Store Interface
 */
export interface BookmarkStore {
  // State
  bookmarks: Bookmark[];
  folders: string[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
  isSyncing: boolean;

  // Actions
  loadBookmarks: () => Promise<void>;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => Promise<void>;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  syncToAleo: () => Promise<void>;

  // Folder management
  addFolder: (name: string) => void;
  deleteFolder: (name: string) => Promise<void>;
  renameFolder: (oldName: string, newName: string) => Promise<void>;

  // Utility
  getBookmarksByFolder: (folder: string) => Bookmark[];
  searchBookmarks: (query: string) => Bookmark[];
  clearError: () => void;
}

/**
 * Default folder names
 */
const DEFAULT_FOLDERS = ['Bookmarks Bar', 'Other Bookmarks', 'Aleo Apps'];

/**
 * Bookmark Store
 * Manages browser bookmarks with Aleo blockchain sync
 */
export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  // Initial state
  bookmarks: [],
  folders: DEFAULT_FOLDERS,
  isLoading: false,
  error: null,
  lastSyncTime: null,
  isSyncing: false,

  /**
   * Load bookmarks from storage
   */
  loadBookmarks: async () => {
    set({ isLoading: true, error: null });

    try {
      const bookmarks = await ipc.getAllBookmarks();

      // Ensure all bookmarks have a folder
      const normalizedBookmarks: Bookmark[] = bookmarks.map(b => ({
        ...b,
        folder: b.folder || 'Other Bookmarks'
      }));

      // Extract unique folders
      const folders = new Set(DEFAULT_FOLDERS);
      normalizedBookmarks.forEach(b => {
        if (b.folder) folders.add(b.folder);
      });

      set({
        bookmarks: normalizedBookmarks,
        folders: Array.from(folders),
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load bookmarks',
        isLoading: false
      });
    }
  },

  /**
   * Add a new bookmark
   * @param bookmark - Bookmark data (without id and createdAt)
   */
  addBookmark: async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    set({ error: null });

    try {
      // Mark bookmark for Aleo sync
      const bookmarkWithPin = {
        ...bookmark,
        aleoPinned: true  // Auto-pin for Aleo sync
      };

      const result = await ipc.addBookmark(bookmarkWithPin);

      if (!result.success) {
        set({ error: result.error || 'Failed to add bookmark' });
        return;
      }

      if (result.bookmark) {
        const newBookmark: Bookmark = {
          ...result.bookmark,
          folder: result.bookmark.folder || 'Other Bookmarks'
        };

        set((state) => ({
          bookmarks: [...state.bookmarks, newBookmark],
          error: null
        }));

        // Add folder if it doesn't exist
        if (newBookmark.folder && !get().folders.includes(newBookmark.folder)) {
          get().addFolder(newBookmark.folder);
        }

        // Auto-sync to Aleo blockchain - triggers transaction approval UI
        console.log('[Bookmark] Bookmark added. Syncing to Aleo blockchain...');
        // Don't await - let user see the transaction approval while bookmark is saved locally
        get().syncToAleo().catch(err => {
          console.error('[Bookmark] Auto-sync failed:', err);
          // Bookmark is still saved locally, just not on-chain
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add bookmark'
      });
    }
  },

  /**
   * Update a bookmark
   * @param id - Bookmark ID
   * @param updates - Partial bookmark object with updates
   */
  updateBookmark: async (id: string, updates: Partial<Bookmark>) => {
    set({ error: null });

    try {
      const result = await ipc.updateBookmark(id, updates);

      if (!result.success) {
        set({ error: result.error || 'Failed to update bookmark' });
        return;
      }

      set((state) => ({
        bookmarks: state.bookmarks.map(b =>
          b.id === id ? { ...b, ...updates } : b
        ),
        error: null
      }));

      // Add folder if it doesn't exist
      if (updates.folder && !get().folders.includes(updates.folder)) {
        get().addFolder(updates.folder);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update bookmark'
      });
    }
  },

  /**
   * Delete a bookmark
   * @param id - Bookmark ID
   */
  deleteBookmark: async (id: string) => {
    set({ error: null });

    try {
      const result = await ipc.deleteBookmark(id);

      if (!result.success) {
        set({ error: result.error || 'Failed to delete bookmark' });
        return;
      }

      set((state) => ({
        bookmarks: state.bookmarks.filter(b => b.id !== id),
        error: null
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete bookmark'
      });
    }
  },

  /**
   * Sync bookmarks to Aleo blockchain
   * Shows transaction approval UI for user to sign
   */
  syncToAleo: async () => {
    set({ isSyncing: true, error: null });

    try {
      const bookmarks = get().bookmarks;

      if (bookmarks.length === 0) {
        console.log('[Bookmark Sync] No bookmarks to sync');
        set({ isSyncing: false });
        return;
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
        hash = hash & hash;
      }
      const bookmarkHash = Math.abs(hash) % 1000000000;

      console.log(`[Bookmark Sync] Syncing ${bookmarks.length} bookmarks to Aleo blockchain`);
      console.log(`[Bookmark Sync] Bookmark hash: ${bookmarkHash}`);

      // Generate proper inputs for add_bookmark function:
      // add_bookmark takes: bookmark_id, encrypted_url, encrypted_title, created_at
      const timestamp = Math.floor(Date.now() / 1000);

      // Check if dapp API is available
      console.log('[Bookmark Sync] Checking dapp API:', !!window.electron?.dapp?.requestTransaction);

      if (!window.electron?.dapp?.requestTransaction) {
        console.error('[Bookmark Sync] dapp.requestTransaction not available!');
        set({ error: 'Transaction API not available', isSyncing: false });
        return;
      }

      console.log('[Bookmark Sync] Calling requestTransaction...');

      // Request transaction with approval UI
      const result = await window.electron.dapp.requestTransaction({
        programId: 'bookmark_v1.aleo',
        functionName: 'add_bookmark',
        inputs: [
          `${bookmarkHash}field`,           // bookmark_id
          `${bookmarkHash % 100000000}field`, // encrypted_url (hash)
          `${(bookmarkHash >> 8) % 100000000}field`, // encrypted_title (hash)
          `${timestamp}u32`                 // created_at
        ],
        fee: 0.1,
        origin: 'AleoBrowser Bookmarks'
      });

      console.log('[Bookmark Sync] requestTransaction result:', result);

      if (!result.success) {
        console.error('[Bookmark Sync] Transaction failed:', result.error);
        set({
          error: result.error || 'Failed to sync bookmarks',
          isSyncing: false
        });
        return;
      }

      set({
        lastSyncTime: Date.now(),
        isSyncing: false,
        error: null
      });

      console.log('[Bookmark Sync] Transaction submitted:', result.transactionId);
    } catch (error) {
      console.error('[Bookmark Sync] Error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to sync bookmarks',
        isSyncing: false
      });
    }
  },

  /**
   * Add a new folder
   * @param name - Folder name
   */
  addFolder: (name: string) => {
    set((state) => {
      if (state.folders.includes(name)) {
        return state;
      }

      return {
        folders: [...state.folders, name]
      };
    });
  },

  /**
   * Delete a folder (moves bookmarks to "Other Bookmarks")
   * @param name - Folder name
   */
  deleteFolder: async (name: string) => {
    // Don't delete default folders
    if (DEFAULT_FOLDERS.includes(name)) {
      set({ error: 'Cannot delete default folders' });
      return;
    }

    // Move all bookmarks in this folder to "Other Bookmarks"
    const state = get();
    const bookmarksInFolder = state.bookmarks.filter(b => b.folder === name);

    for (const bookmark of bookmarksInFolder) {
      await get().updateBookmark(bookmark.id, { folder: 'Other Bookmarks' });
    }

    set((state) => ({
      folders: state.folders.filter(f => f !== name),
      error: null
    }));
  },

  /**
   * Rename a folder
   * @param oldName - Current folder name
   * @param newName - New folder name
   */
  renameFolder: async (oldName: string, newName: string) => {
    // Don't rename default folders
    if (DEFAULT_FOLDERS.includes(oldName)) {
      set({ error: 'Cannot rename default folders' });
      return;
    }

    if (get().folders.includes(newName)) {
      set({ error: 'Folder already exists' });
      return;
    }

    // Update all bookmarks in this folder
    const state = get();
    const bookmarksInFolder = state.bookmarks.filter(b => b.folder === oldName);

    for (const bookmark of bookmarksInFolder) {
      await get().updateBookmark(bookmark.id, { folder: newName });
    }

    set((state) => ({
      folders: state.folders.map(f => f === oldName ? newName : f),
      error: null
    }));
  },

  /**
   * Get bookmarks by folder
   * @param folder - Folder name
   */
  getBookmarksByFolder: (folder: string) => {
    return get().bookmarks.filter(b => b.folder === folder);
  },

  /**
   * Search bookmarks
   * @param query - Search query
   */
  searchBookmarks: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return get().bookmarks.filter(
      b =>
        b.title.toLowerCase().includes(lowerQuery) ||
        b.url.toLowerCase().includes(lowerQuery) ||
        b.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  }
}));

/**
 * Hook: Check if URL is bookmarked
 * Usage: const isBookmarked = useIsBookmarked(url);
 */
export function useIsBookmarked(url: string): boolean {
  return useBookmarkStore((state) =>
    state.bookmarks.some(b => b.url === url)
  );
}

/**
 * Hook: Get bookmark by URL
 * Usage: const bookmark = useBookmarkByUrl(url);
 */
export function useBookmarkByUrl(url: string): Bookmark | undefined {
  return useBookmarkStore((state) =>
    state.bookmarks.find(b => b.url === url)
  );
}

/**
 * Hook: Get bookmarks count by folder
 * Usage: const count = useBookmarkCountByFolder('Bookmarks Bar');
 */
export function useBookmarkCountByFolder(folder: string): number {
  return useBookmarkStore((state) =>
    state.bookmarks.filter(b => b.folder === folder).length
  );
}

/**
 * Initialize bookmark store
 * Call this once on app startup
 */
export function initBookmarkStore() {
  useBookmarkStore.getState().loadBookmarks();
}

/**
 * Setup bookmark event listeners
 * Listen for bookmark shortcuts
 */
export function setupBookmarkEventListeners() {
  ipc.events.onShortcutBookmark(() => {
    // This should be handled by the UI component
    // Just emit a custom event for the UI to listen to
    window.dispatchEvent(new CustomEvent('toggle-bookmark'));
  });
}
