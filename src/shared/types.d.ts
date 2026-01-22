/**
 * Shared type definitions for AleoBrowser
 */
export interface AleoWallet {
    address: string;
    privateKey: string;
    viewKey: string;
}
export interface AleoBalance {
    public: number;
    private: number;
}
export interface AleoRecord {
    id: string;
    owner: string;
    data: Record<string, unknown>;
    nonce: string;
}
export interface AleoTransaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    fee: number;
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
}
export interface Bookmark {
    id: string;
    title: string;
    url: string;
    favicon?: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    folderId?: string;
    isFavorite?: boolean;
}
export interface BookmarkFolder {
    id: string;
    name: string;
    parentId?: string;
    createdAt: number;
    updatedAt: number;
    isExpanded?: boolean;
}
export interface HistoryEntry {
    id: string;
    url: string;
    title: string;
    visitedAt: number;
    favicon?: string;
}
export interface PrivacyStats {
    trackersBlocked: number;
    adsBlocked: number;
    fingerprintingBlocked: number;
    totalBlocked: number;
}
export interface WalletState {
    isUnlocked: boolean;
    hasWallet: boolean;
    address?: string;
}
export interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
    salt: string;
}
export interface EncryptedWallet {
    data: EncryptedData;
    passwordHash: string;
    createdAt: number;
    lastAccessed: number;
}
export interface ExecuteProgramParams {
    programId: string;
    functionName: string;
    inputs: string[];
    fee: number;
    privateKey: string;
}
export interface TransferParams {
    privateKey: string;
    to: string;
    amount: number;
    fee?: number;
}
/**
 * IPC Response types
 */
export interface WalletResponse {
    success: boolean;
    address?: string;
    error?: string;
}
export interface BalanceResponse {
    success: boolean;
    balance?: number;
    error?: string;
}
export interface TransactionResponse {
    success: boolean;
    txHash?: string;
    error?: string;
}
export interface BookmarkResponse {
    success: boolean;
    bookmark?: Bookmark;
    error?: string;
}
export interface BaseResponse {
    success: boolean;
    error?: string;
}
/**
 * Navigation types
 */
export interface NavigationState {
    url: string;
    title: string;
    canGoBack: boolean;
    canGoForward: boolean;
    isLoading: boolean;
    favicon?: string;
}
export interface TabInfo {
    id: string;
    url: string;
    title: string;
    favicon?: string;
    isActive: boolean;
    isLoading: boolean;
}
/**
 * Permission types
 */
export interface PermissionRequest {
    permission: string;
    url: string;
}
/**
 * Constants
 */
export declare const CONSTANTS: {
    readonly APP_NAME: "AleoBrowser";
    readonly MIN_PASSWORD_LENGTH: 8;
    readonly AUTO_LOCK_DURATION: number;
    readonly MAX_HISTORY_ENTRIES: 1000;
    readonly DEFAULT_HOME_PAGE: "https://aleo.org";
    readonly ALEO_ADDRESS_PREFIX: "aleo1";
    readonly ALEO_TX_PREFIX: "at1";
};
//# sourceMappingURL=types.d.ts.map