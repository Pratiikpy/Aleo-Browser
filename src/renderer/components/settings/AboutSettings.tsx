import React from 'react';
import { Button } from '../shared';

export interface AboutInfo {
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  aleoSdkVersion: string;
}

export interface AboutSettingsProps {
  info: AboutInfo;
  onCheckForUpdates: () => Promise<void>;
}

/**
 * About Settings Component
 * Displays version information and update options
 *
 * @example
 * <AboutSettings
 *   info={{
 *     version: '1.0.0',
 *     electronVersion: '28.0.0',
 *     chromeVersion: '120.0.0',
 *     nodeVersion: '20.10.0',
 *     aleoSdkVersion: '0.7.0'
 *   }}
 *   onCheckForUpdates={handleCheckUpdates}
 * />
 */
export const AboutSettings: React.FC<AboutSettingsProps> = ({
  info,
  onCheckForUpdates,
}) => {
  const [checking, setChecking] = React.useState(false);

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      await onCheckForUpdates();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">About AleoBrowser</h2>
        <p className="text-text-muted">
          A privacy-focused web browser powered by Aleo's zero-knowledge technology
        </p>
      </div>

      {/* Logo and Version */}
      <div className="flex items-center gap-4 p-6 bg-bg-secondary border border-bg-elevated rounded-lg">
        <div className="w-16 h-16 bg-gradient-to-br from-accent-aleo to-accent-purple rounded-xl flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white"
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
        </div>
        <div>
          <h3 className="text-xl font-bold text-text-primary">AleoBrowser</h3>
          <p className="text-text-muted">Version {info.version}</p>
        </div>
      </div>

      {/* Version Details */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-text-primary mb-3">Version Information</h3>
        <div className="space-y-2">
          <VersionRow label="AleoBrowser" value={info.version} />
          <VersionRow label="Electron" value={info.electronVersion} />
          <VersionRow label="Chromium" value={info.chromeVersion} />
          <VersionRow label="Node.js" value={info.nodeVersion} />
          <VersionRow label="Aleo SDK" value={info.aleoSdkVersion} />
        </div>
      </div>

      {/* Update Check */}
      <div className="pt-4 border-t border-bg-elevated">
        <Button
          variant="primary"
          onClick={handleCheckUpdates}
          loading={checking}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          }
        >
          Check for Updates
        </Button>
      </div>

      {/* Links */}
      <div className="space-y-3 pt-4 border-t border-bg-elevated">
        <h3 className="text-sm font-medium text-text-primary">Resources</h3>
        <div className="space-y-2">
          <ExternalLink
            href="https://aleo.org"
            label="Aleo Website"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            }
          />
          <ExternalLink
            href="https://github.com/AleoHQ"
            label="GitHub Repository"
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            }
          />
          <ExternalLink
            href="https://developer.aleo.org"
            label="Documentation"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            }
          />
        </div>
      </div>

      {/* License */}
      <div className="pt-4 border-t border-bg-elevated">
        <p className="text-sm text-text-muted">
          AleoBrowser is open source software licensed under the MIT License.
        </p>
        <p className="text-sm text-text-muted mt-2">
          Copyright © 2024 Aleo Systems Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
};

// Helper Components
const VersionRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 px-3 bg-bg-secondary border border-bg-elevated rounded-lg">
    <span className="text-sm text-text-muted">{label}</span>
    <span className="text-sm font-mono text-text-primary">{value}</span>
  </div>
);

const ExternalLink: React.FC<{ href: string; label: string; icon: React.ReactNode }> = ({
  href,
  label,
  icon,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 py-2 px-3 bg-bg-secondary border border-bg-elevated rounded-lg hover:border-accent-aleo/50 hover:bg-bg-elevated transition-all group"
  >
    <span className="text-text-muted group-hover:text-accent-aleo transition-colors">
      {icon}
    </span>
    <span className="text-sm text-text-primary flex-1">{label}</span>
    <svg
      className="w-4 h-4 text-text-muted group-hover:text-accent-aleo transition-colors"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  </a>
);
