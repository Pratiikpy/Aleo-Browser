import React, { useState, useEffect, useRef } from 'react';

interface ShieldsStats {
  adsBlocked: number;
  trackersBlocked: number;
  fingerprintingAttempts: number;
  httpsUpgrades: number;
}

interface ShieldsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  anchorRef?: React.RefObject<HTMLButtonElement>;
}

export const ShieldsPanel: React.FC<ShieldsPanelProps> = ({
  isOpen,
  onClose,
  currentUrl,
  anchorRef,
}) => {
  const [shieldsEnabled, setShieldsEnabled] = useState(true);
  const [stats, setStats] = useState<ShieldsStats>({
    adsBlocked: 0,
    trackersBlocked: 0,
    fingerprintingAttempts: 0,
    httpsUpgrades: 0,
  });
  const [settings, setSettings] = useState({
    blockAds: true,
    blockTrackers: true,
    httpsEverywhere: true,
    blockFingerprinting: true,
    blockCookies: 'third-party' as 'all' | 'third-party' | 'none',
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Get hostname from URL
  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname || 'New Tab';
    } catch {
      return 'New Tab';
    }
  };

  // Load stats for current site
  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await window.electron.privacy.getStats();
        if (result) {
          setStats({
            adsBlocked: result.adsBlocked || 0,
            trackersBlocked: result.trackersBlocked || 0,
            fingerprintingAttempts: result.fingerprintingAttempts || 0,
            httpsUpgrades: result.httpsUpgrades || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load privacy stats:', error);
      }
    };

    if (isOpen) {
      loadStats();
    }
  }, [isOpen, currentUrl]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await window.electron.privacy.getSettings();
        if (result) {
          setSettings({
            blockAds: result.blockAds ?? true,
            blockTrackers: result.blockTrackers ?? true,
            httpsEverywhere: result.httpsEverywhere ?? true,
            blockFingerprinting: result.blockFingerprinting ?? true,
            blockCookies: result.blockCookies ?? 'third-party',
          });
          setShieldsEnabled(result.enabled ?? true);
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  // Hide BrowserView when panel is open (so toggles are clickable)
  useEffect(() => {
    if (isOpen) {
      window.electron.ui?.setBrowserViewVisible(false);
    } else {
      window.electron.ui?.setBrowserViewVisible(true);
    }
  }, [isOpen]);

  // Toggle shields
  const handleToggleShields = async () => {
    const newValue = !shieldsEnabled;
    setShieldsEnabled(newValue);
    try {
      await window.electron.privacy.setEnabled(newValue);
    } catch (error) {
      console.error('Failed to toggle shields:', error);
    }
  };

  // Update individual settings
  const handleSettingChange = async (key: string, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await window.electron.privacy.updateSetting(key, value);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  if (!isOpen) return null;

  const hostname = getHostname(currentUrl);
  const totalBlocked = stats.adsBlocked + stats.trackersBlocked;

  return (
    <div
      ref={panelRef}
      className="absolute top-12 right-4 w-80 bg-[#111118] border border-[#27272a] rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-down"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#0a0a0f] to-[#111118] border-b border-[#27272a]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${shieldsEnabled ? 'bg-[#00d4aa]' : 'bg-[#ef4444]'} glow-accent`} />
            <span className="font-semibold text-[#e4e4e7]">Aleo Shields</span>
          </div>
          <button
            onClick={handleToggleShields}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${shieldsEnabled ? 'bg-[#00d4aa]' : 'bg-[#3f3f46]'}
            `}
          >
            <div
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform
                ${shieldsEnabled ? 'translate-x-7' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
        <p className="text-sm text-[#a1a1aa] truncate" title={hostname}>
          {hostname}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b border-[#27272a]">
        <div className="text-center p-3 bg-[#0a0a0f] rounded-lg">
          <div className="text-2xl font-bold text-[#00d4aa]">{stats.adsBlocked}</div>
          <div className="text-xs text-[#71717a]">Ads Blocked</div>
        </div>
        <div className="text-center p-3 bg-[#0a0a0f] rounded-lg">
          <div className="text-2xl font-bold text-[#00d4aa]">{stats.trackersBlocked}</div>
          <div className="text-xs text-[#71717a]">Trackers</div>
        </div>
        <div className="text-center p-3 bg-[#0a0a0f] rounded-lg">
          <div className="text-2xl font-bold text-[#3b82f6]">{stats.httpsUpgrades}</div>
          <div className="text-xs text-[#71717a]">HTTPS Upgrades</div>
        </div>
        <div className="text-center p-3 bg-[#0a0a0f] rounded-lg">
          <div className="text-2xl font-bold text-[#f59e0b]">{stats.fingerprintingAttempts}</div>
          <div className="text-xs text-[#71717a]">Fingerprint</div>
        </div>
      </div>

      {/* Protection Settings */}
      {shieldsEnabled && (
        <div className="p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-3">
            Protection Settings
          </h3>

          {/* Block Ads & Trackers */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#00d4aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-sm">Block Ads & Trackers</span>
            </div>
            <button
              onClick={() => handleSettingChange('blockTrackers', !settings.blockTrackers)}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${settings.blockTrackers ? 'bg-[#00d4aa]' : 'bg-[#3f3f46]'}
              `}
            >
              <div
                className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                  ${settings.blockTrackers ? 'translate-x-5' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>

          {/* HTTPS Everywhere */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm">HTTPS Everywhere</span>
            </div>
            <button
              onClick={() => handleSettingChange('httpsEverywhere', !settings.httpsEverywhere)}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${settings.httpsEverywhere ? 'bg-[#00d4aa]' : 'bg-[#3f3f46]'}
              `}
            >
              <div
                className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                  ${settings.httpsEverywhere ? 'translate-x-5' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>

          {/* Block Fingerprinting */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <span className="text-sm">Block Fingerprinting</span>
            </div>
            <button
              onClick={() => handleSettingChange('blockFingerprinting', !settings.blockFingerprinting)}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${settings.blockFingerprinting ? 'bg-[#00d4aa]' : 'bg-[#3f3f46]'}
              `}
            >
              <div
                className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                  ${settings.blockFingerprinting ? 'translate-x-5' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>

          {/* Cookie Control */}
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#a855f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Cookie Control</span>
            </div>
            <select
              value={settings.blockCookies}
              onChange={(e) => handleSettingChange('blockCookies', e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#e4e4e7] focus:outline-none focus:border-[#00d4aa]"
            >
              <option value="none">Allow All Cookies</option>
              <option value="third-party">Block Third-Party</option>
              <option value="all">Block All Cookies</option>
            </select>
          </div>
        </div>
      )}

      {/* Shields Disabled Message */}
      {!shieldsEnabled && (
        <div className="p-6 text-center">
          <svg className="w-12 h-12 mx-auto text-[#ef4444] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[#a1a1aa] text-sm">
            Shields are disabled for this site.
            <br />
            Your browsing is not protected.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 bg-[#0a0a0f] border-t border-[#27272a]">
        <div className="flex items-center justify-between text-xs text-[#71717a]">
          <span>
            {totalBlocked > 0
              ? `${totalBlocked} items blocked on this session`
              : 'No items blocked yet'}
          </span>
          <button
            onClick={() => {
              onClose();
              // Open privacy settings
              window.electron.window.openSettings?.('privacy');
            }}
            className="text-[#00d4aa] hover:text-[#00f5c4] transition-colors"
          >
            Advanced →
          </button>
        </div>
      </div>
    </div>
  );
};
