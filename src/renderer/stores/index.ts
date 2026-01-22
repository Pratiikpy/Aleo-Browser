/**
 * Central export for all Zustand stores
 * Import stores from here to keep imports clean
 */

// Export all stores
export { useTabStore, useActiveTab, useTabCount } from './tabStore';
export type { Tab, TabStore } from './tabStore';

export {
  useWalletStore,
  useWalletConnected,
  useFormattedBalance
} from './walletStore';
export type { WalletBalance, WalletStore } from './walletStore';

export {
  useBookmarkStore,
  useIsBookmarked,
  useBookmarkByUrl,
  useBookmarkCountByFolder
} from './bookmarkStore';
export type { Bookmark, BookmarkStore } from './bookmarkStore';

export {
  useSettingsStore,
  useResolvedTheme,
  usePrivacyLevel,
  useShouldBlockUrl
} from './settingsStore';
export type { Settings, SettingsStore, SearchEngine, Network } from './settingsStore';

export {
  useHistoryStore,
  useTodayHistory,
  useTopSites,
  useHistorySearch,
  useHistoryStats,
  groupHistoryByDate
} from './historyStore';
export type { HistoryEntry, HistoryStore, HistoryGroup } from './historyStore';

// Initialization functions
import { initTabStore, setupTabEventListeners } from './tabStore';
import { initWalletStore, startBalanceAutoRefresh } from './walletStore';
import { initBookmarkStore, setupBookmarkEventListeners } from './bookmarkStore';
import { initSettingsStore, clearDataOnExit } from './settingsStore';
import { initHistoryStore, setupHistoryEventListeners } from './historyStore';

/**
 * Initialize all stores
 * Call this once on app startup (in main.tsx or App.tsx)
 *
 * Usage:
 * ```tsx
 * import { initializeStores } from './stores';
 *
 * function App() {
 *   useEffect(() => {
 *     initializeStores();
 *   }, []);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function initializeStores() {
  console.log('[Stores] Initializing all stores...');

  // Initialize settings first (needed by other stores)
  initSettingsStore();

  // Initialize tab store
  initTabStore();

  // Initialize wallet store
  initWalletStore();
  startBalanceAutoRefresh();

  // Initialize bookmark store
  initBookmarkStore();

  // Initialize history store
  initHistoryStore();

  // Setup event listeners
  setupTabEventListeners();
  setupBookmarkEventListeners();
  setupHistoryEventListeners();

  console.log('[Stores] All stores initialized successfully');
}

/**
 * Cleanup function for app shutdown
 * Call this before the app closes
 */
export function cleanupStores() {
  console.log('[Stores] Cleaning up stores...');

  // Clear data on exit if enabled
  clearDataOnExit();

  // Remove all IPC event listeners
  if (typeof window !== 'undefined' && window.electron) {
    window.electron.events.removeAllListeners();
  }

  console.log('[Stores] Cleanup complete');
}

/**
 * Development helper: Reset all stores
 * Only use in development mode
 */
export function resetAllStores() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('resetAllStores should only be used in development');
    return;
  }

  console.log('[Stores] Resetting all stores...');

  // Reset settings
  useSettingsStore.getState().resetSettings();

  // Re-initialize
  initializeStores();

  console.log('[Stores] All stores reset');
}

/**
 * Development helper: Get store states
 * Useful for debugging
 */
export function getStoreStates() {
  return {
    tabs: useTabStore.getState(),
    wallet: useWalletStore.getState(),
    bookmarks: useBookmarkStore.getState(),
    settings: useSettingsStore.getState(),
    history: useHistoryStore.getState()
  };
}

// Expose to window in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__stores = {
    tab: useTabStore,
    wallet: useWalletStore,
    bookmarks: useBookmarkStore,
    settings: useSettingsStore,
    history: useHistoryStore,
    getStates: getStoreStates,
    reset: resetAllStores
  };

  console.log('[Dev] Stores exposed to window.__stores');
}
