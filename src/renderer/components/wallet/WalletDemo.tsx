/**
 * WalletDemo.tsx
 *
 * Complete integration example showing how to use all wallet components together
 * This demonstrates the complete wallet flow with state management
 */

import React, { useState, useEffect } from 'react';
import { WalletPanel } from './WalletPanel';
import { SendForm } from './SendForm';
import { ReceiveModal } from './ReceiveModal';
import { TransactionList } from './TransactionList';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  address: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  fee?: number;
}

export const WalletDemo: React.FC = () => {
  const [showSendForm, setShowSendForm] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState({ public: 0, private: 0 });
  const [address, setAddress] = useState('');

  // Load wallet data on mount
  useEffect(() => {
    loadWalletData();
    loadTransactions();
  }, []);

  const loadWalletData = async () => {
    try {
      const [addressRes, balanceRes] = await Promise.all([
        window.electron.wallet.getAddress(),
        window.electron.wallet.getBalance(),
      ]);

      if (addressRes.success && addressRes.address) {
        setAddress(addressRes.address);
      }

      if (balanceRes.success) {
        setBalance({
          public: balanceRes.public || 0,
          private: balanceRes.private || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    }
  };

  const loadTransactions = async () => {
    // In production, this would fetch from the wallet service
    // For demo, using mock data
    const mockTransactions: Transaction[] = [
      {
        id: 'tx1',
        type: 'received',
        amount: 10.5,
        address: 'aleo1abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        timestamp: Date.now() - 1000 * 60 * 5,
        status: 'confirmed',
      },
      {
        id: 'tx2',
        type: 'sent',
        amount: 5.25,
        address: 'aleo1zyxwvutsrqponmlkjihgfedcba0987654321zyxwvutsrqponmlk',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        status: 'confirmed',
        fee: 0.005,
      },
      {
        id: 'tx3',
        type: 'sent',
        amount: 2.0,
        address: 'aleo1testaddress123456789testaddress123456789testaddress123',
        timestamp: Date.now() - 1000 * 60 * 10,
        status: 'pending',
        fee: 0.001,
      },
      {
        id: 'tx4',
        type: 'received',
        amount: 25.0,
        address: 'aleo1sender1234567890sender1234567890sender1234567890sender',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        status: 'confirmed',
      },
      {
        id: 'tx5',
        type: 'sent',
        amount: 1.5,
        address: 'aleo1recipient1234567890recipient1234567890recipient123456',
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        status: 'failed',
        fee: 0.001,
      },
    ];

    setTransactions(mockTransactions);
  };

  const handleSendSuccess = () => {
    // Reload wallet data and transactions after successful send
    loadWalletData();
    loadTransactions();
  };

  const handleTransactionClick = (transaction: Transaction) => {
    console.log('Transaction clicked:', transaction);
    // In production, this could open a transaction detail modal
    // or navigate to a transaction explorer
  };

  const totalBalance = balance.public + balance.private;

  return (
    <div className="h-screen bg-[#0a0a0f] flex">
      {/* Left Panel - Wallet */}
      <div className="w-96 border-r border-[#27272a] flex flex-col">
        <WalletPanel
          onSendClick={() => setShowSendForm(true)}
          onReceiveClick={() => setShowReceiveModal(true)}
        />
      </div>

      {/* Right Panel - Transaction History */}
      <div className="flex-1 bg-[#111118] overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#27272a]">
            <h2 className="text-xl font-semibold text-[#e4e4e7]">Transaction History</h2>
            <p className="text-sm text-[#71717a] mt-1">
              View all your ALEO transactions
            </p>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto p-6">
            <TransactionList
              transactions={transactions}
              onTransactionClick={handleTransactionClick}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSendForm && (
        <SendForm
          onClose={() => setShowSendForm(false)}
          onSuccess={handleSendSuccess}
          currentBalance={totalBalance}
        />
      )}

      {showReceiveModal && address && (
        <ReceiveModal
          address={address}
          onClose={() => setShowReceiveModal(false)}
        />
      )}
    </div>
  );
};

/**
 * Usage in App.tsx:
 *
 * import { WalletDemo } from './components/wallet/WalletDemo';
 *
 * function App() {
 *   return <WalletDemo />;
 * }
 *
 * Or integrate individual components:
 *
 * import { WalletPanel, SendForm, ReceiveModal, TransactionList } from './components/wallet';
 *
 * function CustomWalletUI() {
 *   const [showSend, setShowSend] = useState(false);
 *
 *   return (
 *     <div>
 *       <WalletPanel
 *         onSendClick={() => setShowSend(true)}
 *         onReceiveClick={() => {...}}
 *       />
 *       {showSend && (
 *         <SendForm
 *           onClose={() => setShowSend(false)}
 *           onSuccess={() => {...}}
 *           currentBalance={100}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 */
