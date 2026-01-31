# Personal Hub - Installation Guide

Personal Hub is a secure, private desktop app for organizing your life. All data is encrypted and stored locally.

---

## For Users

### Linux

**Requirements:** FUSE2 (for AppImage)
```bash
sudo apt install libfuse2    # Ubuntu/Debian
sudo dnf install fuse-libs   # Fedora
```

**Install:**
1. Download `PersonalHub-1.0.0.AppImage` from [Releases](https://github.com/bradymd/phub/releases)
2. Move to your bin folder and run:
   ```bash
   mkdir -p ~/bin
   mv ~/Downloads/PersonalHub-1.0.0.AppImage ~/bin/phub
   chmod +x ~/bin/phub
   phub
   ```

Or install the `.deb` package:
```bash
sudo dpkg -i personal-hub_1.0.0_amd64.deb
```

### Windows

1. Download `PersonalHub Setup 1.0.0.exe` from [Releases](https://github.com/bradymd/phub/releases)
2. Run the installer
3. Launch from Start Menu

### macOS

1. Download `PersonalHub-1.0.0.dmg` from [Releases](https://github.com/bradymd/phub/releases)
2. Drag to Applications
3. First launch: Right-click → Open

### First Launch

1. Create a **master password** (this encrypts all your data - don't forget it!)
2. Start adding your information

### Updates

The app checks for updates automatically. When available, click "Download Now" then "Restart Now".

### Backups

Create regular backups via Settings → Create Backup. Store backups safely - you'll need your master password to restore.

---

## For Developers

### Prerequisites

- Node.js 18+

### Setup

```bash
git clone https://github.com/bradymd/phub.git
cd phub
npm install
```

### Development

```bash
npm run electron:dev
```

### Build

```bash
npm run build:linux   # Linux: AppImage + .deb
npm run build:win     # Windows: installer + portable
npm run build:mac     # macOS: .dmg
```

Output in `dist-electron/`.

### Project Structure

```
src/
├── app/components/    # React components (panels)
├── config/panels.ts   # Panel registry
├── contexts/          # React contexts (storage, auth)
├── services/          # Storage, encryption, migrations
├── hooks/             # Custom React hooks
└── utils/             # Crypto, file utilities

electron/
├── main.cjs           # Electron main process
└── preload.cjs        # IPC bridge

docs/                  # Documentation
```

### Documentation

- [CLAUDE.md](CLAUDE.md) - Codebase guide for AI assistants
- [docs/DATA_MIGRATIONS.md](docs/DATA_MIGRATIONS.md) - Schema migration guide
- [docs/RELEASING_UPDATES.md](docs/RELEASING_UPDATES.md) - Release process
- [docs/STYLE_CONVENTIONS.md](docs/STYLE_CONVENTIONS.md) - UI patterns

---

## Data Location

All data stored in `~/Documents/PersonalHub/` - encrypted with AES-256-GCM.

## Security

- Your master password cannot be recovered if forgotten
- All data is encrypted locally
- No data is sent to any server (except update checks to GitHub)
