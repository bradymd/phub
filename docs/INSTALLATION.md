# Installation Guide

This guide covers installing PersonalHub on all supported platforms.

## Platform Support

| Platform | Status | Auto-Updates | Notes |
|----------|--------|--------------|-------|
| **Linux** | Primary | Yes (AppImage) | Actively developed and tested |
| **Windows** | Experimental | Yes | Not regularly tested |
| **macOS** | Experimental | No | Not regularly tested, unsigned |

> **Note:** PersonalHub is primarily developed and tested on Linux. Windows and macOS builds are provided for convenience but may have untested issues. Please report any platform-specific bugs on [GitHub Issues](https://github.com/bradymd/phub/issues).

---

## Linux

### Option 1: AppImage (Recommended)

The AppImage is a portable executable that works on most Linux distributions.

**Download and run:**
```bash
# Download latest release
curl -L https://github.com/bradymd/phub/releases/latest/download/PersonalHub-1.0.7-x86_64.AppImage -o PersonalHub.AppImage

# Make executable
chmod +x PersonalHub.AppImage

# Run
./PersonalHub.AppImage
```

**Troubleshooting:**
- If the app shows a blank screen, try: `./PersonalHub.AppImage --disable-gpu`
- On Wayland, the app should auto-detect. If not, set: `--ozone-platform-hint=auto`

### Option 2: Debian Package (.deb)

For Debian, Ubuntu, and derivatives:

```bash
# Download
curl -L https://github.com/bradymd/phub/releases/latest/download/PersonalHub-1.0.7-amd64.deb -o personalhub.deb

# Install
sudo dpkg -i personalhub.deb

# If dependencies are missing
sudo apt-get install -f
```

The app will appear in your application menu as "Personal Hub".

---

## Windows

> **Experimental:** Windows builds are not regularly tested. Please report issues.

### Download

Download the installer from the [latest release](https://github.com/bradymd/phub/releases/latest):
- `PersonalHub-Setup-X.X.X.exe` - Installer
- `PersonalHub-X.X.X-portable.exe` - Portable version (no install needed)

### Installation

1. Download `PersonalHub-Setup-X.X.X.exe`
2. Run the installer
3. You may see "Windows protected your PC" (SmartScreen) - click "More info" → "Run anyway"
4. Follow the installation wizard

### Why the Security Warning?

The Windows build is not code-signed (signing certificates cost $100-400/year). This triggers Windows SmartScreen. The app is safe to run - you can verify the source code on GitHub.

---

## macOS

> **Experimental:** macOS builds are not regularly tested and are unsigned. Please report issues.

### Download

```bash
# Download latest release
curl -L https://github.com/bradymd/phub/releases/latest/download/PersonalHub-1.0.7-mac.zip -o PersonalHub.zip

# Extract
unzip PersonalHub.zip
```

### First Launch - Bypassing Gatekeeper

Because the app is unsigned, macOS will block it by default. You have two options:

**Option 1: Right-click to Open (Recommended)**
1. In Finder, navigate to `PersonalHub.app`
2. **Right-click** (or Control-click) on the app
3. Select **"Open"** from the context menu
4. Click **"Open"** in the dialog that appears
5. The app will now launch and be remembered for future launches

**Option 2: Remove Quarantine Attribute**
```bash
# Remove the quarantine flag
xattr -cr PersonalHub.app

# Then double-click to open normally
open PersonalHub.app
```

**Option 3: System Preferences**
1. Try to open the app (it will be blocked)
2. Go to **System Preferences** → **Security & Privacy** → **General**
3. Click **"Open Anyway"** next to the message about PersonalHub

### Why the Security Warning?

The macOS build is not code-signed or notarized (requires Apple Developer account at $99/year). This triggers Gatekeeper protection. The app is safe to run - you can verify the source code on GitHub.

### Known Limitations on macOS

- No automatic updates (must manually download new versions)
- First launch requires Gatekeeper bypass
- Not tested on Apple Silicon (M1/M2/M3) - may run via Rosetta 2

---

## Verifying Downloads

All releases include SHA512 checksums in the `latest-*.yml` files. You can verify your download:

```bash
# Linux example
sha512sum PersonalHub-1.0.7-x86_64.AppImage
# Compare with sha512 value in latest-linux.yml
```

---

## Data Storage

PersonalHub stores all data locally in your home directory:

| Platform | Location |
|----------|----------|
| Linux | `~/.config/personal-hub/` |
| Windows | `%APPDATA%\personal-hub\` |
| macOS | `~/Library/Application Support/personal-hub/` |

All data is encrypted with your master password using AES-256-GCM.

---

## Updating

### Linux (AppImage)
The app checks for updates automatically and will notify you when a new version is available.

### Linux (.deb)
Check the [releases page](https://github.com/bradymd/phub/releases) and download the new .deb file.

### Windows
The app checks for updates automatically.

### macOS
Check the [releases page](https://github.com/bradymd/phub/releases) and download the new .zip file. Follow the same installation steps.

---

## Uninstalling

### Linux (AppImage)
Simply delete the AppImage file. Your data remains in `~/.config/personal-hub/`.

### Linux (.deb)
```bash
sudo apt remove personal-hub
```

### Windows
Use "Add or Remove Programs" in Windows Settings.

### macOS
Drag `PersonalHub.app` to the Trash.

### Removing Data
To completely remove all data (after uninstalling):

| Platform | Command |
|----------|---------|
| Linux | `rm -rf ~/.config/personal-hub` |
| Windows | Delete `%APPDATA%\personal-hub` folder |
| macOS | `rm -rf ~/Library/Application\ Support/personal-hub` |

> **Warning:** This permanently deletes all your encrypted data. Make a backup first if needed.
