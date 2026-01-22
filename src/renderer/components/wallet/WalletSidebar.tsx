import React, { useState, useEffect } from 'react';
import { WalletPanel } from './WalletPanel';
import { SendForm } from './SendForm';
import { ReceiveModal } from './ReceiveModal';

interface WalletSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletSidebar: React.FC<WalletSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const [view, setView] = useState<'main' | 'send' | 'receive'>('main');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Load wallet data when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadWalletInfo();
    }
  }, [isOpen]);

  const loadWalletInfo = async () => {
    try {
      const [addressRes, balanceRes] = await Promise.all([
        window.electron.wallet.getAddress(),
        window.electron.wallet.getBalance(),
      ]);

      if (addressRes.success) {
        setWalletAddress(addressRes.address || '');
      }
      if (balanceRes.success) {
        setWalletBalance((balanceRes.public || 0) + (balanceRes.private || 0));
      }
    } catch (err) {
      console.error('Failed to load wallet info:', err);
    }
  };

  const handleSendSuccess = () => {
    // Refresh wallet data after successful send
    loadWalletInfo();
    setView('main');
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-[#111118] border-l border-[#27272a] flex flex-col animate-fade-in pointer-events-auto relative z-50 h-full">
      {/* Close button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Wallet Panel */}
      {view === 'main' && (
        <WalletPanel
          onSendClick={() => setView('send')}
          onReceiveClick={() => setView('receive')}
        />
      )}

      {/* Send Form Modal */}
      {view === 'send' && (
        <SendForm
          onClose={() => setView('main')}
          onSuccess={handleSendSuccess}
          currentBalance={walletBalance}
        />
      )}

      {/* Receive Modal */}
      {view === 'receive' && (
        <ReceiveModal
          address={walletAddress}
          onClose={() => setView('main')}
        />
      )}
    </div>
  );
};
