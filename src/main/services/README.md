# AleoBrowser Services

This directory contains the core services for AleoBrowser, providing blockchain integration, wallet management, encrypted storage, and privacy protection.

## Services Overview

### 1. Aleo Service (`aleo.service.ts`)

Handles all interactions with the Aleo blockchain network.

**Features:**
- Connection management to Aleo testnet
- Balance queries (public and private)
- Token transfers
- Program execution
- Record retrieval
- Transaction tracking

**API:**
```typescript
import { aleoService } from './services';

// Connect to network
await aleoService.connect();

// Get balance
const balance = await aleoService.getBalance('aleo1...');
// Returns: { public: number, private: number }

// Transfer tokens
const txId = await aleoService.transfer({
  privateKey: 'APrivateKey1...',
  to: 'aleo1...',
  amount: 10.5,
  fee: 0.01
});

// Execute program
const txId = await aleoService.executeProgram({
  programId: 'myprogram.aleo',
  functionName: 'myfunction',
  inputs: ['1u64', '2u64'],
  fee: 0.01,
  privateKey: 'APrivateKey1...'
});

// Get records
const records = await aleoService.getRecords('AViewKey1...', 'program.aleo');

// Validate address
aleoService.validateAddress('aleo1...'); // throws if invalid
```

**Note:** Currently uses mock implementation. Replace with `@demox-labs/aleo-sdk` when available.

---

### 2. Wallet Service (`wallet.service.ts`)

Manages wallet creation, import, storage, and operations.

**Features:**
- Wallet creation and import
- Encrypted wallet storage
- Password-protected unlock/lock
- Balance queries
- Token transfers
- Message signing
- Export functionality

**API:**
```typescript
import { walletService } from './services';

// Create new wallet
const wallet = await walletService.createWallet();
// Returns: { address, privateKey, viewKey }

// Save wallet with password
await walletService.saveWallet('mySecurePassword123');

// Import existing wallet
const wallet = await walletService.importWallet('APrivateKey1...');

// Unlock wallet
const wallet = await walletService.unlock('mySecurePassword123');

// Get wallet state
const state = walletService.getState();
// Returns: { isUnlocked, hasWallet, address? }

// Get balance
const balance = await walletService.getBalance();

// Send tokens
const txId = await walletService.send('aleo1...', 10.5, 0.01);

// Sign message
const signature = await walletService.signMessage('Hello Aleo!');

// Lock wallet
walletService.lock();

// Export keys (requires unlocked wallet)
const privateKey = walletService.exportPrivateKey();
const viewKey = walletService.exportViewKey();

// Delete wallet (use with caution)
await walletService.deleteWallet();
```

**Security Features:**
- AES-256-GCM encryption
- PBKDF2 key derivation (100,000 iterations)
- Password hashing for verification
- Secure memory wiping on lock
- Encrypted persistence with electron-store

---

### 3. Storage Service (`storage.service.ts`)

Provides encrypted storage for bookmarks and browsing history.

**Features:**
- Encrypted bookmark management
- Encrypted history tracking
- Search functionality
- Folder organization
- Aleo blockchain sync (placeholder)
- Import/export capabilities

**API:**
```typescript
import { storageService } from './services';

// Bookmarks
const bookmarks = await storageService.getAllBookmarks();

const bookmark = await storageService.addBookmark({
  title: 'Aleo Explorer',
  url: 'https://explorer.aleo.org',
  favicon: 'https://explorer.aleo.org/favicon.ico',
  tags: ['blockchain', 'explorer'],
  folder: 'Crypto'
});

await storageService.updateBookmark(bookmark.id, {
  title: 'Official Aleo Explorer'
});

await storageService.deleteBookmark(bookmark.id);

// Search bookmarks
const results = await storageService.searchBookmarks('aleo');

// Get bookmarks by folder
const cryptoBookmarks = await storageService.getBookmarksByFolder('Crypto');

// Get all folders
const folders = await storageService.getFolders();

// History
const history = await storageService.getHistory(50); // last 50 entries

await storageService.addHistoryEntry({
  url: 'https://aleo.org',
  title: 'Aleo - Zero Knowledge Privacy',
  favicon: 'https://aleo.org/favicon.ico'
});

await storageService.deleteHistoryEntry(entryId);
await storageService.clearHistory();

// Search history
const results = await storageService.searchHistory('aleo', 20);

// Sync to blockchain (placeholder)
const txId = await storageService.syncBookmarksToAleo();

// Import/Export
const data = await storageService.exportData();
// Returns: { bookmarks, history }

await storageService.importData({
  bookmarks: [...],
  history: [...]
});

// Clear cache (call when wallet locks)
storageService.clearCache();
```

**Encryption:**
- Uses wallet-derived encryption key when available
- Falls back to default key for non-sensitive data
- AES-256-GCM encryption for all stored data
- Automatic cache management

---

### 4. Privacy Service (`privacy.service.ts`)

Implements ad blocking, tracker blocking, and privacy protection.

**Features:**
- Tracker blocking
- Ad blocking
- Fingerprinting protection
- Custom blocklist/allowlist
- Privacy statistics
- Configurable protection levels

