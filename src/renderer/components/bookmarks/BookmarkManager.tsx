import React, { useState, useMemo } from 'react';
import { Bookmark, BookmarkFolder } from '../../../shared/types';
import { BookmarkItem } from './BookmarkItem';
import { FolderTree } from './FolderTree';
import { AddBookmarkModal } from './AddBookmarkModal';

interface BookmarkManagerProps {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onAddBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateBookmark: (id: string, bookmark: Partial<Bookmark>) => void;
  onDeleteBookmark: (id: string) => void;
  onAddFolder: (name: string, parentId?: string) => void;
  onUpdateFolder: (id: string, folder: Partial<BookmarkFolder>) => void;
  onDeleteFolder: (id: string) => void;
  onSyncToAleo?: () => void;
  onOpenUrl: (url: string) => void;
  isSyncing?: boolean;
}

/**
 * BookmarkManager Component
 *
 * Main bookmark management interface with:
 * - Grid/list view toggle
 * - Folder navigation (sidebar with tree)
 * - Bookmark items display
 * - Add bookmark button
 * - Search/filter input
 * - Sync to Aleo button
 * - Empty state message
 *
 * Features:
 * - Responsive layout
 * - Keyboard navigation (Arrow keys, Enter, Delete)
 * - Search by title, URL, or tags
 * - Filter by folder
 * - Sort options (name, date, URL)
 *
 * @example
 * <BookmarkManager
 *   bookmarks={bookmarks}
 *   folders={folders}
 *   onAddBookmark={(data) => createBookmark(data)}
 *   onUpdateBookmark={(id, data) => updateBookmark(id, data)}
 *   onDeleteBookmark={(id) => deleteBookmark(id)}
 *   onAddFolder={(name, parentId) => createFolder(name, parentId)}
 *   onUpdateFolder={(id, data) => updateFolder(id, data)}
 *   onDeleteFolder={(id) => deleteFolder(id)}
 *   onSyncToAleo={() => syncBookmarks()}
 *   onOpenUrl={(url) => navigate(url)}
 * />
 */
export const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  bookmarks,
  folders,
  onAddBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onSyncToAleo,
  onOpenUrl,
  isSyncing = false,
}) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'url'>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | undefined>();
  const [showSidebar, setShowSidebar] = useState(true);

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let filtered = [...bookmarks];

    // Filter by folder
    if (selectedFolderId) {
      filtered = filtered.filter(b => b.folderId === selectedFolderId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'date':
          return b.createdAt - a.createdAt;
        case 'url':
          return a.url.localeCompare(b.url);
        default:
          return 0;
      }
    });

    return filtered;
  }, [bookmarks, selectedFolderId, searchQuery, sortBy]);

  const handleAddBookmark = (data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingBookmark) {
      onUpdateBookmark(editingBookmark.id, data);
    } else {
      onAddBookmark(data);
    }
    setEditingBookmark(undefined);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setShowAddModal(true);
  };

  const handleDeleteBookmark = (id: string) => {
    onDeleteBookmark(id);
    if (editingBookmark?.id === id) {
      setEditingBookmark(undefined);
      setShowAddModal(false);
    }
  };

  const handleToggleFolderExpand = (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (folder) {
      onUpdateFolder(id, { isExpanded: !folder.isExpanded });
    }
  };

  // Get current folder name
  const currentFolderName = selectedFolderId
    ? folders.find(f => f.id === selectedFolderId)?.name || 'Unknown Folder'
    : 'All Bookmarks';

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-bg-elevated">
        <div className="flex items-center gap-3">
          {/* Sidebar toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded hover:bg-bg-secondary transition-colors"
            aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div>
            <h1 className="text-xl font-bold text-text-primary">Bookmarks</h1>
            <p className="text-sm text-text-muted">{currentFolderName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              className="w-64 pl-9 pr-3 py-2 bg-bg-secondary border border-bg-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
              aria-label="Search bookmarks"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'url')}
            className="px-3 py-2 bg-bg-secondary border border-bg-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
            aria-label="Sort bookmarks"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
            <option value="url">Sort by URL</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-lg">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-accent-aleo/20 text-accent-aleo' : 'text-text-secondary hover:text-text-primary'}`}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-accent-aleo/20 text-accent-aleo' : 'text-text-secondary hover:text-text-primary'}`}
              aria-label="List view"
              aria-pressed={view === 'list'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Add bookmark */}
          <button
            onClick={() => {
              setEditingBookmark(undefined);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-accent-aleo text-bg-primary rounded-lg font-medium text-sm hover:bg-accent-aleo/90 transition-colors flex items-center gap-2"
            aria-label="Add bookmark"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Bookmark
          </button>

          {/* Sync to Aleo */}
          {onSyncToAleo && (
            <button
              onClick={onSyncToAleo}
              disabled={isSyncing}
              className="px-4 py-2 bg-accent-purple text-text-primary rounded-lg font-medium text-sm hover:bg-accent-purple/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sync to Aleo"
            >
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isSyncing ? 'Syncing...' : 'Sync to Aleo'}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 flex-shrink-0">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
              onCreateFolder={onAddFolder}
              onRenameFolder={(id, name) => onUpdateFolder(id, { name })}
              onDeleteFolder={onDeleteFolder}
              onToggleExpand={handleToggleFolderExpand}
            />
          </div>
        )}

        {/* Bookmarks grid/list */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredBookmarks.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-bg-secondary flex items-center justify-center">
                <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
              </h3>
              <p className="text-text-muted mb-6 max-w-md">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Start building your collection by adding your first bookmark'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setEditingBookmark(undefined);
                    setShowAddModal(true);
                  }}
                  className="px-6 py-3 bg-accent-aleo text-bg-primary rounded-lg font-medium hover:bg-accent-aleo/90 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Bookmark
                </button>
              )}
            </div>
          ) : (
            <div className={
              view === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                : 'space-y-2'
            }>
              {filteredBookmarks.map((bookmark) => (
                <BookmarkItem
                  key={bookmark.id}
                  bookmark={bookmark}
                  onOpen={onOpenUrl}
                  onEdit={handleEditBookmark}
                  onDelete={handleDeleteBookmark}
                  onMove={(id, folderId) => onUpdateBookmark(id, { folderId })}
                  view={view}
                />
              ))}
            </div>
          )}

          {/* Results count */}
          {filteredBookmarks.length > 0 && (
            <div className="mt-6 text-center text-sm text-text-muted">
              Showing {filteredBookmarks.length} of {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Bookmark Modal */}
      <AddBookmarkModal
        isOpen={showAddModal}
        bookmark={editingBookmark}
        folders={folders}
        onSave={handleAddBookmark}
        onDelete={editingBookmark ? () => handleDeleteBookmark(editingBookmark.id) : undefined}
        onClose={() => {
          setShowAddModal(false);
          setEditingBookmark(undefined);
        }}
      />
    </div>
  );
};
