/**
 * Transaction History Service
 * Stores and manages transaction history for the wallet
 */

// Lazy load electron-store
function createStore(defaults: any): any {
  const Store = require('electron-store');
  return new Store({ name: 'transaction-history', defaults });
}

export interface TransactionRecord {
  id: string;
  txId: string;
  type: 'send' | 'receive' | 'execute' | 'deploy';
  programId?: string;
  functionName?: string;
  from?: string;
  to?: string;
  amount?: number;         // In ALEO
  fee?: number;            // In ALEO
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockHeight?: number;
  confirmations?: number;
  memo?: string;
  explorerUrl?: string;
  error?: string;
}

interface TransactionHistoryStore {
  transactions: TransactionRecord[];
  lastSyncedBlockHeight: number;
  network: 'testnet' | 'mainnet';
}

// API endpoints
const ALEO_TESTNET_API = 'https://api.explorer.aleo.org/v1/testnet';
const ALEO_MAINNET_API = 'https://api.explorer.aleo.org/v1/mainnet';
const EXPLORER_TESTNET_URL = 'https://explorer.aleo.org/transaction';
const EXPLORER_MAINNET_URL = 'https://explorer.aleo.org/transaction';

export class TransactionHistoryService {
  private static instance: TransactionHistoryService;
  private store: any = null;
  private transactions: TransactionRecord[] = [];
  private network: 'testnet' | 'mainnet' = 'testnet';
  private pendingCheckInterval: NodeJS.Timeout | null = null;
  private address: string | null = null;

  private static readonly defaultStore: TransactionHistoryStore = {
    transactions: [],
    lastSyncedBlockHeight: 0,
    network: 'testnet'
  };

