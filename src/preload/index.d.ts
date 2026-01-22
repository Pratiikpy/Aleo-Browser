/**
 * Preload script for secure IPC communication
 * Exposes safe APIs to the renderer process
 */
/**
 * Wallet API
 */
declare const walletAPI: {
    create: (password: string) => Promise<any>;
    import: (privateKey: string, password: string) => Promise<any>;
    getAddress: () => Promise<any>;
    getBalance: () => Promise<any>;
    send: (recipient: string, amount: number, memo?: string) => Promise<any>;
    lock: () => Promise<any>;
    unlock: (password: string) => Promise<any>;
    isLocked: () => Promise<any>;
};
/**
 * Bookmarks API
 */
declare const bookmarksAPI: {
    getAll: () => Promise<any>;
    add: (bookmark: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    syncToAleo: () => Promise<any>;
};
/**
 * History API
 */
declare const historyAPI: {
    getAll: (limit?: number) => Promise<any>;
    add: (entry: any) => Promise<any>;
    clear: () => Promise<any>;
    delete: (id: string) => Promise<any>;
};
/**
 * Browser API
 */
declare const browserAPI: {
    navigate: (url: string) => Promise<any>;
    goBack: () => Promise<any>;
    goForward: () => Promise<any>;
    reload: () => Promise<any>;
    stop: () => Promise<any>;
    getUrl: () => Promise<any>;
    getTitle: () => Promise<any>;
    newTab: (url?: string) => Promise<any>;
    closeTab: () => Promise<any>;
};
/**
 * Window API
 */
declare const windowAPI: {
    minimize: () => Promise<any>;
    maximize: () => Promise<any>;
    close: () => Promise<any>;
    isMaximized: () => Promise<any>;
};
/**
 * Events API (one-way communication from main to renderer)
 */
declare const eventsAPI: {
    onTabLoading: (callback: (loading: boolean) => void) => void;
    onTabNavigated: (callback: (data: any) => void) => void;
    onTabTitleUpdated: (callback: (title: string) => void) => void;
    onTabFaviconUpdated: (callback: (favicon: string) => void) => void;
    onTabError: (callback: (error: string) => void) => void;
    onTabNewWindow: (callback: (url: string) => void) => void;
    onWindowMaximized: (callback: (maximized: boolean) => void) => void;
    onWindowFocused: (callback: (focused: boolean) => void) => void;
    onPermissionRequest: (callback: (data: any) => void) => void;
    onShortcutCloseTab: (callback: () => void) => void;
    onShortcutNewTab: (callback: () => void) => void;
    onShortcutFocusAddressBar: (callback: () => void) => void;
    onShortcutBookmark: (callback: () => void) => void;
    onShortcutShowHistory: (callback: () => void) => void;
    onShortcutClearData: (callback: () => void) => void;
    removeAllListeners: () => void;
};
export interface ElectronAPI {
    wallet: typeof walletAPI;
    bookmarks: typeof bookmarksAPI;
    history: typeof historyAPI;
    browser: typeof browserAPI;
    window: typeof windowAPI;
    events: typeof eventsAPI;
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
export {};
//# sourceMappingURL=index.d.ts.map