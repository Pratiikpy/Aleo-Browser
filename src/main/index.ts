import path from 'path';
import {
  createMainWindow,
  getMainWindow,
  createBrowserView,
  createTab,
  switchTab,
  closeTab,
  getActiveTabId,
  getActiveBrowserView,
  getAllTabIds,
  navigateToUrl,
  navigateTab,
  goBack,
  goForward,
  reload,
  stopLoading,
  getCurrentUrl,
  getCurrentTitle,
  zoomIn,
  zoomOut,
  zoomReset,
  getZoomLevel,
  findInPage,
  stopFindInPage,
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
  isWindowMaximized,
  toggleFullScreen,
  isFullScreen
} from './window';
import { setupIpcHandlers } from './ipc';
import { setupDownloadHandler, getDownloads, cancelDownload, pauseDownload, resumeDownload } from './services/download.service';
import { sessionService } from './services/session.service';

// Lazy load electron modules to avoid initialization issues
let electronModule: typeof import('electron') | null = null;

function getElectron(): typeof import('electron') {
  if (!electronModule) {
    electronModule = require('electron');
  }
  return electronModule!;
}

/**
 * AleoBrowser - Privacy-first browser powered by Aleo
 * Main process entry point
 */

/**
 * Security configuration
 */
function setupSecurity(): void {
  const { app, session } = getElectron();

  // Disable hardware acceleration if needed for compatibility
  // app.disableHardwareAcceleration();

  // Set app user model ID for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.aleobrowser.app');
  }

  // Configure default session security
  app.whenReady().then(() => {
    const defaultSession = session.defaultSession;

    // Enable web security features
    defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowedPermissions = [
        'media',
        'geolocation',
        'notifications',
        'clipboard-read',
        'clipboard-write'
      ];

      if (allowedPermissions.includes(permission)) {
        // Request user permission through renderer
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('permission:request', {
            permission,
            url: webContents.getURL()
          });
        }
        callback(false); // Deny by default, approve through IPC if user accepts
      } else {
        callback(false);
      }
    });

    // Note: CSP is NOT applied to BrowserView content to allow normal web browsing
    // Only the main renderer UI should have strict CSP (handled by Electron's defaults)

    // Block ads and trackers (basic implementation)
    const adBlockFilters = [
      '*://*.doubleclick.net/*',
      '*://*.googleadservices.com/*',
      '*://*.googlesyndication.com/*',
      '*://*.google-analytics.com/*',
      '*://*.facebook.com/tr/*',
      '*://*.facebook.net/*'
    ];

    defaultSession.webRequest.onBeforeRequest({ urls: adBlockFilters }, (details, callback) => {
      callback({ cancel: true });
    });

    // Enable privacy features - but allow basic browsing
    defaultSession.setPermissionCheckHandler((webContents, permission) => {
      // Allow safe permissions for web browsing
      const allowedChecks = ['clipboard-read', 'clipboard-sanitized-write'];
      return allowedChecks.includes(permission);
    });

    // Setup download handler
    setupDownloadHandler(defaultSession);

    // Clear cache on app quit for privacy
    app.on('before-quit', () => {
      // Save session before quitting
      saveTabs();
      defaultSession.clearCache();
    });
  });
}

/**
 * Save current tabs for session restore
 */
function saveTabs(): void {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  const tabIds = getAllTabIds();
  const tabs: Array<{ id: string; url: string; title: string }> = [];

  for (const tabId of tabIds) {
    const view = require('./window').getBrowserView(tabId);
    if (view) {
      tabs.push({
        id: tabId,
        url: view.webContents.getURL() || '',
        title: view.webContents.getTitle() || 'New Tab'
      });
    }
  }

  sessionService.saveTabs(tabs);
}

/**
 * Setup window controls IPC handlers
 */
function setupWindowControls(): void {
  const { ipcMain } = getElectron();

  ipcMain.handle('window:minimize', () => {
    minimizeWindow();
    return { success: true };
  });

  ipcMain.handle('window:maximize', () => {
    toggleMaximizeWindow();
    return { success: true, isMaximized: isWindowMaximized() };
  });

  ipcMain.handle('window:close', () => {
    closeWindow();
    return { success: true };
  });

  ipcMain.handle('window:isMaximized', () => {
    return { isMaximized: isWindowMaximized() };
  });

  ipcMain.handle('window:toggleFullScreen', () => {
    toggleFullScreen();
    return { success: true, isFullScreen: isFullScreen() };
  });

  ipcMain.handle('window:isFullScreen', () => {
    return { isFullScreen: isFullScreen() };
  });
}

/**
 * Setup browser navigation IPC handlers
 */
