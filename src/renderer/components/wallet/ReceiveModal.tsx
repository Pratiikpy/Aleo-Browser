import React, { useState } from 'react';

interface ReceiveModalProps {
  address: string;
  onClose: () => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  address,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // NOTE: BrowserView visibility is managed by the parent (App.tsx/WalletSidebar)
  // Do NOT manage BrowserView here to avoid race conditions with parent components

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Aleo Address',
          text: `Send ALEO to: ${address}`,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27272a] rounded-xl max-w-lg w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-xl font-semibold text-[#e4e4e7]">Receive ALEO</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Text */}
          <div className="text-center">
            <p className="text-sm text-[#a1a1aa]">
              Share this address to receive ALEO tokens
            </p>
          </div>

          {/* QR Code Placeholder */}
          <div className="flex justify-center">
            <div className="w-64 h-64 bg-[#0a0a0f] border-2 border-[#27272a] rounded-xl p-4 flex items-center justify-center">
              {/* QR Code SVG Placeholder - styled to look like a QR code */}
              <div className="w-full h-full grid grid-cols-8 gap-1">
                {/* Generate a simple pattern that looks like QR code */}
                {Array.from({ length: 64 }).map((_, i) => {
                  // Create a pseudo-random pattern based on address
                  const isFilledPattern = [
                    1, 1, 1, 0, 1, 1, 1, 0,
                    1, 0, 0, 0, 0, 0, 1, 0,
                    1, 0, 1, 1, 1, 0, 1, 0,
                    0, 0, 1, 0, 1, 0, 0, 0,
                    1, 0, 1, 0, 1, 0, 1, 0,
                    0, 0, 0, 0, 0, 0, 0, 1,
                    1, 0, 1, 1, 1, 0, 1, 1,
                    1, 1, 1, 0, 1, 1, 1, 0,
                  ];
                  const isFilled = isFilledPattern[i] === 1;
                  return (
                    <div
                      key={i}
                      className={`rounded-sm ${
                        isFilled ? 'bg-[#e4e4e7]' : 'bg-[#1a1a24]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Address Display */}
          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-2 text-center">
              Your Address
            </label>
            <div className="px-4 py-4 bg-[#0a0a0f] border border-[#27272a] rounded-lg">
              <div className="text-center text-[#e4e4e7] font-mono text-sm break-all leading-relaxed">
                {address}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs text-amber-400">
              <strong className="block mb-1">Important</strong>
              Only send ALEO tokens to this address. Sending other tokens may result in permanent loss.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCopy}
              className="w-full px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Address Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Address
                </>
              )}
            </button>

            {/* Show share button only if Web Share API is available */}
            {navigator.share && (
              <button
                onClick={handleShare}
                className="w-full px-4 py-3 bg-[#1a1a24] hover:bg-[#27272a] text-[#e4e4e7] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Address
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
