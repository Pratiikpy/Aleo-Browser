import React, { useState, useRef, useEffect } from 'react';
import { Bookmark } from '../../../shared/types';

interface BookmarkItemProps {
  bookmark: Bookmark;
  onOpen: (url: string) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folderId?: string) => void;
  view: 'grid' | 'list';
}

/**
 * BookmarkItem Component
 *
 * Displays a single bookmark with:
 * - Favicon or fallback icon
 * - Title (truncated if long)
 * - URL preview (domain only)
 * - Click to open in new tab
 * - Right-click context menu
 * - Hover overlay with quick actions
 *
 * @example
 * <BookmarkItem
 *   bookmark={bookmark}
 *   onOpen={(url) => window.open(url)}
 *   onEdit={(bm) => setEditingBookmark(bm)}
 *   onDelete={(id) => removeBookmark(id)}
 *   onMove={(id, folderId) => moveBookmark(id, folderId)}
 *   view="grid"
 * />
 */
export const BookmarkItem: React.FC<BookmarkItemProps> = ({
  bookmark,
  onOpen,
  onEdit,
  onDelete,
  onMove,
  view,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Extract domain from URL
  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Handle click to open
  const handleClick = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      onOpen(bookmark.url);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(bookmark.url);
    } else if (e.key === 'Delete') {
      onDelete(bookmark.id);
    }
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContextMenu]);

  const domain = getDomain(bookmark.url);

  if (view === 'grid') {
    return (
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open bookmark: ${bookmark.title}`}
          className="flex flex-col items-center p-4 rounded-lg bg-bg-secondary border border-bg-elevated hover:border-accent-aleo/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
        >
          {/* Favicon */}
          <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex items-center justify-center mb-3 overflow-hidden">
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt=""
                className="w-8 h-8"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-text-primary text-center line-clamp-2 mb-1 w-full">
            {bookmark.title}
          </h3>

          {/* Domain */}
          <p className="text-xs text-text-muted truncate w-full text-center">
            {domain}
          </p>

          {/* Favorite star */}
          {bookmark.isFavorite && (
            <div className="absolute top-2 right-2">
              <svg className="w-4 h-4 text-accent-aleo fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Hover overlay with quick actions */}
        {isHovered && (
          <div className="absolute inset-0 bg-bg-primary/80 rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bookmark);
              }}
              className="p-2 rounded-lg bg-bg-secondary hover:bg-bg-elevated transition-colors"
              aria-label="Edit bookmark"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bookmark.id);
              }}
              className="p-2 rounded-lg bg-bg-secondary hover:bg-red-500/20 transition-colors"
              aria-label="Delete bookmark"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Context menu */}
        {showContextMenu && (
          <div
            ref={menuRef}
            className="fixed z-50 bg-bg-secondary border border-bg-elevated rounded-lg shadow-2xl py-1 min-w-[180px]"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          >
            <button
              onClick={() => {
                onOpen(bookmark.url);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in new tab
            </button>
            <button
              onClick={() => {
                onEdit(bookmark);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(bookmark.url);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy URL
            </button>
            <hr className="my-1 border-bg-elevated" />
            <button
              onClick={() => {
                onDelete(bookmark.id);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open bookmark: ${bookmark.title}`}
      className="group flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-bg-elevated hover:border-accent-aleo/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      {/* Favicon */}
      <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center flex-shrink-0 overflow-hidden">
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="w-5 h-5"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {bookmark.title}
          </h3>
          {bookmark.isFavorite && (
            <svg className="w-3 h-3 text-accent-aleo fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
        </div>
        <p className="text-xs text-text-muted truncate">
          {domain}
        </p>
      </div>

      {/* Quick actions (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bookmark);
          }}
          className="p-1.5 rounded hover:bg-bg-elevated transition-colors"
          aria-label="Edit bookmark"
        >
          <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(bookmark.id);
          }}
          className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
          aria-label="Delete bookmark"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-bg-secondary border border-bg-elevated rounded-lg shadow-2xl py-1 min-w-[180px]"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
        >
          <button
            onClick={() => {
              onOpen(bookmark.url);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in new tab
          </button>
          <button
            onClick={() => {
              onEdit(bookmark);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(bookmark.url);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy URL
          </button>
          <hr className="my-1 border-bg-elevated" />
          <button
            onClick={() => {
              onDelete(bookmark.id);
              setShowContextMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
