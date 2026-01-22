import React, { useState, useRef, useEffect } from 'react';

interface SendFormProps {
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

type SendStep = 'input' | 'review' | 'sending' | 'success' | 'error';
type FeeLevel = 'low' | 'medium' | 'high';

interface FeeOption {
  level: FeeLevel;
  amount: number;
  label: string;
  estimatedTime: string;
}

const FEE_OPTIONS: FeeOption[] = [
  { level: 'low', amount: 0.001, label: 'Low', estimatedTime: '~5 min' },
  { level: 'medium', amount: 0.005, label: 'Medium', estimatedTime: '~2 min' },
  { level: 'high', amount: 0.01, label: 'High', estimatedTime: '~30 sec' },
];

export const SendForm: React.FC<SendFormProps> = ({
  onClose,
  onSuccess,
  currentBalance,
}) => {
  const [step, setStep] = useState<SendStep>('input');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFee, setSelectedFee] = useState<FeeLevel>('medium');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Ref to store success timer for cleanup
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const selectedFeeOption = FEE_OPTIONS.find((f) => f.level === selectedFee)!;
  const totalAmount = parseFloat(amount || '0') + selectedFeeOption.amount;

  // NOTE: BrowserView visibility is managed by the parent (App.tsx/WalletSidebar)
  // Do NOT manage BrowserView here to avoid race conditions with parent components

