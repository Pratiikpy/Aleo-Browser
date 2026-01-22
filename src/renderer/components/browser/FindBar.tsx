import React, { useState, useEffect, useRef } from 'react';

interface FindBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FindBar: React.FC<FindBarProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState({ current: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Listen for find results
  useEffect(() => {
    const handleResult = (result: { matches: number; activeMatchOrdinal: number; finalUpdate: boolean }) => {
      if (result.finalUpdate) {
        setMatches({ current: result.activeMatchOrdinal, total: result.matches });
      }
    };

    window.electron.events.onFindInPageResult(handleResult);

    return () => {
      // Cleanup is handled by removeAllListeners
    };
  }, []);

  // Search when query changes
  useEffect(() => {
    if (query.trim()) {
      window.electron.browser.findInPage(query);
    } else {
      window.electron.browser.stopFindInPage('clearSelection');
      setMatches({ current: 0, total: 0 });
    }
  }, [query]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleFindNext = () => {
      if (query.trim()) {
        window.electron.browser.findInPage(query, { forward: true, findNext: true });
      }
    };

    const handleFindPrevious = () => {
      if (query.trim()) {
        window.electron.browser.findInPage(query, { forward: false, findNext: true });
      }
    };

    const handleEscape = () => {
      onClose();
    };

    window.electron.events.onShortcutFindNext(handleFindNext);
    window.electron.events.onShortcutFindPrevious(handleFindPrevious);
    window.electron.events.onShortcutEscape(handleEscape);

    return () => {
      // Cleanup
    };
  }, [query, onClose]);

  // Hide BrowserView when find bar is active (needs full interaction)
  useEffect(() => {
    if (isOpen) {
      window.electron.ui?.setBrowserViewVisible(false);
    } else {
      window.electron.ui?.setBrowserViewVisible(true);
    }
  }, [isOpen]);

  const handleFind = (forward: boolean) => {
    if (query.trim()) {
      window.electron.browser.findInPage(query, { forward, findNext: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFind(!e.shiftKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleClose = () => {
    setQuery('');
    setMatches({ current: 0, total: 0 });
    window.electron.browser.stopFindInPage('clearSelection');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-4 z-50 flex items-center gap-2 bg-[#1a1a24] border border-[#27272a] rounded-lg shadow-lg p-2 animate-slide-down">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in page..."
          className="w-64 h-8 bg-[#0a0a0f] border border-[#27272a] rounded px-3 pr-16 text-sm text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:border-[#00d4aa]"
        />
        {/* Match count */}
        {query && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#71717a]">
            {matches.total > 0 ? `${matches.current}/${matches.total}` : 'No matches'}
          </span>
        )}
      </div>

      {/* Previous button */}
      <button
        onClick={() => handleFind(false)}
        disabled={!query || matches.total === 0}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Previous match (Shift+Enter)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Next button */}
      <button
        onClick={() => handleFind(true)}
        disabled={!query || matches.total === 0}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Next match (Enter)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
        title="Close (Esc)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
