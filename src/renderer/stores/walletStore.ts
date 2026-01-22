import { create } from 'zustand';
import { ipc } from '../lib/ipc';

/**
 * Wallet Balance Interface
 */
export interface WalletBalance {
  public: number;
  private: number;
}

/**
 * Wallet Store Interface
 */
export interface WalletStore {
  // State
  address: string | null;
  balance: WalletBalance | null;
  isLocked: boolean;
  hasWallet: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkWalletStatus: () => Promise<void>;
  createWallet: (password: string) => Promise<{ mnemonic: string; address: string } | null>;
  importWallet: (privateKey: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  refreshBalance: () => Promise<void>;
  send: (to: string, amount: number, memo?: string) => Promise<string | null>;

  // Utility
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Wallet Store
 * Manages Aleo wallet state and operations
 */
export const useWalletStore = create<WalletStore>((set, get) => ({
  // Initial state
  address: null,
  balance: null,
  isLocked: true,
  hasWallet: false,
  isLoading: false,
  error: null,

  /**
   * Check wallet status on app startup
   */
  checkWalletStatus: async () => {
    set({ isLoading: true, error: null });

    try {
      const status = await ipc.getWalletLockStatus();

      set({
        hasWallet: status.hasWallet,
        isLocked: status.isLocked,
        isLoading: false
      });

      // If wallet exists and is unlocked, get address and balance
      if (status.hasWallet && !status.isLocked) {
        await get().refreshBalance();

        const addressResult = await ipc.getWalletAddress();
        if (addressResult.success && addressResult.address) {
          set({ address: addressResult.address });
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to check wallet status',
        isLoading: false
      });
    }
  },

  /**
   * Create a new Aleo wallet
   * @param password - Encryption password (min 8 characters)
   * @returns Mnemonic phrase and address, or null on failure
   */
  createWallet: async (password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await ipc.createWallet(password);

      if (!result.success) {
        set({
          error: result.error || 'Failed to create wallet',
          isLoading: false
        });
        return null;
      }

      // Wallet created and unlocked
      set({
        address: result.address || null,
        hasWallet: true,
        isLocked: false,
        isLoading: false,
        error: null
      });

      // Fetch initial balance
      await get().refreshBalance();

      // Generate mnemonic (placeholder - should come from Aleo SDK)
      const mnemonic = generateMockMnemonic();

      return {
        mnemonic,
        address: result.address || ''
      };
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create wallet',
        isLoading: false
      });
      return null;
    }
  },

  /**
   * Import an existing wallet from private key
   * @param privateKey - Aleo private key
   * @param password - Encryption password
   */
  importWallet: async (privateKey: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await ipc.importWallet(privateKey, password);

      if (!result.success) {
        set({
          error: result.error || 'Failed to import wallet',
          isLoading: false
        });
        return;
      }

      // Wallet imported and unlocked
      set({
        address: result.address || null,
        hasWallet: true,
        isLocked: false,
        isLoading: false,
        error: null
      });

      // Fetch initial balance
      await get().refreshBalance();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to import wallet',
        isLoading: false
      });
    }
  },

  /**
   * Unlock the wallet with password
   * @param password - Wallet password
   * @returns True if unlock successful
   */
  unlock: async (password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await ipc.unlockWallet(password);

      if (!result.success) {
        set({
          error: result.error || 'Failed to unlock wallet',
          isLoading: false
        });
        return false;
      }

      set({
        isLocked: false,
        isLoading: false,
        error: null
      });

      // Fetch address and balance
      const addressResult = await ipc.getWalletAddress();
      if (addressResult.success && addressResult.address) {
        set({ address: addressResult.address });
      }

      await get().refreshBalance();

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to unlock wallet',
        isLoading: false
      });
      return false;
    }
  },

  /**
   * Lock the wallet
   */
  lock: () => {
    ipc.lockWallet();

    set({
      address: null,
      balance: null,
      isLocked: true,
      error: null
    });
  },

  /**
   * Refresh wallet balance
   */
  refreshBalance: async () => {
    const state = get();

    if (state.isLocked || !state.hasWallet) {
      return;
    }

    try {
      const result = await ipc.getWalletBalance();

      if (result.success) {
        set({
          balance: {
            public: result.public ?? 0,
            private: result.private ?? 0
          },
          error: null
        });
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      // Don't set error state for background refresh failures
    }
  },

  /**
   * Send Aleo tokens
   * @param to - Recipient address
   * @param amount - Amount to send
   * @param fee - Optional fee amount
   * @param memo - Optional memo
   * @returns Transaction hash, or null on failure
   */
  send: async (to: string, amount: number, fee?: number, memo?: string) => {
    const state = get();

    if (state.isLocked) {
      set({ error: 'Wallet is locked' });
      return null;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await ipc.sendTransaction(to, amount, fee, memo);

      if (!result.success) {
        set({
          error: result.error || 'Failed to send transaction',
          isLoading: false
        });
        return null;
      }

      set({ isLoading: false, error: null });

      // Refresh balance after successful send
      setTimeout(() => {
        get().refreshBalance();
      }, 1000);

      return result.txHash || null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to send transaction',
        isLoading: false
      });
      return null;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Set loading state
   */
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  }
}));

/**
 * Generate mock mnemonic phrase (replace with Aleo SDK)
 */
function generateMockMnemonic(): string {
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
    'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
    'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
  ];

  const mnemonic: string[] = [];
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    mnemonic.push(words[randomIndex]);
  }

  return mnemonic.join(' ');
}

/**
 * Hook: Get wallet connection status
 * Usage: const isConnected = useWalletConnected();
 */
export function useWalletConnected() {
  return useWalletStore((state) => state.hasWallet && !state.isLocked);
}

/**
 * Hook: Get formatted balance
 * Usage: const formattedBalance = useFormattedBalance();
 */
export function useFormattedBalance(): string {
  return useWalletStore((state) => {
    if (!state.balance) return '0.00';
    const total = state.balance.public + state.balance.private;
    return total.toFixed(2);
  });
}

/**
 * Initialize wallet store
 * Call this once on app startup
 */
export function initWalletStore() {
  useWalletStore.getState().checkWalletStatus();
}

/**
 * Auto-refresh balance every 30 seconds when wallet is unlocked
 */
let balanceRefreshInterval: NodeJS.Timeout | null = null;

export function startBalanceAutoRefresh() {
  if (balanceRefreshInterval) {
    clearInterval(balanceRefreshInterval);
  }

  balanceRefreshInterval = setInterval(() => {
    const state = useWalletStore.getState();
    if (!state.isLocked && state.hasWallet) {
      state.refreshBalance();
    }
  }, 30000); // 30 seconds
}

export function stopBalanceAutoRefresh() {
  if (balanceRefreshInterval) {
    clearInterval(balanceRefreshInterval);
    balanceRefreshInterval = null;
  }
}
