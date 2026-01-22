/**
 * Session Service - Manages browser session persistence
 * Handles tab restoration on restart
 */

// Lazy load electron-store
let storeInstance: any = null;

function getStore(): any {
  if (!storeInstance) {
    const Store = require('electron-store');
    storeInstance = new Store({
      name: 'session',
      defaults: {
        tabs: [],
        lastSaved: 0,
        activeTabId: null,
        windowState: null,
        lastSessionCrashed: false
      }
    });
  }
  return storeInstance;
}

/**
 * Tab session data
 */
export interface TabSession {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  scrollPosition?: { x: number; y: number };
  zoomLevel?: number;
}

/**
 * Window state
 */
export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

/**
 * Session Service class
 */
class SessionService {
  private crashDetected: boolean = false;

  constructor() {
    // Check if last session crashed
    const store = getStore();
    const lastSessionCrashed = store.get('lastSessionCrashed', false);
    if (lastSessionCrashed) {
      this.crashDetected = true;
      console.log('Previous session may have crashed');
    }
    // Mark session as potentially crashed until properly closed
    store.set('lastSessionCrashed', true);
  }

  /**
   * Save current tabs
   */
  saveTabs(tabs: TabSession[]): void {
    const store = getStore();
    store.set('tabs', tabs);
    store.set('lastSaved', Date.now());
  }

  /**
   * Save active tab ID
   */
  saveActiveTab(tabId: string): void {
    const store = getStore();
    store.set('activeTabId', tabId);
  }

  /**
   * Save window state
   */
  saveWindowState(state: WindowState): void {
    const store = getStore();
    store.set('windowState', state);
  }

  /**
   * Restore saved tabs
   */
  restoreTabs(): TabSession[] | null {
    const store = getStore();
    const tabs = store.get('tabs') as TabSession[] | null;
    const lastSaved = store.get('lastSaved') as number;

    // Only restore if saved within the last 24 hours
    if (tabs && tabs.length > 0 && lastSaved) {
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - lastSaved < maxAge) {
        return tabs;
      }
    }

    return null;
  }

  /**
   * Get active tab ID from last session
   */
  getActiveTabId(): string | null {
    const store = getStore();
    return store.get('activeTabId', null);
  }

  /**
   * Get window state from last session
   */
  getWindowState(): WindowState | null {
    const store = getStore();
    return store.get('windowState', null);
  }

  /**
   * Check if crash was detected
   */
  didCrash(): boolean {
    return this.crashDetected;
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    const store = getStore();
    store.set('tabs', []);
    store.set('lastSaved', 0);
    store.set('activeTabId', null);
    // Keep window state for better UX
  }

  /**
   * Mark session as cleanly closed
   */
  markCleanShutdown(): void {
    const store = getStore();
    store.set('lastSessionCrashed', false);
  }

  /**
   * Get last saved timestamp
   */
  getLastSaved(): number {
    const store = getStore();
    return store.get('lastSaved', 0);
  }

  /**
   * Check if we have a session to restore
   */
  hasSession(): boolean {
    const tabs = this.restoreTabs();
    return tabs !== null && tabs.length > 0;
  }

  /**
   * Add a single tab to session
   */
  addTab(tab: TabSession): void {
    const store = getStore();
    const tabs = store.get('tabs', []) as TabSession[];
    tabs.push(tab);
    store.set('tabs', tabs);
    store.set('lastSaved', Date.now());
  }

  /**
   * Update a tab in session
   */
  updateTab(tabId: string, updates: Partial<TabSession>): void {
    const store = getStore();
    const tabs = store.get('tabs', []) as TabSession[];
    const index = tabs.findIndex(t => t.id === tabId);
    if (index !== -1) {
      tabs[index] = { ...tabs[index], ...updates };
      store.set('tabs', tabs);
      store.set('lastSaved', Date.now());
    }
  }

  /**
   * Remove a tab from session
   */
  removeTab(tabId: string): void {
    const store = getStore();
    const tabs = store.get('tabs', []) as TabSession[];
    const filtered = tabs.filter(t => t.id !== tabId);
    store.set('tabs', filtered);
    store.set('lastSaved', Date.now());
  }
}

// Export singleton instance
export const sessionService = new SessionService();
