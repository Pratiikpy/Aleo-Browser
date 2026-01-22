/**
 * Bookmark Components Usage Example
 *
 * This file demonstrates how to integrate the bookmark components
 * into your AleoBrowser application with state management.
 */

import React, { useState, useEffect } from 'react';
import { Bookmark, BookmarkFolder } from '../../../shared/types';
import { BookmarkManager, BookmarkBar } from './index';
import { v4 as uuidv4 } from 'uuid';

/**
 * Example: Bookmark Manager Page
 *
 * Full-page bookmark management interface
 */
export const BookmarkManagerPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load bookmarks from storage on mount
  useEffect(() => {
    // TODO: Replace with actual IPC call to main process
    // window.electron.loadBookmarks().then(setBookmarks);
    // window.electron.loadFolders().then(setFolders);

    // Demo data
    setBookmarks([
      {
        id: '1',
        title: 'Aleo Network',
        url: 'https://aleo.org',
        favicon: 'https://aleo.org/favicon.ico',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        isFavorite: true,
        tags: ['blockchain', 'privacy'],
      },
      {
        id: '2',
        title: 'GitHub',
        url: 'https://github.com',
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 172800000,
        isFavorite: true,
      },
    ]);

    setFolders([
      {
        id: 'f1',
        name: 'Development',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isExpanded: true,
      },
    ]);
  }, []);

  // Add bookmark
  const handleAddBookmark = (data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBookmark: Bookmark = {
      ...data,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setBookmarks([...bookmarks, newBookmark]);

    // TODO: Save to storage
    // window.electron.saveBookmark(newBookmark);
  };

  // Update bookmark
  const handleUpdateBookmark = (id: string, data: Partial<Bookmark>) => {
    setBookmarks(bookmarks.map(b =>
      b.id === id ? { ...b, ...data, updatedAt: Date.now() } : b
    ));

    // TODO: Save to storage
    // window.electron.updateBookmark(id, data);
  };

  // Delete bookmark
  const handleDeleteBookmark = (id: string) => {
    setBookmarks(bookmarks.filter(b => b.id !== id));

    // TODO: Remove from storage
    // window.electron.deleteBookmark(id);
  };

  // Add folder
  const handleAddFolder = (name: string, parentId?: string) => {
    const newFolder: BookmarkFolder = {
      id: uuidv4(),
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isExpanded: true,
    };

    setFolders([...folders, newFolder]);

    // TODO: Save to storage
    // window.electron.saveFolder(newFolder);
  };

  // Update folder
  const handleUpdateFolder = (id: string, data: Partial<BookmarkFolder>) => {
    setFolders(folders.map(f =>
      f.id === id ? { ...f, ...data, updatedAt: Date.now() } : f
    ));

    // TODO: Save to storage
    // window.electron.updateFolder(id, data);
  };

  // Delete folder
  const handleDeleteFolder = (id: string) => {
    // Move bookmarks in this folder to root
    setBookmarks(bookmarks.map(b =>
      b.folderId === id ? { ...b, folderId: undefined, updatedAt: Date.now() } : b
    ));

    // Remove folder and its subfolders
    const getFolderAndChildren = (folderId: string): string[] => {
      const children = folders.filter(f => f.parentId === folderId).map(f => f.id);
      return [folderId, ...children.flatMap(getFolderAndChildren)];
    };

    const idsToDelete = getFolderAndChildren(id);
    setFolders(folders.filter(f => !idsToDelete.includes(f.id)));

    // TODO: Remove from storage
    // window.electron.deleteFolder(id);
  };

  // Sync to Aleo blockchain
  const handleSyncToAleo = async () => {
    setIsSyncing(true);

    try {
      // TODO: Implement Aleo sync
      // await window.electron.syncBookmarksToAleo(bookmarks);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate
      console.log('Bookmarks synced to Aleo!');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Open URL in new tab
  const handleOpenUrl = (url: string) => {
    // TODO: Open in browser webview
    // window.electron.openUrl(url);
    console.log('Opening:', url);
  };

  return (
    <div className="h-screen">
      <BookmarkManager
        bookmarks={bookmarks}
        folders={folders}
        onAddBookmark={handleAddBookmark}
        onUpdateBookmark={handleUpdateBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onAddFolder={handleAddFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
        onSyncToAleo={handleSyncToAleo}
        onOpenUrl={handleOpenUrl}
        isSyncing={isSyncing}
      />
    </div>
  );
};

/**
 * Example: Bookmark Bar Integration
 *
 * Add this to your browser toolbar
 */
export const BrowserWithBookmarkBar: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load data
  useEffect(() => {
    // Demo data
    setBookmarks([
      {
        id: '1',
        title: 'Aleo',
        url: 'https://aleo.org',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: true,
      },
      {
        id: '2',
        title: 'GitHub',
        url: 'https://github.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: true,
      },
      {
        id: '3',
        title: 'Dev Docs',
        url: 'https://developer.aleo.org',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: true,
        folderId: 'f1',
      },
    ]);

    setFolders([
      {
        id: 'f1',
        name: 'Development',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  }, []);

  const handleOpenUrl = (url: string) => {
    console.log('Navigate to:', url);
    // TODO: Implement navigation
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Titlebar */}
      <div className="h-8 bg-bg-secondary border-b border-bg-elevated">
        <div className="px-3 py-1 text-sm font-semibold text-text-primary">
          AleoBrowser
        </div>
      </div>

      {/* Bookmark Bar */}
      <BookmarkBar
        bookmarks={bookmarks}
        folders={folders}
        onBookmarkClick={handleOpenUrl}
        onAddBookmark={() => setShowAddModal(true)}
        maxVisible={8}
      />

      {/* Main browser content */}
      <div className="flex-1 bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">Browser content here</p>
      </div>
    </div>
  );
};

/**
 * Example: Standalone Usage with State Management
 *
 * Using with Zustand or other state management
 */

// Example Zustand store
/*
import create from 'zustand';

interface BookmarkStore {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBookmark: (id: string, data: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;
  addFolder: (name: string, parentId?: string) => void;
  updateFolder: (id: string, data: Partial<BookmarkFolder>) => void;
  deleteFolder: (id: string) => void;
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  bookmarks: [],
  folders: [],

  addBookmark: (data) => set((state) => ({
    bookmarks: [...state.bookmarks, {
      ...data,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
  })),

  updateBookmark: (id, data) => set((state) => ({
    bookmarks: state.bookmarks.map(b =>
      b.id === id ? { ...b, ...data, updatedAt: Date.now() } : b
    ),
  })),

  deleteBookmark: (id) => set((state) => ({
    bookmarks: state.bookmarks.filter(b => b.id !== id),
  })),

  addFolder: (name, parentId) => set((state) => ({
    folders: [...state.folders, {
      id: uuidv4(),
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isExpanded: true,
    }],
  })),

  updateFolder: (id, data) => set((state) => ({
    folders: state.folders.map(f =>
      f.id === id ? { ...f, ...data, updatedAt: Date.now() } : f
    ),
  })),

  deleteFolder: (id) => set((state) => {
    const getFolderAndChildren = (folderId: string): string[] => {
      const children = state.folders.filter(f => f.parentId === folderId).map(f => f.id);
      return [folderId, ...children.flatMap(getFolderAndChildren)];
    };

    const idsToDelete = getFolderAndChildren(id);

    return {
      bookmarks: state.bookmarks.map(b =>
        b.folderId === id ? { ...b, folderId: undefined, updatedAt: Date.now() } : b
      ),
      folders: state.folders.filter(f => !idsToDelete.includes(f.id)),
    };
  }),
}));

// Usage with Zustand
export const BookmarkManagerWithStore: React.FC = () => {
  const {
    bookmarks,
    folders,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addFolder,
    updateFolder,
    deleteFolder,
  } = useBookmarkStore();

  return (
    <BookmarkManager
      bookmarks={bookmarks}
      folders={folders}
      onAddBookmark={addBookmark}
      onUpdateBookmark={updateBookmark}
      onDeleteBookmark={deleteBookmark}
      onAddFolder={addFolder}
      onUpdateFolder={updateFolder}
      onDeleteFolder={deleteFolder}
      onOpenUrl={(url) => console.log('Open:', url)}
    />
  );
};
*/
