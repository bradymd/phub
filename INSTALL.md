# Personal Hub - Installation Guide

Welcome to Personal Hub! This guide will help you install and set up your secure, private life organization app.

## What is Personal Hub?

Personal Hub is a **desktop application** that helps you organize your entire life in one secure place:
- 📋 Documents & Certificates
- 💰 Finances & Pensions
- 💼 Employment History
- 🎓 Education Records
- 🏥 Medical Records
- 👥 Contacts
- 🔐 Password Manager (Virtual High Street)
- 📸 Photos

**Everything is encrypted** with AES-256-GCM encryption using your master password. Your data never leaves your computer.

---

## System Requirements

- **Operating System:** Windows 10/11, macOS 10.15+, or Linux
- **Disk Space:** ~100 MB for app + storage for your data
- **RAM:** 4 GB minimum (8 GB recommended)

---

## Installation

### Option 1: Download Pre-built Installer (Coming Soon)

1. Download the installer for your operating system from the releases page
2. Run the installer
3. Follow the installation wizard
4. Launch Personal Hub from your applications menu

### Option 2: Build from Source

**Prerequisites:**
- [Node.js 18+](https://nodejs.org/)
- [Rust](https://rustup.rs/)

**Steps:**

1. **Install Rust** (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/phub.git
   cd phub
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the application:**
   ```bash
   npm run tauri build
   ```

5. **Find the installer:**
   - **Windows:** `src-tauri/target/release/bundle/msi/`
   - **macOS:** `src-tauri/target/release/bundle/dmg/`
   - **Linux:** `src-tauri/target/release/bundle/appimage/` or `bundle/deb/`

6. **Install and run** the application from the bundle directory

---

## First Launch

### Step 1: Create Your Master Password

On first launch, you'll be asked to create a **master password**:

⚠️ **CRITICAL:** This password:
- Encrypts ALL your data
- Cannot be recovered if forgotten
- Should be strong but memorable
- Should be unique (not used elsewhere)

**Tips for a strong master password:**
- Use at least 12 characters
- Mix uppercase, lowercase, numbers, and symbols
- Use a passphrase: `Correct-Horse-Battery-Staple-99!`
- Consider using a password manager to store it securely

### Step 2: Import Wizard (Optional)

If you have existing data, the Import Wizard will appear:

1. **Click "Import from Backup"** if you have a previous backup file
2. **Select your backup JSON file** using the file picker
3. **Enter your master password** (the one that encrypted the backup)
4. **Click "Start Fresh"** if you're setting up for the first time

### Step 3: Start Organizing!

You're ready to use Personal Hub! Click on any category to start adding your data.

---

## Using Personal Hub

### Adding Data

1. **Click on a category card** (e.g., "Certificates", "Finance", "Contacts")
2. **Click "Add Record"** or the plus (+) button
3. **Fill in the details** and attach any documents if needed
4. **Click "Save"** - your data is automatically encrypted!

### Viewing Documents

- Click the **eye icon** or document name to view attached PDFs and images
- Documents open in a secure modal viewer
- Your documents are stored encrypted with your data

### Password Manager (Virtual High Street)

- Store website logins in the "Virtual High Street"
- Generate strong passwords with the built-in generator
- Copy passwords to clipboard with one click
- All passwords are encrypted!

---

## Backup & Restore

### Creating Backups

⚠️ **IMPORTANT:** Regular backups protect you from data loss!

1. **Click "Backup & Restore"** in the top-right corner
2. **Click "Create Backup Now"**
3. **Choose a save location:**
   - Default: `~/Downloads/`
   - Recommended: External drive or cloud storage folder
4. **Done!** Your backup is saved with a timestamp

**Security:** Backups are **encrypted with AES-256-GCM** using your master password. Without your master password, backups cannot be decrypted - even by you!

**Backup Best Practices:**
- Create backups **weekly**
- Store backups in **multiple locations** (external drive + cloud)
- Keep **multiple versions** (don't overwrite old backups)
- **Test your backups** periodically by restoring to a test device

### Restoring from Backup

1. **Click "Backup & Restore"**
2. **Click "Restore from Backup"**
3. **Select your backup file**
4. **Confirm** (⚠️ this will replace ALL current data)
5. **Restart the app** to see restored data

---

## Data Storage

All your data is stored in:

```
~/Documents/PersonalHub/
└── data/
    ├── virtual_street.encrypted.json          (Passwords)
    ├── finance_items.encrypted.json           (Financial accounts)
    ├── pensions.encrypted.json                (Pension records)
    ├── budget_items.encrypted.json            (Budget tracking)
    ├── certificates.encrypted.json            (Certificates)
    ├── documents_certificates.encrypted.json  (Certificate files)
    ├── education_records.encrypted.json       (Education history)
    ├── medical_history.encrypted.json         (Medical records)
    ├── employment_records.encrypted.json      (Career history)
    ├── contacts.encrypted.json                (Contacts)
    └── photos.encrypted.json                  (Photos)
```

**Important Notes:**
- All files are encrypted with AES-256-GCM
- Files cannot be read without your master password
- Backup this folder regularly
- Don't edit these files manually (use the app)

---

## Security & Privacy

### Encryption

- **Algorithm:** AES-256-GCM (industry standard, military-grade)
- **Key Derivation:** PBKDF2 with 10,000 iterations + SHA-256
- **Password:** Your master password + random salt per file
- **Authentication:** Galois/Counter Mode ensures data integrity

### Privacy

✅ **What Personal Hub Does:**
- Stores all data locally on your computer
- Encrypts everything with your master password
- Works 100% offline

❌ **What Personal Hub Does NOT Do:**
- Upload data to the cloud (unless you manually put backups there)
- Send telemetry or analytics
- Connect to the internet
- Track your usage
- Share data with third parties

### Your Responsibilities

1. **Choose a strong master password**
2. **Never forget your master password** (write it down safely!)
3. **Create regular backups**
4. **Store backups securely** (encrypted external drives, password-protected cloud storage)
5. **Keep your computer secure** (OS updates, antivirus, disk encryption)

---

## Troubleshooting

### I Forgot My Master Password

❌ **Cannot be recovered.** Your data is permanently encrypted.

**Solutions:**
- If you have a backup, restore it on a new installation
- If no backup exists, your data cannot be recovered
- This is by design - it protects your data even if your computer is stolen

### The App Won't Start

**Linux users:**
```bash
# Ensure Rust is in your PATH
source ~/.cargo/env

# Run from terminal to see errors
npm run tauri dev
```

**All users:**
1. Check that you meet system requirements
2. Ensure no antivirus is blocking the app
3. Try restarting your computer
4. Check GitHub Issues for known problems

### Import Wizard Keeps Appearing

This means Personal Hub detects no data:

1. **If you've imported before:** Check that files exist in `~/Documents/PersonalHub/data/`
2. **If files exist:** Ensure they're not corrupted or empty
3. **If you want to start fresh:** Click "Start Fresh" to dismiss

### Data Not Showing After Restore

1. **Restart the app** completely (don't just close the window)
2. **Check the restore succeeded** (no errors in Backup Manager)
3. **Verify backup file** is not corrupted

---

## Getting Help

### Documentation

- **[README.md](README.md)** - Project overview and quick start
- **[MIGRATION.md](MIGRATION.md)** - Technical migration guide (browser → desktop)
- **[Development Plan](DEVELOPMENT_PLAN.md)** - Architecture and roadmap

### Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/your-username/phub/issues)
- **Discussions:** [Ask questions and share tips](https://github.com/your-username/phub/discussions)

### Contributing

Personal Hub is open source! Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## Uninstalling

1. **Backup your data first!** (Backup & Restore → Create Backup)
2. **Uninstall the application:**
   - **Windows:** Settings → Apps → Personal Hub → Uninstall
   - **macOS:** Drag app to Trash
   - **Linux:** `sudo apt remove personalhub` or delete AppImage
3. **Optional:** Delete data folder:
   ```bash
   rm -rf ~/Documents/PersonalHub/
   ```

⚠️ **Warning:** Deleting the data folder is permanent and cannot be undone without backups!

---

## License

Personal Hub is released under the MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Desktop app framework
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

Developed with assistance from Claude (Anthropic).

---

**Thank you for using Personal Hub!** 🎉

Stay organized, stay secure, stay private.
