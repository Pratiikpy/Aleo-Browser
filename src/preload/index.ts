import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script for secure IPC communication
 * Exposes safe APIs to the renderer process
 */

/**
 * Wallet API - Leo Wallet-like features
 */
const walletAPI = {
  // Create new wallet with mnemonic
  create: (password: string) => ipcRenderer.invoke('wallet:create', password),

  // Import from private key
  import: (privateKey: string, password: string) => ipcRenderer.invoke('wallet:import', privateKey, password),

  // Import from mnemonic phrase
  importFromMnemonic: (mnemonic: string, password: string) => ipcRenderer.invoke('wallet:importFromMnemonic', mnemonic, password),

  // Get wallet info
  getAddress: () => ipcRenderer.invoke('wallet:getAddress'),
  getBalance: () => ipcRenderer.invoke('wallet:getBalance'),
  refreshBalance: () => ipcRenderer.invoke('wallet:refreshBalance'),

  // Transactions
  send: (recipient: string, amount: number, fee?: number, memo?: string) =>
    ipcRenderer.invoke('wallet:send', { recipient, amount, fee, memo }),

  // Lock/unlock
  lock: () => ipcRenderer.invoke('wallet:lock'),
  unlock: (password: string) => ipcRenderer.invoke('wallet:unlock', password),
  isLocked: () => ipcRenderer.invoke('wallet:isLocked'),

  // Export keys (requires unlocked wallet)
  exportPrivateKey: () => ipcRenderer.invoke('wallet:exportPrivateKey'),
  exportViewKey: () => ipcRenderer.invoke('wallet:exportViewKey'),

  // Delete wallet
  delete: () => ipcRenderer.invoke('wallet:delete')
};

/**
 * Bookmarks API
 */
