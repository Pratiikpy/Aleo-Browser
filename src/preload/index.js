"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/**
 * Preload script for secure IPC communication
 * Exposes safe APIs to the renderer process
 */
/**
 * Wallet API
 */
const walletAPI = {
    create: (password) => electron_1.ipcRenderer.invoke('wallet:create', password),
    import: (privateKey, password) => electron_1.ipcRenderer.invoke('wallet:import', privateKey, password),
    getAddress: () => electron_1.ipcRenderer.invoke('wallet:getAddress'),
    getBalance: () => electron_1.ipcRenderer.invoke('wallet:getBalance'),
    send: (recipient, amount, memo) => electron_1.ipcRenderer.invoke('wallet:send', { recipient, amount, memo }),
    lock: () => electron_1.ipcRenderer.invoke('wallet:lock'),
    unlock: (password) => electron_1.ipcRenderer.invoke('wallet:unlock', password),
    isLocked: () => electron_1.ipcRenderer.invoke('wallet:isLocked')
};
/**
 * Bookmarks API
 */
const bookmarksAPI = {
    getAll: () => electron_1.ipcRenderer.invoke('bookmarks:getAll'),
    add: (bookmark) => electron_1.ipcRenderer.invoke('bookmarks:add', bookmark),
    update: (id, updates) => electron_1.ipcRenderer.invoke('bookmarks:update', id, updates),
    delete: (id) => electron_1.ipcRenderer.invoke('bookmarks:delete', id),
    syncToAleo: () => electron_1.ipcRenderer.invoke('bookmarks:syncToAleo')
};
/**
 * History API
 */
const historyAPI = {
    getAll: (limit) => electron_1.ipcRenderer.invoke('history:getAll', limit),
    add: (entry) => electron_1.ipcRenderer.invoke('history:add', entry),
    clear: () => electron_1.ipcRenderer.invoke('history:clear'),
    delete: (id) => electron_1.ipcRenderer.invoke('history:delete', id)
};
/**
 * Browser API
 */
const browserAPI = {
    navigate: (url) => electron_1.ipcRenderer.invoke('browser:navigate', url),
    goBack: () => electron_1.ipcRenderer.invoke('browser:goBack'),
    goForward: () => electron_1.ipcRenderer.invoke('browser:goForward'),
    reload: () => electron_1.ipcRenderer.invoke('browser:reload'),
    stop: () => electron_1.ipcRenderer.invoke('browser:stop'),
    getUrl: () => electron_1.ipcRenderer.invoke('browser:getUrl'),
    getTitle: () => electron_1.ipcRenderer.invoke('browser:getTitle'),
    newTab: (url) => electron_1.ipcRenderer.invoke('browser:newTab', url),
    closeTab: () => electron_1.ipcRenderer.invoke('browser:closeTab')
};
/**
 * Window API
 */
const windowAPI = {
    minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
    maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
    close: () => electron_1.ipcRenderer.invoke('window:close'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized')
};
/**
 * Events API (one-way communication from main to renderer)
 */
const eventsAPI = {
    onTabLoading: (callback) => {
        electron_1.ipcRenderer.on('tab:loading', (_event, loading) => callback(loading));
    },
    onTabNavigated: (callback) => {
        electron_1.ipcRenderer.on('tab:navigated', (_event, data) => callback(data));
    },
    onTabTitleUpdated: (callback) => {
        electron_1.ipcRenderer.on('tab:title-updated', (_event, title) => callback(title));
    },
    onTabFaviconUpdated: (callback) => {
        electron_1.ipcRenderer.on('tab:favicon-updated', (_event, favicon) => callback(favicon));
    },
    onTabError: (callback) => {
        electron_1.ipcRenderer.on('tab:error', (_event, error) => callback(error));
    },
    onTabNewWindow: (callback) => {
        electron_1.ipcRenderer.on('tab:new-window', (_event, url) => callback(url));
    },
    onWindowMaximized: (callback) => {
        electron_1.ipcRenderer.on('window:maximized', (_event, maximized) => callback(maximized));
    },
    onWindowFocused: (callback) => {
        electron_1.ipcRenderer.on('window:focused', (_event, focused) => callback(focused));
    },
    onPermissionRequest: (callback) => {
        electron_1.ipcRenderer.on('permission:request', (_event, data) => callback(data));
    },
    onShortcutCloseTab: (callback) => {
        electron_1.ipcRenderer.on('shortcut:closeTab', () => callback());
    },
    onShortcutNewTab: (callback) => {
        electron_1.ipcRenderer.on('shortcut:newTab', () => callback());
    },
    onShortcutFocusAddressBar: (callback) => {
        electron_1.ipcRenderer.on('shortcut:focusAddressBar', () => callback());
    },
    onShortcutBookmark: (callback) => {
        electron_1.ipcRenderer.on('shortcut:bookmark', () => callback());
    },
    onShortcutShowHistory: (callback) => {
        electron_1.ipcRenderer.on('shortcut:showHistory', () => callback());
    },
    onShortcutClearData: (callback) => {
        electron_1.ipcRenderer.on('shortcut:clearData', () => callback());
    },
    removeAllListeners: () => {
        electron_1.ipcRenderer.removeAllListeners('tab:loading');
        electron_1.ipcRenderer.removeAllListeners('tab:navigated');
        electron_1.ipcRenderer.removeAllListeners('tab:title-updated');
        electron_1.ipcRenderer.removeAllListeners('tab:favicon-updated');
        electron_1.ipcRenderer.removeAllListeners('tab:error');
        electron_1.ipcRenderer.removeAllListeners('tab:new-window');
        electron_1.ipcRenderer.removeAllListeners('window:maximized');
        electron_1.ipcRenderer.removeAllListeners('window:focused');
        electron_1.ipcRenderer.removeAllListeners('permission:request');
        electron_1.ipcRenderer.removeAllListeners('shortcut:closeTab');
        electron_1.ipcRenderer.removeAllListeners('shortcut:newTab');
        electron_1.ipcRenderer.removeAllListeners('shortcut:focusAddressBar');
        electron_1.ipcRenderer.removeAllListeners('shortcut:bookmark');
        electron_1.ipcRenderer.removeAllListeners('shortcut:showHistory');
        electron_1.ipcRenderer.removeAllListeners('shortcut:clearData');
    }
};
/**
 * Expose protected APIs to renderer process
 */
electron_1.contextBridge.exposeInMainWorld('electron', {
    wallet: walletAPI,
    bookmarks: bookmarksAPI,
    history: historyAPI,
    browser: browserAPI,
    window: windowAPI,
    events: eventsAPI,
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});
//# sourceMappingURL=index.js.map