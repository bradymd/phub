# Personal Hub - Secure Life Organization

A **private, local-first desktop application** for organizing your entire life. Track your documents, finances, vehicles, property, medical records, contacts, and passwords - all encrypted and stored securely on your own device.

**Built with [Electron](https://www.electronjs.org/)** - A cross-platform desktop application using React + TypeScript.

---

## Security First

- **AES-256-GCM Encryption** for all sensitive data
- **Master Password Protection** with PBKDF2 key derivation (10,000 iterations)
- **Filesystem Storage** - Data stored in `~/Documents/PersonalHub/` (not in the app)
- **No Cloud Storage** - everything stays on your device
- **No Telemetry** - completely private
- **Auto-Updates** - checks GitHub releases for new versions
- **Open Source** - inspect the code yourself

---

## Features

### Core Panels
- **Contacts** - Keep important contacts organized
- **Documents** - Store and organize important documents (PDFs, images)
- **Certificates** - Track certificates with expiry dates and documents
- **Education** - Education history with qualifications and transcripts
- **Employment** - Career history with CV export functionality

### Finance Panels
- **Finance** - Track savings accounts and financial assets
- **Pensions** - Pension tracking with projections
- **Budget** - Monthly budget tracking
- **Kakeibo** - Japanese budgeting method

### Lifestyle Panels
- **Vehicles** - Vehicle details, MOT, tax, insurance, service history with reminders
- **Property** - Property details, maintenance schedules, council tax
- **Medical** - Medical history and appointment tracking
- **Dental** - Dental records and appointments
- **Pets** - Pet information, vaccinations, vet visits

### Security Panels
- **Virtual High Street** - Password manager disguised as a shopping street
  - All passwords encrypted with AES-256-GCM
  - Password generator
  - Copy to clipboard
  - Organized by category

### System Features
- **Backup & Restore** - Export encrypted backups, restore on any machine
- **Smart Panel Ordering** - Panels with alerts appear first, then by usage frequency
- **Key Dates Dashboard** - See upcoming renewals, appointments, and deadlines
- **Settings** - Show/hide panels, customize your experience

---

## Installation

### Download

Download the latest release from [GitHub Releases](https://github.com/bradymd/phub/releases):

- **Linux**: `personal-hub_X.X.X_amd64.deb` (recommended)
- **Windows**: `PersonalHub Setup X.X.X.exe` (coming soon)
- **macOS**: `PersonalHub-X.X.X.dmg` (coming soon)

### Linux (Recommended)

```bash
sudo dpkg -i personal-hub_1.0.0_amd64.deb
personal-hub
```

### Linux AppImage (Alternative)

Requires FUSE2 and must run with `--no-sandbox`:

```bash
sudo apt install libfuse2
chmod +x PersonalHub-1.0.0.AppImage
./PersonalHub-1.0.0.AppImage --no-sandbox
```

---

## Development

### Prerequisites

- **Node.js 18+** and npm

### Setup

```bash
git clone https://github.com/bradymd/phub.git
cd phub
npm install
```

### Run Development Mode

```bash
npm run electron:dev
```

### Build for Production

```bash
# Linux
npm run build:linux

# Windows (on Windows machine)
npm run build:win

# macOS (on macOS machine)
npm run build:mac
```

Output files are in `dist-electron/`.

---

## Data Storage

All data is stored locally in encrypted JSON files:

```
~/Documents/PersonalHub/
├── .master.key                              (Encrypted master key)
└── data/
    ├── contacts.encrypted.json
    ├── vehicles.encrypted.json
    ├── properties.encrypted.json
    ├── medical_history.encrypted.json
    ├── certificates.encrypted.json
    ├── education.encrypted.json
    ├── employment.encrypted.json
    ├── finance_items.encrypted.json
    ├── pension_items.encrypted.json
    ├── budget_items.encrypted.json
    ├── virtual_street.encrypted.json        (Passwords)
    └── ...
```

Each file is encrypted with **AES-256-GCM** using your master password.

---

## Auto-Updates

The app checks for updates on GitHub and shows a notification when available.

**Linux .deb users:** Download the new `.deb` from [Releases](https://github.com/bradymd/phub/releases) and run:
```bash
sudo dpkg -i personal-hub_X.X.X_amd64.deb
```

**AppImage users:** Updates can install automatically via the in-app notification.

See [docs/RELEASING_UPDATES.md](docs/RELEASING_UPDATES.md) for release instructions.

---

## Documentation

- **[docs/RELEASING_UPDATES.md](docs/RELEASING_UPDATES.md)** - How to release new versions
- **[docs/DATA_MIGRATIONS.md](docs/DATA_MIGRATIONS.md)** - Handling data structure changes
- **[docs/STYLE_CONVENTIONS.md](docs/STYLE_CONVENTIONS.md)** - UI design patterns
- **[CLAUDE.md](CLAUDE.md)** - AI assistant instructions for this codebase

---

## Tech Stack

- **Electron** - Cross-platform desktop framework
- **React 18** + **TypeScript**
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first styling
- **Lucide React** - Icon library
- **electron-updater** - Auto-update system
- **Web Crypto API** - AES-256-GCM encryption

---

## Security Details

### Encryption
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Derivation:** PBKDF2 with 10,000 iterations
- **Hash Function:** SHA-256
- **Salt:** 16 bytes random (unique per encryption)
- **IV:** 12 bytes random (unique per encryption)

### Master Password
- **Cannot be recovered** if forgotten (this is intentional for security)
- Choose something strong but memorable
- The master key is encrypted with your password and stored locally

---

## Privacy Statement

This application:
- Runs entirely on your device
- Stores all data locally in `~/Documents/PersonalHub/`
- Makes no network requests except for update checks (GitHub only)
- Collects no telemetry or analytics
- Sends no personal data anywhere

**Your data belongs to you. It never leaves your device.**

---

## License

MIT License - See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party licenses.

---

## Acknowledgments

- Built with Claude Code (AI pair programming)
- shadcn/ui for UI components
- Lucide for icons

---

**Version:** 1.0.0
**Last Updated:** January 2026
