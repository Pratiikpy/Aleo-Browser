/**
 * Tab Suspend/Memory Saver Service
 * Manages tab suspension to reduce memory usage for inactive tabs
 */

// Lazy load electron-store to avoid initialization issues
function createStore(defaults: any): any {
  const Store = require('electron-store');
  return new Store({ name: 'tab-suspend', defaults });
}

export interface SuspendedTabInfo {
  tabId: string;
  url: string;
  title: string;
  favicon?: string;
  suspendedAt: number;
  lastActiveAt: number;
}

interface TabSuspendSettings {
  enabled: boolean;
  autoSuspendEnabled: boolean;
  autoSuspendDelayMinutes: number;  // Time before auto-suspending inactive tabs
  neverSuspendPinnedTabs: boolean;
  neverSuspendAudioTabs: boolean;
  neverSuspendDomains: string[];    // Domains to never suspend (e.g., 'aleo.org')
}

interface TabSuspendStore {
  settings: TabSuspendSettings;
  suspendedTabs: SuspendedTabInfo[];
}

export class TabSuspendService {
  private static instance: TabSuspendService;
  private store: any = null;
  private settings: TabSuspendSettings | null = null;
  private suspendedTabs: Map<string, SuspendedTabInfo> = new Map();
  private lastActiveTimestamps: Map<string, number> = new Map();
  private autoSuspendInterval: NodeJS.Timeout | null = null;
  private pinnedTabs: Set<string> = new Set();
  private audioPlayingTabs: Set<string> = new Set();

  private static readonly defaultStore: TabSuspendStore = {
    settings: {
      enabled: true,
      autoSuspendEnabled: true,
      autoSuspendDelayMinutes: 30,  // 30 minutes default
      neverSuspendPinnedTabs: true,
      neverSuspendAudioTabs: true,
      neverSuspendDomains: [
        'aleo.org',
        'explorer.aleo.org',
        'developer.aleo.org',
        'localhost',
        '127.0.0.1'
      ]
    },
    suspendedTabs: []
  };

  private constructor() {
    // Store is initialized lazily
  }

  /**
   * Get the store instance, lazily initialized
   */
  private getStore(): any {
    if (!this.store) {
      this.store = createStore(TabSuspendService.defaultStore);
    }
    return this.store;
  }

  /**
   * Ensure data is loaded from store
   */
  private ensureLoaded(): void {
    if (!this.settings) {
      const store = this.getStore();
      this.settings = store.get('settings');

      // Restore suspended tabs from store
      const savedSuspendedTabs = store.get('suspendedTabs') as SuspendedTabInfo[];
      savedSuspendedTabs.forEach(tab => {
        this.suspendedTabs.set(tab.tabId, tab);
      });
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TabSuspendService {
    if (!TabSuspendService.instance) {
      TabSuspendService.instance = new TabSuspendService();
    }
    return TabSuspendService.instance;
  }

  /**
   * Initialize auto-suspend timer
   */
  startAutoSuspend(checkCallback: () => void): void {
    this.ensureLoaded();

    if (!this.settings!.enabled || !this.settings!.autoSuspendEnabled) {
      return;
    }

    // Check every minute for tabs to auto-suspend
    if (this.autoSuspendInterval) {
      clearInterval(this.autoSuspendInterval);
    }

    this.autoSuspendInterval = setInterval(() => {
      checkCallback();
    }, 60000); // Check every minute

    console.log('[Tab Suspend] Auto-suspend timer started');
  }

  /**
   * Stop auto-suspend timer
   */
  stopAutoSuspend(): void {
    if (this.autoSuspendInterval) {
      clearInterval(this.autoSuspendInterval);
      this.autoSuspendInterval = null;
      console.log('[Tab Suspend] Auto-suspend timer stopped');
    }
  }

  /**
   * Record tab activity (called when tab becomes active)
   */
  recordTabActivity(tabId: string): void {
    this.lastActiveTimestamps.set(tabId, Date.now());
  }

  /**
   * Check if tab should be auto-suspended
   */
  shouldAutoSuspend(tabId: string, url: string): boolean {
    this.ensureLoaded();

    if (!this.settings!.enabled || !this.settings!.autoSuspendEnabled) {
      return false;
    }

    // Don't suspend already suspended tabs
    if (this.suspendedTabs.has(tabId)) {
      return false;
    }

    // Check pinned tabs setting
    if (this.settings!.neverSuspendPinnedTabs && this.pinnedTabs.has(tabId)) {
      return false;
    }

    // Check audio tabs setting
    if (this.settings!.neverSuspendAudioTabs && this.audioPlayingTabs.has(tabId)) {
      return false;
    }

    // Check never-suspend domains
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      if (this.settings!.neverSuspendDomains.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
      )) {
        return false;
      }
    } catch {
      // Invalid URL, allow suspend
    }

    // Check if tab has been inactive long enough
    const lastActive = this.lastActiveTimestamps.get(tabId) || 0;
    const inactiveMs = Date.now() - lastActive;
    const thresholdMs = this.settings!.autoSuspendDelayMinutes * 60 * 1000;

    return inactiveMs >= thresholdMs;
  }

  /**
   * Mark tab as suspended
   */
  suspendTab(tabId: string, url: string, title: string, favicon?: string): SuspendedTabInfo {
    this.ensureLoaded();

    const info: SuspendedTabInfo = {
      tabId,
      url,
      title,
      favicon,
      suspendedAt: Date.now(),
      lastActiveAt: this.lastActiveTimestamps.get(tabId) || Date.now()
    };

    this.suspendedTabs.set(tabId, info);
    this.saveSuspendedTabs();

    console.log(`[Tab Suspend] Tab ${tabId} suspended: ${url}`);
    return info;
  }

