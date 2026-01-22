import React, { useState, useEffect, useRef } from 'react';

interface Shortcut {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

interface AleoProgram {
  id: string;
  name: string;
  url: string;
  category: string;
  icon: React.ReactNode;
}

// Aleo Ecosystem Directory
const ALEO_PROGRAMS: AleoProgram[] = [
  {
    id: 'leo-playground',
    name: 'Leo Playground',
    url: 'https://developer.aleo.org/leo/playground',
    category: 'Developer',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'explorer',
    name: 'Aleo Explorer',
    url: 'https://explorer.aleo.org',
    category: 'Explorer',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'faucet',
    name: 'Aleo Faucet',
    url: 'https://faucet.aleo.org',
    category: 'Testnet',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'demox',
    name: 'Demox Labs',
    url: 'https://demox.gg',
    category: 'dApps',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'puzzle',
    name: 'Puzzle Wallet',
    url: 'https://puzzle.online',
    category: 'Wallet',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
  {
    id: 'aleoswap',
    name: 'AleoSwap',
    url: 'https://aleoswap.io',
    category: 'DEX',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    id: 'arcane',
    name: 'Arcane Finance',
    url: 'https://arcane.finance',
    category: 'DeFi',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'ans',
    name: 'Aleo Names',
    url: 'https://aleonames.id',
    category: 'Identity',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
  },
];

interface PrivacyStats {
  adsBlocked: number;
  trackersBlocked: number;
  fingerprintingAttempts: number;
  httpsUpgrades: number;
  totalBlocked: number;
}

interface NewTabPageProps {
  onNavigate: (url: string) => void;
}

// Default shortcuts for Aleo ecosystem
const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: '1', title: 'Aleo', url: 'https://aleo.org', favicon: 'https://aleo.org/favicon.ico' },
  { id: '2', title: 'Explorer', url: 'https://explorer.aleo.org', favicon: 'https://explorer.aleo.org/favicon.ico' },
  { id: '3', title: 'Leo Docs', url: 'https://developer.aleo.org', favicon: 'https://developer.aleo.org/favicon.ico' },
  { id: '4', title: 'GitHub', url: 'https://github.com/AleoHQ', favicon: 'https://github.com/favicon.ico' },
  { id: '5', title: 'Discord', url: 'https://discord.gg/aleo', favicon: 'https://discord.com/favicon.ico' },
  { id: '6', title: 'Twitter', url: 'https://twitter.com/AleoHQ', favicon: 'https://twitter.com/favicon.ico' },
];

