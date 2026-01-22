import { create } from 'zustand';
import { ipc, type HistoryEntry as IPCHistoryEntry } from '../lib/ipc';

/**
 * History Entry Interface (extends IPC HistoryEntry)
 */
export interface HistoryEntry extends IPCHistoryEntry {
  visitCount: number;
  lastVisited: number; // Same as visitedAt, but renamed for clarity
}

/**
 * History Store Interface
 */
export interface HistoryStore {
  // State
  history: HistoryEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadHistory: (limit?: number) => Promise<void>;
  addEntry: (url: string, title: string, favicon?: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;

  // Utility
  searchHistory: (query: string) => HistoryEntry[];
  getMostVisited: (limit?: number) => HistoryEntry[];
  getRecentHistory: (limit?: number) => HistoryEntry[];
  getHistoryByDate: (date: Date) => HistoryEntry[];
  clearError: () => void;
}

/**
 * Convert IPC HistoryEntry to app HistoryEntry
 */
function toHistoryEntry(entry: IPCHistoryEntry): HistoryEntry {
  return {
    ...entry,
    visitCount: 1, // Will be updated when we track visit counts
    lastVisited: entry.visitedAt
  };
}

/**
 * History Store
 * Manages browser history
 */
export const useHistoryStore = create<HistoryStore>((set, get) => ({
  // Initial state
  history: [],
  isLoading: false,
  error: null,

  /**
   * Load history from storage
   * @param limit - Optional limit on number of entries to load
   */
  loadHistory: async (limit?: number) => {
    set({ isLoading: true, error: null });

    try {
      const entries = await ipc.getAllHistory(limit);

      // Convert to app HistoryEntry format and merge duplicates
      const historyMap = new Map<string, HistoryEntry>();

      entries.forEach(entry => {
        const existing = historyMap.get(entry.url);

        if (existing) {
          // Increment visit count and update last visited
          existing.visitCount++;
          if (entry.visitedAt > existing.lastVisited) {
            existing.lastVisited = entry.visitedAt;
            existing.title = entry.title; // Use most recent title
            existing.favicon = entry.favicon; // Use most recent favicon
          }
        } else {
          historyMap.set(entry.url, toHistoryEntry(entry));
        }
      });

      const history = Array.from(historyMap.values())
        .sort((a, b) => b.lastVisited - a.lastVisited);

      set({
        history,
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load history',
        isLoading: false
      });
    }
  },

  /**
   * Add a history entry
   * @param url - Page URL
   * @param title - Page title
   * @param favicon - Optional favicon URL
   */
  addEntry: async (url: string, title: string, favicon?: string) => {
    try {
      // Skip certain URLs
      if (
        url.startsWith('about:') ||
        url.startsWith('chrome:') ||
        url.startsWith('devtools:') ||
        url.startsWith('file:')
      ) {
        return;
      }

      await ipc.addHistoryEntry({ url, title, favicon });

      // Update local state
      set((state) => {
        const existing = state.history.find(h => h.url === url);

        if (existing) {
          // Update existing entry
          return {
            history: state.history.map(h =>
              h.url === url
                ? {
                    ...h,
                    title,
                    favicon: favicon || h.favicon,
                    visitCount: h.visitCount + 1,
                    lastVisited: Date.now()
                  }
                : h
            ).sort((a, b) => b.lastVisited - a.lastVisited),
            error: null
          };
        } else {
          // Add new entry
          const newEntry: HistoryEntry = {
            id: `temp-${Date.now()}`, // Temporary ID until reload
            url,
            title,
            favicon,
            visitedAt: Date.now(),
            visitCount: 1,
            lastVisited: Date.now()
          };

          return {
            history: [newEntry, ...state.history],
            error: null
          };
        }
      });
    } catch (error) {
      console.error('Failed to add history entry:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add history entry'
      });
    }
  },

  /**
   * Delete a specific history entry
   * @param id - Entry ID
   */
  deleteEntry: async (id: string) => {
    set({ error: null });

    try {
      const result = await ipc.deleteHistoryEntry(id);

      if (!result.success) {
        set({ error: 'Failed to delete history entry' });
        return;
      }

      set((state) => ({
        history: state.history.filter(h => h.id !== id),
        error: null
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete history entry'
      });
    }
  },

  /**
   * Clear all history
   */
  clearHistory: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await ipc.clearHistory();

      if (!result.success) {
        set({
          error: 'Failed to clear history',
          isLoading: false
        });
        return;
      }

      set({
        history: [],
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear history',
        isLoading: false
      });
    }
  },

  /**
   * Search history
   * @param query - Search query
   */
  searchHistory: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return get().history.filter(
      h =>
        h.title.toLowerCase().includes(lowerQuery) ||
        h.url.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Get most visited sites
   * @param limit - Number of results (default 10)
   */
  getMostVisited: (limit: number = 10) => {
    return [...get().history]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit);
  },

  /**
   * Get recent history
   * @param limit - Number of results (default 20)
   */
  getRecentHistory: (limit: number = 20) => {
    return get().history.slice(0, limit);
  },

  /**
   * Get history entries for a specific date
   * @param date - Date to filter by
   */
  getHistoryByDate: (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return get().history.filter(
      h =>
        h.lastVisited >= startOfDay.getTime() &&
        h.lastVisited <= endOfDay.getTime()
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
 * Hook: Get history for today
 * Usage: const todayHistory = useTodayHistory();
 */
export function useTodayHistory(): HistoryEntry[] {
  return useHistoryStore((state) => state.getHistoryByDate(new Date()));
}

/**
 * Hook: Get most visited sites
 * Usage: const topSites = useTopSites(5);
 */
export function useTopSites(limit: number = 10): HistoryEntry[] {
  return useHistoryStore((state) => state.getMostVisited(limit));
}

/**
 * Hook: Search history
 * Usage: const results = useHistorySearch(query);
 */
export function useHistorySearch(query: string): HistoryEntry[] {
  return useHistoryStore((state) =>
    query ? state.searchHistory(query) : state.getRecentHistory()
  );
}

/**
 * Hook: Get history stats
 * Usage: const stats = useHistoryStats();
 */
export function useHistoryStats() {
  return useHistoryStore((state) => {
    const totalSites = state.history.length;
    const totalVisits = state.history.reduce((sum, h) => sum + h.visitCount, 0);
    const todayCount = state.getHistoryByDate(new Date()).length;

    return {
      totalSites,
      totalVisits,
      todayCount
    };
  });
}

/**
 * Initialize history store
 * Call this once on app startup
 */
export function initHistoryStore() {
  useHistoryStore.getState().loadHistory(1000); // Load last 1000 entries
}

/**
 * Setup history event listeners
 */
export function setupHistoryEventListeners() {
  // Track pending navigation to match with title updates
  let pendingUrl: string | null = null;
  let pendingFavicon: string | null = null;

  // Listen for navigation events to capture URL
  ipc.events.onTabNavigated((data: { url: string; canGoBack: boolean; canGoForward: boolean }) => {
    pendingUrl = data.url;
  });

  // Listen for favicon updates
  ipc.events.onTabFaviconUpdated((favicon: string) => {
    pendingFavicon = favicon;
  });

  // Add to history when title is available
  ipc.events.onTabTitleUpdated((title: string) => {
    if (pendingUrl) {
      useHistoryStore.getState().addEntry(pendingUrl, title, pendingFavicon || undefined);
      pendingUrl = null;
      pendingFavicon = null;
    }
  });

  // Listen for show history shortcut
  ipc.events.onShortcutShowHistory(() => {
    // This should be handled by the UI component
    window.dispatchEvent(new CustomEvent('show-history'));
  });

  // Listen for clear data shortcut
  ipc.events.onShortcutClearData(() => {
    // This should be handled by the UI component
    window.dispatchEvent(new CustomEvent('show-clear-data-dialog'));
  });
}

/**
 * Group history entries by date
 */
export interface HistoryGroup {
  date: string;
  label: string;
  entries: HistoryEntry[];
}

export function groupHistoryByDate(history: HistoryEntry[]): HistoryGroup[] {
  const groups = new Map<string, HistoryEntry[]>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  history.forEach(entry => {
    const date = new Date(entry.lastVisited);
    date.setHours(0, 0, 0, 0);

    let label: string;
    const dateKey = date.toISOString().split('T')[0];

    if (date.getTime() === today.getTime()) {
      label = 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
      label = date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      label = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    const key = `${dateKey}:${label}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(entry);
  });

  return Array.from(groups.entries()).map(([key, entries]) => {
    const [dateKey, label] = key.split(':');
    return {
      date: dateKey,
      label,
      entries: entries.sort((a, b) => b.lastVisited - a.lastVisited)
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
