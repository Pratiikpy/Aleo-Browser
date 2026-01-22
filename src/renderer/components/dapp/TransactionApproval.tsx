import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';

export interface TransactionDetails {
  programId: string;
  functionName: string;
  inputs: string[];
  fee?: number;
}

export interface TransactionApprovalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  origin: string;
  favicon?: string;
  transaction: TransactionDetails;
  walletBalance?: number;
}

/**
 * Transaction Approval Modal
 * Shown when a dApp calls window.aleo.requestTransaction()
 */
export const TransactionApproval: React.FC<TransactionApprovalProps> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  origin,
  favicon,
  transaction,
  walletBalance,
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

  // Format input for display
  const formatInput = (input: string, index: number): React.ReactNode => {
    // Check if it's an address
    if (input.startsWith('aleo1')) {
      return (
        <span className="font-mono text-accent-aleo">
          {input.slice(0, 10)}...{input.slice(-8)}
        </span>
      );
    }
    // Check if it's a number with u64/u128 suffix
    const numMatch = input.match(/^(\d+)(u\d+)$/);
    if (numMatch) {
      const [, value, type] = numMatch;
      // Format as ALEO if it looks like microcredits
      if (parseInt(value) > 100000) {
        const aleo = parseInt(value) / 1_000_000;
        return (
          <span>
            <span className="text-accent-aleo font-medium">{aleo.toFixed(6)}</span>
            <span className="text-text-muted ml-1">ALEO</span>
          </span>
        );
      }
      return (
        <span className="font-mono">
          {value}
          <span className="text-text-muted ml-1">{type}</span>
        </span>
      );
    }
    return <span className="font-mono">{input}</span>;
  };

  const fee = transaction.fee || 0.1;
  const hasInsufficientBalance = walletBalance !== undefined && walletBalance < fee;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReject}
      title="Transaction Request"
      size="md"
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
            disabled={hasInsufficientBalance}
          >
            Approve
          </Button>
        </div>
      }
    >
      <div className="flex flex-col space-y-5">
        {/* Site Info */}
        <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg border border-bg-elevated">
          <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden">
            {favicon ? (
              <img
                src={favicon}
                alt={getDomain(origin)}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{getDomain(origin)}</p>
            <p className="text-xs text-text-muted">is requesting a transaction</p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          {/* Program and Function */}
          <div className="bg-bg-primary rounded-lg border border-bg-elevated overflow-hidden">
            <div className="px-4 py-3 border-b border-bg-elevated">
              <p className="text-xs text-text-muted uppercase tracking-wide">Program</p>
              <p className="text-sm font-mono text-text-primary mt-1">{transaction.programId}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-text-muted uppercase tracking-wide">Function</p>
              <p className="text-sm font-mono text-accent-aleo mt-1">{transaction.functionName}</p>
            </div>
          </div>

          {/* Inputs */}
          {transaction.inputs.length > 0 && (
            <div className="bg-bg-primary rounded-lg border border-bg-elevated">
              <div className="px-4 py-3 border-b border-bg-elevated">
                <p className="text-xs text-text-muted uppercase tracking-wide">Inputs</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                {transaction.inputs.map((input, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Input {index + 1}:</span>
                    {formatInput(input, index)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fee */}
          <div className="bg-bg-primary rounded-lg border border-bg-elevated">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Transaction Fee</p>
                <p className="text-sm text-text-primary mt-1">
                  <span className="font-medium">{fee.toFixed(6)}</span>
                  <span className="text-text-muted ml-1">ALEO</span>
                </p>
              </div>
              {walletBalance !== undefined && (
                <div className="text-right">
                  <p className="text-xs text-text-muted">Your Balance</p>
                  <p className={`text-sm ${hasInsufficientBalance ? 'text-red-500' : 'text-text-primary'}`}>
                    {walletBalance.toFixed(6)} ALEO
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insufficient Balance Warning */}
        {hasInsufficientBalance && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400">
              Insufficient balance to cover the transaction fee
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-2 text-xs text-text-muted p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
          <svg className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            Review this transaction carefully. Once approved, it cannot be reversed.
            Only approve transactions you understand and trust.
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionApproval;
