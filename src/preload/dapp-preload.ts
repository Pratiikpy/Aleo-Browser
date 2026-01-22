/**
 * dApp Preload Script
 * Injects window.aleo provider into web pages loaded in BrowserView
 * Similar to how Brave/MetaMask inject window.ethereum
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Event emitter for dApp events
 */
class AleoEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

const eventEmitter = new AleoEventEmitter();

// Listen for events from main process
ipcRenderer.on('dapp:accountChanged', (_event, address: string | null) => {
  eventEmitter.emit('accountChanged', address);
});

ipcRenderer.on('dapp:disconnect', () => {
  eventEmitter.emit('disconnect');
});

ipcRenderer.on('dapp:networkChanged', (_event, network: string) => {
  eventEmitter.emit('networkChanged', network);
});

/**
 * Transaction request parameters
 */
interface TransactionRequest {
  programId: string;
  functionName: string;
  inputs: string[];
  fee?: number;
}

/**
 * Deployment request parameters
 */
interface DeploymentRequest {
  program: string;
  fee?: number;
}

/**
 * Records request parameters
 */
interface RecordsRequest {
  programId?: string;
  filter?: string;
}

/**
 * Sign message request
 */
interface SignMessageRequest {
  message: string;
}

/**
 * Aleo Provider API
 * Exposed as window.aleo for dApps
 */