  private constructor() {
    // Store is lazily initialized
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TransactionHistoryService {
    if (!TransactionHistoryService.instance) {
      TransactionHistoryService.instance = new TransactionHistoryService();
    }
    return TransactionHistoryService.instance;
  }

  /**
   * Get store instance (lazy)
   */
  private getStore(): any {
    if (!this.store) {
      this.store = createStore(TransactionHistoryService.defaultStore);
    }
    return this.store;
  }

  /**
   * Initialize service with wallet address
   */
  init(address: string, network: 'testnet' | 'mainnet' = 'testnet'): void {
    this.address = address;
    this.network = network;

    // Load transactions from store
    const store = this.getStore();
    this.transactions = store.get('transactions') || [];

    // Update any transactions that have missing from field (recorded before init)
    let updated = false;
    for (const tx of this.transactions) {
      if (!tx.from && (tx.type === 'send' || tx.type === 'execute')) {
        tx.from = address;
        updated = true;
      }
    }
    if (updated) {
      this.saveTransactions();
    }

    console.log(`[Transaction History] Initialized for ${address} on ${network}`);
    console.log(`[Transaction History] Loaded ${this.transactions.length} transactions`);

    // Start checking pending transactions
    this.startPendingCheck();
  }

  /**
   * Set network
   */
  setNetwork(network: 'testnet' | 'mainnet'): void {
    this.network = network;
    this.getStore().set('network', network);
  }

  /**
   * Get API base URL
   */
  private getApiBase(): string {
    return this.network === 'mainnet' ? ALEO_MAINNET_API : ALEO_TESTNET_API;
  }

  /**
   * Get explorer URL for a transaction
   */
  private getExplorerUrl(txId: string): string {
    const base = this.network === 'mainnet' ? EXPLORER_MAINNET_URL : EXPLORER_TESTNET_URL;
    return `${base}/${txId}`;
  }

  /**
   * Add a new transaction to history
   */
  addTransaction(tx: Omit<TransactionRecord, 'id' | 'explorerUrl'>): TransactionRecord {
    const record: TransactionRecord = {
      ...tx,
      id: this.generateId(),
      explorerUrl: this.getExplorerUrl(tx.txId)
    };

    // Add to beginning of array (most recent first)
    this.transactions.unshift(record);

    // Save to store
    this.saveTransactions();

    console.log(`[Transaction History] Added transaction: ${record.txId}`);
    return record;
  }

  /**
   * Record a sent transaction
   */
  recordSentTransaction(params: {
    txId: string;
    to: string;
    amount: number;
    fee?: number;
    memo?: string;
  }): TransactionRecord {
    return this.addTransaction({
      txId: params.txId,
      type: 'send',
      from: this.address || undefined,
      to: params.to,
      amount: params.amount,
      fee: params.fee,
      status: 'pending',
      timestamp: Date.now(),
      memo: params.memo
    });
  }

  /**
   * Record a program execution
   */
  recordExecuteTransaction(params: {
    txId: string;
    programId: string;
    functionName: string;
    fee?: number;
  }): TransactionRecord {
    return this.addTransaction({
      txId: params.txId,
      type: 'execute',
      programId: params.programId,
      functionName: params.functionName,
      from: this.address || undefined,
      fee: params.fee,
      status: 'pending',
      timestamp: Date.now()
    });
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(txId: string): Promise<TransactionRecord | null> {
    const tx = this.transactions.find(t => t.txId === txId);
    if (!tx) return null;

    try {
      const response = await fetch(`${this.getApiBase()}/transaction/${txId}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json() as Record<string, any>;

        // Update transaction details
        tx.status = this.parseStatus(data.status || data.type);
        tx.blockHeight = data.block_height || data.height;
        tx.confirmations = data.confirmations;

        // Try to extract amount and fee from transaction data
        if (data.fee) {
          tx.fee = this.parseMicrocredits(data.fee);
        }

        this.saveTransactions();
        console.log(`[Transaction History] Updated ${txId}: ${tx.status}`);
      } else if (response.status === 404) {
        // Transaction not found - might still be pending or dropped
        // Keep as pending if less than 10 minutes old
        const age = Date.now() - tx.timestamp;
        if (age > 10 * 60 * 1000) {
          tx.status = 'failed';
          tx.error = 'Transaction not found on chain';
          this.saveTransactions();
        }
      }
    } catch (error) {
      console.error(`[Transaction History] Failed to update ${txId}:`, error);
    }

    return tx;
  }

  /**
   * Check all pending transactions
   */
  async checkPendingTransactions(): Promise<void> {
    const pendingTxs = this.transactions.filter(tx => tx.status === 'pending');

    for (const tx of pendingTxs) {
      await this.updateTransactionStatus(tx.txId);
    }
  }

  /**
   * Start automatic pending check
   */
  startPendingCheck(): void {
    if (this.pendingCheckInterval) {
      clearInterval(this.pendingCheckInterval);
    }

    // Check every 30 seconds
    this.pendingCheckInterval = setInterval(() => {
      this.checkPendingTransactions();
    }, 30000);

    // Initial check
    this.checkPendingTransactions();
  }

  /**
   * Stop automatic pending check
   */
  stopPendingCheck(): void {
    if (this.pendingCheckInterval) {
      clearInterval(this.pendingCheckInterval);
      this.pendingCheckInterval = null;
    }
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): TransactionRecord[] {
    return [...this.transactions];
  }

  /**
   * Get transactions with pagination
   */
  getTransactions(options: {
    limit?: number;
    offset?: number;
    type?: 'send' | 'receive' | 'execute' | 'deploy';
    status?: 'pending' | 'confirmed' | 'failed';
  } = {}): { transactions: TransactionRecord[]; total: number; hasMore: boolean } {
    let filtered = [...this.transactions];

    // Filter by type
    if (options.type) {
      filtered = filtered.filter(tx => tx.type === options.type);
    }

    // Filter by status
    if (options.status) {
      filtered = filtered.filter(tx => tx.status === options.status);
    }

    const total = filtered.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    return {
      transactions: paginated,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): TransactionRecord | null {
    return this.transactions.find(tx => tx.id === id || tx.txId === id) || null;
  }

  /**
   * Get transaction by txId
   */
  getTransactionByTxId(txId: string): TransactionRecord | null {
    return this.transactions.find(tx => tx.txId === txId) || null;
  }

  /**
   * Get recent transactions
   */
  getRecentTransactions(limit: number = 10): TransactionRecord[] {
    return this.transactions.slice(0, limit);
  }

  /**
   * Get pending transactions count
   */
  getPendingCount(): number {
    return this.transactions.filter(tx => tx.status === 'pending').length;
  }

  /**
   * Get transaction statistics
   */
  getStats(): {
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    totalSent: number;
    totalReceived: number;
    totalFees: number;
  } {
    const stats = {
      total: this.transactions.length,
      pending: 0,
      confirmed: 0,
      failed: 0,
      totalSent: 0,
      totalReceived: 0,
      totalFees: 0
    };

    for (const tx of this.transactions) {
      // Count by status
      if (tx.status === 'pending') stats.pending++;
      else if (tx.status === 'confirmed') stats.confirmed++;
      else if (tx.status === 'failed') stats.failed++;

      // Sum amounts (only for confirmed)
      if (tx.status === 'confirmed') {
        if (tx.type === 'send' && tx.amount) {
          stats.totalSent += tx.amount;
        } else if (tx.type === 'receive' && tx.amount) {
          stats.totalReceived += tx.amount;
        }

        if (tx.fee) {
          stats.totalFees += tx.fee;
        }
      }
    }

    return stats;
  }

  /**
   * Clear all transactions
   */
  clearHistory(): void {
    this.transactions = [];
    this.saveTransactions();
    console.log('[Transaction History] History cleared');
  }

  /**
   * Delete a specific transaction from history
   */
  deleteTransaction(id: string): boolean {
    const index = this.transactions.findIndex(tx => tx.id === id || tx.txId === id);
    if (index !== -1) {
      this.transactions.splice(index, 1);
      this.saveTransactions();
      return true;
    }
    return false;
  }

  /**
   * Export transactions to JSON
   */
  exportToJson(): string {
    return JSON.stringify(this.transactions, null, 2);
  }

  /**
   * Import transactions from JSON
   */
  importFromJson(json: string): number {
    try {
      const imported = JSON.parse(json) as TransactionRecord[];
      let added = 0;

      for (const tx of imported) {
        // Check if already exists
        if (!this.transactions.find(t => t.txId === tx.txId)) {
          this.transactions.push(tx);
          added++;
        }
      }

      // Sort by timestamp (newest first)
      this.transactions.sort((a, b) => b.timestamp - a.timestamp);
      this.saveTransactions();

      return added;
    } catch (error) {
      console.error('[Transaction History] Import failed:', error);
      return 0;
    }
  }

  /**
   * Save transactions to store
   */
  private saveTransactions(): void {
    this.getStore().set('transactions', this.transactions);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse transaction status
   */
  private parseStatus(status: string): 'pending' | 'confirmed' | 'failed' {
    const s = status?.toLowerCase() || '';
    if (s.includes('accept') || s.includes('confirmed') || s.includes('finalized')) {
      return 'confirmed';
    }
    if (s.includes('reject') || s.includes('failed') || s.includes('aborted')) {
      return 'failed';
    }
    return 'pending';
  }

  /**
   * Parse microcredits to ALEO
   */
  private parseMicrocredits(value: number | string): number {
    const num = typeof value === 'string' ? parseInt(value.replace(/[^\d]/g, ''), 10) : value;
    return num / 1_000_000;
  }

  /**
   * Fetch recent transactions from explorer (for receiving transactions)
   * Note: This requires the explorer API to support address-based queries
   */
  async syncFromExplorer(): Promise<number> {
    if (!this.address) {
      console.warn('[Transaction History] No address set, cannot sync from explorer');
      return 0;
    }

    // Note: The Aleo explorer API currently doesn't support direct address-based
    // transaction queries in a simple way. This would require scanning recent blocks
    // and checking for transactions involving this address.
    // For now, we track transactions initiated by the user.

    console.log('[Transaction History] Explorer sync not yet implemented');
    return 0;
  }
}

// Export singleton
export const transactionHistoryService = TransactionHistoryService.getInstance();

// Export getter
export function getTransactionHistoryService(): TransactionHistoryService {
  return TransactionHistoryService.getInstance();
}
