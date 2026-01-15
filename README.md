# Personal Hub - Secure Life Organization

A **private, local-first desktop application** for organizing your entire life. Track your documents, finances, career history, contacts, medical records, photos, and passwords - all encrypted and stored securely on your own device.

**Built with [Tauri](https://tauri.app/)** - A secure, native desktop application using Rust + React.

**Original Design:** [Figma](https://www.figma.com/design/oJamv4hjwZZinA3sDmV05W/Personal-Document-Management-Website)

---

## 🔒 Security First

- **AES-256-GCM Encryption** for all sensitive data
- **Master Password Protection** with PBKDF2 key derivation (10,000 iterations)
- **Filesystem Storage** - Data stored in `~/Documents/PersonalHub/` (not browser)
- **No Cloud Storage** - everything stays on your device
- **No Telemetry** - completely private
- **Native Desktop App** - Built with Tauri (Rust + React) for security and performance
- **Open Source** - Inspect the code yourself

---

## ✨ Features

### 📋 Documents Manager
Organize certificates, education records, and health documents (metadata tracking).

### 💰 Finance Manager
Track savings accounts, pensions, and other financial assets with total calculations.

### 💼 Employment Manager
Comprehensive career history with:
- Job roles and responsibilities
- Duration calculations
- CV export functionality
- Pension tracking

### 📸 Photo Gallery
Store and organize personal photos and memories.

### 👥 Contacts Manager
Keep important contacts organized with full details.

### 🏪 Virtual High Street (Encrypted!)
Your personal password manager disguised as a "high street":
- **All passwords encrypted** with AES-256-GCM
- Password generator (16-character strong passwords)
- Password strength indicator
- Copy to clipboard
- Organized by category (Banking, Shopping, Social, etc.)
- Favicon support
- Export/import backups

### 🤖 AI Overview
Dashboard showing aggregated life metrics and planning insights.

---

## 🚀 Quick Start

### Prerequisites

1. **Rust** (for Tauri)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Node.js 18+** and npm

### Installation

```bash
npm install
```

### Development

**Desktop App (Recommended):**
```bash
source ~/.cargo/env  # Ensure Rust is in PATH
npm run tauri dev
```

First compile takes ~40s. Subsequent frontend changes reload in 1-2 seconds.

**Browser Fallback (Testing Only):**
```bash
npm run dev
```
Visit http://localhost:5173/ - Uses localStorage instead of filesystem

### First Launch

1. **Import Wizard** - Automatically appears if no data exists
   - Import encrypted backup file, or
   - Start fresh with empty data

2. Create a **master password** (strong, memorable, unrecoverable if forgotten)

3. Start organizing your life - everything is automatically encrypted

### Build for Production

```bash
npm run tauri build
```

Creates native installers in `src-tauri/target/release/bundle/`

---

## 📂 Data Storage

All data is stored locally in encrypted JSON files:

```
~/Documents/PersonalHub/
└── data/
    ├── virtual_street.encrypted.json          (Passwords)
    ├── finance_items.encrypted.json           (Accounts)
    ├── pensions.encrypted.json                (Pension records)
    ├── budget_items.encrypted.json            (Budget tracking)
    ├── certificates.encrypted.json            (Certificates metadata)
    ├── documents_certificates.encrypted.json  (Certificate files)
    ├── education_records.encrypted.json       (Education history)
    ├── medical_history.encrypted.json         (Medical records)
    ├── employment_records.encrypted.json      (Career history)
    ├── contacts.encrypted.json                (Contacts)
    └── photos.encrypted.json                  (Photos)
```

Each file is encrypted with **AES-256-GCM** using your master password. The encryption format:
- **Key Derivation:** PBKDF2 with 10,000 iterations, SHA-256
- **Format:** `[salt(16 bytes)][iv(12 bytes)][ciphertext][authTag(16 bytes)]` → base64

---

## 📖 Documentation

- **[MIGRATION.md](MIGRATION.md)** - Browser to Tauri migration guide
- **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** - Full development roadmap and architecture
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing instructions
- **[SPRINT1_SUMMARY.md](SPRINT1_SUMMARY.md)** - Password encryption implementation details
- **[scripts/dev/README.md](scripts/dev/README.md)** - Development scripts documentation

---

## 🏗️ Tech Stack

- **Tauri v2** - Native desktop framework (Rust + WebView)
- **React 18** + **TypeScript**
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **Lucide React** - Beautiful icon library
- **Web Crypto API** - Browser-native AES-256-GCM encryption
- **Filesystem Storage** - Encrypted data in `~/Documents/PersonalHub/`

---

## 🔐 Security Details

### Encryption
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Hash Function:** SHA-256
- **Salt:** 16 bytes random (unique per password)
- **IV:** 12 bytes random (unique per encryption)

### What's Encrypted
- ✅ Virtual High Street passwords (Sprint 1)
- 🔜 Finance data (planned)
- 🔜 Document metadata (planned)
- 🔜 Contact information (optional)

### What's NOT Encrypted
- Photo URLs (external links)
- Employment history (not sensitive)
- Category names and UI state

---

## 🎯 Roadmap

### ✅ Completed
- Master password system
- Password encryption (Virtual High Street)
- Password generator
- Export/import functionality

### 🚧 In Progress
- User testing and feedback

### 📋 Planned
- **Phase 2:** Real file uploads with encryption
- **Phase 3:** Global search and filtering
- **Phase 4:** Enhanced security (auto-lock, password change)
- **Phase 5:** Desktop app packaging (Tauri/Electron)

See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) for details.

---

## 🧪 Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing instructions.

**Quick Test:**
1. Launch the app
2. Create a master password
3. Add a few websites with passwords in Virtual High Street
4. Close browser completely
5. Reopen - should require password to unlock
6. Verify passwords decrypt correctly

---

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

### Found a Bug?
1. Check browser console for errors
2. Note steps to reproduce
3. Create an issue with details

### Want a Feature?
1. Check [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) to see if it's planned
2. Open an issue to discuss

---

## ⚠️ Important Notes

### Master Password
- **Cannot be recovered** if forgotten (this is intentional for security)
- Choose something strong but memorable
- Write it down and store it safely (physical paper, not digital)

### Data Storage
- All data stored in browser localStorage
- **Not synced** across devices (intentional)
- **Cleared if you clear browser data**
- Use Export feature regularly for backups

### Browser Support
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Should work (untested)
- Mobile browsers: ⚠️ Works but not optimized

---

## 📜 License

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party licenses.

shadcn/ui components: MIT License
Unsplash images: Used per Unsplash License

---

## 🙏 Acknowledgments

- Original design from Figma community
- Built with Claude Code (AI pair programming)
- shadcn/ui for beautiful components
- Web Crypto API for encryption

---

## 📧 Privacy Statement

This application:
- ✅ Runs entirely in your browser
- ✅ Stores all data locally on your device
- ✅ Makes no network requests (except favicon fetching)
- ✅ Collects no telemetry or analytics
- ✅ Sends no data to any server
- ✅ Is completely offline-capable (after first load)

**Your data belongs to you. It never leaves your device.**

---

**Status:** Sprint 1 Complete - Password encryption implemented and tested
**Version:** 0.1.0
**Last Updated:** 2026-01-06