/**
 * Aleo Blockchain Service
 * Handles real interaction with the Aleo network using @provablehq/sdk
 */

import { AleoBalance, AleoRecord, AleoTransaction, TransferParams, ExecuteProgramParams } from '@shared/types';
import https from 'https';

// API endpoints
const ALEO_TESTNET_API = 'https://api.explorer.aleo.org/v1/testnet';
const ALEO_MAINNET_API = 'https://api.explorer.aleo.org/v1/mainnet';
const PROVABLE_TESTNET_API = 'https://api.explorer.provable.com/v1/testnet';

// Helper function for HTTPS GET requests (works reliably in Electron main process)
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          httpsGet(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Network type
type Network = 'testnet' | 'mainnet';

// Dynamic import for the SDK
let aleoSdk: any = null;

async function initSdk(): Promise<any> {
  if (!aleoSdk) {
    try {
      // Use new Function to create dynamic import that TypeScript won't transform to require()
      // This is necessary because @provablehq/sdk is a pure ES Module
      const dynamicImport = new Function('modulePath', 'return import(modulePath)');
      aleoSdk = await dynamicImport('@provablehq/sdk');
    } catch (error) {
      console.warn('Aleo SDK not available, using API-only mode');
    }
  }
  return aleoSdk;
}

export class AleoService {
  private static instance: AleoService;
  private connected: boolean = false;
  private network: Network = 'testnet';
  private apiBase: string = ALEO_TESTNET_API;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AleoService {
    if (!AleoService.instance) {
      AleoService.instance = new AleoService();
    }
    return AleoService.instance;
  }

  /**
   * Set the network (testnet or mainnet)
   */
  setNetwork(network: Network): void {
    this.network = network;
    this.apiBase = network === 'mainnet' ? ALEO_MAINNET_API : ALEO_TESTNET_API;
    this.connected = false; // Require reconnection
  }

  /**
   * Get current network
   */
  getNetwork(): Network {
    return this.network;
  }

  /**
   * Connect to Aleo network
   */
  async connect(): Promise<void> {
    try {
      // Test connection to API
      const response = await fetch(`${this.apiBase}/latest/height`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      this.connected = true;
      console.log(`Connected to Aleo ${this.network}`);
    } catch (error) {
      this.connected = false;
      throw new Error(`Aleo connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if connected to network
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get public balance for an address from credits.aleo program mapping
   */
  async getPublicBalance(address: string): Promise<number> {
    try {
      // Query the credits.aleo account mapping
      const url = `${this.apiBase}/program/credits.aleo/mapping/account/${address}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return 0; // Account not found = 0 balance
        }
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.text();

      // Parse the response - it returns microcredits as a string like "123456u64"
      const match = data.match(/(\d+)u64/);
      if (match) {
        const microcredits = BigInt(match[1]);
        return Number(microcredits) / 1_000_000; // Convert to ALEO
      }

      // Try parsing as plain number
      const numericData = parseInt(data.replace(/[^\d]/g, ''), 10);
      if (!isNaN(numericData)) {
        return numericData / 1_000_000;
      }

      return 0;
    } catch (error) {
      console.error('Error fetching public balance:', error);
      return 0;
    }
  }

  /**
   * Get public and private balance for an address
   */
  async getBalance(address: string): Promise<AleoBalance> {
    // Auto-connect if not connected
    if (!this.connected) {
      try {
        await this.connect();
      } catch {
        // Continue anyway, will return 0 balance
      }
    }

    try {
      const publicBalance = await this.getPublicBalance(address);

      // Note: Private balance requires scanning records with view key
      // This is done client-side and cannot be retrieved via API
      return {
        public: publicBalance,
        private: 0 // Private balance must be calculated from records
      };
    } catch (error) {
      console.error('Error fetching balance:', error);
      return { public: 0, private: 0 };
    }
  }

  /**
   * Transfer ALEO tokens using the SDK
   */
  async transfer(params: TransferParams): Promise<string> {
    const { privateKey, to, amount, fee = 0.1 } = params;

    // Validate inputs
    this.validateAddress(to);
    this.validateAmount(amount);

    try {
      const sdk = await initSdk();

      if (!sdk) {
        throw new Error('Aleo SDK not available. Cannot execute transfer.');
      }

      // Convert amounts to microcredits
      const amountMicrocredits = BigInt(Math.floor(amount * 1_000_000));
      const feeMicrocredits = Math.floor(fee * 1_000_000);

      console.log(`[Aleo Transfer] Initiating transfer of ${amount} ALEO (${amountMicrocredits} microcredits) to ${to}`);
      console.log(`[Aleo Transfer] Fee: ${fee} ALEO (${feeMicrocredits} microcredits)`);

      // Try different SDK API patterns
      let txId: string;

      // Method 1: ProgramManager API (SDK v0.9+)
      if (sdk.ProgramManager) {
        console.log('[Aleo Transfer] Using ProgramManager API');

        // Use provable.com endpoint - SDK adds network internally
        const apiUrl = 'https://api.explorer.provable.com/v1';
        const programManager = new sdk.ProgramManager(apiUrl, undefined, undefined);

        // Set account from private key using constructor pattern (SDK v0.9.15+)
        if (sdk.Account) {
          const account = new sdk.Account({ privateKey: privateKey });
          programManager.setAccount(account);
        } else {
          throw new Error('Account class not available in SDK');
        }

        // Execute transfer_public function on credits.aleo
        txId = await programManager.execute(
          'credits.aleo',
          'transfer_public',
          [to, `${amountMicrocredits}u64`],
          feeMicrocredits,
          undefined, // proving key
          undefined, // verifying key
          undefined, // record (for private transfers)
          undefined  // imports
        );
      } else {
        throw new Error('ProgramManager not found in SDK');
      }

      console.log(`[Aleo Transfer] Transaction submitted: ${txId}`);
      return txId;
    } catch (error) {
      console.error('[Aleo Transfer] Error:', error);

      // Provide more helpful error messages
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('insufficient')) {
        throw new Error(`Insufficient balance for transfer. Amount: ${amount} ALEO, Fee: ${fee} ALEO`);
      }
      if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        throw new Error(`Network error - please check your connection and try again`);
      }

      throw new Error(`Transfer failed: ${errorMsg}`);
    }
  }

  /**
   * Execute an Aleo program
   */
  async executeProgram(params: ExecuteProgramParams): Promise<string> {
    const { programId, functionName, inputs, fee, privateKey } = params;

    if (!programId || !functionName) {
      throw new Error('Program ID and function name are required');
    }

    try {
      const sdk = await initSdk();

      if (!sdk) {
        throw new Error('Aleo SDK not available');
      }

      // Use provable.com API endpoint
      const apiUrl = PROVABLE_TESTNET_API;

      console.log(`[Aleo Execute] Using API: ${apiUrl}`);
      console.log(`[Aleo Execute] Program: ${programId}`);

      // First verify program exists via direct HTTPS call (reliable in Electron)
      try {
        const checkUrl = `${apiUrl}/program/${programId}`;
        console.log(`[Aleo Execute] Checking program at: ${checkUrl}`);
        const programSource = await httpsGet(checkUrl);
        if (!programSource || programSource.includes('not found')) {
          throw new Error(`Program ${programId} not found`);
        }
        console.log(`[Aleo Execute] ✅ Program ${programId} verified on testnet`);
      } catch (checkError) {
        console.error(`[Aleo Execute] Program verification failed:`, checkError);
        // Try alternative API
        try {
          const altUrl = `${ALEO_TESTNET_API}/program/${programId}`;
          console.log(`[Aleo Execute] Trying alternative API: ${altUrl}`);
          const altSource = await httpsGet(altUrl);
          if (altSource && !altSource.includes('not found')) {
            console.log(`[Aleo Execute] ✅ Program verified via alternative API`);
          } else {
            throw new Error('Not found on alternative API');
          }
        } catch {
          throw new Error(`Program '${programId}' not found on testnet. Please verify the contract is deployed.`);
        }
      }

      const programManager = new sdk.ProgramManager(
        apiUrl,
        undefined,
        undefined
      );

      // Use constructor pattern (SDK v0.9.15+)
      const account = new sdk.Account({ privateKey: privateKey });
      programManager.setAccount(account);

      const feeMicrocredits = Math.floor(fee * 1_000_000);

      console.log(`[Aleo Execute] Program: ${programId}, Function: ${functionName}`);
      console.log(`[Aleo Execute] Inputs:`, inputs);
      console.log(`[Aleo Execute] Fee: ${fee} ALEO (${feeMicrocredits} microcredits)`);

      const txId = await programManager.execute(
        programId,
        functionName,
        inputs,
        feeMicrocredits,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      console.log(`[Aleo Execute] Transaction submitted: ${txId}`);
      return txId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Aleo Execute] Error:`, error);

      // Provide helpful error messages
      if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('undefined')) {
        throw new Error(`Program '${programId}' not found on ${this.network}. The Leo contract may not be deployed yet.`);
      }
      if (errorMsg.includes('insufficient')) {
        throw new Error(`Insufficient balance for transaction. Fee: ${fee} ALEO`);
      }
      if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        throw new Error(`Network error connecting to Aleo ${this.network}. Please check your connection.`);
      }

      throw new Error(`Program execution failed: ${errorMsg}`);
    }
  }

  /**
   * Get records for a user (requires view key for decryption)
   */
  async getRecords(viewKey: string, programId?: string): Promise<AleoRecord[]> {
    // Records require client-side scanning and decryption
    // This is a complex operation that requires iterating through blocks
    console.log('Record fetching requires view key scanning - returning empty for now');
    return [];
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<AleoTransaction | null> {
    try {
      const response = await fetch(`${this.apiBase}/transaction/${txId}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch transaction: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txId: string): Promise<'pending' | 'confirmed' | 'failed' | 'unknown'> {
    try {
      const tx = await this.getTransaction(txId);
      return tx?.status || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get latest block height
   */
  async getLatestBlockHeight(): Promise<number> {
    try {
      const response = await fetch(`${this.apiBase}/latest/height`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch latest block height');
      }

      const data = await response.text();
      return parseInt(data, 10) || 0;
    } catch (error) {
      console.error('Error fetching block height:', error);
      return 0;
    }
  }

  /**
   * Get program source code
   */
  async getProgram(programId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.apiBase}/program/${programId}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch program: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error fetching program:', error);
      return null;
    }
  }

  /**
   * Get program mapping value
   */
  async getMappingValue(programId: string, mappingName: string, key: string): Promise<string | null> {
    try {
      const url = `${this.apiBase}/program/${programId}/mapping/${mappingName}/${key}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch mapping value: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error fetching mapping value:', error);
      return null;
    }
  }

  /**
   * Validate Aleo address format
   */
  validateAddress(address: string): void {
    if (!address.startsWith('aleo1') || address.length !== 63) {
      throw new Error('Invalid Aleo address format. Must start with "aleo1" and be 63 characters.');
    }
  }

  /**
   * Check if an address is valid
   */
  isValidAddress(address: string): boolean {
    return typeof address === 'string' &&
           address.startsWith('aleo1') &&
           address.length === 63;
  }

  /**
   * Validate amount
   */
  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!Number.isFinite(amount)) {
      throw new Error('Amount must be a finite number');
    }
  }

  /**
   * Parse transaction data from API response
   */
  private parseTransaction(data: any): AleoTransaction {
    return {
      id: data.id || data.transaction_id || '',
      from: data.owner || '',
      to: data.to || '',
      amount: this.parseAmount(data.amount || 0),
      fee: this.parseAmount(data.fee || 0),
      timestamp: data.timestamp || Date.now(),
      status: this.parseTransactionStatus(data.status || data.type),
    };
  }

  /**
   * Parse transaction status
   */
  private parseTransactionStatus(status: string): 'pending' | 'confirmed' | 'failed' {
    const normalizedStatus = status?.toLowerCase() || '';

    if (normalizedStatus.includes('accept') || normalizedStatus.includes('confirmed')) {
      return 'confirmed';
    }
    if (normalizedStatus.includes('reject') || normalizedStatus.includes('failed')) {
      return 'failed';
    }
    return 'pending';
  }

  /**
   * Parse amount from microcredits to ALEO
   */
  private parseAmount(microcredits: number | string): number {
    const value = typeof microcredits === 'string' ? parseInt(microcredits, 10) : microcredits;
    return value / 1_000_000;
  }
}

// Export singleton instance
export const aleoService = AleoService.getInstance();

// Export lazy getter for consistency
export function getAleoService(): AleoService {
  return AleoService.getInstance();
}