function setupBrowserControls(): void {
  const { ipcMain } = getElectron();

  // Navigation
  ipcMain.handle('browser:navigate', (_event, url: string) => {
    try {
      navigateToUrl(url);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
    }
  });

  ipcMain.handle('browser:goBack', () => {
    goBack();
    return { success: true };
  });

  ipcMain.handle('browser:goForward', () => {
    goForward();
    return { success: true };
  });

  ipcMain.handle('browser:reload', () => {
    reload();
    return { success: true };
  });

  ipcMain.handle('browser:stop', () => {
    stopLoading();
    return { success: true };
  });

  ipcMain.handle('browser:getUrl', () => {
    return { url: getCurrentUrl() };
  });

  ipcMain.handle('browser:getTitle', () => {
    return { title: getCurrentTitle() };
  });

  // Multi-tab management
  ipcMain.handle('browser:createTab', (_event, tabId: string, url?: string) => {
    try {
      createTab(tabId, url);
      return { success: true, tabId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tab'
      };
    }
  });

  ipcMain.handle('browser:switchTab', (_event, tabId: string) => {
    try {
      const success = switchTab(tabId);
      return { success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch tab'
      };
    }
  });

  ipcMain.handle('browser:closeTab', (_event, tabId?: string) => {
    try {
      const id = tabId || getActiveTabId();
      if (id) {
        closeTab(id);
        return { success: true };
      }
      return { success: false, error: 'No tab to close' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close tab'
      };
    }
  });

  ipcMain.handle('browser:getActiveTabId', () => {
    return { tabId: getActiveTabId() };
  });

  ipcMain.handle('browser:getAllTabIds', () => {
    return { tabIds: getAllTabIds() };
  });

  ipcMain.handle('browser:navigateTab', (_event, tabId: string, url: string) => {
    try {
      const success = navigateTab(tabId, url);
      return { success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
    }
  });

  // Legacy newTab handler (for compatibility)
  ipcMain.handle('browser:newTab', (_event, url?: string) => {
    try {
      createBrowserView(url || 'about:blank');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tab'
      };
    }
  });

  // Zoom controls
  ipcMain.handle('browser:zoomIn', () => {
    zoomIn();
    return { success: true, zoomLevel: getZoomLevel() };
  });

  ipcMain.handle('browser:zoomOut', () => {
    zoomOut();
    return { success: true, zoomLevel: getZoomLevel() };
  });

  ipcMain.handle('browser:zoomReset', () => {
    zoomReset();
    return { success: true, zoomLevel: 0 };
  });

  ipcMain.handle('browser:getZoomLevel', () => {
    return { zoomLevel: getZoomLevel() };
  });

  // Find in page
  ipcMain.handle('browser:findInPage', (_event, text: string, options?: { forward?: boolean; findNext?: boolean }) => {
    try {
      findInPage(text, options);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Find failed' };
    }
  });

  ipcMain.handle('browser:stopFindInPage', (_event, action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => {
    stopFindInPage(action);
    return { success: true };
  });

  // Downloads
  ipcMain.handle('downloads:getAll', () => {
    return { downloads: getDownloads() };
  });

  ipcMain.handle('downloads:cancel', (_event, id: string) => {
    cancelDownload(id);
    return { success: true };
  });

  ipcMain.handle('downloads:pause', (_event, id: string) => {
    pauseDownload(id);
    return { success: true };
  });

  ipcMain.handle('downloads:resume', (_event, id: string) => {
    resumeDownload(id);
    return { success: true };
  });

  // Session restore
  ipcMain.handle('session:restore', () => {
    const tabs = sessionService.restoreTabs();
    return { tabs };
  });

  ipcMain.handle('session:save', () => {
    saveTabs();
    return { success: true };
  });

  ipcMain.handle('session:clear', () => {
    sessionService.clearSession();
    return { success: true };
  });
}

/**
 * Setup global keyboard shortcuts
 */
function setupKeyboardShortcuts(): void {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  // Register global shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl/Cmd + W - Close tab
    if ((input.control || input.meta) && input.key.toLowerCase() === 'w') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:closeTab');
    }

    // Ctrl/Cmd + T - New tab
    if ((input.control || input.meta) && input.key.toLowerCase() === 't') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:newTab');
    }

    // Ctrl/Cmd + L - Focus address bar
    if ((input.control || input.meta) && input.key.toLowerCase() === 'l') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:focusAddressBar');
    }

    // Ctrl/Cmd + R - Reload
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r' && !input.shift) {
      event.preventDefault();
      reload();
    }

    // Ctrl/Cmd + Shift + R - Hard reload
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'r') {
      event.preventDefault();
      const view = getActiveBrowserView();
      if (view) {
        view.webContents.reloadIgnoringCache();
      }
    }

    // Ctrl/Cmd + D - Bookmark current page
    if ((input.control || input.meta) && input.key.toLowerCase() === 'd') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:bookmark');
    }

    // Ctrl/Cmd + H - Show history
    if ((input.control || input.meta) && input.key.toLowerCase() === 'h') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:showHistory');
    }

    // Ctrl/Cmd + Shift + Delete - Clear browsing data
    if ((input.control || input.meta) && input.shift && input.key === 'Delete') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:clearData');
    }

    // Ctrl/Cmd + F - Find in page
    if ((input.control || input.meta) && input.key.toLowerCase() === 'f') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:findInPage');
    }

    // Escape - Stop find in page or close panels
    if (input.key === 'Escape') {
      mainWindow.webContents.send('shortcut:escape');
      stopFindInPage('clearSelection');
    }

    // Ctrl/Cmd + G - Find next
    if ((input.control || input.meta) && input.key.toLowerCase() === 'g' && !input.shift) {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:findNext');
    }

    // Ctrl/Cmd + Shift + G - Find previous
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'g') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:findPrevious');
    }

    // Ctrl/Cmd + Plus/= - Zoom in
    if ((input.control || input.meta) && (input.key === '+' || input.key === '=')) {
      event.preventDefault();
      zoomIn();
    }

    // Ctrl/Cmd + Minus - Zoom out
    if ((input.control || input.meta) && input.key === '-') {
      event.preventDefault();
      zoomOut();
    }

    // Ctrl/Cmd + 0 - Reset zoom
    if ((input.control || input.meta) && input.key === '0') {
      event.preventDefault();
      zoomReset();
    }

    // Ctrl/Cmd + Tab - Next tab
    if ((input.control || input.meta) && input.key === 'Tab' && !input.shift) {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:nextTab');
    }

    // Ctrl/Cmd + Shift + Tab - Previous tab
    if ((input.control || input.meta) && input.shift && input.key === 'Tab') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:prevTab');
    }

    // Ctrl/Cmd + 1-9 - Switch to specific tab
    if ((input.control || input.meta) && /^[1-9]$/.test(input.key)) {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:switchToTab', parseInt(input.key) - 1);
    }

    // Ctrl/Cmd + U - View source
    if ((input.control || input.meta) && input.key.toLowerCase() === 'u') {
      event.preventDefault();
      const view = getActiveBrowserView();
      if (view) {
        const url = view.webContents.getURL();
        if (url && !url.startsWith('view-source:')) {
          view.webContents.loadURL('view-source:' + url);
        }
      }
    }

    // Ctrl/Cmd + J - Downloads panel
    if ((input.control || input.meta) && input.key.toLowerCase() === 'j') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:showDownloads');
    }

    // F11 - Toggle fullscreen
    if (input.key === 'F11') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }

    // F12 - Toggle DevTools
    if (input.key === 'F12') {
      event.preventDefault();
      const view = getActiveBrowserView();
      if (view) {
        view.webContents.toggleDevTools();
      } else {
        mainWindow.webContents.toggleDevTools();
      }
    }

    // F5 - Reload
    if (input.key === 'F5') {
      event.preventDefault();
      reload();
    }

    // Alt + Left - Go back
    if (input.alt && input.key === 'ArrowLeft') {
      event.preventDefault();
      goBack();
    }

    // Alt + Right - Go forward
    if (input.alt && input.key === 'ArrowRight') {
      event.preventDefault();
      goForward();
    }

    // Ctrl/Cmd + Shift + T - Reopen closed tab (not implemented yet)
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 't') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut:reopenClosedTab');
    }
  });

  // Listen for find-in-page results
  const view = getActiveBrowserView();
  if (view) {
    view.webContents.on('found-in-page', (_event, result) => {
      mainWindow.webContents.send('findInPage:result', {
        matches: result.matches,
        activeMatchOrdinal: result.activeMatchOrdinal,
        finalUpdate: result.finalUpdate
      });
    });
  }
}

