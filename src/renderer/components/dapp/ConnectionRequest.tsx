import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';

export interface ConnectionRequestProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  origin: string;
  favicon?: string;
  walletAddress?: string;
}

/**
 * Connection Request Modal
 * Shown when a dApp calls window.aleo.connect()
 */
export const ConnectionRequest: React.FC<ConnectionRequestProps> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  origin,
  favicon,
  walletAddress,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  // Extract domain from origin
  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Truncate address for display
  const truncateAddress = (address: string): string => {
    if (!address) return '';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReject}
      title="Connection Request"
      size="sm"
      closeOnBackdrop={false}
      closeOnEscape={false}
      footer={
        <div className="flex gap-3 w-full">
          <Button
            variant="ghost"
            onClick={handleReject}
            className="flex-1"
            disabled={isLoading}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            className="flex-1"
            loading={isLoading}
          >
            Connect
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        {/* Site Info */}
        <div className="flex flex-col items-center space-y-3">
          {/* Favicon */}
          <div className="w-16 h-16 rounded-xl bg-bg-elevated border border-bg-elevated flex items-center justify-center overflow-hidden">
            {favicon ? (
              <img
                src={favicon}
                alt={getDomain(origin)}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <svg
                className="w-8 h-8 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            )}
          </div>

          {/* Domain */}
          <div>
            <p className="text-lg font-medium text-text-primary">
              {getDomain(origin)}
            </p>
            <p className="text-sm text-text-muted mt-1">
              wants to connect to your wallet
            </p>
          </div>
        </div>

        {/* Permissions */}
        <div className="w-full bg-bg-primary rounded-lg p-4 border border-bg-elevated">
          <p className="text-sm font-medium text-text-secondary mb-3">
            This site will be able to:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-text-primary">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              View your wallet address
            </li>
            <li className="flex items-center gap-2 text-sm text-text-primary">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Request transaction approval
            </li>
          </ul>
        </div>

        {/* Wallet Info */}
        {walletAddress && (
          <div className="w-full bg-bg-primary rounded-lg p-4 border border-bg-elevated">
            <p className="text-xs text-text-muted mb-1">Your wallet address</p>
            <p className="text-sm font-mono text-accent-aleo">
              {truncateAddress(walletAddress)}
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-2 text-xs text-text-muted">
          <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            Only connect to sites you trust. This site cannot access your private keys or make transactions without your approval.
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectionRequest;
