# AleoBrowser - Main Process

This directory contains the Electron main process code for AleoBrowser, a privacy-first browser powered by Aleo blockchain technology.

## Architecture

```
src/main/
├── index.ts          # Main entry point
├── window.ts         # Window and BrowserView management
├── ipc.ts           # IPC handlers for all communication
└── utils/
    └── crypto.ts    # AES-256-GCM encryption utilities
```

## Key Features

### 1. Security-First Design

- **Frameless Window**: Custom titlebar for better UI control
- **Context Isolation**: Strict process isolation between main and renderer
- **Sandboxing**: All web content runs in sandboxed processes
- **CSP Headers**: Content Security Policy enforcement
- **Certificate Validation**: Strict certificate checking in production

### 2. Wallet Management

The wallet system provides secure Aleo wallet functionality:

- **AES-256-GCM Encryption**: All private keys are encrypted at rest
- **PBKDF2 Key Derivation**: Password-based key derivation with 100,000 iterations
- **Auto-Lock**: Wallet automatically locks after 15 minutes of inactivity
- **Secure Memory**: Sensitive data cleared from memory after use

**Available IPC Handlers:**
- `wallet:create` - Create a new Aleo wallet
- `wallet:import` - Import existing wallet with private key
- `wallet:getAddress` - Get wallet address
- `wallet:getBalance` - Fetch wallet balance
- `wallet:send` - Send ALEO tokens
- `wallet:lock` - Lock the wallet manually
- `wallet:unlock` - Unlock wallet with password
- `wallet:isLocked` - Check wallet lock status

### 3. Bookmarks Management

Privacy-focused bookmark system with optional Aleo blockchain sync:

**Available IPC Handlers:**
- `bookmarks:getAll` - Retrieve all bookmarks
- `bookmarks:add` - Add new bookmark
- `bookmarks:update` - Update existing bookmark
- `bookmarks:delete` - Remove bookmark
- `bookmarks:syncToAleo` - Sync bookmarks to Aleo blockchain (WIP)

### 4. History Management

**Available IPC Handlers:**
- `history:getAll` - Get browsing history (max 1000 entries)
- `history:add` - Add history entry
- `history:clear` - Clear all history
- `history:delete` - Remove specific entry

### 5. Browser Controls

**Available IPC Handlers:**
- `browser:navigate` - Navigate to URL
- `browser:goBack` - Go back in history
- `browser:goForward` - Go forward in history
- `browser:reload` - Reload current page
- `browser:stop` - Stop page loading
- `browser:newTab` - Create new tab
- `browser:closeTab` - Close current tab

### 6. Window Controls

**Available IPC Handlers:**
- `window:minimize` - Minimize window
- `window:maximize` - Toggle maximize/restore
- `window:close` - Close window
- `window:isMaximized` - Check maximize state

## Data Storage

Uses `electron-store` for persistent storage:

```typescript
{
  wallet?: EncryptedWallet;      // Encrypted wallet data
  bookmarks: Bookmark[];         // User bookmarks
  history: HistoryEntry[];       // Browsing history
  settings: Record<string, any>; // App settings
}
```

## Security Features

### Encryption (crypto.ts)

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with SHA-256
- **Iterations**: 100,000
- **Salt Length**: 32 bytes
- **IV Length**: 16 bytes
- **Auth Tag**: 16 bytes

**Available Functions:**
```typescript
encrypt(plaintext: string, password: string): EncryptedData
decrypt(encryptedData: EncryptedData, password: string): string
hashPassword(password: string): string
verifyPasswordStrength(password: string): PasswordStrength
constantTimeCompare(a: string, b: string): boolean
secureWipe(buffer: Buffer): void
```

### Privacy Features

- **Ad Blocking**: Blocks common ad and tracker domains
- **Tracking Protection**: Prevents tracking scripts
- **Automatic Cache Clearing**: Clears cache on app quit
- **No Telemetry**: Zero tracking or analytics

## Keyboard Shortcuts

- `Ctrl/Cmd + T` - New tab
- `Ctrl/Cmd + W` - Close tab
- `Ctrl/Cmd + R` - Reload
- `Ctrl/Cmd + L` - Focus address bar
- `Ctrl/Cmd + D` - Bookmark page
- `Ctrl/Cmd + H` - Show history
- `Ctrl/Cmd + Shift + Delete` - Clear browsing data
- `F11` - Toggle fullscreen
- `F12` - Toggle DevTools

## Development

### Building

```bash
npm run build:main
```

This compiles TypeScript to JavaScript in `dist/main/`.

### Running

```bash
npm run dev
```

This starts the Vite dev server and Electron in development mode.

## Integration with Aleo SDK

Current implementation uses mock data for wallet operations. To integrate with the real Aleo network:

1. Install Aleo SDK:
```bash
npm install @aleohq/sdk
```

2. Update wallet functions in `ipc.ts`:
   - Replace `generateMockAddress()` with actual Aleo wallet generation
   - Implement real transaction broadcasting
   - Integrate with Aleo RPC endpoints

3. Example integration:
```typescript
import { Account } from '@aleohq/sdk';

// Create wallet
const account = new Account();
const walletData = {
  address: account.address().toString(),
  privateKey: account.privateKey().toString(),
  viewKey: account.viewKey().toString(),
  createdAt: Date.now()
};
```

## Production Considerations

1. **Certificate Pinning**: Add certificate pinning for Aleo network endpoints
2. **Rate Limiting**: Implement rate limiting for API calls
3. **Error Logging**: Add Sentry or similar for error tracking
4. **Auto-Updates**: Implement electron-updater
5. **Code Signing**: Sign the application for distribution
6. **Hardware Wallet**: Add Ledger/Trezor support

## File Descriptions

### index.ts
Main entry point that:
- Initializes the Electron app
- Sets up security configurations
- Creates the main window
- Registers all IPC handlers
- Manages app lifecycle

### window.ts
Window management module that:
- Creates and manages BrowserWindow
- Handles BrowserView for tab content
- Manages window state (minimize, maximize, close)
- Handles navigation events
- Formats URLs and search queries

### ipc.ts
IPC communication layer that:
- Defines all IPC handlers
- Manages wallet state in memory
- Handles encrypted storage operations
- Implements auto-lock functionality
- Provides bookmark and history management

### utils/crypto.ts
Cryptography utilities that:
- Provides AES-256-GCM encryption/decryption
- Implements secure key derivation
- Offers password strength validation
- Ensures constant-time comparison
- Provides secure memory wiping

## Type Safety

All types are defined in `/c/Users/prate/aleobrowser/src/shared/types.ts` and shared across:
- Main process
- Renderer process
- Preload script

This ensures type safety for IPC communication.

## Events

The main process emits events to the renderer:

- `tab:loading` - Page loading state changed
- `tab:navigated` - Navigation occurred
- `tab:title-updated` - Page title updated
- `tab:favicon-updated` - Favicon loaded
- `tab:error` - Navigation error
- `tab:new-window` - New window requested
- `window:maximized` - Window maximize state changed
- `window:focused` - Window focus state changed
- `permission:request` - Permission requested
- `shortcut:*` - Keyboard shortcut triggered

## License

This is part of AleoBrowser project.
