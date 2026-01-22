/**
 * Type definitions for AleoBrowser Settings
 * Central location for all settings-related types
 */

// ============================================================================
// General Settings Types
// ============================================================================

export interface GeneralSettingsData {
  searchEngine: string;
  homepageUrl: string;
  theme: string;
  language: string;
}

export interface SearchEngine {
  value: string;
  label: string;
  url: string;
}

// ============================================================================
// Privacy Settings Types
// ============================================================================

export interface PrivacySettingsData {
  trackerBlocking: boolean;
  adBlocking: boolean;
  clearCookiesOnExit: boolean;
  fingerprintProtection: boolean;
  webRTCProtection: boolean;
}

export interface PrivacyStats {
  trackersBlocked: number;
  adsBlocked: number;
  cookiesBlocked: number;
}

// ============================================================================
// Wallet Settings Types
// ============================================================================

export interface WalletSettingsData {
  autoLockTimeout: number; // minutes (0 = never)
  network: 'testnet' | 'mainnet';
}

export interface WalletInfo {
  address: string;
  balance: number;
  locked: boolean;
}

// ============================================================================
// About Settings Types
// ============================================================================

export interface AboutInfo {
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  aleoSdkVersion: string;
}

// ============================================================================
// Combined Settings Types
// ============================================================================

export interface SettingsData {
  general: GeneralSettingsData;
  privacy: PrivacySettingsData;
  wallet: WalletSettingsData;
}

export type SettingsSection = 'general' | 'privacy' | 'wallet' | 'about';

// ============================================================================
// Settings Event Handlers
// ============================================================================

export interface SettingsHandlers {
  onSettingsChange: (settings: SettingsData) => void;
  onClearBrowsingData: () => Promise<void>;
  onExportPrivateKey: () => Promise<string>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onResetWallet: () => Promise<void>;
  onCheckForUpdates: () => Promise<void>;
}

// ============================================================================
// Settings Storage
// ============================================================================

export interface SettingsStorage {
  get<K extends keyof SettingsData>(key: K): Promise<SettingsData[K]>;
  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): Promise<void>;
  getAll(): Promise<SettingsData>;
  setAll(settings: SettingsData): Promise<void>;
  reset(): Promise<void>;
}

// ============================================================================
// IPC Channel Names
// ============================================================================

export const IPC_CHANNELS = {
  // Settings
  SAVE_SETTINGS: 'save-settings',
  LOAD_SETTINGS: 'load-settings',
  RESET_SETTINGS: 'reset-settings',

  // Privacy
  CLEAR_BROWSING_DATA: 'clear-browsing-data',
  GET_PRIVACY_STATS: 'get-privacy-stats',

  // Wallet
  EXPORT_PRIVATE_KEY: 'export-private-key',
  CHANGE_PASSWORD: 'change-password',
  RESET_WALLET: 'reset-wallet',
  GET_WALLET_INFO: 'get-wallet-info',

  // About
  CHECK_FOR_UPDATES: 'check-for-updates',
  GET_VERSION_INFO: 'get-version-info',
} as const;

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type SettingsValidator<T> = (value: T) => boolean | string;

export interface SettingsSchema<T = SettingsData> {
  defaultValue: T;
  validate?: SettingsValidator<T>;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_SETTINGS: SettingsData = {
  general: {
    searchEngine: 'duckduckgo',
    homepageUrl: 'https://aleo.org',
    theme: 'dark',
    language: 'en',
  },
  privacy: {
    trackerBlocking: true,
    adBlocking: true,
    clearCookiesOnExit: false,
    fingerprintProtection: true,
    webRTCProtection: true,
  },
  wallet: {
    autoLockTimeout: 15,
    network: 'testnet',
  },
};

export const DEFAULT_PRIVACY_STATS: PrivacyStats = {
  trackersBlocked: 0,
  adsBlocked: 0,
  cookiesBlocked: 0,
};

export const DEFAULT_ABOUT_INFO: AboutInfo = {
  version: '1.0.0',
  electronVersion: '28.0.0',
  chromeVersion: '120.0.0',
  nodeVersion: '20.10.0',
  aleoSdkVersion: '0.7.0',
};
