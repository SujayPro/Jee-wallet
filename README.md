<div align="center">

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  HERO                                                              -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

<img src="apps/extension-ui/public/logo.svg" alt="JEE Wallet" width="88" height="88" />

# JEE Wallet

### Your keys. Your chain. Zero on-chain fees.

**The open-source, non-custodial browser wallet built natively for the [JEE blockchain](https://jee.money) — one install, every major browser.**

<br />

[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FSujayPro%2FJee-wallet%2Fmain%2Fapps%2Fextension%2Fmanifest.json&query=%24.version&label=version&color=00d4aa&style=for-the-badge)](https://github.com/SujayPro/Jee-wallet/releases)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=for-the-badge&logo=apache&logoColor=white)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)

<br />

[![Chrome](https://img.shields.io/badge/Chrome-✓-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)
[![Brave](https://img.shields.io/badge/Brave-✓-FB542B?style=flat-square&logo=brave&logoColor=white)](https://brave.com)
[![Edge](https://img.shields.io/badge/Edge-✓-0078D7?style=flat-square&logo=microsoftedge&logoColor=white)](https://www.microsoft.com/edge)
[![Firefox](https://img.shields.io/badge/Firefox_128+-✓-FF7139?style=flat-square&logo=firefox&logoColor=white)](https://www.mozilla.org/firefox/)

<br />

[**🌐 Website**](https://jee.money) · [**🔍 Explorer**](https://jeescan.org) · [**📦 Releases**](https://github.com/SujayPro/Jee-wallet/releases) · [**🐛 Issues**](https://github.com/SujayPro/Jee-wallet/issues) · [**🔐 Security**](mailto:hello@jee.money)

<br />

```
      ██╗███████╗███████╗     ██╗    ██╗ █████╗ ██╗     ██╗     ███████╗████████╗
      ██║██╔════╝██╔════╝     ██║    ██║██╔══██╗██║     ██║     ██╔════╝╚══██╔══╝
      ██║█████╗  █████╗       ██║ █╗ ██║███████║██║     ██║     █████╗     ██║
██   ██║██╔══╝  ██╔══╝       ██║███╗██║██╔══██║██║     ██║     ██╔══╝     ██║
╚█████╔╝███████╗███████╗     ╚███╔███╔╝██║  ██║███████╗███████╗███████╗   ██║
 ╚════╝ ╚══════╝╚══════╝      ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝
```

<br />

| | |
|:---:|:---|
| 🔥 | **Zero-fee L1** — send JEE without gas headaches |
| 🔐 | **Non-custodial** — keys never leave your device |
| 🌍 | **Cross-browser** — Chrome · Brave · Edge · Firefox |
| 🧩 | **dApp native** — connect, sign, send from any JEE site |
| 📦 | **One build** — `npm run bundle` → load everywhere |

<br />

</div>

<br />

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [Supported Browsers](#-supported-browsers)
- [Chain Info](#%EF%B8%8F-chain-info)
- [How It Works](#-how-it-works)
- [Build from Source](#-build-from-source)
- [Install the Extension](#-install-the-extension)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [SDK for dApp Developers](#-sdk-for-dapp-developers)
- [Security Model](#-security-model)
- [FAQ](#-faq)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

---

## 🌟 Overview

**JEE Wallet** is a production-grade browser extension wallet for the **JEE** zero-fee Layer-1 network. It ships as a single cross-browser build — no separate Chrome vs Firefox forks.

Built for real users and real dApps:

- Create HD wallets from a **12 / 24-word seed**
- Import **legacy private keys**
- Manage **multiple accounts** across wallets
- **Connect** to JEE dApps with explicit approval
- **Sign messages** and **send transactions** from a clean React UI
- **Auto-lock** after idle — session keys wiped on lock

> **Privacy first:** JEE Wallet collects **zero** telemetry. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## 📸 Screenshots

Screenshots and a product demo will be added in a future release. For now, see [Releases](https://github.com/SujayPro/Jee-wallet/releases) to download and try the latest build.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🔐 Wallet & Keys
- Non-custodial — **you** hold the keys
- **AES-256-GCM** encryption at rest
- Password-derived key (Argon2 + PBKDF2)
- HD wallet (BIP39 mnemonic)
- Legacy single-key import
- Multi-wallet · multi-account

</td>
<td width="50%" valign="top">

### 🌐 Web3 & UX
- JEE dApp connectivity
- Per-origin connect / disconnect
- Message signing
- Transaction send & stake flows
- Configurable auto-lock timer
- Popup (all browsers) + Firefox sidebar

</td>
</tr>
</table>

<details>
<summary><b>🔍 Full feature list</b></summary>

| | Feature | Details |
|:---:|:---|:---|
| 🔐 | Non-custodial | Private keys never leave your device |
| 🔒 | AES-256-GCM | Sensitive data encrypted with password-derived keys |
| 🌱 | HD Wallets | 12 or 24-word BIP39 mnemonics |
| 🔑 | Legacy import | Raw private key support |
| 🌐 | dApp bridge | Isolated + MAIN-world content scripts |
| ✍️ | Sign messages | Off-chain ownership proofs |
| 💸 | Send & stake | Full transaction flows with confirmation |
| ⏱️ | Auto-lock | Idle timeout → keys cleared from session |
| 📦 | Multi-account | Unlimited wallets & accounts locally |
| 🦊 | Cross-browser | Single manifest, single build |

</details>

---

## 🌍 Supported Browsers

| Browser | Min version | Toolbar | Side panel | Load method |
|:---|:---:|:---|:---|:---|
| **Google Chrome** | 114+ | Popup | — | Load unpacked → `dist/` |
| **Brave** | Latest | Popup | — | Load unpacked → `dist/` |
| **Microsoft Edge** | Latest | Popup | — | Load unpacked → `dist/` |
| **Mozilla Firefox** | **128+** | Popup | Sidebar | Temporary add-on → `dist/manifest.json` |

> **One command builds for all:** `npm run bundle` → output in `apps/extension/dist`

---

## ⛓️ Chain Info

<div align="center">

| Property | Value |
|:---|:---|
| **Network** | JEE Mainnet |
| **Chain ID** | `JEE` |
| **Bech32 prefix** | `jee` |
| **Native token** | **JEE** |
| **On-chain denom** | `jeff` |
| **Decimals** | `6` |
| **Tx fees** | **Zero** |
| **Block explorer** | [jeescan.org](https://jeescan.org) |
| **Official site** | [jee.money](https://jee.money) |

</div>

---

## ⚙️ How It Works

### Architecture

```mermaid
flowchart LR
    subgraph EXT["🧩 Extension"]
        UI["Popup / Sidebar<br/><i>React UI</i>"]
        BG["Background<br/><i>Crypto + RPC</i>"]
        CS["Content Script<br/><i>Isolated</i>"]
        BR["Bridge<br/><i>MAIN world</i>"]
    end

    subgraph WEB["🌍 Website"]
        DAPP["JEE dApp"]
    end

    subgraph CHAIN["⛓️ JEE Network"]
        RPC["RPC / LCD"]
    end

    DAPP <-->|window.postMessage| BR
    BR <-->|postMessage| CS
    CS <-->|Messager| BG
    UI <-->|Messager| BG
    BG <-->|HTTPS| RPC

    style UI fill:#0f172a,stroke:#00d4aa,color:#e2e8f0
    style BG fill:#0f172a,stroke:#00d4aa,color:#e2e8f0
    style CHAIN fill:#1e1b4b,stroke:#818cf8,color:#e2e8f0
```

### dApp request flow

```mermaid
sequenceDiagram
    participant D as dApp (web page)
    participant B as Content Bridge
    participant C as Content Script
    participant K as Background
    participant U as Wallet UI

    D->>B: pocket-network request
    B->>C: postMessage (same origin)
    C->>K: Messager API
    K->>U: Open approval popup
    U->>K: User confirms
    K->>C: Signed result / txid
    C->>B: Response
    B->>D: postMessage response
```

### Security boundaries

```mermaid
flowchart TB
    subgraph TRUSTED["✅ Trusted — Extension only"]
        BG2["Background script"]
        UI2["Extension pages"]
    end

    subgraph UNTRUSTED["⚠️ Untrusted — Web pages"]
        PAGE["Any website / dApp"]
    end

    PAGE -->|"postMessage only"| BR2["Bridge"]
    BR2 --> CS2["Content script"] --> BG2
    UI2 --> BG2

    style TRUSTED fill:#052e16,stroke:#22c55e,color:#ecfdf5
    style UNTRUSTED fill:#450a0a,stroke:#ef4444,color:#fef2f2
```

---

## 🚀 Build from Source

### Prerequisites

| Requirement | Version |
|:---|:---|
| **Node.js** | `24.18.0` LTS ([nvm](https://github.com/nvm-sh/nvm) recommended) |
| **npm** | `11.x` or higher |
| **OS** | Linux, macOS, or Windows (WSL recommended) |

```sh
nvm install 24.18.0
nvm use
```

### Build steps

```sh
git clone https://github.com/SujayPro/Jee-wallet.git
cd Jee-wallet
npm ci
cp apps/extension/.env.example apps/extension/.env
npm run bundle
```

### Output

| Artifact | Path | Purpose |
|:---|:---|:---|
| Unpacked extension | `apps/extension/dist/` | Load unpacked in Chrome, Brave, Edge, or Firefox |
| Store package | `apps/extension/dist.zip` | Firefox Add-ons (AMO) upload |

The bundle script produces a standard ZIP archive with `manifest.json` at the archive root. Background scripts are split into webpack chunks (`bg-vendors-*.js`, `background.js`) to stay under AMO's 5 MB per-file limit. No remote code is loaded at runtime.

For Mozilla AMO automated builds, use:

```sh
npm run build-for-amo
```

---

## 🧩 Install the Extension

### Chrome · Brave · Edge

```
chrome://extensions  →  Developer mode ON  →  Load unpacked  →  select dist/
```

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`)
2. Toggle **Developer mode** (top right)
3. **Load unpacked** → pick `apps/extension/dist`
4. Pin **JEE WALLET** to your toolbar
5. After rebuilds → hit **Refresh** on the extension card

### Firefox

```
about:debugging  →  Load Temporary Add-on  →  dist/manifest.json
```

1. Build the extension (`npm run bundle`) or download a [release](https://github.com/SujayPro/Jee-wallet/releases)
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on…**
4. Select **`apps/extension/dist/manifest.json`**

> Temporary add-ons are cleared when Firefox restarts. Re-load from the same path after restart.

| ⚠️ Issue | Solution |
|:---|:---|
| White blank popup | Load **`extension/dist/`**, not `extension/` |
| Invalid zip on AMO | Use **`dist.zip`** from `npm run bundle` — do not zip manually |
| dApp won't connect (Firefox) | Requires **Firefox 128+** |

**Firefox sidebar:** `View → Sidebar → JEE WALLET`

<details>
<summary><b>Firefox Add-ons (AMO) — developer notes</b></summary>

After `npm run build-for-amo`, upload **`apps/extension/dist.zip`** to the [Firefox Developer Hub](https://addons.mozilla.org/developers/).

| Item | Value |
|:---|:---|
| Upload file | `apps/extension/dist.zip` |
| Source code | This repository + build command above |
| Privacy policy | [PRIVACY_POLICY.md](PRIVACY_POLICY.md) |
| Data collection | None (`data_collection_permissions.required: ["none"]` in manifest) |

Do not manually zip the `dist/` folder — the bundle script creates the correct archive structure.

</details>

---

## 🛠 Tech Stack

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux-764ABC?style=flat-square&logo=redux&logoColor=white)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=flat-square&logo=webpack&logoColor=black)
![Sass](https://img.shields.io/badge/Sass-CC6699?style=flat-square&logo=sass&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)
![WebExtensions](https://img.shields.io/badge/WebExtensions-MV3-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white)

</div>

| Layer | Tech |
|:---|:---|
| UI | React 18, Redux Toolkit, React Router, Bootstrap 5, Sass |
| Extension | Manifest V3, cross-browser `ext` API shim |
| Crypto | AES-256-GCM, Argon2, BIP39 HD derivation |
| Build | Turborepo, webpack 5, Create React App (extension-ui) |
| Chain | JEE RPC / LCD, Cosmos-style addressing |

---

## 📁 Project Structure

```
Jee-wallet/
├── apps/
│   ├── extension/          # MV3 entry — background, content, bridge
│   ├── extension-ui/       # React popup & sidebar UI
│   └── sdk-demo/           # SDK playground
├── packages/
│   ├── background/         # Wallet logic, RPC, encryption
│   ├── content/            # dApp message relay (isolated world)
│   ├── content-bridge/     # Page-context injector (MAIN world)
│   ├── sdk/                # Core dApp SDK
│   ├── react-sdk/          # React hooks for dApps
│   ├── wallet-utils/       # Key derivation & chain utils
│   ├── util-browser/       # Cross-browser messaging & routes
│   └── …                   # types, constants, ui, util
└── apps/extension/dist/    # 👈 Load this in your browser
```

---

## 💻 Development

```sh
npm run dev          # Watch all packages
npm run build        # Build packages
npm run build-ui     # Build React UI only
npm run bundle       # Full extension build + dist.zip
npm run build-for-amo # Same as bundle — AMO-compatible output
npm run test         # Run test suite
npm run format       # Prettier format
```

<details>
<summary><b>🧪 Run specific tests</b></summary>

```sh
npm run test:wallet-utils
npm run test:background
npm run test:util
```

</details>

---

## 🔌 SDK for dApp Developers

Integrate JEE Wallet into your dApp:

| Package | Use case |
|:---|:---|
| [`packages/sdk`](packages/sdk) | Vanilla JS / any framework |
| [`packages/react-sdk`](packages/react-sdk) | React hooks (`useJeeWallet`, etc.) |
| [`apps/sdk-demo`](apps/sdk-demo) | Live integration example |

```sh
cd apps/sdk-demo && npm start   # Demo at localhost:3000
```

---

## 🔒 Security Model

> All sensitive operations execute **only** in the background script.  
> The UI and content scripts never touch raw private keys.

| Rule | Implementation |
|:---|:---|
| Keys stay local | Never sent over `postMessage` or network |
| Encrypted at rest | AES-256-GCM + password-derived keys |
| Session isolation | Auto-lock wipes in-memory secrets |
| dApp permissions | Explicit per-origin user approval |
| Connect / disconnect | Only extension UI can authorize origins |
| Message validation | UUID replay protection on dApp bridge |

**Responsible disclosure:** [hello@jee.money](mailto:hello@jee.money) — please report privately before public disclosure.

---

## ❓ FAQ

<details>
<summary><b>Is JEE Wallet custodial?</b></summary>

No. Your seed phrase and private keys are generated and stored **only on your device**, encrypted with your password. We never see them.

</details>

<details>
<summary><b>Which browsers are supported?</b></summary>

Chrome 114+, Brave, Edge, and Firefox 128+. One `npm run bundle` produces a build for all of them.

</details>

<details>
<summary><b>Why is my Firefox popup white/blank?</b></summary>

You loaded the wrong folder. Select **`apps/extension/dist/manifest.json`**, not the parent `extension/` directory.

</details>

<details>
<summary><b>Does it work with MetaMask?</b></summary>

JEE Wallet is purpose-built for the **JEE chain** via the Pocket Network provider bridge — not EVM / MetaMask.

</details>

<details>
<summary><b>Where are my keys stored?</b></summary>

Encrypted in extension local storage. Session keys (unlocked state) live in extension session storage and are cleared on lock.

</details>

---

## 🗺 Roadmap

- [x] Cross-browser support (Chrome, Brave, Edge, Firefox)
- [x] HD & legacy wallet import
- [x] dApp connect / sign / send
- [x] Firefox sidebar panel
- [x] AMO-ready build pipeline (`dist.zip`, manifest compliance)
- [ ] Chrome Web Store listing
- [ ] Firefox Add-ons (AMO) public listing approved
- [ ] Hardware wallet support
- [ ] Mobile companion app
- [ ] Multi-language UI

---

## 🤝 Contributing

Contributions welcome! To get started:

1. **Fork** the repo
2. **Create** a feature branch (`git checkout -b feature/amazing-thing`)
3. **Commit** your changes (`git commit -m 'Add amazing thing'`)
4. **Push** to the branch (`git push origin feature/amazing-thing`)
5. **Open** a Pull Request

Please keep PRs focused and run `npm run test` before submitting.

---

## 👤 Author

<div align="center">

**SujayPro**

Built by [SujayPro](https://github.com/SujayPro) · [Sujay@jee.money](mailto:Sujay@jee.money)

[![GitHub](https://img.shields.io/badge/GitHub-SujayPro-181717?style=flat-square&logo=github)](https://github.com/SujayPro)
[![Email](https://img.shields.io/badge/Email-Sujay%40jee.money-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:Sujay@jee.money)
[![Website](https://img.shields.io/badge/Website-jee.money-00d4aa?style=flat-square)](https://jee.money)

</div>

---

## 📄 License

[Apache License 2.0](LICENSE)

JEE Wallet is open source — use, modify, and distribute under Apache 2.0 terms.

---

<div align="center">

<br />

**If JEE Wallet helps you — star the repo. It helps others find it.**

<br />

[![Star on GitHub](https://img.shields.io/github/stars/SujayPro/Jee-wallet?style=social)](https://github.com/SujayPro/Jee-wallet/stargazers)

<br />

<sub>Built for JEE · Built for the open web · Zero fees on-chain</sub>

<br /><br />

</div>
