import React, { useState, useEffect, useRef } from 'react';
import { TabBar } from './components/browser/TabBar';
import { Toolbar } from './components/browser/Toolbar';
import { AddressBar } from './components/browser/AddressBar';
import { StatusBar } from './components/browser/StatusBar';
import { WalletSidebar } from './components/wallet/WalletSidebar';
import { FindBar } from './components/browser/FindBar';
import { DownloadBar } from './components/browser/DownloadBar';
import { NewTabPage } from './components/browser/NewTabPage';
import { ShieldsPanel } from './components/browser/ShieldsPanel';
import { BookmarkBar } from './components/bookmarks/BookmarkBar';
import { AddBookmarkModal } from './components/bookmarks/AddBookmarkModal';
import { TransactionApproval, TransactionDetails } from './components/dapp';
import { NotesPanel } from './components/notes';
import { useBookmarkStore, useIsBookmarked } from './stores/bookmarkStore';
import type { Bookmark, BookmarkFolder } from '../shared/types';

// Pending transaction request state
interface PendingTransaction {
  origin: string;
  transaction: TransactionDetails;
}

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
  isNewTab?: boolean;
  pinned?: boolean;
}

const App: React.FC = () => {
  // Tab state with proper multi-tab support
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Browser state
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);

  // UI state
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isFindBarOpen, setIsFindBarOpen] = useState(false);
  const [isDownloadBarOpen, setIsDownloadBarOpen] = useState(false);
  const [isShieldsPanelOpen, setIsShieldsPanelOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [showBookmarkBar, setShowBookmarkBar] = useState(true);

  // Transaction approval state
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Bookmark store
  const {
    bookmarks,
    folders: bookmarkFolderNames,
    loadBookmarks,
    addBookmark,
    deleteBookmark: removeBookmark,
  } = useBookmarkStore();

  // Shield button ref for anchoring the panel
  const shieldsButtonRef = useRef<HTMLButtonElement>(null);

  // Status bar state
  const [privacyMode] = useState<'private' | 'standard'>('private');
  const [networkStatus] = useState<'online' | 'offline' | 'connecting'>('online');
  const [blockedTrackers, setBlockedTrackers] = useState(0);

  // Closed tabs for reopen feature
  const [closedTabs, setClosedTabs] = useState<Tab[]>([]);

  // Address bar ref for focus
  const addressBarRef = useRef<HTMLInputElement>(null);

  // Refs to hold current values for event handlers (prevents stale closures)
  const activeTabIdRef = useRef<string | null>(activeTabId);
  const tabsRef = useRef<Tab[]>(tabs);
  const closedTabsRef = useRef<Tab[]>(closedTabs);

  // Keep refs in sync with state
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { closedTabsRef.current = closedTabs; }, [closedTabs]);

  // Set window title for Aleo branding
  useEffect(() => {
    document.title = 'AleoBrowser - The Privacy Browser for Aleo';
  }, []);

  // Load bookmarks on startup
  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Convert folder names to BookmarkFolder objects for the modal
  const bookmarkFolders: BookmarkFolder[] = bookmarkFolderNames.map((name, index) => ({
    id: name,
    name: name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  // Check if current URL is bookmarked
  const currentUrl = tabs.find(t => t.id === activeTabId)?.url || '';
  const isCurrentPageBookmarked = bookmarks.some(b => b.url === currentUrl);

  // Update BrowserView bounds when wallet sidebar opens/closes
  // The sidebar is 384px wide (w-96 = 24rem = 384px)
  useEffect(() => {
    if (isWalletOpen) {
      // CRITICAL: Hide BrowserView BEFORE adjusting bounds to prevent race condition
      // This ensures the BrowserView doesn't block password input while wallet loads
      window.electron.ui?.setBrowserViewVisible(false);

      // Then adjust bounds for when wallet becomes unlocked
      window.electron.ui?.adjustBrowserViewBounds({
        rightWidth: 384
      });

      // Note: WalletPanel will call setBrowserViewVisible(true) when wallet is unlocked
    } else {
      // When wallet closes, restore BrowserView bounds and visibility
      window.electron.ui?.adjustBrowserViewBounds({
        rightWidth: 0
      });
      window.electron.ui?.setBrowserViewVisible(true);
    }
  }, [isWalletOpen]);

  // Initialize first tab
  useEffect(() => {
    const initialTabId = Date.now().toString();
    setTabs([{
      id: initialTabId,
      title: 'New Tab',
      url: '',
      active: true,
      isNewTab: true
    }]);
    setActiveTabId(initialTabId);

    // Create the tab in the main process
    window.electron.browser.createTab(initialTabId);
    window.electron.browser.switchTab(initialTabId);
  }, []);

  // Subscribe to IPC events from main process (runs only once on mount)
  useEffect(() => {
    // Tab loading state
    window.electron.events.onTabLoading((loading: boolean, tabId?: string) => {
      if (!tabId || tabId === activeTabIdRef.current) {
        setIsLoading(loading);
      }
    });

    // Tab navigation events - update URL and navigation buttons
    window.electron.events.onTabNavigated((data: { tabId?: string; url: string; title: string; canGoBack: boolean; canGoForward: boolean }) => {
      const currentActiveTabId = activeTabIdRef.current;
      const targetTabId = data.tabId || currentActiveTabId;
      if (targetTabId === currentActiveTabId) {
        setCanGoBack(data.canGoBack);
        setCanGoForward(data.canGoForward);
      }

      // Update the specific tab's URL and title
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === targetTabId
            ? {
                ...tab,
                url: data.url,
                title: data.title || 'Loading...',
                isNewTab: !data.url || data.url === '' || data.url === 'about:blank'
              }
            : tab
        )
      );
    });

    // Tab title updates
    window.electron.events.onTabTitleUpdated((title: string, tabId?: string) => {
      const targetTabId = tabId || activeTabIdRef.current;
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === targetTabId ? { ...tab, title } : tab
        )
      );
    });

    // Tab favicon updates
    window.electron.events.onTabFaviconUpdated((favicon: string, tabId?: string) => {
      const targetTabId = tabId || activeTabIdRef.current;
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === targetTabId ? { ...tab, favicon } : tab
        )
      );
    });

    // Tab errors
    window.electron.events.onTabError((error: string) => {
      console.error('Tab error:', error);
    });

    // Zoom changes
    window.electron.events.onTabZoomChanged((newZoomLevel: number, tabId?: string) => {
      if (!tabId || tabId === activeTabIdRef.current) {
        setZoomLevel(newZoomLevel);
      }
    });

    // New window requests (open in new tab)
    window.electron.events.onTabNewWindow((url: string) => {
      handleNewTab(url);
    });

    // Keyboard shortcuts
    window.electron.events.onShortcutCloseTab(() => {
      const currentActiveTabId = activeTabIdRef.current;
      if (currentActiveTabId) {
        handleTabClose(currentActiveTabId);
      }
    });

    window.electron.events.onShortcutNewTab(() => {
      handleNewTab();
    });

    window.electron.events.onShortcutFocusAddressBar(() => {
      addressBarRef.current?.focus();
      addressBarRef.current?.select();
    });

    window.electron.events.onShortcutFindInPage(() => {
      setIsFindBarOpen(true);
    });

    window.electron.events.onShortcutEscape(() => {
      setIsFindBarOpen(false);
      setIsDownloadBarOpen(false);
    });

    window.electron.events.onShortcutShowDownloads(() => {
      setIsDownloadBarOpen(true);
    });

    window.electron.events.onShortcutNextTab(() => {
      const currentTabs = tabsRef.current;
      const currentActiveTabId = activeTabIdRef.current;
      const currentIndex = currentTabs.findIndex(t => t.id === currentActiveTabId);
      if (currentIndex < currentTabs.length - 1) {
        handleTabClick(currentTabs[currentIndex + 1].id);
      } else if (currentTabs.length > 0) {
        handleTabClick(currentTabs[0].id);
      }
    });

    window.electron.events.onShortcutPrevTab(() => {
      const currentTabs = tabsRef.current;
      const currentActiveTabId = activeTabIdRef.current;
      const currentIndex = currentTabs.findIndex(t => t.id === currentActiveTabId);
      if (currentIndex > 0) {
        handleTabClick(currentTabs[currentIndex - 1].id);
      } else if (currentTabs.length > 0) {
        handleTabClick(currentTabs[currentTabs.length - 1].id);
      }
    });

    window.electron.events.onShortcutSwitchToTab((index: number) => {
      const currentTabs = tabsRef.current;
      if (index < currentTabs.length) {
        handleTabClick(currentTabs[index].id);
      } else if (index === 8 && currentTabs.length > 0) {
        // Ctrl+9 always goes to last tab
        handleTabClick(currentTabs[currentTabs.length - 1].id);
      }
    });

    window.electron.events.onShortcutReopenClosedTab(() => {
      const currentClosedTabs = closedTabsRef.current;
      if (currentClosedTabs.length > 0) {
        const lastClosed = currentClosedTabs[currentClosedTabs.length - 1];
        setClosedTabs(prev => prev.slice(0, -1));
        handleNewTab(lastClosed.url);
      }
    });

    // Download events - open download bar on new download
    window.electron.events.onDownloadStarted(() => {
      setIsDownloadBarOpen(true);
    });

    // Permission/transaction request events
    window.electron.events.onPermissionRequest((data: any) => {
      console.log('[App] Permission request received:', data);
      if (data.type === 'transaction' && data.transaction) {
        // Load wallet balance for display
        window.electron.wallet.getBalance().then((result) => {
          if (result.success) {
            setWalletBalance((result.public || 0) + (result.private || 0));
          }
        });

        setPendingTransaction({
          origin: data.origin || 'AleoBrowser',
          transaction: data.transaction,
        });
      }
    });

    // Cleanup on unmount only
    return () => {
      window.electron.events.removeAllListeners();
    };
  }, []); // Empty deps - runs only once on mount

  // Get active tab
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Tab handlers
  const handleTabClick = async (id: string) => {
    if (id === activeTabId) return;

    // Update UI state
    setTabs((prev) =>
      prev.map((tab) => ({ ...tab, active: tab.id === id }))
    );
    setActiveTabId(id);

    // Switch tab in main process
    await window.electron.browser.switchTab(id);
  };

  const handleTabClose = async (id: string) => {
    // Save to closed tabs for reopen
    const closingTab = tabs.find(t => t.id === id);
    if (closingTab && closingTab.url) {
      setClosedTabs(prev => [...prev.slice(-9), closingTab]);
    }

    // Close in main process
    await window.electron.browser.closeTab(id);

    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== id);

      if (newTabs.length === 0) {
        // Create a new tab if all tabs are closed
        const newTabId = Date.now().toString();
        window.electron.browser.createTab(newTabId);
        window.electron.browser.switchTab(newTabId);
        setActiveTabId(newTabId);
        return [{
          id: newTabId,
          title: 'New Tab',
          url: '',
          active: true,
          isNewTab: true
        }];
      }

      // If closing active tab, activate the next or previous tab
      if (id === activeTabId) {
        const closedTabIndex = prev.findIndex((tab) => tab.id === id);
        const newActiveIndex = Math.min(closedTabIndex, newTabs.length - 1);
        const newActiveId = newTabs[newActiveIndex].id;

        window.electron.browser.switchTab(newActiveId);
        setActiveTabId(newActiveId);

        return newTabs.map((tab, index) => ({
          ...tab,
          active: index === newActiveIndex
        }));
      }

      return newTabs;
    });
  };

  const handleNewTab = async (url?: string) => {
    const newTabId = Date.now().toString();
    const isBlank = !url || url === '' || url === 'about:blank';

    const newTab: Tab = {
      id: newTabId,
      title: isBlank ? 'New Tab' : 'Loading...',
      url: url || '',
      active: true,
      isNewTab: isBlank
    };

    // Update UI state
    setTabs((prev) => [
      ...prev.map((tab) => ({ ...tab, active: false })),
      newTab,
    ]);
    setActiveTabId(newTabId);

    // Create and switch to new tab in main process
    await window.electron.browser.createTab(newTabId, url);
    await window.electron.browser.switchTab(newTabId);
  };

  // Navigation handlers
  const handleBack = async () => {
    await window.electron.browser.goBack();
  };

  const handleForward = async () => {
    await window.electron.browser.goForward();
  };

  const handleRefresh = async () => {
    await window.electron.browser.reload();
  };

  const handleHome = async () => {
    await window.electron.browser.navigate('https://aleo.org');
    // Update the current tab to not be a new tab
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, isNewTab: false } : tab
      )
    );
  };

  const handleNavigate = async (url: string) => {
    await window.electron.browser.navigate(url);
    // Update the current tab to not be a new tab
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, url, isNewTab: false }
          : tab
      )
    );
  };

  const handleToggleBookmark = async () => {
    if (isCurrentPageBookmarked) {
      // Find and remove the bookmark
      const existingBookmark = bookmarks.find(b => b.url === currentUrl);
      if (existingBookmark) {
        removeBookmark(existingBookmark.id);
      }
    } else {
      // Check wallet status before showing bookmark modal
      const walletStatus = await window.electron.wallet.isLocked();

      if (!walletStatus.hasWallet) {
        // No wallet - open wallet sidebar to create one
        setIsWalletOpen(true);
        // WalletPanel will show create wallet UI automatically
        return;
      }

      if (walletStatus.isLocked) {
        // Wallet is locked - open wallet sidebar to unlock
        setIsWalletOpen(true);
        // WalletPanel will show unlock UI automatically
        return;
      }

      // Wallet is ready - open modal to add bookmark
      setIsBookmarkModalOpen(true);
    }
  };

  const handleSaveBookmark = async (bookmarkData: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Check wallet status first
    const walletStatus = await window.electron.wallet.isLocked();

    if (!walletStatus.hasWallet) {
      // No wallet - open wallet sidebar to create one
      setIsBookmarkModalOpen(false);
      setIsWalletOpen(true);
      // WalletPanel will show create wallet UI automatically
      return;
    }

    if (walletStatus.isLocked) {
      // Wallet is locked - open wallet sidebar to unlock
      setIsBookmarkModalOpen(false);
      setIsWalletOpen(true);
      // WalletPanel will show unlock UI automatically
      return;
    }

    // Wallet is ready - save bookmark and sync to Aleo
    await addBookmark({
      ...bookmarkData,
      folder: bookmarkData.folderId || 'Other Bookmarks',
    });
    setIsBookmarkModalOpen(false);
  };

  const handleBookmarkBarClick = (url: string) => {
    handleNavigate(url);
  };

  const handleAddBookmarkFromBar = () => {
    setIsBookmarkModalOpen(true);
  };

  // Tab pinning handlers
  const handleTabPin = (id: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, pinned: true } : tab
      )
    );
  };

  const handleTabUnpin = (id: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, pinned: false } : tab
      )
    );
  };

  const handleTabDuplicate = async (id: string) => {
    const tabToDuplicate = tabs.find((t) => t.id === id);
    if (tabToDuplicate && tabToDuplicate.url) {
      await handleNewTab(tabToDuplicate.url);
    }
  };

  // Window controls
  const handleMinimize = async () => {
    await window.electron.window.minimize();
  };

  const handleMaximize = async () => {
    await window.electron.window.maximize();
  };

  const handleClose = async () => {
    // Save session before closing
    await window.electron.session.save();
    await window.electron.window.close();
  };

  // Transaction approval handlers
  const handleTransactionApprove = async () => {
    console.log('[App] Transaction approved');
    const origin = pendingTransaction?.origin || 'browser:internal';
    await window.electron.dapp.respondToPermission(true, origin);
    setPendingTransaction(null);
  };

  const handleTransactionReject = () => {
    console.log('[App] Transaction rejected');
    const origin = pendingTransaction?.origin || 'browser:internal';
    window.electron.dapp.respondToPermission(false, origin);
    setPendingTransaction(null);
  };

  // Check if current URL is .aleo site
  const isAleoSite = activeTab?.url.includes('.aleo') || false;
  const isSecure = activeTab?.url.startsWith('https://') || false;
  const showNewTabPage = activeTab?.isNewTab || (!activeTab?.url);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-[#e4e4e7]">
      {/* Custom Titlebar */}
      <div className="h-8 bg-[#111118] flex items-center justify-between border-b border-[#27272a] drag-region">
        <div className="flex items-center gap-2 px-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-[#00d4aa] to-[#00a885] glow-accent-strong" />
          </div>
          <span className="text-sm font-semibold">AleoBrowser</span>
        </div>

        {/* Window controls */}
        <div className="flex no-drag">
          <button
            onClick={handleMinimize}
            className="w-12 h-8 flex items-center justify-center hover:bg-[#1a1a24] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12">
              <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-12 h-8 flex items-center justify-center hover:bg-[#1a1a24] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12">
              <rect
                x="1.5"
                y="1.5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-12 h-8 flex items-center justify-center hover:bg-[#ef4444] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12">
              <path
                d="M1 1 L11 11 M11 1 L1 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={() => handleNewTab()}
        onTabPin={handleTabPin}
        onTabUnpin={handleTabUnpin}
        onTabDuplicate={handleTabDuplicate}
      />

      {/* Navigation Bar */}
      <div className="h-12 bg-[#0a0a0f] border-b border-[#27272a] flex items-center px-2 relative">
        <Toolbar
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onBack={handleBack}
          onForward={handleForward}
          onRefresh={handleRefresh}
          onHome={handleHome}
          isLoading={isLoading}
        />

        <AddressBar
          ref={addressBarRef}
          url={activeTab?.url || ''}
          isSecure={isSecure}
          isAleoSite={isAleoSite}
          isBookmarked={isCurrentPageBookmarked}
          onNavigate={handleNavigate}
          onToggleBookmark={handleToggleBookmark}
        />

        {/* Zoom indicator */}
        {zoomLevel !== 0 && (
          <div className="ml-2 px-2 h-7 rounded bg-[#1a1a24] text-xs flex items-center text-[#71717a]">
            {Math.round(100 + zoomLevel * 20)}%
          </div>
        )}

        {/* Shields toggle button (Brave-style) */}
        <button
          ref={shieldsButtonRef}
          onClick={() => setIsShieldsPanelOpen(!isShieldsPanelOpen)}
          className={`
            ml-2 w-9 h-9 rounded-lg flex items-center justify-center transition-all
            ${isShieldsPanelOpen
              ? 'bg-[#00d4aa] text-[#0a0a0f] glow-accent'
              : 'bg-[#1a1a24] text-[#00d4aa] hover:bg-[#27272a]'
            }
          `}
          title="Aleo Shields"
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
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </button>

        {/* Notes toggle button */}
        <button
          onClick={() => setIsNotesOpen(!isNotesOpen)}
          className={`
            ml-2 w-9 h-9 rounded-lg flex items-center justify-center transition-all
            ${isNotesOpen
              ? 'bg-purple-500 text-white'
              : 'bg-[#1a1a24] text-purple-400 hover:bg-[#27272a]'
            }
          `}
          title="Private Notes"
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>

        {/* Wallet toggle button */}
        <button
          onClick={() => setIsWalletOpen(!isWalletOpen)}
          className={`
            ml-2 px-3 h-9 rounded-lg font-medium text-sm transition-all
            ${isWalletOpen
              ? 'bg-[#00d4aa] text-[#0a0a0f] glow-accent'
              : 'bg-[#1a1a24] text-[#e4e4e7] hover:bg-[#27272a]'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <span>Wallet</span>
          </div>
        </button>

        {/* Shields Panel */}
        <ShieldsPanel
          isOpen={isShieldsPanelOpen}
          onClose={() => setIsShieldsPanelOpen(false)}
          currentUrl={activeTab?.url || ''}
          anchorRef={shieldsButtonRef}
        />

        {/* Find Bar */}
        <FindBar isOpen={isFindBarOpen} onClose={() => setIsFindBarOpen(false)} />
      </div>

      {/* Bookmark Bar */}
      {showBookmarkBar && (
        <BookmarkBar
          bookmarks={bookmarks.map(b => ({
            ...b,
            createdAt: b.createdAt || Date.now(),
            updatedAt: b.createdAt || Date.now(),
          }))}
          folders={bookmarkFolders}
          onBookmarkClick={handleBookmarkBarClick}
          onAddBookmark={handleAddBookmarkFromBar}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* New Tab Page - shows when no URL */}
        {showNewTabPage && (
          <div className="absolute inset-0 z-10 bg-[#0a0a0f]">
            <NewTabPage onNavigate={handleNavigate} />
          </div>
        )}

        {/* BrowserView renders here (managed by Electron main process) */}
        {/* This div is transparent with pointer-events-none to not block BrowserView */}
        <div className="flex-1 pointer-events-none" />

        {/* Wallet Sidebar - has pointer-events-auto to be interactive */}
        <WalletSidebar
          isOpen={isWalletOpen}
          onClose={() => setIsWalletOpen(false)}
        />

        {/* Notes Panel */}
        <NotesPanel
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
        />

        {/* Download Bar */}
        <DownloadBar
          isOpen={isDownloadBarOpen}
          onClose={() => setIsDownloadBarOpen(false)}
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        privacyMode={privacyMode}
        networkStatus={networkStatus}
        blockedTrackers={blockedTrackers}
      />

      {/* Add Bookmark Modal */}
      <AddBookmarkModal
        isOpen={isBookmarkModalOpen}
        currentUrl={activeTab?.url || ''}
        currentTitle={activeTab?.title || ''}
        folders={bookmarkFolders}
        onSave={handleSaveBookmark}
        onClose={() => setIsBookmarkModalOpen(false)}
      />

      {/* Transaction Approval Modal */}
      {pendingTransaction && (
        <TransactionApproval
          isOpen={true}
          onClose={() => setPendingTransaction(null)}
          onApprove={handleTransactionApprove}
          onReject={handleTransactionReject}
          origin={pendingTransaction.origin}
          transaction={pendingTransaction.transaction}
          walletBalance={walletBalance}
        />
      )}
    </div>
  );
};

export default App;
