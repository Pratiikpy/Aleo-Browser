import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TransactionList } from './TransactionList';

interface WalletPanelProps {
  onSendClick: () => void;
  onReceiveClick: () => void;
}

type WalletState = 'no-wallet' | 'locked' | 'unlocked';
type ImportMode = 'privateKey' | 'mnemonic';

interface WalletData {
  address: string;
  publicBalance: number;
  privateBalance: number;
}

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

export const WalletPanel: React.FC<WalletPanelProps> = ({
  onSendClick,
  onReceiveClick,
}) => {
  const [state, setState] = useState<WalletState>('no-wallet');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('mnemonic');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createStep, setCreateStep] = useState<'password' | 'mnemonic'>('password');
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'privateKey' | 'viewKey'>('privateKey');
  const [exportedKey, setExportedKey] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Track if component is mounted for cleanup
  const isMountedRef = useRef(true);

  useEffect(() => {
    checkWalletState();

    // Set mounted ref and return cleanup that only runs on unmount
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Only restore BrowserView on actual unmount
      window.electron.ui?.setBrowserViewVisible(true);
    };
  }, []);

  // Unified BrowserView visibility control - hide when ANY blocking condition is true
  useEffect(() => {
    const shouldHideBrowserView =
      state === 'locked' ||
      state === 'no-wallet' ||
      showImportModal ||
      showExportModal;

    console.log('[WalletPanel] BrowserView visibility:', !shouldHideBrowserView, { state, showImportModal, showExportModal });

    // Always hide BrowserView when wallet panel is active (to prevent it from blocking input)
    // Only show it when wallet is unlocked AND no modals are open
    window.electron.ui?.setBrowserViewVisible(!shouldHideBrowserView);

    // No cleanup here - the mount useEffect handles unmount cleanup
  }, [state, showImportModal, showExportModal]);

  const checkWalletState = async () => {
    try {
      const isLocked = await window.electron.wallet.isLocked();

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      if (isLocked.success !== false) {
        if (isLocked.hasWallet) {
          setState(isLocked.isLocked ? 'locked' : 'unlocked');
          if (!isLocked.isLocked) {
            const address = await loadWalletData();
            if (address) {
              await loadTransactions(address);
            }
          }
        } else {
          setState('no-wallet');
        }
      }
    } catch (err) {
      console.error('Failed to check wallet state:', err);
    }
  };

  const loadWalletData = async (): Promise<string | null> => {
    try {
      const [addressRes, balanceRes] = await Promise.all([
        window.electron.wallet.getAddress(),
        window.electron.wallet.getBalance(),
      ]);

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return null;

      if (addressRes.success && balanceRes.success) {
        const address = addressRes.address || '';
        setWalletData({
          address,
          publicBalance: balanceRes.public || 0,
          privateBalance: balanceRes.private || 0,
        });
        return address;
      }
      return null;
    } catch (err) {
      console.error('Failed to load wallet data:', err);
      return null;
    }
  };

  const loadTransactions = async (address?: string) => {
    setLoadingTx(true);
    try {
      // Initialize transaction history with wallet address first
      const walletAddress = address || walletData?.address;
      if (walletAddress) {
        await window.electron.txHistory?.init?.(walletAddress, 'testnet');
      }

      // Load from transaction history service
      const result = await window.electron.txHistory?.getAll?.();

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      console.log('[WalletPanel] Transaction history result:', result);

      if (result?.success && result.transactions) {
        // Convert to TransactionList format
        const txs: Transaction[] = result.transactions.map((tx: any) => ({
          id: tx.id,
          txId: tx.txId,
          type: tx.type === 'send' ? 'sent' : tx.type === 'execute' ? 'execute' : 'received',
          amount: tx.amount,
          address: tx.type === 'send' ? (tx.to || '') : (tx.from || ''),
          programId: tx.programId,
          functionName: tx.functionName,
          timestamp: tx.timestamp,
          status: tx.status,
          fee: tx.fee,
        }));
        setTransactions(txs);
        console.log('[WalletPanel] Loaded transactions:', txs.length);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      if (isMountedRef.current) {
        setLoadingTx(false);
      }
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electron.wallet.create(password);
      if (result.success) {
        // Use real mnemonic from the service
        setGeneratedMnemonic(result.mnemonic || '');
        setCreateStep('mnemonic');
      } else {
        setError(result.error || 'Failed to create wallet');
      }
    } catch (err) {
      setError('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMnemonic = async () => {
    setState('unlocked');
    setCreateStep('password');
    setPassword('');
    setConfirmPassword('');
    setGeneratedMnemonic('');
    setMnemonicCopied(false);
    const address = await loadWalletData();
    if (address) {
      await loadTransactions(address);
    }
  };

  const handleImportWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (importMode === 'mnemonic') {
        if (!mnemonic.trim() || mnemonic.trim().split(/\s+/).length < 12) {
          setError('Please enter a valid 12 or 24 word recovery phrase');
          setLoading(false);
          return;
        }
        result = await window.electron.wallet.importFromMnemonic(mnemonic.trim(), password);
      } else {
        if (!privateKey.trim()) {
          setError('Private key is required');
          setLoading(false);
          return;
        }
        result = await window.electron.wallet.import(privateKey.trim(), password);
      }

      if (result.success) {
        setState('unlocked');
        setShowImportModal(false);
        setPrivateKey('');
        setMnemonic('');
        setPassword('');
        const address = await loadWalletData();
        if (address) {
          await loadTransactions(address);
        }
      } else {
        setError(result.error || 'Failed to import wallet');
      }
    } catch (err) {
      setError('Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await window.electron.wallet.unlock(password);
      if (result.success) {
        setState('unlocked');
        setPassword('');
        const address = await loadWalletData();
        if (address) {
          await loadTransactions(address);
        }
      } else {
        setError(result.error || 'Invalid password');
      }
    } catch (err) {
      setError('Failed to unlock wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    try {
      await window.electron.wallet.lock();
      setState('locked');
      setWalletData(null);
      setTransactions([]);
      setShowSettingsMenu(false);
    } catch (err) {
      console.error('Failed to lock wallet:', err);
    }
  };

  const handleRefreshBalance = async () => {
    setRefreshing(true);
    try {
      const result = await window.electron.wallet.refreshBalance();
      if (result.success) {
        setWalletData(prev => prev ? {
          ...prev,
          publicBalance: result.public || 0,
          privateBalance: result.private || 0,
        } : null);
      }
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportKey = async (type: 'privateKey' | 'viewKey') => {
    try {
      const result = type === 'privateKey'
        ? await window.electron.wallet.exportPrivateKey()
        : await window.electron.wallet.exportViewKey();

      if (result.success) {
        setExportType(type);
        setExportedKey(type === 'privateKey' ? result.privateKey : result.viewKey);
        setShowExportModal(true);
        setShowSettingsMenu(false);
      }
    } catch (err) {
      console.error('Failed to export key:', err);
    }
  };

  const handleDeleteWallet = async () => {
    if (window.confirm('Are you sure you want to delete your wallet? This action cannot be undone. Make sure you have backed up your recovery phrase or private key.')) {
      try {
        const result = await window.electron.wallet.delete();
        if (result.success) {
          setState('no-wallet');
          setWalletData(null);
          setTransactions([]);
          setShowSettingsMenu(false);
        }
      } catch (err) {
        console.error('Failed to delete wallet:', err);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyMnemonic = () => {
    copyToClipboard(generatedMnemonic);
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
  };

  // No wallet state - Create or Import
  if (state === 'no-wallet') {
    return (
      <div className="flex flex-col h-full bg-[#111118] p-6">
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          {/* Logo/Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00a885] flex items-center justify-center mb-6 shadow-lg shadow-[#00d4aa]/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[#e4e4e7] mb-2">Aleo Wallet</h2>
          <p className="text-[#a1a1aa] text-center mb-8">Privacy-first blockchain wallet</p>

          {createStep === 'password' ? (
            <>
              {/* Create Wallet Form */}
              <form onSubmit={handleCreateWallet} className="w-full space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#e4e4e7] mb-2">
                    Create Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors"
                    placeholder="Min 8 characters"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#e4e4e7] mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors"
                    placeholder="Re-enter password"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Wallet...' : 'Create New Wallet'}
                </button>
              </form>

              {/* Import Wallet Section */}
              <div className="w-full">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#27272a]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#111118] text-[#71717a]">or</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="w-full px-4 py-3 bg-[#1a1a24] hover:bg-[#27272a] text-[#e4e4e7] font-semibold rounded-lg transition-colors"
                >
                  Import Existing Wallet
                </button>
              </div>

              {/* Import Modal */}
              {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-[#111118] border border-[#27272a] rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#e4e4e7]">Import Wallet</h3>
                      <button
                        onClick={() => {
                          setShowImportModal(false);
                          setPrivateKey('');
                          setMnemonic('');
                          setPassword('');
                          setError('');
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7]"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Import Mode Tabs */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setImportMode('mnemonic')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          importMode === 'mnemonic'
                            ? 'bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30'
                            : 'bg-[#1a1a24] text-[#a1a1aa] hover:bg-[#27272a]'
                        }`}
                      >
                        Recovery Phrase
                      </button>
                      <button
                        onClick={() => setImportMode('privateKey')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          importMode === 'privateKey'
                            ? 'bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30'
                            : 'bg-[#1a1a24] text-[#a1a1aa] hover:bg-[#27272a]'
                        }`}
                      >
                        Private Key
                      </button>
                    </div>

                    <form onSubmit={handleImportWallet} className="space-y-4">
                      {importMode === 'mnemonic' ? (
                        <div>
                          <label className="block text-sm font-medium text-[#e4e4e7] mb-2">
                            Recovery Phrase (12 or 24 words)
                          </label>
                          <textarea
                            value={mnemonic}
                            onChange={(e) => setMnemonic(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors font-mono text-sm resize-none"
                            rows={4}
                            placeholder="Enter your recovery phrase separated by spaces"
                            disabled={loading}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-[#e4e4e7] mb-2">
                            Private Key
                          </label>
                          <textarea
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors font-mono text-sm resize-none"
                            rows={3}
                            placeholder="APrivateKey1..."
                            disabled={loading}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-[#e4e4e7] mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors"
                          placeholder="Min 8 characters"
                          disabled={loading}
                        />
                      </div>

                      {error && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Importing...' : 'Import Wallet'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Mnemonic display step
            <div className="w-full">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[#e4e4e7]">Save Your Recovery Phrase</h3>
                </div>
                <p className="text-sm text-[#a1a1aa] mb-4">
                  Write down these words in order and store them safely. You'll need them to recover your wallet. Never share this with anyone!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-[#0a0a0f] border border-[#27272a] rounded-lg">
                {generatedMnemonic.split(' ').map((word, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-[#52525b] w-5">{index + 1}.</span>
                    <span className="text-sm text-[#e4e4e7] font-mono">{word}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={copyMnemonic}
                className="w-full px-4 py-3 bg-[#1a1a24] hover:bg-[#27272a] text-[#e4e4e7] font-semibold rounded-lg transition-colors mb-4 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {mnemonicCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>

              <button
                onClick={handleConfirmMnemonic}
                className="w-full px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors"
              >
                I've Saved My Recovery Phrase
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Locked state - Unlock form
  if (state === 'locked') {
    return (
      <div className="flex flex-col h-full bg-[#111118] p-6">
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d4aa]/20 to-[#00a885]/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[#00d4aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[#e4e4e7] mb-2">Wallet Locked</h2>
          <p className="text-[#a1a1aa] text-center mb-8">Enter your password to unlock</p>

          <form onSubmit={handleUnlock} className="w-full space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg text-[#e4e4e7] placeholder-[#52525b] focus:border-[#00d4aa] focus:outline-none transition-colors"
                placeholder="Enter password"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Unlocking...' : 'Unlock Wallet'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Unlocked state - Full wallet interface
  return (
    <div className="flex flex-col h-full bg-[#111118]">
      {/* Header with settings menu */}
      <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#e4e4e7]">Aleo Wallet</h2>
        <div className="relative">
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Settings Dropdown */}
          {showSettingsMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a24] border border-[#27272a] rounded-lg shadow-xl z-50">
              <button
                onClick={() => handleExportKey('privateKey')}
                className="w-full px-4 py-2.5 text-left text-sm text-[#e4e4e7] hover:bg-[#27272a] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Export Private Key
              </button>
              <button
                onClick={() => handleExportKey('viewKey')}
                className="w-full px-4 py-2.5 text-left text-sm text-[#e4e4e7] hover:bg-[#27272a] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Export View Key
              </button>
              <div className="border-t border-[#27272a] my-1"></div>
              <button
                onClick={handleLock}
                className="w-full px-4 py-2.5 text-left text-sm text-[#e4e4e7] hover:bg-[#27272a] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Lock Wallet
              </button>
              <button
                onClick={handleDeleteWallet}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Wallet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Powered by Aleo Badge */}
      <div className="px-4 py-2 bg-gradient-to-r from-[#00d4aa]/10 to-[#a855f7]/10 border-b border-[#27272a] flex items-center justify-center gap-2">
        <svg className="w-4 h-4 text-[#00d4aa]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-xs font-medium text-[#00d4aa]">Secured by Aleo ZK-SNARKs</span>
      </div>

      {/* Network Selector */}
      <div className="px-4 py-2 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
          <span className="text-xs text-amber-400 font-medium">Testnet</span>
        </div>
        <button className="text-xs text-[#71717a] hover:text-[#e4e4e7] transition-colors flex items-center gap-1">
          Switch Network
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Balance section */}
      <div className="p-6 border-b border-[#27272a]">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-[#a1a1aa]">Total Balance</div>
          <button
            onClick={handleRefreshBalance}
            disabled={refreshing}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors disabled:opacity-50"
            title="Refresh Balance"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="text-4xl font-bold text-[#e4e4e7] mb-4 font-mono">
          {((walletData?.publicBalance || 0) + (walletData?.privateBalance || 0)).toFixed(6)}
          <span className="text-lg text-[#71717a] ml-2">ALEO</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00d4aa]"></div>
            <span className="text-[#a1a1aa]">Public:</span>
            <span className="text-[#e4e4e7] font-mono">{walletData?.publicBalance.toFixed(6) || '0.000000'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#a855f7]"></div>
            <span className="text-[#a1a1aa]">Private:</span>
            <span className="text-[#e4e4e7] font-mono">{walletData?.privateBalance.toFixed(6) || '0.000000'}</span>
          </div>
        </div>
      </div>

      {/* ZK Privacy Indicator - Shows what AleoBrowser does vs Chrome */}
      <div className="px-4 py-3 border-b border-[#27272a] bg-gradient-to-r from-[#00d4aa]/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#00d4aa]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#00d4aa]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-[#00d4aa]">Zero-Knowledge Protected</span>
        </div>
        <p className="text-xs text-[#a1a1aa]">
          Your private balance is shielded using ZK-SNARKs. Only you can see it.
        </p>
      </div>

      {/* Address section */}
      <div className="px-4 py-4 border-b border-[#27272a]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-[#a1a1aa]">Wallet Address</div>
          <a
            href={`https://explorer.aleo.org/address/${walletData?.address || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#00d4aa] hover:text-[#00f2c3] hover:underline transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              window.electron?.browser?.navigate?.(`https://explorer.aleo.org/address/${walletData?.address || ''}`);
            }}
          >
            View on Explorer
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-[#0a0a0f] rounded-lg border border-[#27272a] text-sm text-[#e4e4e7] font-mono truncate">
            {walletData?.address || 'aleo1...'}
          </div>
          <button
            onClick={() => walletData && copyToClipboard(walletData.address)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7] transition-colors"
            title="Copy Address"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-4 border-b border-[#27272a]">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSendClick}
            className="px-4 py-3 bg-[#00d4aa] hover:bg-[#00f5c4] text-[#0a0a0f] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
          <button
            onClick={onReceiveClick}
            className="px-4 py-3 bg-[#1a1a24] hover:bg-[#27272a] text-[#e4e4e7] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Receive
          </button>
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          <div className="text-sm text-[#a1a1aa] mb-3">Recent Activity</div>
          <TransactionList transactions={transactions} loading={loadingTx} />
        </div>
      </div>

      {/* Export Key Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111118] border border-[#27272a] rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#e4e4e7]">
                {exportType === 'privateKey' ? 'Private Key' : 'View Key'}
              </h3>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportedKey('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#1a1a24] text-[#a1a1aa] hover:text-[#e4e4e7]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
              <p className="text-sm text-red-400">
                <strong>Warning:</strong> Never share your {exportType === 'privateKey' ? 'private key' : 'view key'} with anyone.
                Anyone with this key can {exportType === 'privateKey' ? 'control your funds' : 'view your transactions'}.
              </p>
            </div>

            <div className="p-3 bg-[#0a0a0f] border border-[#27272a] rounded-lg mb-4">
              <code className="text-sm text-[#e4e4e7] font-mono break-all">{exportedKey}</code>
            </div>

            <button
              onClick={() => {
                copyToClipboard(exportedKey);
              }}
              className="w-full px-4 py-3 bg-[#1a1a24] hover:bg-[#27272a] text-[#e4e4e7] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close settings menu */}
      {showSettingsMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setShowSettingsMenu(false)}
        />
      )}
    </div>
  );
};
