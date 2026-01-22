import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, BookmarkFolder } from '../../../shared/types';

interface AddBookmarkModalProps {
  isOpen: boolean;
  bookmark?: Bookmark;
  currentUrl?: string;
  currentTitle?: string;
  folders: BookmarkFolder[];
  onSave: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

/**
 * AddBookmarkModal Component
 *
 * Modal for adding or editing bookmarks with:
 * - URL input (pre-filled with current page)
 * - Title input (pre-filled)
 * - Folder selector dropdown
 * - Tags input (optional)
 * - Favorite toggle
 * - Save/Cancel buttons
 * - Delete button (for edit mode)
 *
 * @example
 * <AddBookmarkModal
 *   isOpen={showModal}
 *   bookmark={editingBookmark}
 *   currentUrl={activeTab.url}
 *   currentTitle={activeTab.title}
 *   folders={folders}
 *   onSave={(data) => saveBookmark(data)}
 *   onDelete={(id) => deleteBookmark(id)}
 *   onClose={() => setShowModal(false)}
 * />
 */
export const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({
  isOpen,
  bookmark,
  currentUrl = '',
  currentTitle = '',
  folders,
  onSave,
  onDelete,
  onClose,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!bookmark;

  // Initialize form with bookmark data or current page
  useEffect(() => {
    if (isOpen) {
      if (bookmark) {
        setUrl(bookmark.url);
        setTitle(bookmark.title);
        setFolderId(bookmark.folderId);
        setTags(bookmark.tags || []);
        setIsFavorite(bookmark.isFavorite || false);
      } else {
        setUrl(currentUrl);
        setTitle(currentTitle || currentUrl);
        setFolderId(undefined);
        setTags([]);
        setIsFavorite(false);
      }
    }
  }, [isOpen, bookmark, currentUrl, currentTitle]);

  // Focus URL input when modal opens
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [isOpen]);

  // Hide BrowserView when modal is open (so inputs are clickable)
  useEffect(() => {
    if (isOpen) {
      window.electron?.ui?.setBrowserViewVisible(false);
    } else {
      window.electron?.ui?.setBrowserViewVisible(true);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmedTag = tagInput.trim();
      if (trimmedTag && !tags.includes(trimmedTag)) {
        setTags([...tags, trimmedTag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      alert('Please enter a URL');
      return;
    }

    onSave({
      url: url.trim(),
      title: title.trim() || url.trim(),
      folderId,
      tags: tags.length > 0 ? tags : undefined,
      isFavorite,
    });

    onClose();
  };

  const handleDelete = () => {
    if (bookmark && onDelete) {
      if (confirm(`Delete bookmark "${bookmark.title}"?`)) {
        onDelete(bookmark.id);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-bg-secondary border border-bg-elevated rounded-xl shadow-2xl w-full max-w-md mx-4"
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bg-elevated">
          <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
            {isEditMode ? 'Edit Bookmark' : 'Add Bookmark'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-elevated transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* URL Input */}
          <div>
            <label htmlFor="bookmark-url" className="block text-sm font-medium text-text-primary mb-1.5">
              URL
            </label>
            <input
              ref={urlInputRef}
              id="bookmark-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 bg-bg-tertiary border border-bg-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
              required
            />
          </div>

          {/* Title Input */}
          <div>
            <label htmlFor="bookmark-title" className="block text-sm font-medium text-text-primary mb-1.5">
              Title
            </label>
            <input
              id="bookmark-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              className="w-full px-3 py-2 bg-bg-tertiary border border-bg-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
            />
          </div>

          {/* Folder Selector */}
          <div>
            <label htmlFor="bookmark-folder" className="block text-sm font-medium text-text-primary mb-1.5">
              Folder
            </label>
            <select
              id="bookmark-folder"
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || undefined)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-bg-elevated rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Input */}
          <div>
            <label htmlFor="bookmark-tags" className="block text-sm font-medium text-text-primary mb-1.5">
              Tags (optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-accent-aleo/20 text-accent-aleo text-xs rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-accent-aleo/70 transition-colors"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <input
              id="bookmark-tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type and press Enter"
              className="w-full px-3 py-2 bg-bg-tertiary border border-bg-elevated rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-aleo/50"
            />
            <p className="mt-1 text-xs text-text-muted">Press Enter or comma to add tags</p>
          </div>

          {/* Favorite Toggle */}
          <div className="flex items-center gap-2">
            <input
              id="bookmark-favorite"
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 rounded border-bg-elevated bg-bg-tertiary text-accent-aleo focus:ring-2 focus:ring-accent-aleo/50"
            />
            <label htmlFor="bookmark-favorite" className="text-sm text-text-primary cursor-pointer flex items-center gap-1.5">
              <svg className="w-4 h-4 text-accent-aleo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Add to favorites
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-bg-elevated">
            <div>
              {isEditMode && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-elevated rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-accent-aleo text-bg-primary rounded-lg hover:bg-accent-aleo/90 transition-colors"
              >
                {isEditMode ? 'Save' : 'Add Bookmark'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
