import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Lazy load electron modules
let electronModule: typeof import('electron') | null = null;

function getElectron(): typeof import('electron') {
  if (!electronModule) {
    electronModule = require('electron');
  }
  return electronModule!;
}

/**
 * Download item interface
 */
export interface DownloadItem {
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

// Store downloads in memory
const downloads: Map<string, DownloadItem> = new Map();
const downloadItems: Map<string, Electron.DownloadItem> = new Map();

/**
 * Get the main window
 */
function getMainWindow(): Electron.BrowserWindow | null {
  const { getMainWindow } = require('../window');
  return getMainWindow();
}

/**
 * Setup download handler for a session
 */
export function setupDownloadHandler(session: Electron.Session): void {
  const { app, shell } = getElectron();

  session.on('will-download', (_event, item, webContents) => {
    const id = uuidv4();
    const filename = item.getFilename();
    const downloadsPath = app.getPath('downloads');
    const savePath = path.join(downloadsPath, filename);

    // Set save path
    item.setSavePath(savePath);

    // Create download record
    const download: DownloadItem = {
      id,
      filename,
      url: item.getURL(),
      savePath,
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      startTime: Date.now()
    };

    downloads.set(id, download);
    downloadItems.set(id, item);

    // Notify renderer
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('download:started', download);
    }

    // Track progress
    let lastReceivedBytes = 0;
    let lastTime = Date.now();

    item.on('updated', (_event, state) => {
      const currentDownload = downloads.get(id);
      if (!currentDownload) return;

      const now = Date.now();
      const receivedBytes = item.getReceivedBytes();
      const timeDiff = (now - lastTime) / 1000; // seconds

      // Calculate speed (bytes per second)
      if (timeDiff > 0) {
        currentDownload.speed = (receivedBytes - lastReceivedBytes) / timeDiff;
      }

      currentDownload.receivedBytes = receivedBytes;
      currentDownload.totalBytes = item.getTotalBytes();

      if (state === 'interrupted') {
        currentDownload.state = 'interrupted';
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          currentDownload.state = 'paused';
        } else {
          currentDownload.state = 'progressing';
        }
      }

      lastReceivedBytes = receivedBytes;
      lastTime = now;

      // Notify renderer of progress
      if (mainWindow) {
        mainWindow.webContents.send('download:progress', currentDownload);
      }
    });

    item.once('done', (_event, state) => {
      const currentDownload = downloads.get(id);
      if (!currentDownload) return;

      currentDownload.endTime = Date.now();
      currentDownload.receivedBytes = item.getReceivedBytes();

      if (state === 'completed') {
        currentDownload.state = 'completed';
        currentDownload.savePath = item.getSavePath();

        // Notify renderer of completion
        if (mainWindow) {
          mainWindow.webContents.send('download:complete', currentDownload);
          // Show notification
          const { Notification } = getElectron();
          if (Notification.isSupported()) {
            new Notification({
              title: 'Download Complete',
              body: filename,
              silent: false
            }).show();
          }
        }
      } else if (state === 'cancelled') {
        currentDownload.state = 'cancelled';
        if (mainWindow) {
          mainWindow.webContents.send('download:cancelled', currentDownload);
        }
      } else {
        currentDownload.state = 'interrupted';
        currentDownload.error = 'Download was interrupted';
        if (mainWindow) {
          mainWindow.webContents.send('download:failed', currentDownload);
        }
      }

      // Clean up download item reference
      downloadItems.delete(id);
    });
  });
}

/**
 * Get all downloads
 */
export function getDownloads(): DownloadItem[] {
  return Array.from(downloads.values()).sort((a, b) => b.startTime - a.startTime);
}

/**
 * Get a specific download
 */
export function getDownload(id: string): DownloadItem | undefined {
  return downloads.get(id);
}

/**
 * Cancel a download
 */
export function cancelDownload(id: string): boolean {
  const item = downloadItems.get(id);
  if (item) {
    item.cancel();
    return true;
  }
  return false;
}

/**
 * Pause a download
 */
export function pauseDownload(id: string): boolean {
  const item = downloadItems.get(id);
  if (item && item.canResume()) {
    item.pause();
    return true;
  }
  return false;
}

/**
 * Resume a download
 */
export function resumeDownload(id: string): boolean {
  const item = downloadItems.get(id);
  if (item && item.isPaused()) {
    item.resume();
    return true;
  }
  return false;
}

/**
 * Open download in folder
 */
export function openDownloadInFolder(id: string): boolean {
  const download = downloads.get(id);
  if (download && download.savePath) {
    const { shell } = getElectron();
    shell.showItemInFolder(download.savePath);
    return true;
  }
  return false;
}

/**
 * Open downloaded file
 */
export function openDownloadedFile(id: string): boolean {
  const download = downloads.get(id);
  if (download && download.state === 'completed' && download.savePath) {
    const { shell } = getElectron();
    shell.openPath(download.savePath);
    return true;
  }
  return false;
}

/**
 * Clear completed downloads from list
 */
export function clearCompletedDownloads(): void {
  for (const [id, download] of downloads.entries()) {
    if (download.state === 'completed' || download.state === 'cancelled') {
      downloads.delete(id);
    }
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format download speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

/**
 * Calculate remaining time
 */
export function calculateRemainingTime(download: DownloadItem): string {
  if (!download.speed || download.speed === 0) return 'Unknown';

  const remaining = download.totalBytes - download.receivedBytes;
  const seconds = remaining / download.speed;

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else {
    return `${Math.round(seconds / 3600)}h`;
  }
}
