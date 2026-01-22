# AleoBrowser Zustand Stores

This directory contains all Zustand state management stores for the AleoBrowser application.

## Overview

All stores are built with:
- **Zustand** - Lightweight state management
- **TypeScript** - Full type safety
- **IPC Integration** - Seamless communication with Electron main process
- **Error Handling** - Comprehensive error states
- **Performance** - Optimized selectors and updates

## Stores

### 1. Tab Store (`tabStore.ts`)

Manages browser tab state and operations.

**State:**
```typescript
interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
}
```

**Usage:**
```tsx
import { useTabStore, useActiveTab } from './stores';

function TabBar() {
  const tabs = useTabStore(state => state.tabs);
  const addTab = useTabStore(state => state.addTab);
  const activeTab = useActiveTab();

  return (
    <div>
      {tabs.map(tab => (
        <TabButton key={tab.id} tab={tab} />
      ))}
      <button onClick={() => addTab()}>New Tab</button>
    </div>
  );
}
```

**Key Features:**
- Add/close/reorder tabs
- Track loading, navigation state
- Listen to IPC events for tab updates
- Automatic tab activation

---

### 2. Wallet Store (`walletStore.ts`)

Manages Aleo wallet state and blockchain operations.

**State:**
```typescript
interface WalletStore {
  address: string | null;
  balance: WalletBalance | null;
  isLocked: boolean;
  hasWallet: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Usage:**
```tsx
import { useWalletStore, useWalletConnected } from './stores';

function WalletButton() {
  const { address, balance, unlock } = useWalletStore();
  const isConnected = useWalletConnected();

  if (!isConnected) {
    return <button onClick={() => unlock('password')}>Unlock Wallet</button>;
  }

  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance?.public} ALEO</p>
    </div>
  );
}
```

**Key Features:**
- Create/import wallet
- Lock/unlock with password
- Send transactions
- Auto-refresh balance
- Secure key management

---

### 3. Bookmark Store (`bookmarkStore.ts`)

Manages browser bookmarks with Aleo blockchain sync.

**State:**
```typescript
interface BookmarkStore {
  bookmarks: Bookmark[];
  folders: string[];
  isLoading: boolean;
  lastSyncTime: number | null;
}
```

**Usage:**
```tsx
import { useBookmarkStore, useIsBookmarked } from './stores';

function BookmarkButton({ url, title }: { url: string; title: string }) {
  const addBookmark = useBookmarkStore(state => state.addBookmark);
  const isBookmarked = useIsBookmarked(url);

  const handleClick = () => {
    if (!isBookmarked) {
      addBookmark({
        url,
        title,
        folder: 'Bookmarks Bar'
      });
    }
  };

  return (
    <button onClick={handleClick}>
      {isBookmarked ? '★' : '☆'}
    </button>
  );
}
```

**Key Features:**
- Add/update/delete bookmarks
- Folder management
- Search bookmarks
- Sync to Aleo blockchain

---

### 4. Settings Store (`settingsStore.ts`)

Manages application settings with localStorage persistence.

**State:**
```typescript
interface SettingsStore extends Settings {
  searchEngine: SearchEngine;
  homepage: string;
  blockTrackers: boolean;
  blockAds: boolean;
  network: 'testnet' | 'mainnet';
  theme: 'light' | 'dark' | 'system';
}
```

**Usage:**
```tsx
import { useSettingsStore, useResolvedTheme } from './stores';

function SettingsPanel() {
  const settings = useSettingsStore();
  const theme = useResolvedTheme();

  return (
    <div className={theme === 'dark' ? 'dark-mode' : 'light-mode'}>
      <label>
        <input
          type="checkbox"
          checked={settings.blockTrackers}
          onChange={(e) => settings.updateSettings({
            blockTrackers: e.target.checked
          })}
        />
        Block Trackers
      </label>
    </div>
  );
}
```

**Key Features:**
- Persisted to localStorage
- Theme management (light/dark/system)
- Privacy settings
- Network selection (testnet/mainnet)
- Auto-lock configuration

---

### 5. History Store (`historyStore.ts`)

Manages browsing history.

**State:**
```typescript
interface HistoryStore {
  history: HistoryEntry[];
  isLoading: boolean;
}
```

**Usage:**
```tsx
import { useHistoryStore, useTopSites, groupHistoryByDate } from './stores';

