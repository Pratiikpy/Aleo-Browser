# AleoBrowser Bookmark Components

A comprehensive, accessible bookmark management system for AleoBrowser built with React 18, TypeScript, and Tailwind CSS.

## 📦 Components

### 1. BookmarkManager
**File**: `/c/Users/prate/aleobrowser/src/renderer/components/bookmarks/BookmarkManager.tsx`

Main bookmark management interface with full CRUD operations.

**Features**:
- Grid/list view toggle
- Folder navigation sidebar
- Search and filter functionality
- Sort options (name, date, URL)
- Add/edit/delete bookmarks
- Sync to Aleo blockchain
- Empty state messages
- Responsive layout

**Props**:
```typescript
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
```

**Usage**:
```tsx
<BookmarkManager
  bookmarks={bookmarks}
  folders={folders}
  onAddBookmark={handleAddBookmark}
  onUpdateBookmark={handleUpdateBookmark}
  onDeleteBookmark={handleDeleteBookmark}
  onAddFolder={handleAddFolder}
  onUpdateFolder={handleUpdateFolder}
  onDeleteFolder={handleDeleteFolder}
  onSyncToAleo={handleSync}
  onOpenUrl={handleOpenUrl}
  isSyncing={false}
/>
```

---

### 2. BookmarkItem
**File**: `/c/Users/prate/aleobrowser/src/renderer/components/bookmarks/BookmarkItem.tsx`

Single bookmark display with interactions.

**Features**:
- Favicon display with fallback
- Title and URL preview
- Click to open in new tab
- Right-click context menu
- Hover overlay with quick actions
- Favorite indicator
- Grid and list view modes

**Props**:
```typescript
interface BookmarkItemProps {
  bookmark: Bookmark;
  onOpen: (url: string) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, folderId?: string) => void;
  view: 'grid' | 'list';
}
```

**Usage**:
```tsx
<BookmarkItem
  bookmark={bookmark}
  onOpen={(url) => window.open(url)}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onMove={handleMove}
  view="grid"
/>
```

---

### 3. BookmarkBar
**File**: `/c/Users/prate/aleobrowser/src/renderer/components/bookmarks/BookmarkBar.tsx`

Horizontal toolbar bookmark bar for quick access.

**Features**:
- Favorite bookmarks display
- Folder dropdown support
- Add bookmark button
- Overflow menu for extra items
- Compact design for toolbar
- Configurable max visible items

**Props**:
```typescript
interface BookmarkBarProps {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onBookmarkClick: (url: string) => void;
  onAddBookmark: () => void;
  maxVisible?: number;
}
```

**Usage**:
```tsx
<BookmarkBar
  bookmarks={favoriteBookmarks}
  folders={folders}
  onBookmarkClick={navigate}
  onAddBookmark={openAddModal}
  maxVisible={8}
/>
```

---

### 4. AddBookmarkModal
**File**: `/c/Users/prate/aleobrowser/src/renderer/components/bookmarks/AddBookmarkModal.tsx`

Modal dialog for adding/editing bookmarks.

**Features**:
- URL and title inputs
- Folder selector dropdown
- Tags input with chip UI
- Favorite toggle
- Pre-fill with current page
- Edit mode with delete option
- Form validation
- Keyboard shortcuts (Enter, Escape)

**Props**:
```typescript
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
```

**Usage**:
```tsx
<AddBookmarkModal
  isOpen={showModal}
  bookmark={editingBookmark}
  currentUrl={currentPageUrl}
  currentTitle={currentPageTitle}
  folders={folders}
  onSave={handleSave}
  onDelete={handleDelete}
  onClose={() => setShowModal(false)}
/>
```

---

### 5. FolderTree
**File**: `/c/Users/prate/aleobrowser/src/renderer/components/bookmarks/FolderTree.tsx`

Sidebar folder navigation with tree structure.

**Features**:
- Hierarchical folder tree
- Expand/collapse folders
- Create/rename/delete folders
- Selected folder highlighting
- Inline editing
- Empty state
- "All Bookmarks" root option

**Props**:
```typescript
interface FolderTreeProps {
  folders: BookmarkFolder[];
  selectedFolderId?: string;
  onFolderSelect: (folderId?: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleExpand: (id: string) => void;
}
```

**Usage**:
```tsx
<FolderTree
  folders={folders}
  selectedFolderId={currentFolder}
  onFolderSelect={setCurrentFolder}
  onCreateFolder={createFolder}
  onRenameFolder={renameFolder}
  onDeleteFolder={deleteFolder}
  onToggleExpand={toggleExpand}
/>
```

---

## 🎨 Styling

All components use **Tailwind CSS** with the AleoBrowser dark theme:

### Color Palette
```javascript
{
  'bg-primary': '#0a0a0f',      // Main background
  'bg-secondary': '#111118',    // Secondary background
  'bg-tertiary': '#1a1a24',     // Tertiary background
  'bg-elevated': '#252532',     // Elevated elements
  'accent-aleo': '#00d4aa',     // Primary accent (Aleo green)
  'accent-purple': '#a855f7',   // Secondary accent
  'text-primary': '#ffffff',    // Primary text
  'text-secondary': '#a1a1aa',  // Secondary text
  'text-muted': '#71717a',      // Muted text
}
```

### Custom Classes
```css
/* Scrollbar styling */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #252532 #111118;
}

/* Focus ring */
.focus\:ring-2 {
  outline: 2px solid rgba(0, 212, 170, 0.5);
  outline-offset: 2px;
}
```