const bookmarksAPI = {
  getAll: () => ipcRenderer.invoke('bookmarks:getAll'),
  add: (bookmark: any) => ipcRenderer.invoke('bookmarks:add', bookmark),
  update: (id: string, updates: any) => ipcRenderer.invoke('bookmarks:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('bookmarks:delete', id),
  syncToAleo: () => ipcRenderer.invoke('bookmarks:syncToAleo')
};

/**
 * History API
 */
const historyAPI = {
  getAll: (limit?: number) => ipcRenderer.invoke('history:getAll', limit),
  add: (entry: any) => ipcRenderer.invoke('history:add', entry),
  clear: () => ipcRenderer.invoke('history:clear'),
  delete: (id: string) => ipcRenderer.invoke('history:delete', id)
};

/**
 * Notes API - Private encrypted notes with Aleo blockchain sync
 */
const notesAPI = {
  getAll: () => ipcRenderer.invoke('notes:getAll'),
  add: (note: { title: string; content: string; tags?: string[] }) => ipcRenderer.invoke('notes:add', note),
  update: (id: string, updates: { title?: string; content?: string; tags?: string[] }) => ipcRenderer.invoke('notes:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
  syncToAleo: (noteId: string) => ipcRenderer.invoke('notes:syncToAleo', noteId)
};

/**
 * Browser API - Enhanced with multi-tab support
 */
const browserAPI = {
  // Navigation
  navigate: (url: string) => ipcRenderer.invoke('browser:navigate', url),
  goBack: () => ipcRenderer.invoke('browser:goBack'),
  goForward: () => ipcRenderer.invoke('browser:goForward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  stop: () => ipcRenderer.invoke('browser:stop'),
  getUrl: () => ipcRenderer.invoke('browser:getUrl'),
  getTitle: () => ipcRenderer.invoke('browser:getTitle'),

  // Multi-tab management
  createTab: (tabId: string, url?: string) => ipcRenderer.invoke('browser:createTab', tabId, url),
  switchTab: (tabId: string) => ipcRenderer.invoke('browser:switchTab', tabId),
  closeTab: (tabId?: string) => ipcRenderer.invoke('browser:closeTab', tabId),
  getActiveTabId: () => ipcRenderer.invoke('browser:getActiveTabId'),
  getAllTabIds: () => ipcRenderer.invoke('browser:getAllTabIds'),
  navigateTab: (tabId: string, url: string) => ipcRenderer.invoke('browser:navigateTab', tabId, url),

  // Legacy (for compatibility)
  newTab: (url?: string) => ipcRenderer.invoke('browser:newTab', url),

  // Zoom controls
  zoomIn: () => ipcRenderer.invoke('browser:zoomIn'),
  zoomOut: () => ipcRenderer.invoke('browser:zoomOut'),
  zoomReset: () => ipcRenderer.invoke('browser:zoomReset'),
  getZoomLevel: () => ipcRenderer.invoke('browser:getZoomLevel'),

  // Find in page
  findInPage: (text: string, options?: { forward?: boolean; findNext?: boolean }) =>
    ipcRenderer.invoke('browser:findInPage', text, options),
  stopFindInPage: (action?: 'clearSelection' | 'keepSelection' | 'activateSelection') =>
    ipcRenderer.invoke('browser:stopFindInPage', action)
};

/**
 * Downloads API
 */
const downloadsAPI = {
  getAll: () => ipcRenderer.invoke('downloads:getAll'),
  cancel: (id: string) => ipcRenderer.invoke('downloads:cancel', id),
  pause: (id: string) => ipcRenderer.invoke('downloads:pause', id),
  resume: (id: string) => ipcRenderer.invoke('downloads:resume', id)
};

/**
 * Session API
 */
const sessionAPI = {
  restore: () => ipcRenderer.invoke('session:restore'),
  save: () => ipcRenderer.invoke('session:save'),
  clear: () => ipcRenderer.invoke('session:clear')
};

/**
 * Privacy API - For Shields Panel and privacy controls
 */
const privacyAPI = {
  getStats: () => ipcRenderer.invoke('privacy:getStats'),
  getSettings: () => ipcRenderer.invoke('privacy:getSettings'),
  setEnabled: (enabled: boolean) => ipcRenderer.invoke('privacy:setEnabled', enabled),
  updateSetting: (key: string, value: boolean | string) => ipcRenderer.invoke('privacy:updateSetting', key, value),
  getSiteStats: (hostname: string) => ipcRenderer.invoke('privacy:getSiteStats', hostname),
  resetStats: () => ipcRenderer.invoke('privacy:resetStats')
};

/**
 * Tab Suspend / Memory Saver API
 */
const tabSuspendAPI = {
  // Suspend/unsuspend tabs
  suspend: (tabId: string) => ipcRenderer.invoke('tab:suspend', tabId),
  unsuspend: (tabId: string) => ipcRenderer.invoke('tab:unsuspend', tabId),
  isSuspended: (tabId: string) => ipcRenderer.invoke('tab:isSuspended', tabId),
  getAllSuspended: () => ipcRenderer.invoke('tab:getAllSuspended'),

  // Memory saver stats
  getStats: () => ipcRenderer.invoke('tab:getMemorySaverStats'),

  // Settings
  getSettings: () => ipcRenderer.invoke('tab:getSuspendSettings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('tab:updateSuspendSettings', settings),
  setEnabled: (enabled: boolean) => ipcRenderer.invoke('tab:setSuspendEnabled', enabled),

  // Never-suspend domains
  getNeverSuspendDomains: () => ipcRenderer.invoke('tab:getNeverSuspendDomains'),
  addNeverSuspendDomain: (domain: string) => ipcRenderer.invoke('tab:addNeverSuspendDomain', domain),
  removeNeverSuspendDomain: (domain: string) => ipcRenderer.invoke('tab:removeNeverSuspendDomain', domain)
};

/**
 * Reader Mode API
 */
const readerAPI = {
  // Toggle reader mode
  toggle: (tabId?: string) => ipcRenderer.invoke('reader:toggle', tabId),

  // Settings
  getSettings: () => ipcRenderer.invoke('reader:getSettings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('reader:updateSettings', settings),

  // Utilities
  isLikelyReadable: (url: string) => ipcRenderer.invoke('reader:isLikelyReadable', url),
  calculateReadingTime: (text: string) => ipcRenderer.invoke('reader:calculateReadingTime', text),
  generateHtml: (article: any) => ipcRenderer.invoke('reader:generateHtml', article)
};

/**
 * Transaction History API
 */
const txHistoryAPI = {
  // Initialize with wallet address
  init: (address: string, network?: string) => ipcRenderer.invoke('txHistory:init', address, network),

  // Get transactions
  getAll: () => ipcRenderer.invoke('txHistory:getAll'),
  get: (options?: {
    limit?: number;
    offset?: number;
    type?: 'send' | 'receive' | 'execute' | 'deploy';
    status?: 'pending' | 'confirmed' | 'failed';
  }) => ipcRenderer.invoke('txHistory:get', options),
  getRecent: (limit?: number) => ipcRenderer.invoke('txHistory:getRecent', limit),
  getById: (id: string) => ipcRenderer.invoke('txHistory:getById', id),

  // Record transactions
  recordSent: (params: {
    txId: string;
    to: string;
    amount: number;
    fee?: number;
    memo?: string;
  }) => ipcRenderer.invoke('txHistory:recordSent', params),
  recordExecute: (params: {
    txId: string;
    programId: string;
    functionName: string;
    fee?: number;
  }) => ipcRenderer.invoke('txHistory:recordExecute', params),

  // Status updates
  updateStatus: (txId: string) => ipcRenderer.invoke('txHistory:updateStatus', txId),
  checkPending: () => ipcRenderer.invoke('txHistory:checkPending'),

  // Statistics
  getStats: () => ipcRenderer.invoke('txHistory:getStats'),
  getPendingCount: () => ipcRenderer.invoke('txHistory:getPendingCount'),

  // Management
  delete: (id: string) => ipcRenderer.invoke('txHistory:delete', id),
  clear: () => ipcRenderer.invoke('txHistory:clear'),

  // Export/Import
  export: () => ipcRenderer.invoke('txHistory:export'),
  import: (json: string) => ipcRenderer.invoke('txHistory:import', json)
};

/**
 * Window API
 */
const windowAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  toggleFullScreen: () => ipcRenderer.invoke('window:toggleFullScreen'),
  isFullScreen: () => ipcRenderer.invoke('window:isFullScreen')
};

/**
 * Permissions API (for managing dApp permissions)
 */
const permissionsAPI = {
  getConnectedSites: () => ipcRenderer.invoke('permissions:getConnectedSites'),
  disconnectSite: (origin: string) => ipcRenderer.invoke('permissions:disconnectSite', origin),
  resolve: (requestId: string, granted: boolean) => ipcRenderer.invoke('permissions:resolve', requestId, granted)
};

/**
 * dApp API (for internal browser transactions and permission responses)
 */
const dappAPI = {
  // Request a transaction from the browser (shows approval UI)
  requestTransaction: (params: {
    programId: string;
    functionName: string;
    inputs: string[];
    fee?: number;
    origin?: string;
  }) => ipcRenderer.invoke('browser:requestTransaction', params),

  // Respond to a permission request
  respondToPermission: (granted: boolean, origin?: string) =>
    ipcRenderer.invoke('browser:respondToPermission', { origin: origin || 'browser:internal', granted })
};

/**
 * Events API (one-way communication from main to renderer)
 */
const eventsAPI = {
  // Tab events
  onTabLoading: (callback: (loading: boolean, tabId?: string) => void) => {
    ipcRenderer.on('tab:loading', (_event, loading, tabId) => callback(loading, tabId));
  },
  onTabNavigated: (callback: (data: any) => void) => {
    ipcRenderer.on('tab:navigated', (_event, data) => callback(data));
  },
  onTabTitleUpdated: (callback: (title: string, tabId?: string) => void) => {
    ipcRenderer.on('tab:title-updated', (_event, title, tabId) => callback(title, tabId));
  },
  onTabFaviconUpdated: (callback: (favicon: string, tabId?: string) => void) => {
    ipcRenderer.on('tab:favicon-updated', (_event, favicon, tabId) => callback(favicon, tabId));
  },
  onTabError: (callback: (error: string, tabId?: string) => void) => {
    ipcRenderer.on('tab:error', (_event, error, tabId) => callback(error, tabId));
  },
  onTabNewWindow: (callback: (url: string) => void) => {
    ipcRenderer.on('tab:new-window', (_event, url) => callback(url));
  },
  onTabZoomChanged: (callback: (zoomLevel: number, tabId?: string) => void) => {
    ipcRenderer.on('tab:zoom-changed', (_event, zoomLevel, tabId) => callback(zoomLevel, tabId));
  },

  // Window events
  onWindowMaximized: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window:maximized', (_event, maximized) => callback(maximized));
  },
  onWindowFocused: (callback: (focused: boolean) => void) => {
    ipcRenderer.on('window:focused', (_event, focused) => callback(focused));
  },

  // Permission events
  onPermissionRequest: (callback: (data: any) => void) => {
    ipcRenderer.on('permission:request', (_event, data) => callback(data));
  },

  // Find in page events
  onFindInPageResult: (callback: (result: { matches: number; activeMatchOrdinal: number; finalUpdate: boolean }) => void) => {
    ipcRenderer.on('findInPage:result', (_event, result) => callback(result));
  },

  // Download events
  onDownloadStarted: (callback: (download: any) => void) => {
    ipcRenderer.on('download:started', (_event, download) => callback(download));
  },
  onDownloadProgress: (callback: (download: any) => void) => {
    ipcRenderer.on('download:progress', (_event, download) => callback(download));
  },
  onDownloadComplete: (callback: (download: any) => void) => {
    ipcRenderer.on('download:complete', (_event, download) => callback(download));
  },
  onDownloadCancelled: (callback: (download: any) => void) => {
    ipcRenderer.on('download:cancelled', (_event, download) => callback(download));
  },
  onDownloadFailed: (callback: (download: any) => void) => {
    ipcRenderer.on('download:failed', (_event, download) => callback(download));
  },

  // Keyboard shortcuts
  onShortcutCloseTab: (callback: () => void) => {
    ipcRenderer.on('shortcut:closeTab', () => callback());
  },
  onShortcutNewTab: (callback: () => void) => {
    ipcRenderer.on('shortcut:newTab', () => callback());
  },
  onShortcutFocusAddressBar: (callback: () => void) => {
    ipcRenderer.on('shortcut:focusAddressBar', () => callback());
  },
  onShortcutBookmark: (callback: () => void) => {
    ipcRenderer.on('shortcut:bookmark', () => callback());
  },
  onShortcutShowHistory: (callback: () => void) => {
    ipcRenderer.on('shortcut:showHistory', () => callback());
  },
  onShortcutClearData: (callback: () => void) => {
    ipcRenderer.on('shortcut:clearData', () => callback());
  },
  onShortcutFindInPage: (callback: () => void) => {
    ipcRenderer.on('shortcut:findInPage', () => callback());
  },
  onShortcutEscape: (callback: () => void) => {
    ipcRenderer.on('shortcut:escape', () => callback());
  },
  onShortcutFindNext: (callback: () => void) => {
    ipcRenderer.on('shortcut:findNext', () => callback());
  },
  onShortcutFindPrevious: (callback: () => void) => {
    ipcRenderer.on('shortcut:findPrevious', () => callback());
  },
  onShortcutNextTab: (callback: () => void) => {
    ipcRenderer.on('shortcut:nextTab', () => callback());
  },
  onShortcutPrevTab: (callback: () => void) => {
    ipcRenderer.on('shortcut:prevTab', () => callback());
  },
  onShortcutSwitchToTab: (callback: (index: number) => void) => {
    ipcRenderer.on('shortcut:switchToTab', (_event, index) => callback(index));
  },
  onShortcutShowDownloads: (callback: () => void) => {
    ipcRenderer.on('shortcut:showDownloads', () => callback());
  },
  onShortcutReopenClosedTab: (callback: () => void) => {
    ipcRenderer.on('shortcut:reopenClosedTab', () => callback());
  },

  // Tab suspend events
  onTabSuspended: (callback: (tabId: string, info: { url: string; title: string }) => void) => {
    ipcRenderer.on('tab:suspended', (_event, tabId, info) => callback(tabId, info));
  },
  onTabUnsuspended: (callback: (tabId: string) => void) => {
    ipcRenderer.on('tab:unsuspended', (_event, tabId) => callback(tabId));
  },

  // Reader mode events
  onReaderToggled: (callback: (data: { tabId: string; enabled: boolean; originalUrl?: string }) => void) => {
    ipcRenderer.on('reader:toggled', (_event, data) => callback(data));
  },

  removeAllListeners: () => {
    // Tab events
    ipcRenderer.removeAllListeners('tab:loading');
    ipcRenderer.removeAllListeners('tab:navigated');
    ipcRenderer.removeAllListeners('tab:title-updated');
    ipcRenderer.removeAllListeners('tab:favicon-updated');
    ipcRenderer.removeAllListeners('tab:error');
    ipcRenderer.removeAllListeners('tab:new-window');
    ipcRenderer.removeAllListeners('tab:zoom-changed');
    // Window events
    ipcRenderer.removeAllListeners('window:maximized');
    ipcRenderer.removeAllListeners('window:focused');
    // Permission events
    ipcRenderer.removeAllListeners('permission:request');
    // Find events
    ipcRenderer.removeAllListeners('findInPage:result');
    // Download events
    ipcRenderer.removeAllListeners('download:started');
    ipcRenderer.removeAllListeners('download:progress');
    ipcRenderer.removeAllListeners('download:complete');
    ipcRenderer.removeAllListeners('download:cancelled');
    ipcRenderer.removeAllListeners('download:failed');
    // Shortcut events
    ipcRenderer.removeAllListeners('shortcut:closeTab');
    ipcRenderer.removeAllListeners('shortcut:newTab');
    ipcRenderer.removeAllListeners('shortcut:focusAddressBar');
    ipcRenderer.removeAllListeners('shortcut:bookmark');
    ipcRenderer.removeAllListeners('shortcut:showHistory');
    ipcRenderer.removeAllListeners('shortcut:clearData');
    ipcRenderer.removeAllListeners('shortcut:findInPage');
    ipcRenderer.removeAllListeners('shortcut:escape');
    ipcRenderer.removeAllListeners('shortcut:findNext');
    ipcRenderer.removeAllListeners('shortcut:findPrevious');
    ipcRenderer.removeAllListeners('shortcut:nextTab');
    ipcRenderer.removeAllListeners('shortcut:prevTab');
    ipcRenderer.removeAllListeners('shortcut:switchToTab');
    ipcRenderer.removeAllListeners('shortcut:showDownloads');
    ipcRenderer.removeAllListeners('shortcut:reopenClosedTab');
    // Tab suspend events
    ipcRenderer.removeAllListeners('tab:suspended');
    ipcRenderer.removeAllListeners('tab:unsuspended');
    // Reader mode events
    ipcRenderer.removeAllListeners('reader:toggled');
  }
};

/**
 * UI Layout API - Controls window layout for sidebars and modals
 */
const uiAPI = {
  // Set right sidebar width (adjusts BrowserView bounds for wallet panel)
  setRightSidebarWidth: (width: number) => ipcRenderer.invoke('ui:setRightSidebarWidth', width),

  // Show/hide BrowserView (for full-screen modals that need click interaction)
  setBrowserViewVisible: (visible: boolean) => ipcRenderer.invoke('ui:setBrowserViewVisible', visible),

  // Adjust BrowserView bounds for partial overlays (panels, bars)
  adjustBrowserViewBounds: (config: { topHeight?: number; bottomHeight?: number; rightWidth?: number }) =>
    ipcRenderer.invoke('ui:adjustBrowserViewBounds', config)
};

/**
 * Expose protected APIs to renderer process
 */
contextBridge.exposeInMainWorld('electron', {
  wallet: walletAPI,
  bookmarks: bookmarksAPI,
  history: historyAPI,
  notes: notesAPI,
  browser: browserAPI,
  downloads: downloadsAPI,
  session: sessionAPI,
  privacy: privacyAPI,
  tabSuspend: tabSuspendAPI,
  reader: readerAPI,
  txHistory: txHistoryAPI,
  window: windowAPI,
  events: eventsAPI,
  permissions: permissionsAPI,
  dapp: dappAPI,
  ui: uiAPI,
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Type definitions for TypeScript
export interface ElectronAPI {
  wallet: typeof walletAPI;
  bookmarks: typeof bookmarksAPI;
  history: typeof historyAPI;
  notes: typeof notesAPI;
  browser: typeof browserAPI;
  downloads: typeof downloadsAPI;
  session: typeof sessionAPI;
  privacy: typeof privacyAPI;
  tabSuspend: typeof tabSuspendAPI;
  reader: typeof readerAPI;
  txHistory: typeof txHistoryAPI;
  window: typeof windowAPI;
  events: typeof eventsAPI;
  permissions: typeof permissionsAPI;
  dapp: typeof dappAPI;
  ui: typeof uiAPI;
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