/**
 * Initialize the application
 */
function initialize(): void {
  const { app, BrowserWindow } = getElectron();

  // Setup security first
  setupSecurity();

  // Single instance lock
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    // Focus the main window if someone tries to run a second instance
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  // App ready handler
  app.whenReady().then(() => {
    console.log('AleoBrowser starting...');

    // Create main window
    const mainWindow = createMainWindow();

    // Setup IPC handlers
    setupIpcHandlers();
    setupWindowControls();
    setupBrowserControls();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Try to restore session, or create initial tab
    const restoredTabs = sessionService.restoreTabs();
    if (restoredTabs && restoredTabs.length > 0) {
      // Restore saved tabs
      restoredTabs.forEach((tab, index) => {
        createTab(tab.id, tab.url || 'https://aleo.org');
        if (index === 0) {
          switchTab(tab.id);
        }
      });
      console.log(`Restored ${restoredTabs.length} tabs from session`);
    } else {
      // Create initial browser view
      const initialTabId = Date.now().toString();
      createTab(initialTabId, 'https://aleo.org');
      switchTab(initialTabId);
    }

    console.log('AleoBrowser ready');

    // macOS: Re-create window when dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        const tabId = Date.now().toString();
        createTab(tabId, 'https://aleo.org');
        switchTab(tabId);
      }
    });
  });

  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Handle app quit
  app.on('before-quit', () => {
    console.log('AleoBrowser shutting down...');
    saveTabs();
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // In production, you might want to send this to a logging service
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    // In production, you might want to send this to a logging service
  });
}

// Start the application
initialize();

// Export for testing purposes
export { initialize };
