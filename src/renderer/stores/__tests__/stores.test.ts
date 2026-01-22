/**
 * Basic store tests
 * Run with: npm test (after setting up testing environment)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useTabStore } from '../tabStore';
import { useWalletStore } from '../walletStore';
import { useBookmarkStore } from '../bookmarkStore';
import { useSettingsStore } from '../settingsStore';
import { useHistoryStore } from '../historyStore';

describe('TabStore', () => {
  beforeEach(() => {
    // Reset store state
    useTabStore.setState({
      tabs: [],
      activeTabId: null
    });
  });

  it('should add a tab', () => {
    const { addTab, tabs } = useTabStore.getState();

    addTab('https://example.com');

    const state = useTabStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].url).toBe('https://example.com');
  });

  it('should close a tab', () => {
    const { addTab, closeTab } = useTabStore.getState();

    addTab('https://example.com');
    const tabId = useTabStore.getState().tabs[0].id;

    closeTab(tabId);

    // Should create a new blank tab when closing the last tab
    const state = useTabStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].url).toBe('about:blank');
  });

  it('should set active tab', () => {
    const { addTab, setActiveTab } = useTabStore.getState();

    addTab('https://example.com');
    addTab('https://test.com');

    const tabs = useTabStore.getState().tabs;
    setActiveTab(tabs[1].id);

    expect(useTabStore.getState().activeTabId).toBe(tabs[1].id);
  });

  it('should update tab properties', () => {
    const { addTab, updateTab } = useTabStore.getState();

    addTab('https://example.com');
    const tabId = useTabStore.getState().tabs[0].id;

    updateTab(tabId, { title: 'Example Domain', isLoading: true });

    const tab = useTabStore.getState().tabs[0];
    expect(tab.title).toBe('Example Domain');
    expect(tab.isLoading).toBe(true);
  });
});

describe('WalletStore', () => {
  beforeEach(() => {
    // Reset store state
    useWalletStore.setState({
      address: null,
      balance: null,
      isLocked: true,
      hasWallet: false,
      isLoading: false,
      error: null
    });
  });

  it('should initialize with locked state', () => {
    const state = useWalletStore.getState();

    expect(state.isLocked).toBe(true);
    expect(state.hasWallet).toBe(false);
    expect(state.address).toBeNull();
  });

  it('should clear error', () => {
    useWalletStore.setState({ error: 'Test error' });

    const { clearError } = useWalletStore.getState();
    clearError();

    expect(useWalletStore.getState().error).toBeNull();
  });
});

describe('BookmarkStore', () => {
  beforeEach(() => {
    // Reset store state
    useBookmarkStore.setState({
      bookmarks: [],
      folders: ['Bookmarks Bar', 'Other Bookmarks', 'Aleo Apps'],
      isLoading: false,
      error: null,
      lastSyncTime: null,
      isSyncing: false
    });
  });

  it('should search bookmarks', () => {
    const state = useBookmarkStore.getState();

    // Add some test bookmarks
    useBookmarkStore.setState({
      bookmarks: [
        {
          id: '1',
          url: 'https://example.com',
          title: 'Example',
          folder: 'Bookmarks Bar',
          createdAt: Date.now()
        },
        {
          id: '2',
          url: 'https://test.com',
          title: 'Test Site',
          folder: 'Other Bookmarks',
          createdAt: Date.now()
        }
      ]
    });

    const results = state.searchBookmarks('example');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Example');
  });

  it('should get bookmarks by folder', () => {
    useBookmarkStore.setState({
      bookmarks: [
        {
          id: '1',
          url: 'https://example.com',
          title: 'Example',
          folder: 'Bookmarks Bar',
          createdAt: Date.now()
        },
        {
          id: '2',
          url: 'https://test.com',
          title: 'Test',
          folder: 'Other Bookmarks',
          createdAt: Date.now()
        }
      ]
    });

    const state = useBookmarkStore.getState();
    const barBookmarks = state.getBookmarksByFolder('Bookmarks Bar');

    expect(barBookmarks.length).toBe(1);
    expect(barBookmarks[0].title).toBe('Example');
  });
});

describe('SettingsStore', () => {
  it('should get search URL', () => {
    const { getSearchUrl } = useSettingsStore.getState();

    const url = getSearchUrl('test query');

    expect(url).toContain('test+query');
    expect(url).toMatch(/^https:\/\//);
  });

  it('should reset to defaults', () => {
    const { updateSettings, resetSettings } = useSettingsStore.getState();

    // Change a setting
    updateSettings({ blockTrackers: false });
    expect(useSettingsStore.getState().blockTrackers).toBe(false);

    // Reset
    resetSettings();
    expect(useSettingsStore.getState().blockTrackers).toBe(true);
  });
});

describe('HistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      history: [],
      isLoading: false,
      error: null
    });
  });

  it('should search history', () => {
    useHistoryStore.setState({
      history: [
        {
          id: '1',
          url: 'https://example.com',
          title: 'Example Domain',
          visitedAt: Date.now(),
          visitCount: 1,
          lastVisited: Date.now()
        },
        {
          id: '2',
          url: 'https://test.com',
          title: 'Test Site',
          visitedAt: Date.now(),
          visitCount: 1,
          lastVisited: Date.now()
        }
      ]
    });

    const state = useHistoryStore.getState();
    const results = state.searchHistory('example');

    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Example Domain');
  });

  it('should get most visited', () => {
    useHistoryStore.setState({
      history: [
        {
          id: '1',
          url: 'https://popular.com',
          title: 'Popular',
          visitedAt: Date.now(),
          visitCount: 10,
          lastVisited: Date.now()
        },
        {
          id: '2',
          url: 'https://less-popular.com',
          title: 'Less Popular',
          visitedAt: Date.now(),
          visitCount: 2,
          lastVisited: Date.now()
        }
      ]
    });

    const state = useHistoryStore.getState();
    const topSites = state.getMostVisited(1);

    expect(topSites.length).toBe(1);
    expect(topSites[0].title).toBe('Popular');
  });
});

// Mock window.electron for testing
global.window = {
  electron: {
    wallet: {
      create: jest.fn(),
      import: jest.fn(),
      getAddress: jest.fn(),
      getBalance: jest.fn(),
      send: jest.fn(),
      lock: jest.fn(),
      unlock: jest.fn(),
      isLocked: jest.fn()
    },
    bookmarks: {
      getAll: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      syncToAleo: jest.fn()
    },
    history: {
      getAll: jest.fn(),
      add: jest.fn(),
      clear: jest.fn(),
      delete: jest.fn()
    },
    browser: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      getUrl: jest.fn(),
      getTitle: jest.fn(),
      newTab: jest.fn(),
      closeTab: jest.fn()
    },
    window: {
      minimize: jest.fn(),
      maximize: jest.fn(),
      close: jest.fn(),
      isMaximized: jest.fn()
    },
    events: {
      onTabLoading: jest.fn(),
      onTabNavigated: jest.fn(),
      onTabTitleUpdated: jest.fn(),
      onTabFaviconUpdated: jest.fn(),
      onTabError: jest.fn(),
      onTabNewWindow: jest.fn(),
      onWindowMaximized: jest.fn(),
      onWindowFocused: jest.fn(),
      onPermissionRequest: jest.fn(),
      onShortcutCloseTab: jest.fn(),
      onShortcutNewTab: jest.fn(),
      onShortcutFocusAddressBar: jest.fn(),
      onShortcutBookmark: jest.fn(),
      onShortcutShowHistory: jest.fn(),
      onShortcutClearData: jest.fn(),
      removeAllListeners: jest.fn()
    },
    platform: 'test',
    versions: {
      node: '18.0.0',
      chrome: '120.0.0',
      electron: '28.0.0'
    }
  }
} as any;
