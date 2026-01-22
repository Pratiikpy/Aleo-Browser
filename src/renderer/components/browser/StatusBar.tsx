import React from 'react';

interface StatusBarProps {
  privacyMode: 'private' | 'standard';
  networkStatus: 'online' | 'offline' | 'connecting';
  blockedTrackers: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  privacyMode,
  networkStatus,
  blockedTrackers,
}) => {
  return (
    <div className="flex items-center justify-between h-6 px-3 bg-[#111118] border-t border-[#27272a] text-xs">
      {/* Privacy status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <svg
            className={`w-3.5 h-3.5 ${
              privacyMode === 'private' ? 'text-[#00d4aa]' : 'text-[#a1a1aa]'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span
            className={
              privacyMode === 'private' ? 'text-[#00d4aa]' : 'text-[#a1a1aa]'
            }
          >
            {privacyMode === 'private' ? 'Private Mode' : 'Standard Mode'}
          </span>
        </div>

        {/* Blocked trackers */}
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-[#ef4444]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          <span className="text-[#a1a1aa]">
            {blockedTrackers} tracker{blockedTrackers !== 1 ? 's' : ''} blocked
          </span>
        </div>
      </div>

      {/* Network status */}
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            networkStatus === 'online'
              ? 'bg-[#00d4aa] glow-accent-strong'
              : networkStatus === 'connecting'
              ? 'bg-[#fbbf24] animate-pulse'
              : 'bg-[#ef4444]'
          }`}
        />
        <span className="text-[#a1a1aa]">
          {networkStatus === 'online'
            ? 'Connected'
            : networkStatus === 'connecting'
            ? 'Connecting...'
            : 'Offline'}
        </span>
      </div>
    </div>
  );
};
