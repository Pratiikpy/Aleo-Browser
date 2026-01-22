import React, { useState, useEffect } from 'react';
import { GeneralSettings, GeneralSettingsData } from './GeneralSettings';
import { PrivacySettings, PrivacySettingsData, PrivacyStats } from './PrivacySettings';
import { WalletSettings, WalletSettingsData } from './WalletSettings';
import { PerformanceSettings } from './PerformanceSettings';
import { AboutSettings, AboutInfo } from './AboutSettings';

type SettingsSection = 'general' | 'privacy' | 'wallet' | 'performance' | 'about';

export interface SettingsData {
  general: GeneralSettingsData;
  privacy: PrivacySettingsData;
  wallet: WalletSettingsData;
}

export interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
  settings: SettingsData;
  privacyStats: PrivacyStats;
  aboutInfo: AboutInfo;
  onSettingsChange: (settings: SettingsData) => void;
  onClearBrowsingData: () => void;
  onExportPrivateKey: () => Promise<string>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onResetWallet: () => Promise<void>;
  onCheckForUpdates: () => Promise<void>;
}

/**
 * Main Settings Page Component
 * Modal-based settings interface with sidebar navigation
 *
 * @example
 * <SettingsPage
 *   isOpen={showSettings}
 *   onClose={() => setShowSettings(false)}
 *   initialSection="general"
 *   settings={allSettings}
 *   privacyStats={stats}
 *   aboutInfo={versionInfo}
 *   onSettingsChange={handleSettingsUpdate}
 *   onClearBrowsingData={handleClearData}
 *   onExportPrivateKey={handleExportKey}
 *   onChangePassword={handlePasswordChange}
 *   onResetWallet={handleReset}
 *   onCheckForUpdates={handleUpdateCheck}
 * />
 */
export const SettingsPage: React.FC<SettingsPageProps> = ({
  isOpen,
  onClose,
  initialSection = 'general',
  settings,
  privacyStats,
  aboutInfo,
  onSettingsChange,
  onClearBrowsingData,
  onExportPrivateKey,
  onChangePassword,
  onResetWallet,
  onCheckForUpdates,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<SettingsData>(settings);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
      setLocalSettings(settings);
      setHasUnsavedChanges(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialSection, settings]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleGeneralChange = (general: GeneralSettingsData) => {
    const newSettings = { ...localSettings, general };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
    onSettingsChange(newSettings);
  };

  const handlePrivacyChange = (privacy: PrivacySettingsData) => {
    const newSettings = { ...localSettings, privacy };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
    onSettingsChange(newSettings);
  };

  const handleWalletChange = (wallet: WalletSettingsData) => {
    const newSettings = { ...localSettings, wallet };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
    onSettingsChange(newSettings);
  };

  if (!isOpen) return null;

  const sections: Array<{
    id: SettingsSection;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
      ),
    },
    {
      id: 'about',
      label: 'About',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Settings Modal */}
      <div
        className="relative bg-bg-primary border border-bg-elevated rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <aside className="w-64 bg-bg-secondary border-r border-bg-elevated flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-bg-elevated">
            <h1 id="settings-title" className="text-xl font-bold text-text-primary">
              Settings
            </h1>
            {hasUnsavedChanges && (
              <div className="mt-2 flex items-center gap-2 text-xs text-accent-aleo">
                <div className="w-2 h-2 rounded-full bg-accent-aleo animate-pulse" />
                Changes saved automatically
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${
                    activeSection === section.id
                      ? 'bg-accent-aleo/10 text-accent-aleo border border-accent-aleo/20'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }
                `}
                aria-current={activeSection === section.id ? 'page' : undefined}
              >
                {section.icon}
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-bg-elevated">
            <button
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close Settings
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {activeSection === 'general' && (
              <GeneralSettings
                settings={localSettings.general}
                onChange={handleGeneralChange}
                onClearBrowsingData={onClearBrowsingData}
              />
            )}
            {activeSection === 'privacy' && (
              <PrivacySettings
                settings={localSettings.privacy}
                stats={privacyStats}
                onChange={handlePrivacyChange}
              />
            )}
            {activeSection === 'wallet' && (
              <WalletSettings
                settings={localSettings.wallet}
                onChange={handleWalletChange}
                onExportPrivateKey={onExportPrivateKey}
                onChangePassword={onChangePassword}
                onResetWallet={onResetWallet}
              />
            )}
            {activeSection === 'performance' && <PerformanceSettings />}
            {activeSection === 'about' && (
              <AboutSettings info={aboutInfo} onCheckForUpdates={onCheckForUpdates} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
