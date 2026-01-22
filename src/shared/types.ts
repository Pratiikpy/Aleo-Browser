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
  httpsUpgrades?: number;
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
export const CONSTANTS = {
  APP_NAME: 'AleoBrowser',
  MIN_PASSWORD_LENGTH: 8,
  AUTO_LOCK_DURATION: 15 * 60 * 1000, // 15 minutes
  MAX_HISTORY_ENTRIES: 1000,
  DEFAULT_HOME_PAGE: 'https://aleo.org',
  ALEO_ADDRESS_PREFIX: 'aleo1',
  ALEO_TX_PREFIX: 'at1'
} as const;