**API:**
```typescript
import { privacyService } from './services';

// Check if URL should be blocked
const result = privacyService.shouldBlock('https://google-analytics.com/...');
// Returns: { blocked: boolean, reason?: string }

// Get statistics
const stats = privacyService.getStats();
// Returns: {
//   trackersBlocked: number,
//   adsBlocked: number,
//   fingerprintingBlocked: number,
//   totalBlocked: number
// }

// Enable/disable protection
privacyService.setEnabled(true);
const enabled = privacyService.isEnabled();

// Get/update settings
const settings = privacyService.getSettings();
privacyService.updateSettings({
  blockAds: true,
  blockTrackers: true,
  blockFingerprinting: true,
  strictMode: false
});

// Protection levels
privacyService.setProtectionLevel('strict'); // 'off' | 'standard' | 'strict'
const level = privacyService.getProtectionLevel();

// Check specific protection
const trackerBlockingEnabled = privacyService.isProtectionEnabled('trackers');

// Custom blocklist/allowlist
privacyService.addToBlocklist('example.com');
privacyService.removeFromBlocklist('example.com');
privacyService.addToAllowlist('trusted-site.com');
privacyService.removeFromAllowlist('trusted-site.com');

const blocklist = privacyService.getBlocklist();
const allowlist = privacyService.getAllowlist();

// Import blocklist
privacyService.importBlocklist([
  'tracker.com',
  'ad-server.net',
  '# Comments are ignored'
]);

// Export blocklist
const domains = privacyService.exportBlocklist();

// Reset statistics
privacyService.resetStats();

// Get session summary
const summary = privacyService.getSessionSummary();
// Returns: { stats, settings, enabled }
```

**Built-in Protection:**
- Google Analytics, Tag Manager, DoubleClick
- Facebook, Twitter, LinkedIn trackers
- Common ad networks (Taboola, Outbrain, Criteo, etc.)
- Fingerprinting scripts
- Social media widgets
- Analytics platforms (Mixpanel, Amplitude, Hotjar, etc.)

---

## Type Definitions

All shared types are defined in `src/shared/types.ts`:

```typescript
export interface AleoWallet {
  address: string;
  privateKey: string;
  viewKey: string;
}

export interface AleoBalance {
  public: number;
  private: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  folder?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
  favicon?: string;
}

export interface PrivacyStats {
  trackersBlocked: number;
  adsBlocked: number;
  fingerprintingBlocked: number;
  totalBlocked: number;
}

export interface WalletState {
  isUnlocked: boolean;
  hasWallet: boolean;
  address?: string;
}
```

## Usage Example

```typescript
import {
  aleoService,
  walletService,
  storageService,
  privacyService
} from './services';

// Initialize browser session
async function initializeBrowser() {
  // Connect to Aleo network
  await aleoService.connect();

  // Check if user has wallet
  if (walletService.hasWallet()) {
    // Prompt for password
    const password = await promptPassword();
    await walletService.unlock(password);
  } else {
    // Show onboarding
    const wallet = await walletService.createWallet();
    const password = await promptNewPassword();
    await walletService.saveWallet(password);
  }

  // Load user data
  const bookmarks = await storageService.getAllBookmarks();
  const history = await storageService.getHistory(100);

  // Enable privacy protection
  privacyService.setEnabled(true);
  privacyService.setProtectionLevel('standard');
}

// Handle page navigation
async function onNavigate(url: string) {
  // Check privacy blocking
  const blockResult = privacyService.shouldBlock(url);
  if (blockResult.blocked) {
    console.log(`Blocked: ${blockResult.reason}`);
    return;
  }

  // Add to history
  await storageService.addHistoryEntry({
    url,
    title: document.title,
    favicon: getFavicon()
  });
}

// Handle wallet operation
async function sendTokens(to: string, amount: number) {
  if (!walletService.getState().isUnlocked) {
    throw new Error('Wallet is locked');
  }

  const balance = await walletService.getBalance();
  if (balance.public < amount) {
    throw new Error('Insufficient balance');
  }

  const txId = await walletService.send(to, amount);
  console.log(`Transaction sent: ${txId}`);
  return txId;
}
```

## Configuration

Services use `electron-store` for persistence with the following storage locations:

- **Wallet:** `~/.config/aleobrowser/wallet.json` (encrypted)
- **Storage:** `~/.config/aleobrowser/storage.json` (encrypted)
- **Privacy:** `~/.config/aleobrowser/privacy.json`

All services implement singleton pattern for global state management.

## Security Considerations

1. **Wallet Security:**
   - Private keys never leave the application
   - Encrypted at rest with AES-256-GCM
   - Memory is wiped on lock
   - Password-protected with strong hashing

2. **Storage Security:**
   - All user data encrypted
   - Uses wallet-derived keys when available
   - Supports blockchain backup (planned)

3. **Privacy Protection:**
   - No data collection
   - Local-only processing
   - Pattern-based blocking (no external lists)
   - User-controlled blocklists

## Future Enhancements

1. **Aleo SDK Integration:**
   - Replace mock implementations with real Aleo SDK
   - Support for ZK proofs
   - Private transactions
   - Program deployment

2. **Blockchain Sync:**
   - Store encrypted bookmarks on Aleo blockchain
   - Cross-device sync via blockchain
   - Decentralized storage

3. **Enhanced Privacy:**
   - Integration with filter lists (EasyList, etc.)
   - Content script injection blocking
   - Cookie management
   - WebRTC leak protection

4. **Multi-account Support:**
   - Multiple wallet profiles
   - Account switching
   - Separate storage per account

## Testing

```bash
# Build services
npm run build:main

# Run type checking
npx tsc --noEmit -p tsconfig.main.json

# Test in development
npm run dev
```

## License

MIT
