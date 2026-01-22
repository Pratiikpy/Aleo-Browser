# AleoBrowser

**The first privacy-by-default web browser powered by Aleo's zero-knowledge proofs.**

Your notes, bookmarks, and credentials — encrypted with AES-256 and verified on-chain using ZK proofs. No one can see your data. Not even us.

---

## Why This Exists

Every browser today stores your data on their servers. They can read it. They can sell it. They can lose it in a breach.

AleoBrowser is different:
- **Your data stays yours** — Encrypted with your wallet's private key
- **Blockchain-verified** — Every piece of data creates a ZK proof on Aleo
- **Mathematically private** — Zero-knowledge proofs guarantee privacy, not promises

---

## Features

### Private Notes
Create notes that are:
- Encrypted locally with **AES-256-GCM**
- Synced to Aleo blockchain with **zero-knowledge proofs**
- Only decryptable by you (using your wallet key)

```
Your Note → AES-256 Encrypt → ZK Proof → Aleo Blockchain
                ↑                    ↑
        Only you can decrypt    Verifiable without revealing content
```

### Private Bookmarks
Save bookmarks that:
- Stay hidden from tracking
- Sync privately to blockchain
- Prove existence without revealing URLs

### Integrated Aleo Wallet
Full Aleo wallet built-in:
- Send/receive ALEO tokens
- View public and private balances
- Transaction history with explorer links
- dApp transaction approval

### Privacy Shields
Block trackers, ads, and fingerprinting by default.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Desktop | Electron 28 |
| Blockchain | Aleo (Leo smart contracts) |
| Encryption | AES-256-GCM |
| SDK | @provablehq/sdk |

---

## Smart Contracts

Three Leo smart contracts on Aleo:

### `privacybrowser_notes_v1.aleo`
```leo
// Private record - only owner can see (ZK privacy)
record Note {
    owner: address,
    note_id: field,
    encrypted_title: field,
    encrypted_content: field,
    encrypted_tags: field,
    created_at: u64,
    updated_at: u64,
}

// ZK transitions
async transition add_note(...) -> (Note, Future)
transition delete_note(note: Note) -> Future
transition update_note(old_note: Note, ...) -> Note
transition transfer_note(note: Note, recipient: address) -> (Note, Future)
```

### `bookmark_v1.aleo`
Private bookmark storage with ZK verification.

### `privacybrowser_credentials_v1.aleo`
Encrypted credential management.

---

## Privacy Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AleoBrowser                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Notes     │  │  Bookmarks  │  │   Wallet    │     │
│  │  (Private)  │  │  (Private)  │  │   (Aleo)    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│                   ┌──────▼──────┐                       │
│                   │  AES-256    │                       │
│                   │  Encryption │                       │
│                   └──────┬──────┘                       │
│                          │                              │
└──────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Aleo     │
                    │  Blockchain │
                    │  (ZK Proofs)│
                    └─────────────┘
```

**Two layers of privacy:**
1. **AES-256-GCM encryption** — Data encrypted before leaving your device
2. **Zero-knowledge proofs** — Blockchain verifies without seeing content

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Install & Run
```bash
git clone https://github.com/user/aleobrowser.git
cd aleobrowser
npm install
npm run dev
```

### Build for Distribution
```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# Linux
npm run package:linux
```

---

## How It Works

### Creating a Private Note

1. **User writes note** in the browser
2. **AES-256-GCM encryption** with wallet private key
3. **Hash of ciphertext** sent to Aleo blockchain
4. **ZK proof generated** by Aleo network
5. **Transaction confirmed** — note verifiable on-chain

```typescript
// Real encryption code from src/main/ipc.ts
const encryptedTitleData = encrypt(note.title, walletPrivateKey);
const encryptedContentData = encrypt(note.content, walletPrivateKey);

// Submit to Aleo blockchain
const txHash = await aleoService.executeProgram({
  programId: 'privacybrowser_notes_v1.aleo',
  functionName: 'add_note',
  inputs: [noteIdField, encryptedTitleField, encryptedContentField, ...],
  fee: 0.1,
  privateKey: wallet.privateKey,
});
```

### Verify on Aleo Explorer

Every transaction is verifiable:
- **Program:** `privacybrowser_notes_v1.aleo`
- **Function:** `add_note`
- **ZK proof:** Included and verified
- **Content:** Hidden (only hashes visible)

---

## Project Structure

```
aleobrowser/
├── contracts/           # Leo smart contracts
│   ├── notes/          # Private notes contract
│   ├── bookmark/       # Private bookmarks contract
│   └── credentials/    # Private credentials contract
├── src/
│   ├── main/           # Electron main process
│   │   ├── services/   # Aleo, crypto, transaction services
│   │   ├── ipc.ts      # IPC handlers
│   │   └── window.ts   # Window management
│   ├── renderer/       # React frontend
│   │   ├── components/ # UI components
│   │   └── stores/     # Zustand state management
│   └── preload/        # Electron preload scripts
└── assets/             # Icons, images
```

---

## Security

| Feature | Implementation |
|---------|---------------|
| Wallet encryption | AES-256-GCM + PBKDF2 (100k iterations) |
| Note encryption | AES-256-GCM with wallet-derived key |
| Key storage | Encrypted locally, never transmitted |
| Transaction signing | Client-side with private key |
| Session | Auto-lock after inactivity |

**Your private key never leaves your device.**

---

## Why Aleo?

| Other Blockchains | Aleo |
|-------------------|------|
| All transactions public | Transactions private by default |
| Data visible forever | Data hidden with ZK proofs |
| Trust the developer | Trust the math |
| Privacy as feature | Privacy as foundation |

Aleo is the only Layer-1 blockchain with **programmable privacy by design**. Every transaction generates a zero-knowledge proof that verifies correctness without revealing data.

---

## Privacy Features

- Tracker blocking (EasyList + EasyPrivacy)
- Ad blocking
- Fingerprint protection
- WebRTC leak protection
- HTTPS enforcement
- Cookie management

---

## License

MIT
