import React from 'react';

interface ToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onHome: () => void;
  isLoading?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onRefresh,
  onHome,
  isLoading = false,
}) => {
  return (
    <div className="flex items-center gap-1 px-2">
      {/* Back button */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`
          w-8 h-8 flex items-center justify-center rounded
          transition-colors
          ${canGoBack
            ? 'text-[#e4e4e7] hover:bg-[#1a1a24]'
            : 'text-[#3f3f46] cursor-not-allowed'
          }
        `}
        title="Back"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Forward button */}
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className={`
          w-8 h-8 flex items-center justify-center rounded
          transition-colors
          ${canGoForward
            ? 'text-[#e4e4e7] hover:bg-[#1a1a24]'
            : 'text-[#3f3f46] cursor-not-allowed'
          }
        `}
        title="Forward"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        className="w-8 h-8 flex items-center justify-center rounded text-[#e4e4e7] hover:bg-[#1a1a24] transition-colors"
        title={isLoading ? 'Stop' : 'Refresh'}
      >
        {isLoading ? (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </button>

      {/* Home button */}
      <button
        onClick={onHome}
        className="w-8 h-8 flex items-center justify-center rounded text-[#e4e4e7] hover:bg-[#1a1a24] transition-colors"
        title="Home"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      </button>
    </div>
  );
};
