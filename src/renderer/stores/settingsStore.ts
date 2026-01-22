import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Search Engine Options
 */
export type SearchEngine = 'duckduckgo' | 'google' | 'brave';

/**
 * Network Options
 */
export type Network = 'testnet' | 'mainnet';

/**
 * Settings Interface
 */
export interface Settings {
  searchEngine: SearchEngine;
  homepage: string;
  blockTrackers: boolean;
  blockAds: boolean;
  clearOnExit: boolean;
  autoLockMinutes: number;
  network: Network;
  // Display settings
  theme: 'light' | 'dark' | 'system';
  zoomLevel: number;
  // Privacy settings
  doNotTrack: boolean;
  clearCookiesOnExit: boolean;
  clearHistoryOnExit: boolean;
  clearCacheOnExit: boolean;
  // Advanced settings
  enableDevTools: boolean;
  hardwareAcceleration: boolean;
  // Aleo-specific settings
  aleoNodeUrl: string;
  enableBlockchainSync: boolean;
}

/**
 * Settings Store Interface
 */
export interface SettingsStore extends Settings {
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetSettings: () => void;

  // Search engine helpers
  getSearchUrl: (query: string) => string;

  // Utility
  clearError: () => void;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: Settings = {
  searchEngine: 'duckduckgo',
  homepage: 'about:blank',
  blockTrackers: true,
  blockAds: true,
  clearOnExit: false,
  autoLockMinutes: 15,
  network: 'testnet',
  theme: 'system',
  zoomLevel: 1.0,
  doNotTrack: true,
  clearCookiesOnExit: false,
  clearHistoryOnExit: false,
  clearCacheOnExit: false,
  enableDevTools: false,
  hardwareAcceleration: true,
  aleoNodeUrl: 'https://api.explorer.aleo.org/v1',
  enableBlockchainSync: true
};

/**
 * Search engine URLs
 */
const SEARCH_URLS: Record<SearchEngine, string> = {
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  brave: 'https://search.brave.com/search?q='
};

/**
 * Settings Store
 * Manages application settings with localStorage persistence
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state (from defaults)
      ...DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      /**
       * Load settings from localStorage
       * This is handled automatically by zustand persist middleware
       */
      loadSettings: async () => {
        set({ isLoading: true, error: null });

        try {
          // Settings are automatically loaded from localStorage
          // This method is mainly for triggering any side effects
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load settings',
            isLoading: false
          });
        }
      },

      /**
       * Update settings
       * @param updates - Partial settings object with updates
       */
      updateSettings: async (updates: Partial<Settings>) => {
        set({ error: null });

        try {
          // Validate updates
          if (updates.autoLockMinutes !== undefined) {
            if (updates.autoLockMinutes < 1 || updates.autoLockMinutes > 120) {
              throw new Error('Auto-lock minutes must be between 1 and 120');
            }
          }

          if (updates.zoomLevel !== undefined) {
            if (updates.zoomLevel < 0.5 || updates.zoomLevel > 2.0) {
              throw new Error('Zoom level must be between 0.5 and 2.0');
            }
          }

          if (updates.aleoNodeUrl !== undefined) {
            try {
              new URL(updates.aleoNodeUrl);
            } catch {
              throw new Error('Invalid Aleo node URL');
            }
          }

          // Update state (automatically persisted to localStorage)
          set((state) => ({
            ...updates,
            error: null
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update settings'
          });
          throw error;
        }
      },

      /**
       * Reset settings to defaults
       */
      resetSettings: () => {
        set({
          ...DEFAULT_SETTINGS,
          error: null
        });
      },

      /**
       * Get search URL for a query
       * @param query - Search query
       */
      getSearchUrl: (query: string) => {
        const state = get();
        const baseUrl = SEARCH_URLS[state.searchEngine];
        return baseUrl + encodeURIComponent(query);
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'aleobrowser-settings', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist settings, not loading/error state
      partialize: (state) => {
        const { isLoading, error, ...settings } = state;
        return settings as Settings;
      }
    }
  )
);

/**
 * Hook: Get current theme with system preference
 * Usage: const theme = useResolvedTheme();
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useSettingsStore((state) => state.theme);

  if (theme !== 'system') {
    return theme;
  }

  // Detect system theme
  if (typeof window !== 'undefined') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  return 'light';
}

/**
 * Hook: Get privacy level (0-100)
 * Usage: const privacyLevel = usePrivacyLevel();
 */
export function usePrivacyLevel(): number {
  return useSettingsStore((state) => {
    let level = 0;

    if (state.blockTrackers) level += 20;
    if (state.blockAds) level += 20;
    if (state.doNotTrack) level += 10;
    if (state.clearOnExit) level += 15;
    if (state.clearCookiesOnExit) level += 10;
    if (state.clearHistoryOnExit) level += 10;
    if (state.clearCacheOnExit) level += 10;
    if (state.enableBlockchainSync) level += 5;

    return Math.min(level, 100);
  });
}

/**
 * Hook: Check if URL should be blocked (ad/tracker)
 * Usage: const shouldBlock = useShouldBlockUrl(url);
 */
export function useShouldBlockUrl(url: string): boolean {
  return useSettingsStore((state) => {
    // Simple pattern matching for common ad/tracker domains
    const adPatterns = [
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'advertising.com',
      'adservice.google.com'
    ];

    const trackerPatterns = [
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.com/tr',
      'connect.facebook.net',
      'analytics.twitter.com',
      'pixel.facebook.com'
    ];

    if (state.blockAds && adPatterns.some(pattern => url.includes(pattern))) {
      return true;
    }

    if (state.blockTrackers && trackerPatterns.some(pattern => url.includes(pattern))) {
      return true;
    }

    return false;
  });
}

/**
 * Initialize settings store
 * Call this once on app startup
 */
export function initSettingsStore() {
  const store = useSettingsStore.getState();
  store.loadSettings();

  // Apply theme
  applyTheme();

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (useSettingsStore.getState().theme === 'system') {
        applyTheme();
      }
    });
  }
}

/**
 * Apply theme to document
 */
export function applyTheme() {
  if (typeof window === 'undefined') return;

  const theme = useSettingsStore.getState().theme;
  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
}

/**
 * Subscribe to theme changes
 */
useSettingsStore.subscribe((state) => {
  applyTheme();
});

/**
 * Clear data on exit if enabled
 */
export async function clearDataOnExit() {
  const settings = useSettingsStore.getState();

  if (!settings.clearOnExit) return;

  const promises: Promise<void>[] = [];

  // Clear based on individual settings
  if (settings.clearHistoryOnExit) {
    const { useHistoryStore } = await import('./historyStore');
    promises.push(useHistoryStore.getState().clearHistory());
  }

  if (settings.clearCookiesOnExit) {
    // Clear cookies (implement when cookie management is added)
    console.log('Clearing cookies on exit...');
  }

  if (settings.clearCacheOnExit) {
    // Clear cache (implement when cache management is added)
    console.log('Clearing cache on exit...');
  }

  await Promise.all(promises);
}
