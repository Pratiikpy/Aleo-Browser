import React, { useState } from 'react';
import { SettingsPage, SettingsData } from './SettingsPage';
import { PrivacyStats } from './PrivacySettings';
import { AboutInfo } from './AboutSettings';
import { Button } from '../shared';

/**
 * Example implementation of SettingsPage
 * This demonstrates how to integrate the settings system into your app
 */
export const SettingsExample: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  // Initial settings state
  const [settings, setSettings] = useState<SettingsData>({
    general: {
      searchEngine: 'duckduckgo',
      homepageUrl: 'https://aleo.org',
      theme: 'dark',
      language: 'en',
    },
    privacy: {
      trackerBlocking: true,
      adBlocking: true,
      clearCookiesOnExit: false,
      fingerprintProtection: true,
      webRTCProtection: true,
    },
    wallet: {
      autoLockTimeout: 15,
      network: 'testnet',
    },
  });

  // Mock privacy stats (in real app, these would come from IPC)
  const privacyStats: PrivacyStats = {
    trackersBlocked: 12547,
    adsBlocked: 3892,
    cookiesBlocked: 7654,
  };

  // Mock version info (in real app, these would come from IPC)
  const aboutInfo: AboutInfo = {
    version: '1.0.0',
    electronVersion: '28.0.0',
    chromeVersion: '120.0.0',
    nodeVersion: '20.10.0',
    aleoSdkVersion: '0.7.0',
  };

  // Settings handlers
  const handleSettingsChange = (newSettings: SettingsData) => {
    setSettings(newSettings);
    console.log('Settings updated:', newSettings);
    // In real app, save to storage via IPC:
    // window.electron.ipcRenderer.invoke('save-settings', newSettings);
  };

  const handleClearBrowsingData = async () => {
    console.log('Clearing browsing data...');
    // In real app, call IPC:
    // await window.electron.ipcRenderer.invoke('clear-browsing-data');
    alert('Browsing data cleared!');
  };

  const handleExportPrivateKey = async (): Promise<string> => {
    console.log('Exporting private key...');
    // In real app, call IPC:
    // return await window.electron.ipcRenderer.invoke('export-private-key');
    return 'APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH';
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    console.log('Changing password...');
    // In real app, call IPC:
    // await window.electron.ipcRenderer.invoke('change-password', currentPassword, newPassword);

    // Simulate validation
    if (currentPassword !== 'current') {
      throw new Error('Current password is incorrect');
    }

    alert('Password changed successfully!');
  };

  const handleResetWallet = async (): Promise<void> => {
    console.log('Resetting wallet...');
    // In real app, call IPC:
    // await window.electron.ipcRenderer.invoke('reset-wallet');
    alert('Wallet has been reset!');
  };

  const handleCheckForUpdates = async (): Promise<void> => {
    console.log('Checking for updates...');
    // In real app, call IPC:
    // await window.electron.ipcRenderer.invoke('check-for-updates');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    alert('You are running the latest version!');
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          AleoBrowser Settings Demo
        </h1>
        <p className="text-text-muted mb-8">
          Click the button below to open the settings page
        </p>

        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowSettings(true)}
          leftIcon={
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
          }
        >
          Open Settings
        </Button>

        <div className="mt-8 p-4 bg-bg-secondary border border-bg-elevated rounded-lg max-w-md mx-auto">
          <h3 className="text-sm font-medium text-text-primary mb-2">Current Settings</h3>
          <pre className="text-xs text-text-muted text-left overflow-auto">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
      </div>

      <SettingsPage
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        initialSection="general"
        settings={settings}
        privacyStats={privacyStats}
        aboutInfo={aboutInfo}
        onSettingsChange={handleSettingsChange}
        onClearBrowsingData={handleClearBrowsingData}
        onExportPrivateKey={handleExportPrivateKey}
        onChangePassword={handleChangePassword}
        onResetWallet={handleResetWallet}
        onCheckForUpdates={handleCheckForUpdates}
      />
    </div>
  );
};
