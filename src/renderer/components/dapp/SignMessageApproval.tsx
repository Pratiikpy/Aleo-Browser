import React, { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';

export interface SignMessageApprovalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  origin: string;
  favicon?: string;
  message: string;
}

/**
 * Sign Message Approval Modal
 * Shown when a dApp calls window.aleo.signMessage()
 */
export const SignMessageApproval: React.FC<SignMessageApprovalProps> = ({
  isOpen,
  onClose,
  onApprove,
  onReject,
  origin,
  favicon,
  message,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReject}
      title="Sign Message"
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
            Sign
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
            <p className="text-xs text-text-muted">wants you to sign a message</p>
          </div>
        </div>

        {/* Message */}
        <div className="bg-bg-primary rounded-lg border border-bg-elevated">
          <div className="px-4 py-3 border-b border-bg-elevated">
            <p className="text-xs text-text-muted uppercase tracking-wide">Message to sign</p>
          </div>
          <div className="px-4 py-3">
            <pre className="text-sm text-text-primary whitespace-pre-wrap break-all font-mono bg-bg-elevated p-3 rounded-lg max-h-48 overflow-y-auto">
              {message}
            </pre>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-text-muted p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Signing this message creates a cryptographic proof that you own this wallet.
            This does not grant access to your funds or submit any transactions.
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default SignMessageApproval;
