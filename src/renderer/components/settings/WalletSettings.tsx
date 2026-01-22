import React, { useState } from 'react';
import { Button, Input, Modal } from '../shared';

export interface WalletSettingsData {
  autoLockTimeout: number;
  network: 'testnet' | 'mainnet';
}

export interface WalletSettingsProps {
  settings: WalletSettingsData;
  onChange: (settings: WalletSettingsData) => void;
  onExportPrivateKey: () => Promise<string>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onResetWallet: () => Promise<void>;
}

const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
];

/**
 * Wallet Settings Component
 * Manages wallet security, network, and advanced options
 *
 * @example
 * <WalletSettings
 *   settings={walletSettings}
 *   onChange={updateWalletSettings}
 *   onExportPrivateKey={handleExportKey}
 *   onChangePassword={handlePasswordChange}
 *   onResetWallet={handleReset}
 * />
 */
export const WalletSettings: React.FC<WalletSettingsProps> = ({
  settings,
  onChange,
  onExportPrivateKey,
  onChangePassword,
  onResetWallet,
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [exportedKey, setExportedKey] = useState('');
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleAutoLockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, autoLockTimeout: Number(e.target.value) });
  };

  const handleNetworkChange = (network: 'testnet' | 'mainnet') => {
    onChange({ ...settings, network });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const key = await onExportPrivateKey();
      setExportedKey(key);
    } catch (error) {
      console.error('Failed to export key:', error);
    } finally {
      setExporting(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleReset = async () => {
    if (resetConfirmation !== 'RESET WALLET') return;

    setResetting(true);
    try {
      await onResetWallet();
      setShowResetModal(false);
    } catch (error) {
      console.error('Failed to reset wallet:', error);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Wallet Settings</h2>
        <p className="text-text-muted">
          Manage your Aleo wallet security and network preferences
        </p>
      </div>

      {/* Network Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          Network
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => handleNetworkChange('testnet')}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 transition-all
              ${
                settings.network === 'testnet'
                  ? 'border-accent-aleo bg-accent-aleo/10 text-accent-aleo'
                  : 'border-bg-elevated bg-bg-secondary text-text-secondary hover:border-bg-elevated/80'
              }
            `}
          >
            <div className="font-medium">Testnet</div>
            <div className="text-xs mt-1 opacity-80">For testing and development</div>
          </button>
          <button
            onClick={() => handleNetworkChange('mainnet')}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 transition-all
              ${
                settings.network === 'mainnet'
                  ? 'border-accent-aleo bg-accent-aleo/10 text-accent-aleo'
                  : 'border-bg-elevated bg-bg-secondary text-text-secondary hover:border-bg-elevated/80'
              }
            `}
          >
            <div className="font-medium">Mainnet</div>
            <div className="text-xs mt-1 opacity-80">Production network</div>
          </button>
        </div>
        <p className="text-sm text-text-muted">
          Switch between Aleo testnet and mainnet. Mainnet transactions use real ALEO tokens.
        </p>
      </div>

      {/* Auto-lock Timeout */}
      <div className="space-y-2">
        <label htmlFor="auto-lock" className="block text-sm font-medium text-text-primary">
          Auto-lock Timeout
        </label>
        <select
          id="auto-lock"
          value={settings.autoLockTimeout}
          onChange={handleAutoLockChange}
          className="w-full bg-bg-secondary border border-bg-elevated rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-aleo focus:border-accent-aleo transition-all"
        >
          {AUTO_LOCK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-text-muted">
          Automatically lock your wallet after a period of inactivity
        </p>
      </div>

      {/* Security Actions */}
      <div className="space-y-3 pt-4 border-t border-bg-elevated">
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Security</h3>

          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={() => setShowExportModal(true)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              }
            >
              Export Private Key
            </Button>

            <Button
              variant="secondary"
              onClick={() => setShowPasswordModal(true)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
            >
              Change Password
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-4 border-t border-red-500/20">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-red-500 mb-1">Danger Zone</h3>
            <p className="text-sm text-text-muted">
              Irreversible actions that will affect your wallet
            </p>
          </div>
          <Button
            variant="danger"
            onClick={() => setShowResetModal(true)}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          >
            Reset Wallet
          </Button>
        </div>
      </div>

      {/* Export Private Key Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setExportedKey('');
          setKeyRevealed(false);
        }}
        title="Export Private Key"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-500 mb-1">Warning</h4>
                <p className="text-sm text-text-muted">
                  Never share your private key. Anyone with this key can access your wallet
                  and steal your funds. Store it securely offline.
                </p>
              </div>
            </div>
          </div>

          {!exportedKey ? (
            <Button variant="primary" onClick={handleExport} loading={exporting} fullWidth>
              Reveal Private Key
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={keyRevealed ? 'text' : 'password'}
                  value={exportedKey}
                  readOnly
                  fullWidth
                  rightIcon={
                    <button
                      onClick={() => setKeyRevealed(!keyRevealed)}
                      className="cursor-pointer"
                    >
                      {keyRevealed ? '🙈' : '👁️'}
                    </button>
                  }
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(exportedKey)}
                fullWidth
              >
                Copy to Clipboard
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        }}
        title="Change Password"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePasswordChange}
              loading={changingPassword}
            >
              Change Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
          />
          <Input
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Must be at least 8 characters"
            fullWidth
          />
          <Input
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={passwordError}
            fullWidth
          />
        </div>
      </Modal>

      {/* Reset Wallet Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetConfirmation('');
        }}
        title="Reset Wallet"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReset}
              loading={resetting}
              disabled={resetConfirmation !== 'RESET WALLET'}
            >
              Reset Wallet
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-500 mb-1">
                  This action cannot be undone
                </h4>
                <p className="text-sm text-text-muted">
                  Resetting your wallet will permanently delete all your accounts and data.
                  Make sure you have backed up your private keys before proceeding.
                </p>
              </div>
            </div>
          </div>

          <Input
            label='Type "RESET WALLET" to confirm'
            value={resetConfirmation}
            onChange={(e) => setResetConfirmation(e.target.value)}
            placeholder="RESET WALLET"
            fullWidth
          />
        </div>
      </Modal>
    </div>
  );
};
