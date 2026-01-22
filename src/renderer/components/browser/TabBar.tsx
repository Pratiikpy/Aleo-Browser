import React, { useState } from 'react';

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
  pinned?: boolean;
  suspended?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onTabPin?: (id: string) => void;
  onTabUnpin?: (id: string) => void;
  onTabDuplicate?: (id: string) => void;
}

interface ContextMenuState {
  isOpen: boolean;
  tabId: string | null;
  x: number;
  y: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  onTabClick,
  onTabClose,
  onNewTab,
  onTabPin,
  onTabUnpin,
  onTabDuplicate,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    tabId: null,
    x: 0,
    y: 0,
  });

  // Sort tabs: pinned first, then regular
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      tabId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, tabId: null, x: 0, y: 0 });
  };

  const handlePin = () => {
    if (contextMenu.tabId && onTabPin) {
      onTabPin(contextMenu.tabId);
    }
    closeContextMenu();
  };

  const handleUnpin = () => {
    if (contextMenu.tabId && onTabUnpin) {
      onTabUnpin(contextMenu.tabId);
    }
    closeContextMenu();
  };

  const handleDuplicate = () => {
    if (contextMenu.tabId && onTabDuplicate) {
      onTabDuplicate(contextMenu.tabId);
    }
    closeContextMenu();
  };

  const handleCloseFromMenu = () => {
    if (contextMenu.tabId) {
      onTabClose(contextMenu.tabId);
    }
    closeContextMenu();
  };

  const currentTab = tabs.find(t => t.id === contextMenu.tabId);

  return (
    <div className="flex items-center h-10 bg-[#111118] border-b border-[#27272a] drag-region">
      <div className="flex-1 flex items-center overflow-x-auto overflow-y-hidden scrollbar-none">
        {sortedTabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              group relative flex items-center gap-2 h-10
              cursor-pointer no-drag transition-colors
              ${tab.pinned
                ? 'px-3 min-w-[44px] max-w-[44px] justify-center'
                : 'px-4 min-w-[180px] max-w-[240px]'
              }
              ${tab.active
                ? 'bg-[#0a0a0f] text-[#e4e4e7]'
                : tab.suspended
                ? 'bg-[#111118] text-[#52525b] hover:bg-[#1a1a24]'
                : 'bg-[#111118] text-[#a1a1aa] hover:bg-[#1a1a24]'
              }
            `}
            onClick={() => onTabClick(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            title={tab.suspended ? 'Click to wake - Tab suspended to save memory' : undefined}
            style={{
              clipPath: tab.active
                ? 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 100%, 0% 100%)'
                : 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 100%, 0% 100%)',
              opacity: tab.suspended && !tab.active ? 0.6 : 1,
            }}
          >
            {/* Pinned indicator */}
            {tab.pinned && (
              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
            )}

            {/* Suspended indicator */}
            {tab.suspended && !tab.active && (
              <div className="absolute top-1 left-1 w-4 h-4 flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
            )}

            {/* Favicon */}
            <div className="flex-shrink-0 w-4 h-4">
              {tab.favicon ? (
                <img
                  src={tab.favicon}
                  alt=""
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
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
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            {/* Title - only shown for non-pinned tabs */}
            {!tab.pinned && (
              <span className="flex-1 truncate text-sm font-medium">
                {tab.title || 'New Tab'}
              </span>
            )}

            {/* Close button - only shown for non-pinned tabs */}
            {!tab.pinned && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-[#27272a] transition-opacity"
              >
                <svg
                  className="w-3.5 h-3.5"
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
              </button>
            )}
          </div>
        ))}
      </div>

      {/* New tab button */}
      <button
        onClick={onNewTab}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-[#a1a1aa] hover:text-[#e4e4e7] hover:bg-[#1a1a24] no-drag transition-colors"
        title="New tab"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          {/* Menu */}
          <div
            className="fixed z-50 bg-[#1a1a24] border border-[#27272a] rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {currentTab?.pinned ? (
              <button
                onClick={handleUnpin}
                className="w-full px-3 py-2 text-sm text-left text-[#e4e4e7] hover:bg-[#27272a] flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Unpin Tab
              </button>
            ) : (
              <button
                onClick={handlePin}
                className="w-full px-3 py-2 text-sm text-left text-[#e4e4e7] hover:bg-[#27272a] flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-[#00d4aa]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                Pin Tab
              </button>
            )}

            <button
              onClick={handleDuplicate}
              className="w-full px-3 py-2 text-sm text-left text-[#e4e4e7] hover:bg-[#27272a] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate Tab
            </button>

            <div className="h-px bg-[#27272a] my-1" />

            {!currentTab?.pinned && (
              <button
                onClick={handleCloseFromMenu}
                className="w-full px-3 py-2 text-sm text-left text-[#ef4444] hover:bg-[#27272a] flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close Tab
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