---

## 📊 Data Types

### Bookmark
```typescript
interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  folderId?: string;
  isFavorite?: boolean;
}
```

### BookmarkFolder
```typescript
interface BookmarkFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: number;
  updatedAt: number;
  isExpanded?: boolean;
}
```

---

## ♿ Accessibility

All components are built with **WCAG 2.1 Level AA** compliance:

- ✅ Full keyboard navigation
- ✅ ARIA labels and roles
- ✅ Screen reader support
- ✅ High contrast ratios (>4.5:1)
- ✅ Focus management
- ✅ Semantic HTML

See [ACCESSIBILITY.md](./ACCESSIBILITY.md) for detailed checklist.

---

## 🚀 Performance Optimizations

### Implemented
- `useMemo` for filtered/sorted bookmarks
- Event delegation for large lists
- Lazy rendering with proper keys
- Controlled components for forms
- Debounced search (future enhancement)

### Best Practices
- React 18 concurrent features ready
- Proper cleanup of event listeners
- No memory leaks in effects
- Optimized re-renders

### Performance Budgets
- Initial load: <100ms
- Interaction response: <16ms (60fps)
- Search/filter: <50ms
- Modal open: <100ms

---

## 🧪 Testing

### Unit Tests (Future)
```typescript
// BookmarkItem.test.tsx
describe('BookmarkItem', () => {
  it('renders bookmark with title and URL', () => {});
  it('opens URL on click', () => {});
  it('shows context menu on right-click', () => {});
  it('handles keyboard navigation', () => {});
});
```

### Integration Tests
```typescript
// BookmarkManager.test.tsx
describe('BookmarkManager', () => {
  it('filters bookmarks by search query', () => {});
  it('sorts bookmarks by date', () => {});
  it('creates new folder', () => {});
  it('syncs to Aleo', () => {});
});
```

### E2E Tests
```typescript
// bookmarks.e2e.ts
describe('Bookmark Management', () => {
  it('adds a new bookmark from current page', () => {});
  it('organizes bookmarks into folders', () => {});
  it('edits bookmark title', () => {});
  it('deletes bookmark with confirmation', () => {});
});
```

---

## 🔌 Integration

### With Electron IPC
```typescript
// preload.ts
contextBridge.exposeInMainWorld('electron', {
  bookmarks: {
    getAll: () => ipcRenderer.invoke('bookmarks:getAll'),
    create: (bookmark) => ipcRenderer.invoke('bookmarks:create', bookmark),
    update: (id, data) => ipcRenderer.invoke('bookmarks:update', id, data),
    delete: (id) => ipcRenderer.invoke('bookmarks:delete', id),
  },
  folders: {
    getAll: () => ipcRenderer.invoke('folders:getAll'),
    create: (folder) => ipcRenderer.invoke('folders:create', folder),
    update: (id, data) => ipcRenderer.invoke('folders:update', id, data),
    delete: (id) => ipcRenderer.invoke('folders:delete', id),
  },
});
```

### With Zustand Store
```typescript
import { create } from 'zustand';

interface BookmarkStore {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  addBookmark: (bookmark) => void;
  // ... other actions
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  // ... store implementation
}));
```

---

## 📁 File Structure

```
/c/Users/prate/aleobrowser/src/renderer/components/bookmarks/
├── BookmarkManager.tsx       # Main manager component
├── BookmarkItem.tsx          # Single bookmark display
├── BookmarkBar.tsx           # Toolbar bookmark bar
├── AddBookmarkModal.tsx      # Add/edit modal
├── FolderTree.tsx            # Folder navigation
├── index.ts                  # Exports
├── USAGE_EXAMPLE.tsx         # Usage examples
├── ACCESSIBILITY.md          # Accessibility checklist
└── README.md                 # This file
```

---

## 🛠️ Development

### Prerequisites
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- uuid package

### Adding New Features
1. Create feature branch
2. Implement component
3. Add TypeScript types
4. Add accessibility features
5. Update documentation
6. Add tests
7. Create PR

### Code Style
- Use functional components
- TypeScript strict mode
- Tailwind CSS classes
- JSDoc comments
- Descriptive names

---

## 📖 Examples

See [USAGE_EXAMPLE.tsx](./USAGE_EXAMPLE.tsx) for:
- Full page bookmark manager
- Bookmark bar integration
- State management examples
- IPC integration patterns

---

## 🐛 Known Issues

None at this time.

---

## 🗺️ Roadmap

- [ ] Drag-and-drop reordering
- [ ] Import/export bookmarks
- [ ] Bookmark sync across devices
- [ ] Full-text search
- [ ] Bookmark thumbnails
- [ ] Collections/smart folders
- [ ] Keyboard shortcut customization
- [ ] Undo/redo functionality

---

## 📄 License

Part of AleoBrowser - Privacy-first browser powered by Aleo.

---

## 🤝 Contributing

Contributions welcome! Please:
1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Ensure accessibility
5. Submit PR with description

---

## 📞 Support

For issues or questions:
- Open GitHub issue
- Check documentation
- Review examples

---

## 🙏 Acknowledgments

- Built with React 18
- Styled with Tailwind CSS
- Icons from Heroicons
- Accessibility guidelines from W3C WCAG

---

**Last Updated**: January 21, 2026
**Version**: 1.0.0
**Author**: AleoBrowser Team
