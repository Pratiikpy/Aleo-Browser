import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ipc } from '../lib/ipc';

/**
 * Browser Tab Interface
 */
export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

/**
 * Tab Store Interface
 */
export interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;

  // Actions
  addTab: (url?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Utility methods
  getActiveTab: () => Tab | undefined;
  getTab: (id: string) => Tab | undefined;
}

/**
 * Default new tab URL
 */
const DEFAULT_URL = 'about:blank';
const DEFAULT_TITLE = 'New Tab';

/**
 * Create a new tab object
 */
function createTab(url: string = DEFAULT_URL): Tab {
  return {
    id: uuidv4(),
    url,
    title: DEFAULT_TITLE,
    favicon: undefined,
    isLoading: false,
    canGoBack: false,
    canGoForward: false
  };
}

/**
 * Tab Store
 * Manages browser tabs state
 */
export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [createTab()],
  activeTabId: null,

  /**
   * Add a new tab
   * @param url - Optional URL to navigate to
   */
  addTab: (url?: string) => {
    const newTab = createTab(url);

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }));

    // Notify main process about new tab
    if (url && url !== DEFAULT_URL) {
      ipc.navigate(url);
    }
  },

  /**
   * Close a tab
   * @param id - Tab ID to close
   */
  closeTab: (id: string) => {
    set((state) => {
      const tabs = state.tabs.filter(tab => tab.id !== id);

      // If we closed all tabs, create a new one
      if (tabs.length === 0) {
        const newTab = createTab();
        return {
          tabs: [newTab],
          activeTabId: newTab.id
        };
      }

      // If we closed the active tab, activate the next or previous tab
      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === id) {
        const closedTabIndex = state.tabs.findIndex(tab => tab.id === id);
        const nextTab = tabs[Math.min(closedTabIndex, tabs.length - 1)];
        newActiveTabId = nextTab.id;
      }

      return {
        tabs,
        activeTabId: newActiveTabId
      };
    });

    // Notify main process
    ipc.closeTab();
  },

  /**
   * Set the active tab
   * @param id - Tab ID to activate
   */
  setActiveTab: (id: string) => {
    const tab = get().tabs.find(t => t.id === id);
    if (!tab) {
      console.warn(`Tab ${id} not found`);
      return;
    }

    set({ activeTabId: id });

    // Navigate to the tab's URL in the browser view
    if (tab.url && tab.url !== DEFAULT_URL) {
      ipc.navigate(tab.url);
    }
  },

  /**
   * Update a tab's properties
   * @param id - Tab ID to update
   * @param updates - Partial tab object with updates
   */
  updateTab: (id: string, updates: Partial<Tab>) => {
    set((state) => ({
      tabs: state.tabs.map(tab =>
        tab.id === id ? { ...tab, ...updates } : tab
      )
    }));
  },

  /**
   * Reorder tabs (drag and drop)
   * @param fromIndex - Source index
   * @param toIndex - Destination index
   */
  reorderTabs: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const tabs = [...state.tabs];
      const [movedTab] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, movedTab);

      return { tabs };
    });
  },

  /**
   * Get the currently active tab
   */
  getActiveTab: () => {
    const state = get();
    return state.tabs.find(tab => tab.id === state.activeTabId);
  },

  /**
   * Get a tab by ID
   * @param id - Tab ID
   */
  getTab: (id: string) => {
    return get().tabs.find(tab => tab.id === id);
  }
}));

/**
 * Initialize tab store with first tab
 * Call this once on app startup
 */
export function initTabStore() {
  const store = useTabStore.getState();
  if (store.tabs.length > 0 && !store.activeTabId) {
    store.setActiveTab(store.tabs[0].id);
  }
}

/**
 * Hook: Get active tab
 * Usage: const activeTab = useActiveTab();
 */
export function useActiveTab() {
  return useTabStore((state) => {
    if (!state.activeTabId) return undefined;
    return state.tabs.find(tab => tab.id === state.activeTabId);
  });
}

/**
 * Hook: Get tab count
 * Usage: const tabCount = useTabCount();
 */
export function useTabCount() {
  return useTabStore((state) => state.tabs.length);
}

/**
 * Setup IPC event listeners for tab updates
 * Call this once on app startup
 */
export function setupTabEventListeners() {
  const { updateTab, getActiveTab } = useTabStore.getState();

  // Listen for tab loading state changes
  ipc.events.onTabLoading((isLoading: boolean) => {
    const activeTab = getActiveTab();
    if (activeTab) {
      updateTab(activeTab.id, { isLoading });
    }
  });

  // Listen for navigation events
  ipc.events.onTabNavigated((data: { url: string; canGoBack: boolean; canGoForward: boolean }) => {
    const activeTab = getActiveTab();
    if (activeTab) {
      updateTab(activeTab.id, {
        url: data.url,
        canGoBack: data.canGoBack,
        canGoForward: data.canGoForward,
        isLoading: false
      });
    }
  });

  // Listen for title updates
  ipc.events.onTabTitleUpdated((title: string) => {
    const activeTab = getActiveTab();
    if (activeTab) {
      updateTab(activeTab.id, { title });
    }
  });

  // Listen for favicon updates
  ipc.events.onTabFaviconUpdated((favicon: string) => {
    const activeTab = getActiveTab();
    if (activeTab) {
      updateTab(activeTab.id, { favicon });
    }
  });

  // Listen for new tab shortcut
  ipc.events.onShortcutNewTab(() => {
    useTabStore.getState().addTab();
  });

  // Listen for close tab shortcut
  ipc.events.onShortcutCloseTab(() => {
    const activeTab = getActiveTab();
    if (activeTab) {
      useTabStore.getState().closeTab(activeTab.id);
    }
  });
}