  /**
   * Mark tab as unsuspended
   */
  unsuspendTab(tabId: string): SuspendedTabInfo | null {
    const info = this.suspendedTabs.get(tabId);
    if (info) {
      this.suspendedTabs.delete(tabId);
      this.saveSuspendedTabs();
      this.recordTabActivity(tabId);
      console.log(`[Tab Suspend] Tab ${tabId} unsuspended`);
    }
    return info || null;
  }

  /**
   * Check if tab is suspended
   */
  isTabSuspended(tabId: string): boolean {
    return this.suspendedTabs.has(tabId);
  }

  /**
   * Get suspended tab info
   */
  getSuspendedTabInfo(tabId: string): SuspendedTabInfo | null {
    return this.suspendedTabs.get(tabId) || null;
  }

  /**
   * Get all suspended tabs
   */
  getAllSuspendedTabs(): SuspendedTabInfo[] {
    return Array.from(this.suspendedTabs.values());
  }

  /**
   * Get count of suspended tabs
   */
  getSuspendedTabCount(): number {
    return this.suspendedTabs.size;
  }

  /**
   * Estimate memory saved (rough estimate: ~50MB per tab)
   */
  getEstimatedMemorySaved(): number {
    return this.suspendedTabs.size * 50; // MB
  }

  /**
   * Mark tab as pinned (won't auto-suspend)
   */
  setPinnedTab(tabId: string, isPinned: boolean): void {
    if (isPinned) {
      this.pinnedTabs.add(tabId);
    } else {
      this.pinnedTabs.delete(tabId);
    }
  }

  /**
   * Mark tab as playing audio (won't auto-suspend)
   */
  setAudioPlayingTab(tabId: string, isPlaying: boolean): void {
    if (isPlaying) {
      this.audioPlayingTabs.add(tabId);
    } else {
      this.audioPlayingTabs.delete(tabId);
    }
  }

  /**
   * Remove tab from tracking (when tab is closed)
   */
  removeTab(tabId: string): void {
    this.suspendedTabs.delete(tabId);
    this.lastActiveTimestamps.delete(tabId);
    this.pinnedTabs.delete(tabId);
    this.audioPlayingTabs.delete(tabId);
    this.saveSuspendedTabs();
  }

  /**
   * Save suspended tabs to store
   */
  private saveSuspendedTabs(): void {
    const store = this.getStore();
    store.set('suspendedTabs', Array.from(this.suspendedTabs.values()));
  }

  /**
   * Get current settings
   */
  getSettings(): TabSuspendSettings {
    this.ensureLoaded();
    return { ...this.settings! };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<TabSuspendSettings>): void {
    this.ensureLoaded();
    this.settings = {
      ...this.settings!,
      ...updates
    };
    this.getStore().set('settings', this.settings);
    console.log('[Tab Suspend] Settings updated');
  }

  /**
   * Enable or disable tab suspend
   */
  setEnabled(enabled: boolean): void {
    this.updateSettings({ enabled });
    if (!enabled) {
      this.stopAutoSuspend();
    }
  }

  /**
   * Check if tab suspend is enabled
   */
  isEnabled(): boolean {
    this.ensureLoaded();
    return this.settings!.enabled;
  }

  /**
   * Add domain to never-suspend list
   */
  addNeverSuspendDomain(domain: string): void {
    this.ensureLoaded();
    const normalized = domain.toLowerCase().replace(/^www\./, '');
    if (!this.settings!.neverSuspendDomains.includes(normalized)) {
      this.settings!.neverSuspendDomains.push(normalized);
      this.getStore().set('settings', this.settings);
      console.log(`[Tab Suspend] Added never-suspend domain: ${normalized}`);
    }
  }

  /**
   * Remove domain from never-suspend list
   */
  removeNeverSuspendDomain(domain: string): void {
    this.ensureLoaded();
    const normalized = domain.toLowerCase().replace(/^www\./, '');
    const index = this.settings!.neverSuspendDomains.indexOf(normalized);
    if (index !== -1) {
      this.settings!.neverSuspendDomains.splice(index, 1);
      this.getStore().set('settings', this.settings);
      console.log(`[Tab Suspend] Removed never-suspend domain: ${normalized}`);
    }
  }

  /**
   * Get never-suspend domains
   */
  getNeverSuspendDomains(): string[] {
    this.ensureLoaded();
    return [...this.settings!.neverSuspendDomains];
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    suspendedCount: number;
    memorySavedMB: number;
    enabled: boolean;
    autoSuspendEnabled: boolean;
    autoSuspendDelayMinutes: number;
  } {
    this.ensureLoaded();
    return {
      suspendedCount: this.suspendedTabs.size,
      memorySavedMB: this.getEstimatedMemorySaved(),
      enabled: this.settings!.enabled,
      autoSuspendEnabled: this.settings!.autoSuspendEnabled,
      autoSuspendDelayMinutes: this.settings!.autoSuspendDelayMinutes
    };
  }
}

// Export singleton instance
export const tabSuspendService = TabSuspendService.getInstance();

// Export lazy getter
export function getTabSuspendService(): TabSuspendService {
  return TabSuspendService.getInstance();
}
