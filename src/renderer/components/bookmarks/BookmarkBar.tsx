import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, BookmarkFolder } from '../../../shared/types';

interface BookmarkBarProps {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onBookmarkClick: (url: string) => void;
  onAddBookmark: () => void;
  maxVisible?: number;
}

/**
 * BookmarkBar Component
 *
 * Horizontal toolbar bookmark bar with:
 * - Favorite bookmarks display
 * - Folder dropdown support
 * - Add current page button (+)
 * - Overflow menu for extra items
 * - Compact design for toolbar
 *
 * @example
 * <BookmarkBar
 *   bookmarks={favoriteBookmarks}
 *   folders={folders}
 *   onBookmarkClick={(url) => navigate(url)}
 *   onAddBookmark={() => setShowAddModal(true)}
 *   maxVisible={8}
 * />
 */
export const BookmarkBar: React.FC<BookmarkBarProps> = ({
  bookmarks,
  folders,
  onBookmarkClick,
  onAddBookmark,
  maxVisible = 8,
}) => {
  const [showOverflow, setShowOverflow] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const folderRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get favorite bookmarks
  const favoriteBookmarks = bookmarks.filter(b => b.isFavorite);
  const visibleBookmarks = favoriteBookmarks.slice(0, maxVisible);
  const overflowBookmarks = favoriteBookmarks.slice(maxVisible);

  // Get bookmarks by folder
  const getBookmarksByFolder = (folderId: string) => {
    return bookmarks.filter(b => b.folderId === folderId);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }

      if (openFolderId) {
        const folderRef = folderRefs.current.get(openFolderId);
        if (folderRef && !folderRef.contains(e.target as Node)) {
          setOpenFolderId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFolderId]);

  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const BookmarkButton: React.FC<{ bookmark: Bookmark; compact?: boolean }> = ({ bookmark, compact }) => (
    <button
      onClick={() => onBookmarkClick(bookmark.url)}
      className="group flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-bg-elevated transition-colors max-w-[160px]"
      title={bookmark.title}
      aria-label={`Open bookmark: ${bookmark.title}`}
    >
      {/* Favicon */}
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        )}
      </div>

      {/* Title */}
      {!compact && (
        <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors truncate">
          {bookmark.title}
        </span>
      )}
    </button>
  );

  const FolderButton: React.FC<{ folder: BookmarkFolder }> = ({ folder }) => {
    const isOpen = openFolderId === folder.id;
    const folderBookmarks = getBookmarksByFolder(folder.id);

    if (folderBookmarks.length === 0) return null;

    return (
      <div className="relative" ref={(el) => {
        if (el) folderRefs.current.set(folder.id, el);
        else folderRefs.current.delete(folder.id);
      }}>
        <button
          onClick={() => setOpenFolderId(isOpen ? null : folder.id)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors
            ${isOpen ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'}
          `}
          aria-label={`Open folder: ${folder.name}`}
          aria-expanded={isOpen}
        >
          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-xs text-text-secondary truncate max-w-[100px]">
            {folder.name}
          </span>
          <svg className={`w-3 h-3 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Folder dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-bg-elevated rounded-lg shadow-2xl py-1 min-w-[200px] max-h-[300px] overflow-y-auto z-50">
            {folderBookmarks.map((bookmark) => (
              <button
                key={bookmark.id}
                onClick={() => {
                  onBookmarkClick(bookmark.url);
                  setOpenFolderId(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
                title={bookmark.title}
              >
                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  {bookmark.favicon ? (
                    <img
                      src={bookmark.favicon}
                      alt=""
                      className="w-4 h-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{bookmark.title}</p>
                  <p className="text-xs text-text-muted truncate">{getDomain(bookmark.url)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-bg-primary border-b border-bg-elevated overflow-x-auto scrollbar-thin">
      {/* Add bookmark button */}
      <button
        onClick={onAddBookmark}
        className="p-1.5 rounded hover:bg-bg-elevated transition-colors flex-shrink-0"
        aria-label="Add bookmark"
        title="Add current page to bookmarks"
      >
        <svg className="w-4 h-4 text-accent-aleo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div className="w-px h-4 bg-bg-elevated flex-shrink-0" />

      {/* Visible bookmarks */}
      {visibleBookmarks.map((bookmark) => (
        <BookmarkButton key={bookmark.id} bookmark={bookmark} />
      ))}

      {/* Folder buttons */}
      {folders.filter(f => !f.parentId && getBookmarksByFolder(f.id).length > 0).map((folder) => (
        <FolderButton key={folder.id} folder={folder} />
      ))}

      {/* Overflow menu */}
      {overflowBookmarks.length > 0 && (
        <div className="relative" ref={overflowRef}>
          <button
            onClick={() => setShowOverflow(!showOverflow)}
            className={`
              p-1.5 rounded transition-colors flex-shrink-0
              ${showOverflow ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'}
            `}
            aria-label="More bookmarks"
            aria-expanded={showOverflow}
          >
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>

          {showOverflow && (
            <div className="absolute top-full right-0 mt-1 bg-bg-secondary border border-bg-elevated rounded-lg shadow-2xl py-1 min-w-[200px] max-h-[400px] overflow-y-auto z-50">
              {overflowBookmarks.map((bookmark) => (
                <button
                  key={bookmark.id}
                  onClick={() => {
                    onBookmarkClick(bookmark.url);
                    setShowOverflow(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
                  title={bookmark.title}
                >
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                    {bookmark.favicon ? (
                      <img
                        src={bookmark.favicon}
                        alt=""
                        className="w-4 h-4"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">{bookmark.title}</p>
                    <p className="text-xs text-text-muted truncate">{getDomain(bookmark.url)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
