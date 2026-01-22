import React, { useState, useRef, useEffect } from 'react';
import { BookmarkFolder } from '../../../shared/types';

interface FolderTreeProps {
  folders: BookmarkFolder[];
  selectedFolderId?: string;
  onFolderSelect: (folderId?: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

interface FolderItemProps {
  folder: BookmarkFolder;
  level: number;
  isSelected: boolean;
  childFolders: BookmarkFolder[];
  onSelect: (folderId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateSubfolder: (parentId: string) => void;
}

/**
 * FolderItem Component
 * Renders a single folder with expand/collapse and actions
 */
const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  level,
  isSelected,
  childFolders,
  onSelect,
  onRename,
  onDelete,
  onToggleExpand,
  onCreateSubfolder,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasChildren = childFolders.length > 0;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveRename = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.id, editName.trim());
    } else {
      setEditName(folder.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditName(folder.name);
      setIsEditing(false);
    }
  };

  return (
    <div>
      <div
        className={`
          group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors
          ${isSelected ? 'bg-accent-aleo/20 text-accent-aleo' : 'hover:bg-bg-elevated text-text-primary'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Expand/collapse button */}
        <button
          onClick={() => onToggleExpand(folder.id)}
          className="p-0.5 hover:bg-bg-secondary rounded transition-colors flex-shrink-0"
          aria-label={folder.isExpanded ? 'Collapse folder' : 'Expand folder'}
          aria-expanded={folder.isExpanded}
        >
          {hasChildren ? (
            <svg
              className={`w-3 h-3 transition-transform ${folder.isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <div className="w-3 h-3" />
          )}
        </button>

        {/* Folder icon */}
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>

        {/* Folder name */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            className="flex-1 px-1 py-0.5 text-sm bg-bg-secondary border border-accent-aleo rounded focus:outline-none"
            aria-label="Folder name"
          />
        ) : (
          <span
            className="flex-1 text-sm truncate"
            onClick={() => onSelect(folder.id)}
          >
            {folder.name}
          </span>
        )}

        {/* Actions */}
        {showActions && !isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubfolder(folder.id);
              }}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
              aria-label="Create subfolder"
              title="Create subfolder"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 hover:bg-bg-secondary rounded transition-colors"
              aria-label="Rename folder"
              title="Rename folder"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete folder "${folder.name}"? All bookmarks in this folder will be moved to the root.`)) {
                  onDelete(folder.id);
                }
              }}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
              aria-label="Delete folder"
              title="Delete folder"
            >
              <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Child folders */}
      {folder.isExpanded && childFolders.map((childFolder) => (
        <FolderItem
          key={childFolder.id}
          folder={childFolder}
          level={level + 1}
          isSelected={isSelected}
          childFolders={[]}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onToggleExpand={onToggleExpand}
          onCreateSubfolder={onCreateSubfolder}
        />
      ))}
    </div>
  );
};

/**
 * FolderTree Component
 *
 * Displays folder navigation with:
 * - Tree structure with expand/collapse
 * - Create new folder button
 * - Rename/delete folder options
 * - Drag-drop bookmarks to folders (placeholder)
 *
 * @example
 * <FolderTree
 *   folders={folders}
 *   selectedFolderId={currentFolderId}
 *   onFolderSelect={(id) => setCurrentFolderId(id)}
 *   onCreateFolder={(name, parentId) => createFolder(name, parentId)}
 *   onRenameFolder={(id, name) => renameFolder(id, name)}
 *   onDeleteFolder={(id) => deleteFolder(id)}
 *   onToggleExpand={(id) => toggleFolderExpand(id)}
 * />
 */
export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleExpand,
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingParentId, setCreatingParentId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Build folder tree structure
  const getFolderTree = () => {
    const rootFolders = folders.filter(f => !f.parentId);
    const getChildren = (parentId: string) => folders.filter(f => f.parentId === parentId);

    return { rootFolders, getChildren };
  };

  const { rootFolders, getChildren } = getFolderTree();

  const handleCreateFolder = () => {
    setIsCreatingFolder(true);
    setCreatingParentId(undefined);
    setNewFolderName('New Folder');
  };

  const handleCreateSubfolder = (parentId: string) => {
    setIsCreatingFolder(true);
    setCreatingParentId(parentId);
    setNewFolderName('New Folder');
  };

  const handleSaveNewFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), creatingParentId);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
    setCreatingParentId(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveNewFolder();
    } else if (e.key === 'Escape') {
      setIsCreatingFolder(false);
      setNewFolderName('');
      setCreatingParentId(undefined);
    }
  };

  useEffect(() => {
    if (isCreatingFolder && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isCreatingFolder]);

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-bg-elevated">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-bg-elevated">
        <h2 className="text-sm font-semibold text-text-primary">Folders</h2>
        <button
          onClick={handleCreateFolder}
          className="p-1.5 rounded hover:bg-bg-elevated transition-colors"
          aria-label="Create new folder"
          title="Create new folder"
        >
          <svg className="w-4 h-4 text-accent-aleo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* All Bookmarks (root) */}
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5 mb-2 rounded cursor-pointer transition-colors
            ${!selectedFolderId ? 'bg-accent-aleo/20 text-accent-aleo' : 'hover:bg-bg-elevated text-text-primary'}
          `}
          onClick={() => onFolderSelect(undefined)}
          role="button"
          tabIndex={0}
          aria-label="All bookmarks"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onFolderSelect(undefined);
            }
          }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="flex-1 text-sm font-medium">All Bookmarks</span>
        </div>

        {/* New folder input */}
        {isCreatingFolder && !creatingParentId && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <div className="w-3 h-3" />
            <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={handleSaveNewFolder}
              onKeyDown={handleKeyDown}
              className="flex-1 px-1 py-0.5 text-sm bg-bg-secondary border border-accent-aleo rounded focus:outline-none"
              aria-label="New folder name"
            />
          </div>
        )}

        {/* Root folders */}
        {rootFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            level={0}
            isSelected={selectedFolderId === folder.id}
            childFolders={getChildren(folder.id)}
            onSelect={onFolderSelect}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
            onToggleExpand={onToggleExpand}
            onCreateSubfolder={handleCreateSubfolder}
          />
        ))}

        {/* Empty state */}
        {rootFolders.length === 0 && !isCreatingFolder && (
          <div className="text-center py-8">
            <svg className="w-8 h-8 mx-auto mb-2 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-xs text-text-muted">No folders yet</p>
            <p className="text-xs text-text-muted">Click + to create one</p>
          </div>
        )}
      </div>
    </div>
  );
};
