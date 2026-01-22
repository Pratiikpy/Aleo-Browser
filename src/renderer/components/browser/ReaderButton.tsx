import React, { useState } from 'react';

interface ReaderButtonProps {
  url: string;
}

export const ReaderButton: React.FC<ReaderButtonProps> = ({ url }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);

  // Check if the current URL is a readable page (not reader mode, not new tab)
  const isReadableUrl = url &&
    !url.startsWith('data:') &&
    !url.startsWith('about:') &&
    !url.startsWith('chrome:') &&
    url.length > 0;

  const handleToggleReader = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await window.electron.reader.toggle();
      if (result.success) {
        setIsReaderMode(result.enabled || false);
      } else if (result.error) {
        console.log('Reader mode error:', result.error);
      }
    } catch (error) {
      console.error('Failed to toggle reader mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update reader mode state based on URL
  React.useEffect(() => {
    setIsReaderMode(url.startsWith('data:text/html'));
  }, [url]);

  if (!isReadableUrl && !isReaderMode) return null;

  return (
    <button
      onClick={handleToggleReader}
      disabled={isLoading}
      className={`
        w-8 h-8 rounded-lg flex items-center justify-center transition-all
        ${isReaderMode
          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          : 'hover:bg-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
        }
        ${isLoading ? 'opacity-50' : ''}
      `}
      title={isReaderMode ? 'Exit Reader Mode' : 'Enter Reader Mode'}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      ) : (
        <svg
          className="w-4 h-4"
          fill={isReaderMode ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={isReaderMode ? 0 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      )}
    </button>
  );
};

export default ReaderButton;
