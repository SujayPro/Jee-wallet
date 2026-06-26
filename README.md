# JEE Wallet

A secure, non-custodial browser extension wallet for the **JEE blockchain** — a zero-fee Layer-1 network.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-SujayPro%2FJee--Wallet--Chrome-181717?logo=github)](https://github.com/SujayPro/Jee-Wallet-Chrome)

**Repository:** [github.com/SujayPro/Jee-Wallet-Chrome](https://github.com/SujayPro/Jee-Wallet-Chrome)

---

## Features

- 🔐 **Non-custodial** — your private keys never leave your device
- 🔒 **AES-256-GCM encryption** — all sensitive data encrypted with a password-derived key
- 🌱 **HD Wallet support** — create wallets from a 12 or 24-word mnemonic seed phrase
- 🔑 **Legacy wallet import** — import existing accounts using a raw private key
- 🌐 **dApp connectivity** — connect to JEE-compatible dApps with explicit user approval
- ✍️ **Message signing** — sign arbitrary messages to prove wallet ownership
- ⏱️ **Auto-lock** — wallet locks automatically after a configurable idle timeout
- 📦 **Multiple accounts** — manage multiple wallets and accounts in one place
- 🖥️ **Side panel support** — accessible as a Chrome side panel while browsing

---

## Chain Info

| Property | Value |
|---|---|
| Chain ID | `JEE` |
| Bech32 prefix | `jee` |
| Native token | **JEE** |
| On-chain denom | `jeff` |
| Decimals | 6 |
| Explorer | [jeescan.org](https://jeescan.org) |
| Website | [jee.money](https://jee.money) |

---

## Project Structure

This is a monorepo managed with [Turborepo](https://turbo.build/repo).

```
apps/
  extension/        # Chrome extension entry points (background, content, content-bridge)
  extension-ui/     # React UI (popup + side panel)
  sdk-demo/         # Demo app for the SDK

packages/
  background/       # Background service worker logic
  constants/        # Shared constants
  content/          # Content script (dApp bridge)
  content-bridge/   # Injected MAIN-world script
  react-sdk/        # React hooks SDK for dApp developers
  sdk/              # Core SDK for dApp developers
  types/            # Shared TypeScript types
  ui/               # Shared UI components
  util/             # Cryptographic utilities
  util-browser/     # Browser-specific utilities (messaging, routing)
  wallet-utils/     # Wallet derivation and chain utilities
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your own JEE node endpoints:

```sh
cp apps/extension/.env.example apps/extension/.env
```

Then edit `apps/extension/.env`:

```
JEE_MAINNET_LCD=<your JEE LCD endpoint>
JEE_MAINNET_RPC=<your JEE RPC endpoint>
```

Create the UI env files:

`apps/extension-ui/.env.development.local`
```
REACT_APP_TOS_URL=https://jee.money/assets/tos.md
```

`apps/extension-ui/.env.production.local`
```
REACT_APP_TOS_URL=https://jee.money/assets/tos.md
```

### 3. Build everything

```sh
npm run bundle
```

This runs the full pipeline: build packages → build UI → bundle extension.

Or step by step:

```sh
npm run build        # Build all packages
npm run build-ui     # Build the React UI
```

Then bundle just the extension:

```sh
npm run bundle
```

### 4. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `apps/extension/dist` folder
5. After any rebuild, click the refresh icon on the extension card

---

## Development

Run all packages in watch mode:

```sh
npm run dev
```

Run tests:

```sh
npm run test
```

---

## SDK

If you are building a dApp and want to integrate with JEE Wallet, see the [`packages/sdk`](packages/sdk) and [`packages/react-sdk`](packages/react-sdk) packages.

---

## Security

All security-sensitive operations happen exclusively in the background service worker:

- Private keys and seed phrases are **never** passed through `window.postMessage`
- All sensitive session data is encrypted at rest in `chrome.storage.session`
- The wallet auto-locks after idle and clears all session keys on lock
- dApp connections require explicit user approval via a confirmation popup
- Only the extension's own UI can approve or revoke site connections

Found a vulnerability? Please report it privately to **hello@jee.money** before disclosing publicly.

---

## Privacy

JEE Wallet collects zero user data. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for the full policy.

---

## License

[Apache License 2.0](LICENSE)

JEE Wallet is open source. You may use, modify, and distribute it under the terms of the Apache 2.0 license.

This project is derived from [NodeWallet](https://github.com/decentralized-authority/nodewallet) (Decentralized Authority). See [NOTICE](NOTICE) for attribution.
