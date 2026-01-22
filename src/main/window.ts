import path from 'path';

// Lazy load electron modules to avoid initialization issues
let electronModule: typeof import('electron') | null = null;

function getElectron(): typeof import('electron') {
  if (!electronModule) {
    electronModule = require('electron');
  }
  return electronModule!;
}

/**
 * Window configuration
 */
const WINDOW_CONFIG = {
  minWidth: 1024,
  minHeight: 768,
  defaultWidth: 1400,
  defaultHeight: 900,
  backgroundColor: '#0a0a0f',
  // UI Bar heights:
  // - Titlebar: 32px (h-8)
  // - TabBar: 40px (h-10)
  // - Navigation: 48px (h-12)
  // Total top offset: 120px
  titleBarHeight: 120,
  // StatusBar at bottom: 24px (h-6)
  statusBarHeight: 24
};

const VITE_DEV_SERVER_URL = 'http://localhost:5173';

function isDev(): boolean {
  const { app } = getElectron();
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

/**
 * Global references
 */
let mainWindow: Electron.BrowserWindow | null = null;

// Multi-tab BrowserView system - each tab has its own isolated BrowserView
const browserViews: Map<string, Electron.BrowserView> = new Map();
let activeTabId: string | null = null;

// Tab zoom levels (per-tab zoom memory)
const tabZoomLevels: Map<string, number> = new Map();

// Suspended tabs - store URL to reload when unsuspended
interface SuspendedTabState {
  url: string;
  title: string;
  favicon?: string;
  zoomLevel: number;
}
const suspendedTabStates: Map<string, SuspendedTabState> = new Map();

// Find in page state
let findInPageActive = false;

// Right sidebar width (wallet panel) - used to offset BrowserView bounds
let rightSidebarWidth = 0;

// Track if a modal is open (hide BrowserView completely)
let modalOpen = false;

// Track overlay adjustments for partial overlays (panels, bars)
let overlayConfig = {
  topHeight: 0,
  bottomHeight: 0,
  leftWidth: 0,
  rightWidth: 0
};

// Tab suspend service (lazy loaded)
let tabSuspendService: any = null;
function getTabSuspendService() {
  if (!tabSuspendService) {
    const { tabSuspendService: service } = require('./services/tab-suspend.service');
    tabSuspendService = service;
  }
  return tabSuspendService;
}

/**
 * Create the main application window
 */
export function createMainWindow(): Electron.BrowserWindow {
  const { BrowserWindow, screen, nativeTheme } = getElectron();

  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Calculate centered position
  const windowWidth = Math.min(WINDOW_CONFIG.defaultWidth, width);
  const windowHeight = Math.min(WINDOW_CONFIG.defaultHeight, height);
  const x = Math.floor((width - windowWidth) / 2);
  const y = Math.floor((height - windowHeight) / 2);

  // Create the browser window
  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    minWidth: WINDOW_CONFIG.minWidth,
    minHeight: WINDOW_CONFIG.minHeight,
    frame: false,
    backgroundColor: WINDOW_CONFIG.backgroundColor,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  // Force dark theme
  nativeTheme.themeSource = 'dark';

  // Load the renderer
  if (isDev()) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Show window when ready
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Handle window close
  win.on('closed', () => {
    mainWindow = null;
    // Clean up all browser views
    browserViews.forEach((view) => {
      try {
        (view.webContents as any).destroy();
      } catch (e) {
        // View may already be destroyed
      }
    });
    browserViews.clear();
    activeTabId = null;
  });

  // Handle window resize - update active BrowserView bounds
  win.on('resize', () => {
    updateActiveBrowserViewBounds();
  });

  // Handle window state changes
  win.on('maximize', () => {
    win.webContents.send('window:maximized', true);
    updateActiveBrowserViewBounds();
  });

  win.on('unmaximize', () => {
    win.webContents.send('window:maximized', false);
    updateActiveBrowserViewBounds();
  });

  win.on('focus', () => {
    win.webContents.send('window:focused', true);
  });

  win.on('blur', () => {
    win.webContents.send('window:focused', false);
  });

  // Prevent navigation in main window
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow = win;
  return win;
}

/**
 * Update the bounds of the active BrowserView
 */
function updateActiveBrowserViewBounds(): void {
  if (!mainWindow || !activeTabId) return;
  if (modalOpen) return; // Don't update if modal is hiding it

  const view = browserViews.get(activeTabId);
  if (!view) return;

  const bounds = mainWindow.getBounds();
  const topOffset = WINDOW_CONFIG.titleBarHeight + overlayConfig.topHeight;
  const bottomOffset = WINDOW_CONFIG.statusBarHeight + overlayConfig.bottomHeight;
  const effectiveRightWidth = Math.max(rightSidebarWidth, overlayConfig.rightWidth);

  view.setBounds({
    x: overlayConfig.leftWidth,
    y: topOffset,
    width: bounds.width - overlayConfig.leftWidth - effectiveRightWidth,
    height: bounds.height - topOffset - bottomOffset
  });
}

/**
 * Set the right sidebar width (for wallet panel) and update BrowserView bounds
 */
export function setRightSidebarWidth(width: number): void {
  rightSidebarWidth = width;
  updateActiveBrowserViewBounds();
}

/**
 * Hide BrowserView completely (for full-screen modals)
 * When visible=false, BrowserView is moved off-screen
 * When visible=true, BrowserView bounds are restored
 */
export function setBrowserViewVisible(visible: boolean): void {
  modalOpen = !visible;
  if (!mainWindow || !activeTabId) return;

  const view = browserViews.get(activeTabId);
  if (!view) return;

  if (!visible) {
    // Move off-screen to hide completely
    view.setBounds({ x: -10000, y: -10000, width: 0, height: 0 });
  } else {
    // Restore normal bounds
    updateActiveBrowserViewBounds();
  }
}

/**
 * Adjust BrowserView bounds for partial overlays (panels, bars)
 * Use this for floating panels that don't cover the entire screen
 */
export function adjustBrowserViewBounds(config: {
  topHeight?: number;
  bottomHeight?: number;
  rightWidth?: number;
}): void {
  overlayConfig = {
    topHeight: config.topHeight || 0,
    bottomHeight: config.bottomHeight || 0,
    leftWidth: 0,
    rightWidth: config.rightWidth || 0
  };
  updateActiveBrowserViewBounds();
}

/**
 * Get the main window instance
 */
export function getMainWindow(): Electron.BrowserWindow | null {
  return mainWindow;
}

/**
 * Create a new tab with its own isolated BrowserView
 */
export function createTab(tabId: string, url?: string): Electron.BrowserView {
  const { BrowserView, Menu, clipboard, shell } = getElectron();

  if (!mainWindow) {
    throw new Error('Main window not created');
  }

  // Create new browser view with dApp preload script
  const browserView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload/dapp-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      autoplayPolicy: 'user-gesture-required' // Block autoplay videos
    }
  });

  // Store the view
  browserViews.set(tabId, browserView);
  tabZoomLevels.set(tabId, 0);

  // Position browser view
  const bounds = mainWindow.getBounds();
  browserView.setBounds({
    x: 0,
    y: WINDOW_CONFIG.titleBarHeight,
    width: bounds.width,
    height: bounds.height - WINDOW_CONFIG.titleBarHeight - WINDOW_CONFIG.statusBarHeight
  });

  // Setup context menu (right-click)
  browserView.webContents.on('context-menu', (_event, params) => {
    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    // Navigation items
    menuItems.push(
      { label: 'Back', click: () => browserView.webContents.goBack(), enabled: browserView.webContents.canGoBack() },
      { label: 'Forward', click: () => browserView.webContents.goForward(), enabled: browserView.webContents.canGoForward() },
      { label: 'Reload', click: () => browserView.webContents.reload() },
      { type: 'separator' }
    );

    // Text selection items
    if (params.selectionText) {
      menuItems.push(
        { label: 'Copy', role: 'copy' },
        { label: 'Search Google for "' + params.selectionText.slice(0, 20) + (params.selectionText.length > 20 ? '...' : '') + '"',
          click: () => browserView.webContents.loadURL(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`) },
        { type: 'separator' }
      );
    }

    // Editable field items
    if (params.isEditable) {
      menuItems.push(
        { label: 'Cut', role: 'cut', enabled: params.selectionText.length > 0 },
        { label: 'Copy', role: 'copy', enabled: params.selectionText.length > 0 },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' },
        { type: 'separator' }
      );
    }

    // Image items
    if (params.mediaType === 'image') {
      menuItems.push(
        { label: 'Save Image As...', click: () => mainWindow?.webContents.send('download:start', params.srcURL) },
        { label: 'Copy Image Address', click: () => clipboard.writeText(params.srcURL) },
        { label: 'Open Image in New Tab', click: () => mainWindow?.webContents.send('tab:new-window', params.srcURL) },
        { type: 'separator' }
      );
    }

    // Link items
    if (params.linkURL) {
      menuItems.push(
        { label: 'Open Link in New Tab', click: () => mainWindow?.webContents.send('tab:new-window', params.linkURL) },
        { label: 'Copy Link Address', click: () => clipboard.writeText(params.linkURL) },
        { type: 'separator' }
      );
    }

    // Page items
    menuItems.push(
      { label: 'View Page Source', click: () => browserView.webContents.loadURL('view-source:' + browserView.webContents.getURL()) },
      { label: 'Inspect Element', click: () => browserView.webContents.inspectElement(params.x, params.y) }
    );

    const menu = Menu.buildFromTemplate(menuItems);
    menu.popup();
  });

  // Navigation events - scoped to this specific tab
  browserView.webContents.on('did-start-loading', () => {
    if (activeTabId === tabId) {
      mainWindow?.webContents.send('tab:loading', true, tabId);
    }
  });

  browserView.webContents.on('did-stop-loading', () => {
    if (activeTabId === tabId) {
      mainWindow?.webContents.send('tab:loading', false, tabId);
    }
  });

  browserView.webContents.on('did-navigate', (_event: Electron.Event, navUrl: string) => {
    mainWindow?.webContents.send('tab:navigated', {
      tabId,
      url: navUrl,
      title: browserView.webContents.getTitle(),
      canGoBack: browserView.webContents.canGoBack(),
      canGoForward: browserView.webContents.canGoForward()
    });
  });

  browserView.webContents.on('did-navigate-in-page', (_event: Electron.Event, navUrl: string) => {
    mainWindow?.webContents.send('tab:navigated', {
      tabId,
      url: navUrl,
      title: browserView.webContents.getTitle(),
      canGoBack: browserView.webContents.canGoBack(),
      canGoForward: browserView.webContents.canGoForward()
    });
  });

  browserView.webContents.on('page-title-updated', (_event: Electron.Event, title: string) => {
    mainWindow?.webContents.send('tab:title-updated', title, tabId);
  });

  browserView.webContents.on('page-favicon-updated', (_event: Electron.Event, favicons: string[]) => {
    if (favicons.length > 0) {
      mainWindow?.webContents.send('tab:favicon-updated', favicons[0], tabId);
    }
  });

  browserView.webContents.setWindowOpenHandler(({ url: newUrl }: { url: string }) => {
    mainWindow?.webContents.send('tab:new-window', newUrl);
    return { action: 'deny' };
  });

  // Load URL if provided
  if (url && url.trim()) {
    const formattedUrl = formatUrl(url);
    browserView.webContents.loadURL(formattedUrl).catch((error: Error) => {
      console.error('Failed to load URL:', error);
      // Escape HTML to prevent XSS from error messages
      const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
      browserView.webContents.loadURL(`data:text/html,<html><body style="background:#0a0a0f;color:#fff;font-family:system-ui;padding:40px;"><h1>Failed to load page</h1><p>${escapeHtml(error.message)}</p></body></html>`);
    });
  }

  return browserView;
}

/**
 * Switch to a specific tab
 */
export function switchTab(tabId: string): boolean {
  if (!mainWindow) return false;

  // Check if tab is suspended - unsuspend it first
  if (suspendedTabStates.has(tabId)) {
    const view = unsuspendTab(tabId);
    if (!view) {
      console.error('[Tab Switch] Failed to unsuspend tab:', tabId);
      return false;
    }
  }

  const view = browserViews.get(tabId);
  if (!view) return false;

  // Hide current tab's view
  if (activeTabId && activeTabId !== tabId) {
    const currentView = browserViews.get(activeTabId);
    if (currentView) {
      mainWindow.removeBrowserView(currentView);
    }
  }

  // Show the new tab's view
  mainWindow.addBrowserView(view);
  activeTabId = tabId;

  // Record tab activity for auto-suspend tracking
  try {
    const service = getTabSuspendService();
    service.recordTabActivity(tabId);
  } catch (e) {
    // Service not available
  }

  // Update bounds and restore zoom level
  updateActiveBrowserViewBounds();
  const zoomLevel = tabZoomLevels.get(tabId) || 0;
  view.webContents.setZoomLevel(zoomLevel);

  // Send current state to renderer
  mainWindow.webContents.send('tab:navigated', {
    tabId,
    url: view.webContents.getURL(),
    title: view.webContents.getTitle(),
    canGoBack: view.webContents.canGoBack(),
    canGoForward: view.webContents.canGoForward()
  });

  return true;
}

/**
 * Close a specific tab
 */
export function closeTab(tabId: string): boolean {
  // Check if it's a suspended tab
  if (suspendedTabStates.has(tabId)) {
    suspendedTabStates.delete(tabId);
    tabZoomLevels.delete(tabId);

    // Clean up in suspend service
    try {
      const service = getTabSuspendService();
      service.removeTab(tabId);
    } catch (e) {
      // Service not available
    }

    return true;
  }

  const view = browserViews.get(tabId);
  if (!view) return false;

  // Remove from window if it's the active view
  if (mainWindow && activeTabId === tabId) {
    mainWindow.removeBrowserView(view);
    activeTabId = null;
  }

  // Destroy the view
  try {
    (view.webContents as any).destroy();
  } catch (e) {
    // View may already be destroyed
  }

  browserViews.delete(tabId);
  tabZoomLevels.delete(tabId);

  // Clean up in suspend service
  try {
    const service = getTabSuspendService();
    service.removeTab(tabId);
  } catch (e) {
    // Service not available
  }

  return true;
}

/**
 * Get the active tab ID
 */
export function getActiveTabId(): string | null {
  return activeTabId;
}

/**
 * Get a BrowserView by tab ID
 */
export function getBrowserView(tabId: string): Electron.BrowserView | null {
  return browserViews.get(tabId) || null;
}

/**
 * Get the active BrowserView
 */
export function getActiveBrowserView(): Electron.BrowserView | null {
  if (!activeTabId) return null;
  return browserViews.get(activeTabId) || null;
}

/**
 * Navigate to URL in active tab
 */
export function navigateToUrl(url: string): void {
  const view = getActiveBrowserView();
  if (!view) {
    // Create a new tab if none exists
    const tabId = Date.now().toString();
    createTab(tabId, url);
    switchTab(tabId);
    return;
  }

  const formattedUrl = formatUrl(url);
  view.webContents.loadURL(formattedUrl).catch((error: Error) => {
    console.error('Navigation failed:', error);
    mainWindow?.webContents.send('tab:error', error.message);
  });
}

/**
 * Navigate a specific tab to URL
 */
export function navigateTab(tabId: string, url: string): boolean {
  const view = browserViews.get(tabId);
  if (!view) return false;

  const formattedUrl = formatUrl(url);
  view.webContents.loadURL(formattedUrl).catch((error: Error) => {
    console.error('Navigation failed:', error);
    mainWindow?.webContents.send('tab:error', error.message, tabId);
  });

  return true;
}

/**
 * Go back in active tab
 */
export function goBack(): void {
  const view = getActiveBrowserView();
  if (view?.webContents.canGoBack()) {
    view.webContents.goBack();
  }
}

/**
 * Go forward in active tab
 */
export function goForward(): void {
  const view = getActiveBrowserView();
  if (view?.webContents.canGoForward()) {
    view.webContents.goForward();
  }
}

/**
 * Reload active tab
 */
export function reload(): void {
  const view = getActiveBrowserView();
  view?.webContents.reload();
}

/**
 * Stop loading in active tab
 */
export function stopLoading(): void {
  const view = getActiveBrowserView();
  if (view?.webContents.isLoading()) {
    view.webContents.stop();
  }
}

/**
 * Get current URL of active tab
 */
export function getCurrentUrl(): string {
  const view = getActiveBrowserView();
  return view?.webContents.getURL() || '';
}

/**
 * Get current title of active tab
 */
export function getCurrentTitle(): string {
  const view = getActiveBrowserView();
  return view?.webContents.getTitle() || '';
}

/**
 * Zoom in active tab
 */
export function zoomIn(): void {
  const view = getActiveBrowserView();
  if (!view || !activeTabId) return;

  const currentZoom = view.webContents.getZoomLevel();
  const newZoom = Math.min(currentZoom + 0.5, 5);
  view.webContents.setZoomLevel(newZoom);
  tabZoomLevels.set(activeTabId, newZoom);
  mainWindow?.webContents.send('tab:zoom-changed', newZoom, activeTabId);
}

/**
 * Zoom out active tab
 */
export function zoomOut(): void {
  const view = getActiveBrowserView();
  if (!view || !activeTabId) return;

  const currentZoom = view.webContents.getZoomLevel();
  const newZoom = Math.max(currentZoom - 0.5, -5);
  view.webContents.setZoomLevel(newZoom);
  tabZoomLevels.set(activeTabId, newZoom);
  mainWindow?.webContents.send('tab:zoom-changed', newZoom, activeTabId);
}

/**
 * Reset zoom in active tab
 */
export function zoomReset(): void {
  const view = getActiveBrowserView();
  if (!view || !activeTabId) return;

  view.webContents.setZoomLevel(0);
  tabZoomLevels.set(activeTabId, 0);
  mainWindow?.webContents.send('tab:zoom-changed', 0, activeTabId);
}

/**
 * Get zoom level for active tab
 */
export function getZoomLevel(): number {
  const view = getActiveBrowserView();
  return view?.webContents.getZoomLevel() || 0;
}

/**
 * Find in page
 */
export function findInPage(text: string, options?: { forward?: boolean; findNext?: boolean }): void {
  const view = getActiveBrowserView();
  if (!view || !text) return;

  findInPageActive = true;
  view.webContents.findInPage(text, {
    forward: options?.forward ?? true,
    findNext: options?.findNext ?? false
  });
}

/**
 * Stop find in page
 */
export function stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection' = 'clearSelection'): void {
  const view = getActiveBrowserView();
  if (!view) return;

  findInPageActive = false;
  view.webContents.stopFindInPage(action);
}

/**
 * Check if find in page is active
 */
export function isFindInPageActive(): boolean {
  return findInPageActive;
}

/**
 * Format URL with HTTPS Everywhere support
 */
function formatUrl(input: string): string {
  const trimmed = input.trim();

  let url: string;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    url = trimmed;
  } else if (trimmed.includes('.') && !trimmed.includes(' ')) {
    url = `https://${trimmed}`;
  } else {
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  // Apply HTTPS Everywhere upgrade if applicable
  try {
    const { privacyService } = require('./services/privacy.service');
    const upgradedUrl = privacyService.shouldUpgradeToHttps(url);
    if (upgradedUrl) {
      return upgradedUrl;
    }
  } catch (error) {
    // Privacy service not available, continue without HTTPS upgrade
    console.warn('[HTTPS Everywhere] Service not available:', error);
  }

  return url;
}

/**
 * Close browser view (legacy - for compatibility)
 */
export function closeBrowserView(): void {
  if (!activeTabId) return;
  closeTab(activeTabId);
}

/**
 * Create browser view (legacy - for compatibility)
 */
export function createBrowserView(url: string): Electron.BrowserView {
  const tabId = Date.now().toString();
  const view = createTab(tabId, url);
  switchTab(tabId);
  return view;
}

/**
 * Get all tab IDs
 */
export function getAllTabIds(): string[] {
  return Array.from(browserViews.keys());
}

/**
 * Minimize window
 */
export function minimizeWindow(): void {
  mainWindow?.minimize();
}

/**
 * Toggle maximize
 */
export function toggleMaximizeWindow(): void {
  if (!mainWindow) return;

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
}

/**
 * Close window
 */
export function closeWindow(): void {
  mainWindow?.close();
}

/**
 * Check if maximized
 */
export function isWindowMaximized(): boolean {
  return mainWindow?.isMaximized() || false;
}

/**
 * Toggle fullscreen
 */
export function toggleFullScreen(): void {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
}

/**
 * Check if fullscreen
 */
export function isFullScreen(): boolean {
  return mainWindow?.isFullScreen() || false;
}

/**
 * Suspend a tab to free memory
 * Stores the URL and destroys the webContents
 */
export function suspendTab(tabId: string): boolean {
  const view = browserViews.get(tabId);
  if (!view) return false;

  // Don't suspend the active tab
  if (tabId === activeTabId) {
    console.log('[Tab Suspend] Cannot suspend active tab');
    return false;
  }

  // Store the current state before suspending
  const url = view.webContents.getURL();
  const title = view.webContents.getTitle();
  const zoomLevel = tabZoomLevels.get(tabId) || 0;

  // Check if already suspended
  if (suspendedTabStates.has(tabId)) {
    console.log('[Tab Suspend] Tab already suspended:', tabId);
    return true;
  }

  // Store the suspended state
  suspendedTabStates.set(tabId, {
    url,
    title,
    zoomLevel
  });

  // Notify the suspend service
  try {
    const service = getTabSuspendService();
    service.suspendTab(tabId, url, title);
  } catch (e) {
    console.warn('[Tab Suspend] Service not available:', e);
  }

  // Destroy the webContents to free memory
  try {
    // Remove from window first
    if (mainWindow) {
      mainWindow.removeBrowserView(view);
    }
    (view.webContents as any).destroy();
  } catch (e) {
    console.error('[Tab Suspend] Error destroying webContents:', e);
  }

  // Remove from browserViews but keep track that we have a suspended tab
  browserViews.delete(tabId);

  // Notify renderer about suspension
  mainWindow?.webContents.send('tab:suspended', tabId, { url, title });

  console.log(`[Tab Suspend] Tab ${tabId} suspended: ${url}`);
  return true;
}

/**
 * Unsuspend a tab - recreate the BrowserView and reload the URL
 */
export function unsuspendTab(tabId: string): Electron.BrowserView | null {
  const suspendedState = suspendedTabStates.get(tabId);
  if (!suspendedState) {
    console.log('[Tab Suspend] Tab not suspended:', tabId);
    return browserViews.get(tabId) || null;
  }

  // Recreate the tab with the stored URL
  const view = createTab(tabId, suspendedState.url);

  // Restore zoom level
  if (suspendedState.zoomLevel !== 0) {
    view.webContents.setZoomLevel(suspendedState.zoomLevel);
    tabZoomLevels.set(tabId, suspendedState.zoomLevel);
  }

  // Clear the suspended state
  suspendedTabStates.delete(tabId);

  // Notify the suspend service
  try {
    const service = getTabSuspendService();
    service.unsuspendTab(tabId);
  } catch (e) {
    console.warn('[Tab Suspend] Service not available:', e);
  }

  // Notify renderer
  mainWindow?.webContents.send('tab:unsuspended', tabId);

  console.log(`[Tab Suspend] Tab ${tabId} unsuspended: ${suspendedState.url}`);
  return view;
}

/**
 * Check if a tab is suspended
 */
export function isTabSuspended(tabId: string): boolean {
  return suspendedTabStates.has(tabId);
}

/**
 * Get suspended tab info
 */
export function getSuspendedTabState(tabId: string): SuspendedTabState | null {
  return suspendedTabStates.get(tabId) || null;
}

/**
 * Get all suspended tab IDs
 */
export function getSuspendedTabIds(): string[] {
  return Array.from(suspendedTabStates.keys());
}

/**
 * Get memory saver stats
 */
export function getMemorySaverStats(): {
  suspendedCount: number;
  estimatedMemorySavedMB: number;
} {
  const suspendedCount = suspendedTabStates.size;
  // Estimate ~50MB saved per suspended tab
  return {
    suspendedCount,
    estimatedMemorySavedMB: suspendedCount * 50
  };
}

/**
 * Auto-suspend inactive tabs
 * Called periodically to check for tabs that should be suspended
 */
export function checkAutoSuspend(excludeTabIds: string[] = []): string[] {
  const suspendedTabs: string[] = [];

  try {
    const service = getTabSuspendService();
    if (!service.isEnabled()) {
      return suspendedTabs;
    }

    // Check each tab
    browserViews.forEach((view, tabId) => {
      // Skip active tab and excluded tabs
      if (tabId === activeTabId || excludeTabIds.includes(tabId)) {
        return;
      }

      const url = view.webContents.getURL();
      if (service.shouldAutoSuspend(tabId, url)) {
        if (suspendTab(tabId)) {
          suspendedTabs.push(tabId);
        }
      }
    });
  } catch (e) {
    console.warn('[Tab Suspend] Auto-suspend check failed:', e);
  }

  return suspendedTabs;
}

/**
 * Initialize auto-suspend timer
 */
export function initAutoSuspend(): void {
  try {
    const service = getTabSuspendService();
    service.startAutoSuspend(() => {
      const suspended = checkAutoSuspend();
      if (suspended.length > 0) {
        console.log(`[Tab Suspend] Auto-suspended ${suspended.length} tabs`);
      }
    });
  } catch (e) {
    console.warn('[Tab Suspend] Failed to init auto-suspend:', e);
  }
}