export const NewTabPage: React.FC<NewTabPageProps> = ({ onNavigate }) => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<PrivacyStats>({
    adsBlocked: 0,
    trackersBlocked: 0,
    fingerprintingAttempts: 0,
    httpsUpgrades: 0,
    totalBlocked: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Load real privacy stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const privacyStats = await window.electron.privacy.getStats();
        setStats(privacyStats);
      } catch (error) {
        console.error('Failed to load privacy stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(searchQuery);
    }
  };

  const handleShortcutClick = (url: string) => {
    onNavigate(url);
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="h-full bg-gradient-to-b from-[#0a0a0f] to-[#111118] flex flex-col items-center justify-center p-8 overflow-auto">
      {/* Time and Date */}
      <div className="text-center mb-8">
        <div className="text-6xl font-light text-[#e4e4e7] mb-2">{formatTime(currentTime)}</div>
        <div className="text-lg text-[#71717a]">{formatDate(currentTime)}</div>
      </div>

      {/* Logo */}
      <div className="mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00a885] flex items-center justify-center shadow-lg shadow-[#00d4aa]/20">
          <svg className="w-10 h-10 text-[#0a0a0f]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl mb-12">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 bg-[#1a1a24] border border-[#27272a] rounded-full pl-12 pr-6 text-lg text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
            placeholder="Search or enter URL..."
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-[#27272a] rounded-full transition-colors"
            >
              <svg className="w-4 h-4 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Shortcuts Grid */}
      <div className="w-full max-w-3xl mb-12">
        <div className="grid grid-cols-6 gap-4">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => handleShortcutClick(shortcut.url)}
              className="flex flex-col items-center p-4 rounded-xl hover:bg-[#1a1a24] transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1a1a24] group-hover:bg-[#27272a] flex items-center justify-center mb-2 overflow-hidden transition-colors">
                {shortcut.favicon ? (
                  <img
                    src={shortcut.favicon}
                    alt={shortcut.title}
                    className="w-6 h-6"
                    onError={(e) => {
                      // Fallback to first letter if favicon fails
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-lg font-bold text-[#00d4aa]">
                    {shortcut.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm text-[#a1a1aa] group-hover:text-[#e4e4e7] truncate max-w-full transition-colors">
                {shortcut.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Comparison Section - AleoBrowser vs Chrome */}
      <div className="w-full max-w-3xl mb-8">
        <h2 className="text-xl font-semibold text-center text-[#e4e4e7] mb-6">
          Why Use AleoBrowser for Aleo?
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Chrome column */}
          <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#4285f4]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#4285f4]" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-medium text-[#e4e4e7]">Chrome + Extension</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#10005;</span>
                <span className="text-[#a1a1aa]">Extensions can read all your data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#10005;</span>
                <span className="text-[#a1a1aa]">Ads & trackers everywhere</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#10005;</span>
                <span className="text-[#a1a1aa]">Private keys in extension memory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#10005;</span>
                <span className="text-[#a1a1aa]">Fingerprinting not blocked</span>
              </li>
            </ul>
          </div>

          {/* AleoBrowser column */}
          <div className="p-5 rounded-xl bg-[#00d4aa]/5 border border-[#00d4aa]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00a885] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0a0a0f]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-medium text-[#e4e4e7]">AleoBrowser</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#00d4aa] mt-0.5">&#10003;</span>
                <span className="text-[#a1a1aa]">Native ZK wallet - no extensions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00d4aa] mt-0.5">&#10003;</span>
                <span className="text-[#a1a1aa]">Built-in ad & tracker blocking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00d4aa] mt-0.5">&#10003;</span>
                <span className="text-[#a1a1aa]">Keys never leave secure process</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00d4aa] mt-0.5">&#10003;</span>
                <span className="text-[#a1a1aa]">Fingerprint protection enabled</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Aleo Ecosystem Directory */}
      <div className="w-full max-w-3xl mb-8">
        <h2 className="text-lg font-semibold text-[#e4e4e7] mb-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00d4aa] to-[#00a885] flex items-center justify-center">
            <svg className="w-3 h-3 text-[#0a0a0f]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          Aleo Ecosystem
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {ALEO_PROGRAMS.map((program) => (
            <button
              key={program.id}
              onClick={() => onNavigate(program.url)}
              className="flex flex-col items-center p-4 rounded-xl bg-[#1a1a24]/50 border border-[#27272a] hover:border-[#00d4aa]/50 hover:bg-[#1a1a24] transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4aa]/20 to-[#a855f7]/10 flex items-center justify-center mb-2 text-[#00d4aa] group-hover:from-[#00d4aa]/30 group-hover:to-[#a855f7]/20 transition-all">
                {program.icon}
              </div>
              <span className="text-sm text-[#e4e4e7] font-medium text-center">{program.name}</span>
              <span className="text-xs text-[#71717a] mt-0.5">{program.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Stats Dashboard */}
      <div className="w-full max-w-3xl bg-[#1a1a24]/50 border border-[#27272a] rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-[#00d4aa]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <h2 className="text-lg font-semibold text-white">Privacy Protection</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Ads & Trackers Blocked */}
            <div className="text-center group">
              <p className="text-3xl font-bold text-[#00d4aa] mb-1">
                {(stats.adsBlocked + stats.trackersBlocked).toLocaleString()}
              </p>
              <p className="text-sm text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">Ads & Trackers</p>
            </div>

            {/* HTTPS Upgrades */}
            <div className="text-center group">
              <p className="text-3xl font-bold text-[#00d4aa] mb-1">
                {stats.httpsUpgrades.toLocaleString()}
              </p>
              <p className="text-sm text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">HTTPS Upgrades</p>
            </div>

            {/* Fingerprinting Blocked */}
            <div className="text-center group">
              <p className="text-3xl font-bold text-[#00d4aa] mb-1">
                {stats.fingerprintingAttempts.toLocaleString()}
              </p>
              <p className="text-sm text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">Fingerprints Blocked</p>
            </div>

            {/* Time Saved */}
            <div className="text-center group">
              <p className="text-3xl font-bold text-[#00d4aa] mb-1">
                {(() => {
                  const minutes = Math.round((stats.totalBlocked * 50) / 1000 / 60);
                  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
                  return `${minutes}m`;
                })()}
              </p>
              <p className="text-sm text-[#71717a] group-hover:text-[#a1a1aa] transition-colors">Time Saved</p>
            </div>
          </div>
        )}
      </div>

      {/* Aleo Ecosystem Section */}
      <div className="mt-12 text-center">
        <p className="text-sm text-[#71717a] mb-4">Powered by Aleo Privacy</p>
        <div className="flex items-center justify-center gap-6">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate('https://aleo.org/post/aleo-grants/'); }}
            className="text-sm text-[#00d4aa] hover:text-[#00f2c3] transition-colors"
          >
            Aleo Grants
          </a>
          <span className="text-[#27272a]">|</span>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate('https://developer.aleo.org'); }}
            className="text-sm text-[#00d4aa] hover:text-[#00f2c3] transition-colors"
          >
            Developer Docs
          </a>
          <span className="text-[#27272a]">|</span>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate('https://aleo.org/community/'); }}
            className="text-sm text-[#00d4aa] hover:text-[#00f2c3] transition-colors"
          >
            Community
          </a>
        </div>
      </div>
    </div>
  );
};
