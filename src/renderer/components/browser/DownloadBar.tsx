import React, { useState, useEffect } from 'react';

interface Download {
  id: string;
  filename: string;
  url: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'paused';
  startTime: number;
  endTime?: number;
  speed?: number;
  error?: string;
}

interface DownloadBarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format speed
 */
function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

/**
 * Calculate progress percentage
 */
function calculateProgress(download: Download): number {
  if (download.totalBytes === 0) return 0;
  return Math.round((download.receivedBytes / download.totalBytes) * 100);
}

export const DownloadBar: React.FC<DownloadBarProps> = ({ isOpen, onClose }) => {
  const [downloads, setDownloads] = useState<Download[]>([]);

  // Load initial downloads
  useEffect(() => {
    const loadDownloads = async () => {
      const result = await window.electron.downloads.getAll();
      if (result.downloads) {
        setDownloads(result.downloads);
      }
    };

    loadDownloads();
  }, []);

  // Listen for download events
  useEffect(() => {
    const handleStarted = (download: Download) => {
      setDownloads((prev) => [download, ...prev.filter((d) => d.id !== download.id)]);
    };

    const handleProgress = (download: Download) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? download : d))
      );
    };

    const handleComplete = (download: Download) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? download : d))
      );
    };

    const handleCancelled = (download: Download) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? download : d))
      );
    };

    const handleFailed = (download: Download) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? download : d))
      );
    };

    window.electron.events.onDownloadStarted(handleStarted);
    window.electron.events.onDownloadProgress(handleProgress);
    window.electron.events.onDownloadComplete(handleComplete);
    window.electron.events.onDownloadCancelled(handleCancelled);
    window.electron.events.onDownloadFailed(handleFailed);

    return () => {
      // Cleanup handled by removeAllListeners
    };
  }, []);

  // Hide BrowserView when download bar is open (so buttons are clickable)
  useEffect(() => {
    if (isOpen) {
      window.electron.ui?.setBrowserViewVisible(false);
    } else {
      window.electron.ui?.setBrowserViewVisible(true);
    }
  }, [isOpen]);

  const handleCancel = (id: string) => {
    window.electron.downloads.cancel(id);
  };

  const handlePause = (id: string) => {
    window.electron.downloads.pause(id);
  };

  const handleResume = (id: string) => {
    window.electron.downloads.resume(id);
  };

  const clearCompleted = () => {
    setDownloads((prev) =>
      prev.filter((d) => d.state !== 'completed' && d.state !== 'cancelled')
    );
  };

  // Get state icon
  const getStateIcon = (state: string) => {
    switch (state) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-[#00d4aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'cancelled':
      case 'interrupted':
        return (
          <svg className="w-5 h-5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'paused':
        return (
          <svg className="w-5 h-5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-[#3b82f6] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#111118] border-t border-[#27272a] shadow-lg max-h-64 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#00d4aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="font-medium">Downloads</span>
          <span className="text-sm text-[#71717a]">({downloads.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {downloads.some((d) => d.state === 'completed' || d.state === 'cancelled') && (
            <button
              onClick={clearCompleted}
              className="text-sm text-[#71717a] hover:text-[#e4e4e7] transition-colors"
            >
              Clear completed
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Download list */}
      <div className="flex-1 overflow-y-auto">
        {downloads.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[#71717a]">
            No downloads yet
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]">
            {downloads.map((download) => (
              <div key={download.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a24] transition-colors">
                {/* State icon */}
                <div className="flex-shrink-0">
                  {getStateIcon(download.state)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" title={download.filename}>
                      {download.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#71717a]">
                    {download.state === 'progressing' ? (
                      <>
                        <span>{formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}</span>
                        {download.speed && <span>({formatSpeed(download.speed)})</span>}
                      </>
                    ) : download.state === 'completed' ? (
                      <span>{formatBytes(download.totalBytes)}</span>
                    ) : download.state === 'paused' ? (
                      <span>Paused - {formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}</span>
                    ) : download.state === 'cancelled' ? (
                      <span>Cancelled</span>
                    ) : (
                      <span className="text-[#ef4444]">{download.error || 'Download failed'}</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {(download.state === 'progressing' || download.state === 'paused') && (
                    <div className="mt-1 h-1 bg-[#27272a] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          download.state === 'paused' ? 'bg-[#f59e0b]' : 'bg-[#00d4aa]'
                        }`}
                        style={{ width: `${calculateProgress(download)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {download.state === 'progressing' && (
                    <>
                      <button
                        onClick={() => handlePause(download.id)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
                        title="Pause"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCancel(download.id)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                  {download.state === 'paused' && (
                    <>
                      <button
                        onClick={() => handleResume(download.id)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
                        title="Resume"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCancel(download.id)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#27272a] transition-colors"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