function HistoryPanel() {
  const history = useHistoryStore(state => state.history);
  const topSites = useTopSites(5);
  const groups = groupHistoryByDate(history);

  return (
    <div>
      <h2>Most Visited</h2>
      {topSites.map(site => (
        <div key={site.id}>
          {site.title} - {site.visitCount} visits
        </div>
      ))}

      <h2>History</h2>
      {groups.map(group => (
        <div key={group.date}>
          <h3>{group.label}</h3>
          {group.entries.map(entry => (
            <div key={entry.id}>{entry.title}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

**Key Features:**
- Track visit count
- Search history
- Group by date
- Most visited sites
- Clear history

---

## IPC Client (`lib/ipc.ts`)

Type-safe wrapper around `window.electron` API.

**Features:**
- Error handling for all IPC calls
- TypeScript interfaces
- Consistent response format
- Logging and debugging support

**Usage:**
```typescript
import { ipc } from '../lib/ipc';

// Wallet operations
const result = await ipc.createWallet('password');
if (result.success) {
  console.log('Wallet created:', result.address);
}

// Bookmarks
const bookmarks = await ipc.getAllBookmarks();

// History
await ipc.addHistoryEntry({ url: 'https://example.com', title: 'Example' });
```

---

## Initialization

### Quick Start

Add to your `main.tsx` or `App.tsx`:

```tsx
import { useEffect } from 'react';
import { initializeStores, cleanupStores } from './stores';

function App() {
  useEffect(() => {
    // Initialize all stores on mount
    initializeStores();

    // Cleanup on unmount
    return () => {
      cleanupStores();
    };
  }, []);

  return <YourApp />;
}
```

### What `initializeStores()` does:

1. Loads settings from localStorage
2. Applies theme to document
3. Checks wallet status
4. Loads bookmarks and history
5. Sets up IPC event listeners
6. Starts auto-refresh for wallet balance

---

## Performance Best Practices

### 1. Use Selectors

✅ **Good:**
```tsx
const tabCount = useTabStore(state => state.tabs.length);
```

❌ **Bad:**
```tsx
const { tabs } = useTabStore();
const tabCount = tabs.length; // Re-renders when ANY tab changes
```

### 2. Use Custom Hooks

```tsx
// Use provided hooks
const activeTab = useActiveTab();
const isConnected = useWalletConnected();
const topSites = useTopSites(5);
```

### 3. Batch Updates

```tsx
// Update multiple fields at once
updateSettings({
  blockTrackers: true,
  blockAds: true,
  doNotTrack: true
});
```

### 4. Avoid Unnecessary Subscriptions

```tsx
// Only subscribe to what you need
const isLocked = useWalletStore(state => state.isLocked);

// Not this:
const wallet = useWalletStore(); // Subscribes to everything
```

---

## Error Handling

All stores include error states:

```tsx
function Component() {
  const { error, clearError } = useWalletStore();

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={clearError}>Dismiss</button>
      </div>
    );
  }

  return <div>...</div>;
}
```

---

## Development Tools

Stores are exposed to `window.__stores` in development mode:

```javascript
// In browser console:
window.__stores.getStates()      // Get all store states
window.__stores.reset()          // Reset all stores
window.__stores.tab.getState()   // Get tab store state
```

---

## Testing

### Unit Tests

```tsx
import { renderHook, act } from '@testing-library/react';
import { useTabStore } from './tabStore';

test('should add a tab', () => {
  const { result } = renderHook(() => useTabStore());

  act(() => {
    result.current.addTab('https://example.com');
  });

  expect(result.current.tabs.length).toBe(2); // Initial + new
});
```

### Integration Tests

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { initializeStores } from './stores';

beforeEach(() => {
  initializeStores();
});

test('should load bookmarks on init', async () => {
  render(<BookmarkList />);

  await waitFor(() => {
    expect(screen.getByText('My Bookmark')).toBeInTheDocument();
  });
});
```

---

## Migration Guide

### From useState to Zustand

**Before:**
```tsx
const [tabs, setTabs] = useState([]);

const addTab = (url) => {
  setTabs([...tabs, createTab(url)]);
};
```

**After:**
```tsx
const tabs = useTabStore(state => state.tabs);
const addTab = useTabStore(state => state.addTab);
```

### From Context to Zustand

**Before:**
```tsx
const WalletContext = createContext(null);

function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  return (
    <WalletContext.Provider value={{ wallet, setWallet }}>
      {children}
    </WalletContext.Provider>
  );
}
```

**After:**
```tsx
// Just import and use
import { useWalletStore } from './stores';

function Component() {
  const wallet = useWalletStore(state => state.address);
  return <div>{wallet}</div>;
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              React Components               │
│  (TabBar, Wallet, Bookmarks, Settings...)   │
└────────────┬────────────────────────────────┘
             │ useStore hooks
             ↓
┌─────────────────────────────────────────────┐
│           Zustand Stores Layer              │
│  ┌─────────┬──────────┬──────────┬────────┐ │
│  │   Tab   │  Wallet  │ Bookmark │Settings│ │
│  │  Store  │  Store   │  Store   │ Store  │ │
│  └────┬────┴────┬─────┴────┬─────┴───┬────┘ │
└───────│─────────│───────────│─────────│──────┘
        │         │           │         │
        ↓         ↓           ↓         ↓
┌─────────────────────────────────────────────┐
│              IPC Client Layer               │
│           (lib/ipc.ts wrapper)              │
└────────────┬────────────────────────────────┘
             │ IPC calls
             ↓
┌─────────────────────────────────────────────┐
│          Electron Main Process              │
│  (Wallet, Bookmarks, History, Browser...)   │
└─────────────────────────────────────────────┘
```

---

## File Structure

```
src/renderer/stores/
├── index.ts              # Central export & initialization
├── tabStore.ts           # Browser tabs
├── walletStore.ts        # Aleo wallet
├── bookmarkStore.ts      # Bookmarks
├── settingsStore.ts      # App settings
├── historyStore.ts       # Browser history
├── README.md             # This file
└── lib/
    └── ipc.ts           # IPC client wrapper
```

---

## Contributing

When adding a new store:

1. Create store file in `stores/` directory
2. Follow existing store patterns
3. Add TypeScript interfaces
4. Include error handling
5. Add custom hooks for common selectors
6. Export from `index.ts`
7. Add initialization function
8. Update this README

---

## Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Electron IPC](https://www.electronjs.org/docs/latest/api/ipc-renderer)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
