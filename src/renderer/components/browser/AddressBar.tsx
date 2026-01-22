import React, { useState, useEffect, FormEvent, forwardRef, useImperativeHandle, useRef } from 'react';
import { ReaderButton } from './ReaderButton';

interface AddressBarProps {
  url: string;
  isSecure: boolean;
  isAleoSite: boolean;
  isBookmarked: boolean;
  onNavigate: (url: string) => void;
  onToggleBookmark: () => void;
}

export const AddressBar = forwardRef<HTMLInputElement, AddressBarProps>(({
  url,
  isSecure,
  isAleoSite,
  isBookmarked,
  onNavigate,
  onToggleBookmark,
}, ref) => {
  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose input ref methods to parent
  useImperativeHandle(ref, () => inputRef.current!, []);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url);
    }
  }, [url, isFocused]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onNavigate(inputValue);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Select all text on focus for easy editing
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setInputValue(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInputValue(url);
      inputRef.current?.blur();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`
        flex-1 flex items-center gap-2 px-3 h-9 mx-2 rounded-lg
        bg-[#111118] border transition-all
        ${isFocused
          ? 'border-[#00d4aa] glow-accent'
          : 'border-[#27272a]'
        }
      `}
    >
      {/* Security/Site indicator */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {isSecure ? (
          <svg
            className="w-4 h-4 text-[#00d4aa]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-[#a1a1aa]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            />
          </svg>
        )}

        {/* Aleo badge for .aleo sites */}
        {isAleoSite && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#00d4aa]/10 border border-[#00d4aa]/30">
            <div className="w-2 h-2 rounded-full bg-[#00d4aa] glow-accent-strong" />
            <span className="text-xs font-semibold text-[#00d4aa]">ALEO</span>
          </div>
        )}
      </div>

      {/* URL input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Search or enter address..."
        className="flex-1 bg-transparent text-sm text-[#e4e4e7] placeholder-[#52525b] outline-none"
      />

      {/* Reader mode button */}
      <ReaderButton url={url} />

      {/* Bookmark button */}
      <button
        type="button"
        onClick={onToggleBookmark}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-[#1a1a24] transition-colors"
        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        {isBookmarked ? (
          <svg
            className="w-4 h-4 text-[#00d4aa]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-[#a1a1aa]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        )}
      </button>
    </form>
  );
});

AddressBar.displayName = 'AddressBar';