  const validateAddress = (address: string): boolean => {
    // Aleo addresses start with 'aleo1' and are 63 characters long
    return address.startsWith('aleo1') && address.length === 63;
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleMaxClick = () => {
    const maxAmount = Math.max(0, currentBalance - selectedFeeOption.amount);
    setAmount(maxAmount.toFixed(6));
  };

  const handleContinue = () => {
    setError('');

    // Validate recipient address
    if (!recipient.trim()) {
      setError('Recipient address is required');
      return;
    }

    if (!validateAddress(recipient)) {
      setError('Invalid Aleo address. Must start with "aleo1" and be 63 characters');
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (totalAmount > currentBalance) {
      setError('Insufficient balance (including fee)');
      return;
    }

    setStep('review');
  };

  const handleConfirmSend = async () => {
    setStep('sending');
    setError('');

    try {
      const result = await window.electron.wallet.send(
        recipient,
        parseFloat(amount),
        selectedFeeOption.amount  // Pass the user-selected fee
      );

      if (result.success) {
        setTxHash(result.txHash || '');
        setStep('success');
        // Store timer ref for cleanup on unmount
        successTimerRef.current = setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      } else {
        setError(result.error || 'Transaction failed');
        setStep('error');
      }
    } catch (err) {
      setError('Failed to send transaction');
      setStep('error');
    }
  };

  const handleBack = () => {
    setStep('input');
    setError('');
  };

  const handleRetry = () => {
    setStep('input');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27272a] rounded-xl max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]">
          <h3 className="text-xl font-semibold text-[#e4e4e7]">
            {step === 'input' ? 'Send ALEO' : step === 'review' ? 'Review Transaction' : step === 'sending' ? 'Sending...' : step === 'success' ? 'Success!' : 'Transaction Failed'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input Step */}
        {step === 'input' && (
          <div className="p-6 space-y-5">
            {/* Recipient Address */}
            <div>
              <label className="block text-sm font-medium text-[#e4e4e7] mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors font-mono text-sm"
                placeholder="aleo1..."
              />
              {recipient && !validateAddress(recipient) && (
                <p className="mt-1.5 text-xs text-amber-400">Invalid address format</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[#e4e4e7]">
                  Amount
                </label>
                <span className="text-xs text-[#71717a]">
                  Balance: <span className="text-[#e4e4e7] font-mono">{currentBalance.toFixed(6)}</span> ALEO
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors font-mono text-lg pr-20"
                  placeholder="0.00"
                />
                <button
                  onClick={handleMaxClick}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#1a1a24] hover:bg-[#27272a] text-[#00d4aa] text-xs font-semibold rounded transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Fee Selector */}
            <div>
              <label className="block text-sm font-medium text-[#e4e4e7] mb-3">
                Network Fee
              </label>
              <div className="grid grid-cols-3 gap-3">
                {FEE_OPTIONS.map((option) => (
                  <button
                    key={option.level}
                    onClick={() => setSelectedFee(option.level)}
                    className={`px-3 py-3 rounded-lg border-2 transition-all ${
                      selectedFee === option.level
                        ? 'border-[#00d4aa] bg-[#00d4aa]/10'
                        : 'border-[#27272a] bg-[#0a0a0f] hover:border-[#3f3f46]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#e4e4e7] mb-1">
                      {option.label}
                    </div>
                    <div className="text-xs text-[#a1a1aa] font-mono mb-1">
                      {option.amount} ALEO
                    </div>
                    <div className="text-xs text-[#71717a]">
                      {option.estimatedTime}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#a1a1aa]">Amount</span>
                <span className="text-[#e4e4e7] font-mono">{parseFloat(amount || '0').toFixed(6)} ALEO</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#a1a1aa]">Network Fee</span>
                <span className="text-[#e4e4e7] font-mono">{selectedFeeOption.amount.toFixed(6)} ALEO</span>
              </div>
              <div className="pt-2 border-t border-[#27272a]">
                <div className="flex items-center justify-between">
                  <span className="text-[#e4e4e7] font-semibold">Total</span>
                  <span className="text-[#e4e4e7] font-mono font-semibold">{totalAmount.toFixed(6)} ALEO</span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!recipient || !amount || parseFloat(amount || '0') <= 0}
              className="w-full px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="p-6 space-y-5">
            <div className="space-y-4">
              {/* From */}
              <div>
                <div className="text-sm text-[#a1a1aa] mb-2">From</div>
                <div className="px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] font-mono text-sm truncate">
                  Your Wallet
                </div>
              </div>

              {/* To */}
              <div>
                <div className="text-sm text-[#a1a1aa] mb-2">To</div>
                <div className="px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] font-mono text-sm break-all">
                  {recipient}
                </div>
              </div>

              {/* Amount Details */}
              <div className="px-4 py-4 bg-[#0a0a0f] border border-[#27272a] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#a1a1aa]">Amount</span>
                  <span className="text-[#e4e4e7] font-mono">{parseFloat(amount).toFixed(6)} ALEO</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#a1a1aa]">Network Fee ({selectedFeeOption.label})</span>
                  <span className="text-[#e4e4e7] font-mono">{selectedFeeOption.amount.toFixed(6)} ALEO</span>
                </div>
                <div className="pt-3 border-t border-[#27272a]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#e4e4e7] font-semibold">Total</span>
                    <span className="text-lg text-[#e4e4e7] font-mono font-bold">{totalAmount.toFixed(6)} ALEO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-xs text-amber-400">
                <strong className="block mb-1">Confirm transaction details</strong>
                Transactions on Aleo blockchain are irreversible. Please verify all details before confirming.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-3 bg-[#1a1a24] hover:bg-[#27272a] text-[#e4e4e7] font-semibold rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmSend}
                className="flex-1 px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors"
              >
                Confirm Send
              </button>
            </div>
          </div>
        )}

        {/* Sending Step - ZK Proof Animation */}
        {step === 'sending' && (
          <div className="p-6 flex flex-col items-center justify-center py-12">
            <div className="relative w-24 h-24 mx-auto mb-6">
              {/* Animated rings */}
              <div className="absolute inset-0 border-2 border-[#00d4aa] rounded-full animate-ping opacity-20" />
              <div
                className="absolute inset-2 border-2 border-[#00d4aa] rounded-full animate-ping opacity-40"
                style={{ animationDelay: '0.3s' }}
              />
              <div
                className="absolute inset-4 border-2 border-[#00d4aa] rounded-full animate-ping opacity-60"
                style={{ animationDelay: '0.6s' }}
              />
              <div
                className="absolute inset-6 border-2 border-[#00d4aa]/80 rounded-full animate-pulse"
              />
              {/* Center lock icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#00d4aa]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00d4aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
            <p className="text-lg text-[#e4e4e7] font-semibold mb-2">Generating ZK Proof...</p>
            <p className="text-sm text-[#a1a1aa] text-center mb-4">
              Your transaction is being encrypted with zero-knowledge cryptography
            </p>
            {/* Progress steps */}
            <div className="w-full max-w-xs space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#00d4aa]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Building transaction inputs...</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#00d4aa]">
                <div className="w-4 h-4 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
                <span>Generating ZK-SNARK proof...</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#52525b]">
                <div className="w-4 h-4 rounded-full border border-[#52525b]" />
                <span>Broadcasting to network...</span>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="p-6 flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl text-[#e4e4e7] font-semibold mb-2">Transaction Sent!</p>
            <p className="text-sm text-[#a1a1aa] text-center mb-4">
              {parseFloat(amount).toFixed(6)} ALEO sent successfully
            </p>
            {txHash && (
              <div className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg">
                <div className="text-xs text-[#a1a1aa] mb-1">Transaction Hash</div>
                <div className="text-sm text-[#e4e4e7] font-mono break-all">{txHash}</div>
              </div>
            )}
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-xl text-[#e4e4e7] font-semibold mb-2">Transaction Failed</p>
              <p className="text-sm text-[#a1a1aa] text-center">{error}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[#1a1a24] hover:bg-[#27272a] text-[#e4e4e7] font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
