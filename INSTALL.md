# Personal Hub - Installation Guide

Welcome to Personal Hub! This guide will help you install and set up your secure, private life organization app.

## What is Personal Hub?

Personal Hub is a **desktop application** that helps you organize your entire life in one secure place:
- Documents & Certificates
- Vehicles & Property
- Finances & Pensions
- Employment & Education
- Medical & Dental Records
- Contacts
- Password Manager (Virtual High Street)

**Everything is encrypted** with AES-256-GCM encryption using your master password. Your data never leaves your computer.

---

## System Requirements

- **Operating System:** Windows 10/11, macOS 10.15+, or Linux
- **Disk Space:** ~400 MB for app + storage for your data
- **RAM:** 4 GB minimum (8 GB recommended)

---

## Installation

### Linux - AppImage (Recommended)

1. Download `PersonalHub-X.X.X.AppImage` from [GitHub Releases](https://github.com/bradymd/phub/releases)
2. Make it executable and run:
   ```bash
   chmod +x PersonalHub-1.0.0.AppImage
   ./PersonalHub-1.0.0.AppImage
   ```

### Linux - Debian/Ubuntu (.deb)

1. Download `personal-hub_X.X.X_amd64.deb` from [GitHub Releases](https://github.com/bradymd/phub/releases)
2. Install:
   ```bash
   sudo dpkg -i personal-hub_1.0.0_amd64.deb
   ```
3. Launch from applications menu or run `personal-hub`

### Windows

1. Download `PersonalHub Setup X.X.X.exe` from [GitHub Releases](https://github.com/bradymd/phub/releases)
2. Run the installer
3. You may see "Unknown Publisher" warning - click "More info" → "Run anyway"
4. Launch from Start Menu

### macOS

1. Download `PersonalHub-X.X.X.dmg` from [GitHub Releases](https://github.com/bradymd/phub/releases)
2. Open the DMG and drag to Applications
3. First launch: Right-click → Open (to bypass Gatekeeper)

---

## Build from Source

**Prerequisites:**
- [Node.js 18+](https://nodejs.org/)

**Steps:**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bradymd/phub.git
   cd phub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run electron:dev
   ```

4. **Build for production:**
   ```bash
   # Linux
   npm run build:linux

   # Windows
   npm run build:win

   # macOS
   npm run build:mac
   ```

5. **Find the installer in `dist-electron/`**

---

## First Launch

### Step 1: Create Your Master Password

On first launch, you'll be asked to create a **master password**:

**CRITICAL:** This password:
- Encrypts ALL your data
- Cannot be recovered if forgotten
- Should be strong but memorable
- Should be unique (not used elsewhere)

**Tips for a strong master password:**
- Use at least 12 characters
- Mix uppercase, lowercase, numbers, and symbols
- Use a passphrase: `Correct-Horse-Battery-Staple-99!`
- Write it down and store it safely (physical paper)

### Step 2: Start Organizing!

You're ready to use Personal Hub! Click on any panel to start adding your data.

---

## Auto-Updates

Personal Hub automatically checks for updates when it starts:

1. When an update is available, you'll see a notification
2. Click "Download Now" to download in the background
3. Click "Restart Now" to install and restart the app

Updates are downloaded from GitHub Releases.

---

## Backup & Restore

### Creating Backups

**IMPORTANT:** Regular backups protect you from data loss!

1. Click the **Settings** panel
2. Click **"Create Backup"**
3. Choose a save location (recommended: external drive or cloud folder)
4. Your backup is saved as a `.phub` file

**Backup Best Practices:**
- Create backups **weekly**
- Store backups in **multiple locations**
- Keep **multiple versions**
- **Test your backups** periodically

### Restoring from Backup

1. Click **"Restore from Backup"** in Settings
2. Select your `.phub` backup file
3. Confirm the restore
4. Restart the app

---

## Data Storage

All your data is stored locally in:

```
~/Documents/PersonalHub/
├── .master.key                    (Encrypted master key)
└── data/
    ├── contacts.encrypted.json
    ├── vehicles.encrypted.json
    ├── properties.encrypted.json
    ├── certificates.encrypted.json
    ├── virtual_street.encrypted.json   (Passwords)
    └── ...
```

**Important:**
- All files are encrypted with AES-256-GCM
- Files cannot be read without your master password
- Backup this folder regularly
- Don't edit these files manually

---

## Security & Privacy

### Encryption

- **Algorithm:** AES-256-GCM (industry standard)
- **Key Derivation:** PBKDF2 with 10,000 iterations + SHA-256
- **Password:** Your master password + random salt per file

### Privacy

**What Personal Hub Does:**
- Stores all data locally on your computer
- Encrypts everything with your master password
- Checks GitHub for updates (no personal data sent)

**What Personal Hub Does NOT Do:**
- Upload your data anywhere
- Send telemetry or analytics
- Track your usage
- Share data with third parties

---

## Troubleshooting

### I Forgot My Master Password

**Cannot be recovered.** Your data is permanently encrypted.

**Solutions:**
- If you have a backup with a known password, restore it
- If no backup exists, data cannot be recovered
- This is by design for security

### The App Won't Start (Linux)

```bash
# For AppImage, ensure it's executable
chmod +x PersonalHub-*.AppImage

# Run from terminal to see errors
./PersonalHub-1.0.0.AppImage
```

### Update Check Failed

- Check your internet connection
- The app will work offline, just without update notifications

---

## Uninstalling

1. **Backup your data first!**
2. **Uninstall the application:**
   - **Linux AppImage:** Delete the AppImage file
   - **Linux .deb:** `sudo apt remove personal-hub`
   - **Windows:** Settings → Apps → Personal Hub → Uninstall
   - **macOS:** Drag app to Trash
3. **Optional:** Delete data folder:
   ```bash
   rm -rf ~/Documents/PersonalHub/
   ```

**Warning:** Deleting the data folder is permanent!

---

## Getting Help

- **GitHub Issues:** [Report bugs](https://github.com/bradymd/phub/issues)
- **Documentation:** See [README.md](README.md) and [docs/](docs/)

---

## Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/) - Desktop app framework
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

Developed with assistance from Claude Code (Anthropic).

---

**Thank you for using Personal Hub!**

Stay organized, stay secure, stay private.