const aleoProvider = {
  /**
   * Provider identification
   */
  isAleoBrowser: true,
  version: '1.0.0',

  /**
   * Connect to the wallet - requests permission from user
   * @returns Connected wallet address or null if rejected
   */
  connect: async (): Promise<string | null> => {
    try {
      const result = await ipcRenderer.invoke('dapp:connect');
      if (result.success) {
        eventEmitter.emit('connect', result.address);
        return result.address;
      }
      return null;
    } catch (error) {
      console.error('dApp connect failed:', error);
      throw error;
    }
  },

  /**
   * Disconnect from the wallet
   */
  disconnect: async (): Promise<void> => {
    try {
      await ipcRenderer.invoke('dapp:disconnect');
      eventEmitter.emit('disconnect');
    } catch (error) {
      console.error('dApp disconnect failed:', error);
      throw error;
    }
  },

  /**
   * Check if connected
   */
  isConnected: async (): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('dapp:isConnected');
      return result.connected;
    } catch {
      return false;
    }
  },

  /**
   * Get connected account address
   * @returns Address if connected and permitted, null otherwise
   */
  getAccount: async (): Promise<string | null> => {
    try {
      const result = await ipcRenderer.invoke('dapp:getAccount');
      return result.success ? result.address : null;
    } catch (error) {
      console.error('dApp getAccount failed:', error);
      return null;
    }
  },

  /**
   * Get current network
   */
  getNetwork: async (): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('dapp:getNetwork');
      return result.network || 'testnet';
    } catch {
      return 'testnet';
    }
  },

  /**
   * Request transaction execution
   * Shows approval UI to user
   */
  requestTransaction: async (params: TransactionRequest): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('dapp:requestTransaction', params);
      if (result.success) {
        return result.transactionId;
      }
      throw new Error(result.error || 'Transaction rejected');
    } catch (error) {
      console.error('dApp requestTransaction failed:', error);
      throw error;
    }
  },

  /**
   * Request program deployment
   * Shows approval UI to user
   */
  requestDeploy: async (params: DeploymentRequest): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('dapp:requestDeploy', params);
      if (result.success) {
        return result.transactionId;
      }
      throw new Error(result.error || 'Deployment rejected');
    } catch (error) {
      console.error('dApp requestDeploy failed:', error);
      throw error;
    }
  },

  /**
   * Request records from the wallet
   * Returns decrypted records for permitted programs
   */
  requestRecords: async (params?: RecordsRequest): Promise<any[]> => {
    try {
      const result = await ipcRenderer.invoke('dapp:requestRecords', params || {});
      if (result.success) {
        return result.records;
      }
      throw new Error(result.error || 'Records request rejected');
    } catch (error) {
      console.error('dApp requestRecords failed:', error);
      throw error;
    }
  },

  /**
   * Decrypt a ciphertext using the view key
   * Requires user approval
   */
  decrypt: async (ciphertext: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('dapp:decrypt', { ciphertext });
      if (result.success) {
        return result.plaintext;
      }
      throw new Error(result.error || 'Decryption rejected');
    } catch (error) {
      console.error('dApp decrypt failed:', error);
      throw error;
    }
  },

  /**
   * Sign a message with the private key
   * Shows approval UI to user
   */
  signMessage: async (params: SignMessageRequest): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('dapp:signMessage', params);
      if (result.success) {
        return result.signature;
      }
      throw new Error(result.error || 'Signing rejected');
    } catch (error) {
      console.error('dApp signMessage failed:', error);
      throw error;
    }
  },

  /**
   * Get balance for the connected account
   */
  getBalance: async (): Promise<{ public: number; private: number }> => {
    try {
      const result = await ipcRenderer.invoke('dapp:getBalance');
      if (result.success) {
        return result.balance;
      }
      throw new Error(result.error || 'Failed to get balance');
    } catch (error) {
      console.error('dApp getBalance failed:', error);
      throw error;
    }
  },

  /**
   * Get block height
   */
  getBlockHeight: async (): Promise<number> => {
    try {
      const result = await ipcRenderer.invoke('dapp:getBlockHeight');
      return result.height || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Get transaction status
   */
  getTransactionStatus: async (transactionId: string): Promise<string> => {
    try {
      const result = await ipcRenderer.invoke('dapp:getTransactionStatus', { transactionId });
      return result.status || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  /**
   * Event subscription
   * Supported events: 'connect', 'disconnect', 'accountChanged', 'networkChanged'
   */
  on: (event: string, callback: Function): void => {
    eventEmitter.on(event, callback);
  },

  /**
   * Remove event listener
   */
  off: (event: string, callback: Function): void => {
    eventEmitter.off(event, callback);
  },

  /**
   * Remove all listeners
   */
  removeAllListeners: (event?: string): void => {
    eventEmitter.removeAllListeners(event);
  },
};

/**
 * Leo Wallet compatible provider (for dApps using Leo Wallet API)
 * Maps Leo Wallet API to our provider
 */
const leoWalletProvider = {
  ...aleoProvider,

  // Leo Wallet specific methods
  requestAccess: async () => aleoProvider.connect(),
  requestViewKey: async () => {
    // View key sharing would require user approval
    const result = await ipcRenderer.invoke('dapp:requestViewKey');
    if (result.success) {
      return result.viewKey;
    }
    throw new Error(result.error || 'View key request rejected');
  },

  // Alias for compatibility
  signTransaction: async (params: TransactionRequest) => aleoProvider.requestTransaction(params),
};

/**
 * Puzzle Wallet compatible provider
 */
const puzzleProvider = {
  ...aleoProvider,

  // Puzzle-specific aliases
  requestSignature: async (message: string) => aleoProvider.signMessage({ message }),
  execute: async (params: TransactionRequest) => aleoProvider.requestTransaction(params),
};

// Expose providers to the page
try {
  // Main Aleo provider
  contextBridge.exposeInMainWorld('aleo', aleoProvider);

  // Leo Wallet compatibility
  contextBridge.exposeInMainWorld('leoWallet', leoWalletProvider);

  // Puzzle Wallet compatibility
  contextBridge.exposeInMainWorld('puzzle', puzzleProvider);

  // Legacy support
  contextBridge.exposeInMainWorld('aleoBrowser', {
    ...aleoProvider,
    isBrowser: true,
    browserName: 'AleoBrowser',
    browserVersion: '1.0.0',
  });

  console.log('AleoBrowser: dApp provider injected (window.aleo, window.leoWallet, window.puzzle)');
} catch (error) {
  console.error('Failed to inject dApp provider:', error);
}

// Type definitions for dApps
export interface AleoProvider {
  isAleoBrowser: boolean;
  version: string;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  isConnected: () => Promise<boolean>;
  getAccount: () => Promise<string | null>;
  getNetwork: () => Promise<string>;
  requestTransaction: (params: TransactionRequest) => Promise<string>;
  requestDeploy: (params: DeploymentRequest) => Promise<string>;
  requestRecords: (params?: RecordsRequest) => Promise<any[]>;
  decrypt: (ciphertext: string) => Promise<string>;
  signMessage: (params: SignMessageRequest) => Promise<string>;
  getBalance: () => Promise<{ public: number; private: number }>;
  getBlockHeight: () => Promise<number>;
  getTransactionStatus: (transactionId: string) => Promise<string>;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
  removeAllListeners: (event?: string) => void;
}

declare global {
  interface Window {
    aleo: AleoProvider;
    leoWallet: AleoProvider;
    puzzle: AleoProvider;
    aleoBrowser: AleoProvider & { isBrowser: boolean; browserName: string; browserVersion: string };
  }
}
