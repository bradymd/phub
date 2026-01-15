# Development Scripts and Debug Files

This directory contains temporary scripts and debug files used during development. **These files should never be committed to git as they contain or work with personal data.**

## Directory Structure

### `import-scripts/`
Node.js scripts used for one-time data migration and bulk operations:

- `attach-*.cjs` - Scripts to bulk-attach documents to encrypted records
- `import-*.cjs` - Scripts to import data from various formats into encrypted storage
- `examine-*.cjs` - Scripts to examine and validate data
- `merge-*.cjs` - Scripts to merge data from different sources
- `imported-*.json` - Output files from import operations (contain personal data)

### `debug-html/`
HTML files used for testing and debugging during migration from browser localStorage to Tauri:

- `import-*.html` - Browser-based import interfaces (deprecated after Tauri migration)
- `debug-*.html` - Debug interfaces for testing encryption/decryption
- `check-storage.html` - Tool for inspecting localStorage (deprecated)

### Root files
- `IMG_*.{PNG,jpg}` - User-uploaded images (personal data)

## Usage

### Running Import Scripts

```bash
node scripts/dev/import-scripts/attach-medical-documents.cjs <master-password>
node scripts/dev/import-scripts/attach-education-documents.cjs <master-password>
```

## Security Note

**All files in this directory are ignored by git via `.gitignore`.** They contain or process personal information and must never be committed to version control.
