import React from 'react';

interface Transaction {
  id: string;
  txId?: string;
  type: 'sent' | 'received' | 'execute';
  amount?: number;
  address?: string;
  programId?: string;
  functionName?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  fee?: number;
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading = false,
  onTransactionClick,
}) => {
  const formatAddress = (address: string): string => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg animate-pulse"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1a1a24]"></div>
                <div>
                  <div className="w-24 h-4 bg-[#1a1a24] rounded mb-1"></div>
                  <div className="w-32 h-3 bg-[#1a1a24] rounded"></div>
                </div>
              </div>
              <div className="w-20 h-5 bg-[#1a1a24] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1a1a24] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[#e4e4e7] mb-1">No Transactions Yet</h3>
        <p className="text-sm text-[#71717a] max-w-xs">
          Your transaction history will appear here once you send or receive ALEO tokens
        </p>
      </div>
    );
  }

  // Group transactions by date
  const groupedTransactions: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    const dateKey = formatDate(tx.timestamp);
    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(tx);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([date, txs]) => (
        <div key={date}>
          {/* Date Header */}
          <div className="text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-3 px-1">
            {date}
          </div>

          {/* Transactions */}
          <div className="space-y-2">
            {txs.map((tx) => (
              <div
                key={tx.id}
                onClick={() => onTransactionClick?.(tx)}
                className={`px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg transition-all ${
                  onTransactionClick ? 'cursor-pointer hover:border-[#3f3f46] hover:bg-[#111118]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Left side - Icon and details */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'sent'
                          ? 'bg-red-500/10'
                          : tx.type === 'execute'
                          ? 'bg-purple-500/10'
                          : 'bg-green-500/10'
                      }`}
                    >
                      {tx.type === 'sent' ? (
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      ) : tx.type === 'execute' ? (
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#e4e4e7] capitalize">
                          {tx.type === 'execute' ? 'Contract Call' : tx.type}
                        </span>
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            tx.status === 'confirmed'
                              ? 'bg-green-500/10 text-green-400'
                              : tx.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {tx.status === 'pending' && (
                            <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full mr-1.5 animate-pulse"></span>
                          )}
                          {tx.status}
                        </span>
                      </div>
                      {tx.type === 'execute' ? (
                        <>
                          <div className="text-xs text-[#a78bfa] font-mono truncate">
                            {tx.programId || 'Unknown Program'}
                          </div>
                          <div className="text-xs text-[#71717a] mt-0.5">
                            {tx.functionName ? `${tx.functionName}()` : 'Unknown Function'}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-[#71717a] font-mono truncate">
                          {tx.type === 'sent' ? 'To: ' : 'From: '}
                          {tx.address ? formatAddress(tx.address) : 'Unknown'}
                        </div>
                      )}
                      <div className="text-xs text-[#52525b] mt-0.5">
                        {formatTime(tx.timestamp)}
                      </div>
                    </div>
                  </div>

                  {/* Right side - Amount */}
                  <div className="text-right flex-shrink-0 ml-4">
                    {tx.type === 'execute' ? (
                      <>
                        <div className="text-sm font-medium text-purple-400">
                          Execute
                        </div>
                        {tx.fee && (
                          <div className="text-xs text-[#52525b] mt-0.5">
                            Fee: {tx.fee.toFixed(6)} ALEO
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div
                          className={`text-base font-semibold font-mono ${
                            tx.type === 'sent' ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {tx.type === 'sent' ? '-' : '+'}
                          {(tx.amount || 0).toFixed(6)}
                        </div>
                        <div className="text-xs text-[#71717a]">ALEO</div>
                        {tx.fee && tx.type === 'sent' && (
                          <div className="text-xs text-[#52525b] mt-0.5">
                            Fee: {tx.fee.toFixed(6)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {/* View on Explorer link */}
                <div className="mt-2 pt-2 border-t border-[#27272a]/50">
                  <a
                    href={`https://explorer.provable.com/transaction/${tx.txId || tx.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#00d4aa] hover:text-[#00f2c3] hover:underline transition-colors flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    View on Explorer
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Example usage:
/*
import { TransactionList } from './TransactionList';

const mockTransactions = [
  {
    id: '1',
    type: 'received',
    amount: 10.5,
    address: 'aleo1abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
    timestamp: Date.now() - 1000 * 60 * 5,
    status: 'confirmed',
  },
  {
    id: '2',
    type: 'sent',
    amount: 5.25,
    address: 'aleo1zyxwvutsrqponmlkjihgfedcba0987654321zyxwvutsrqponmlk',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    status: 'confirmed',
    fee: 0.001,
  },
  {
    id: '3',
    type: 'sent',
    amount: 2.0,
    address: 'aleo1testaddress123456789testaddress123456789testaddress123',
    timestamp: Date.now() - 1000 * 60 * 10,
    status: 'pending',
    fee: 0.001,
  },
];

<TransactionList
  transactions={mockTransactions}
  onTransactionClick={(tx) => console.log('Clicked:', tx)}
/>
*/
