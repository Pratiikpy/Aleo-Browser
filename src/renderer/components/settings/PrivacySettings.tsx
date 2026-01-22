import React from 'react';
import { Toggle } from '../shared';

export interface PrivacySettingsData {
  trackerBlocking: boolean;
  adBlocking: boolean;
  clearCookiesOnExit: boolean;
  fingerprintProtection: boolean;
  webRTCProtection: boolean;
}

export interface PrivacyStats {
  trackersBlocked: number;
  adsBlocked: number;
  cookiesBlocked: number;
}

export interface PrivacySettingsProps {
  settings: PrivacySettingsData;
  stats: PrivacyStats;
  onChange: (settings: PrivacySettingsData) => void;
}

/**
 * Privacy Settings Component
 * Manages privacy and security preferences with real-time stats
 *
 * @example
 * <PrivacySettings
 *   settings={privacySettings}
 *   stats={{ trackersBlocked: 1234, adsBlocked: 567, cookiesBlocked: 890 }}
 *   onChange={updatePrivacySettings}
 * />
 */
export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  settings,
  stats,
  onChange,
}) => {
  const handleToggle = (key: keyof PrivacySettingsData) => (value: boolean) => {
    onChange({ ...settings, [key]: value });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Privacy & Security</h2>
        <p className="text-text-muted">
          Protect your privacy while browsing with Aleo's zero-knowledge technology
        </p>
      </div>

      {/* Privacy Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-secondary border border-bg-elevated rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-accent-aleo"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-sm font-medium text-text-muted">Trackers Blocked</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(stats.trackersBlocked)}</p>
        </div>

        <div className="bg-bg-secondary border border-bg-elevated rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-accent-aleo"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <span className="text-sm font-medium text-text-muted">Ads Blocked</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(stats.adsBlocked)}</p>
        </div>

        <div className="bg-bg-secondary border border-bg-elevated rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-accent-aleo"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="text-sm font-medium text-text-muted">Cookies Blocked</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(stats.cookiesBlocked)}</p>
        </div>
      </div>

      {/* Privacy Toggles */}
      <div className="space-y-4">
        <Toggle
          checked={settings.trackerBlocking}
          onChange={handleToggle('trackerBlocking')}
          label="Block Trackers"
          description="Prevent websites from tracking your browsing activity across the web"
        />

        <div className="h-px bg-bg-elevated" />

        <Toggle
          checked={settings.adBlocking}
          onChange={handleToggle('adBlocking')}
          label="Block Ads"
          description="Block advertisements and improve page load times"
        />

        <div className="h-px bg-bg-elevated" />

        <Toggle
          checked={settings.clearCookiesOnExit}
          onChange={handleToggle('clearCookiesOnExit')}
          label="Clear Cookies on Exit"
          description="Automatically delete all cookies when you close the browser"
        />

        <div className="h-px bg-bg-elevated" />

        <Toggle
          checked={settings.fingerprintProtection}
          onChange={handleToggle('fingerprintProtection')}
          label="Fingerprint Protection"
          description="Protect against browser fingerprinting techniques"
        />

        <div className="h-px bg-bg-elevated" />

        <Toggle
          checked={settings.webRTCProtection}
          onChange={handleToggle('webRTCProtection')}
          label="WebRTC IP Protection"
          description="Prevent websites from detecting your real IP address via WebRTC"
        />
      </div>

      {/* Info Box */}
      <div className="bg-accent-aleo/10 border border-accent-aleo/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-accent-aleo mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-accent-aleo mb-1">
              Enhanced Privacy with Aleo
            </h4>
            <p className="text-sm text-text-muted">
              AleoBrowser uses zero-knowledge proofs to verify your transactions and
              interactions without revealing your personal data. All privacy features are
              enabled by default for maximum protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
