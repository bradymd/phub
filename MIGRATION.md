# Migration from Browser to Tauri Desktop App

This document describes the architectural changes made when migrating PersonalHub from a browser-based application to a Tauri desktop application.

## Overview

PersonalHub was originally built as a browser application using React + localStorage. It has been migrated to a **Tauri v2 desktop application** that stores encrypted data in the user's file system instead of browser localStorage.

## Key Changes

### 1. Storage Layer Migration

**Before (Browser):**
- Data stored in browser `localStorage`
- Limited to ~5-10MB storage
- Data tied to browser/domain
- Accessed via `localStorage.getItem()` / `localStorage.setItem()`

**After (Tauri):**
- Data stored in `~/Documents/PersonalHub/data/`
- No practical storage limits
- Data persists across application updates
- Accessed via Tauri filesystem APIs

### 2. Storage Service Architecture

The application now uses a **storage abstraction layer** with automatic environment detection:

```typescript
// src/services/storage.ts
export function createStorageService(masterPassword: string): StorageService {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  if (isTauri) {
    // Production: Use Tauri file system storage
    return new TauriStorageService(masterPassword);
  }

  // Development: Use browser localStorage fallback
  return new LocalStorageService(masterPassword);
}
```

**Storage implementations:**
- `TauriStorageService` - Production storage using filesystem (~/Documents/PersonalHub/)
- `LocalStorageService` - Development fallback using browser localStorage

**Removed:**
- `IndexedDBService` - Was planned but never implemented; removed during cleanup

### 3. File System Structure

```
~/Documents/PersonalHub/
└── data/
    ├── virtual_street.encrypted.json
    ├── finance_items.encrypted.json
    ├── pensions.encrypted.json
    ├── budget_items.encrypted.json
    ├── certificates.encrypted.json
    ├── documents_certificates.encrypted.json
    ├── education_records.encrypted.json
    ├── medical_history.encrypted.json
    ├── employment_records.encrypted.json
    ├── contacts.encrypted.json
    └── photos.encrypted.json
```

All files are encrypted with AES-256-GCM using the user's master password.

### 4. Document Viewing Changes

**Before (Browser):**
```typescript
// Opened documents in new tabs using blob URLs
const blob = base64ToBlob(fileData, 'application/pdf');
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
```

**After (Tauri):**
```typescript
// Uses modal iframe viewers (Tauri WebView blocks window.open with blob URLs)
<iframe
  src={`data:application/pdf;base64,${doc.fileData}`}
  style={{ flex: 1, border: 'none', width: '100%' }}
  title={doc.filename}
/>
```

**Components updated:**
- `MedicalHistoryManagerSecure.tsx` - Modal PDF viewer
- `EducationManagerSecure.tsx` - Modal PDF viewer
- `CertificateManagerSecure.tsx` - Modal viewer (PDF and images)

### 5. Data Import Wizard

Added a Tauri-specific import wizard for first-time setup:

- **Component:** `ImportWizard.tsx`
- **Trigger:** Automatically shows if no data exists
- **Features:**
  - File picker using `@tauri-apps/plugin-dialog`
  - Imports encrypted backup JSON files
  - Converts browser localStorage export to Tauri filesystem storage

### 6. Security & Encryption

No changes to encryption algorithm - still uses:
- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with 10,000 iterations, SHA-256
- **Format:** `[salt(16)][iv(12)][ciphertext][authTag(16)]` → base64

The same master password unlocks data in both browser and Tauri versions.

## Code Cleanup

### Files Reorganized

**Moved to `scripts/dev/`:**
- All `*.cjs` import/migration scripts
- All `import-*.html` debug files
- All `imported-*.json` data files
- User images (`IMG_*`)

### Code Removed

**From `storage.ts`:**
- ~170 lines of commented-out `IndexedDBService` code (never implemented)

**From components:**
- All `window.open()` calls with blob URLs (replaced with modal viewers)
- Direct `localStorage` access (replaced with `useStorage()` hook)

### Updated `.gitignore`

Added comprehensive protection for:
- User data directories (`public/medical/`, `public/documents/`, `public/thumbnails/`)
- Import scripts and debug files (`*.cjs`, `*.html`, `imported-*.json`)
- Personal documents (`*.pdf`, `*.xlsx`, `IMG_*`)
- Tauri build artifacts (`src-tauri/target/`)

## Development Workflow

### Running the App

**Development mode (with hot reload):**
```bash
source ~/.cargo/env
npm run tauri dev
```

**Production build:**
```bash
npm run tauri build
```

### Browser Fallback

The app still works in a browser for development/testing:
```bash
npm run dev
# Opens at http://localhost:5173
```

However, the import wizard and file-system features require Tauri.

## Backwards Compatibility

### Browser → Tauri Migration

Users can export their browser localStorage data and import it into the Tauri app:

1. **Export from browser version:**
   - Uses existing localStorage data
   - Creates encrypted JSON export

2. **Import into Tauri:**
   - Import wizard reads JSON file
   - Writes to `~/Documents/PersonalHub/data/`
   - Same encryption, just different storage location

### Data Format

The encrypted data format is identical between browser and Tauri versions, ensuring seamless migration.

## Known Differences

| Feature | Browser | Tauri |
|---------|---------|-------|
| Storage location | localStorage | ~/Documents/PersonalHub/ |
| Storage limit | ~5-10MB | No limit |
| File picker | `<input type="file">` | Tauri dialog plugin |
| Document viewing | `window.open()` | Modal iframe |
| Data persistence | Per-browser | System-wide |
| Offline mode | ✅ (PWA) | ✅ (Native) |

## Future Considerations

### Planned Enhancements
1. **Automatic Backups** - Periodic encrypted backups to user-chosen location
2. **Cloud Sync** - Optional encrypted sync to user's cloud storage
3. **Multi-device** - Share encrypted data across devices

### Migration Path
If needed to move back to browser:
1. Export data from Tauri (same format as localStorage)
2. Import into browser version
3. Data format is compatible

## Testing

### Verify Tauri Features
```bash
# Check that storage goes to filesystem
ls -la ~/Documents/PersonalHub/data/

# Check file sizes (should match your data)
du -sh ~/Documents/PersonalHub/

# Test import wizard (delete data first)
rm -rf ~/Documents/PersonalHub/data/*
npm run tauri dev
```

### Verify Browser Fallback
```bash
npm run dev
# Should still work with localStorage
```

## Support

For issues related to:
- **Tauri setup:** See README.md "Development Setup" section
- **Data migration:** Check import wizard logs in browser console
- **Encryption:** All files use same format as before (AES-256-GCM)
