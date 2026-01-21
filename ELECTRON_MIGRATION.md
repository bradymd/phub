# Electron Migration Plan

## Current State (Tauri Checkpoint)

**Tag**: `tauri-checkpoint-v1`
**Date**: 2026-01-21
**Status**: Fully functional, but scroll performance limited by WebKitGTK on Linux

## Why Migrate to Electron?

**Problem**: Tauri uses system WebView (WebKitGTK on Linux) which has poor scroll performance
- Scrolling through 30+ budget items feels sluggish
- CSS optimizations didn't help significantly
- User expects smooth scrolling like web apps (Chrome/Firefox)

**Solution**: Electron bundles Chromium = much better rendering performance on Linux

## What Stays The Same

✓ All React components and UI code
✓ All encryption logic (AES-256-GCM)
✓ All data structures and storage
✓ User data files (backward compatible)
✓ Overall architecture

## What Needs To Change

### 1. Build System
- Remove: `tauri.conf.json`, `src-tauri/` directory
- Add: Electron main process file (`electron/main.js`)
- Update: `package.json` scripts

### 2. Backend (Rust → Node.js)
- File operations: `@tauri-apps/plugin-fs` → Node.js `fs` module
- IPC: Tauri commands → Electron IPC
- Window management: Tauri API → Electron BrowserWindow

### 3. Dependencies
Remove:
```json
"@tauri-apps/api"
"@tauri-apps/plugin-fs"
```

Add:
```json
"electron"
"electron-builder"
```

### 4. Storage Service (`src/services/tauri-storage.ts`)
- Rewrite file operations to use Electron IPC → Node.js fs
- Keep encryption logic identical
- Same API for React components

### 5. Document Service
- Update thumbnail generation to use Electron APIs
- Keep same logic, different file system calls

## Migration Steps

1. **Backup current state** (✓ Done - tagged as tauri-checkpoint-v1)
2. **Create electron branch**: `git checkout -b electron-migration`
3. **Install Electron**: `npm install electron electron-builder`
4. **Create Electron main process**
5. **Rewrite IPC layer** (tauri-storage.ts → electron-storage.ts)
6. **Test file operations** (read/write/encrypt/decrypt)
7. **Update build scripts**
8. **Test all managers** (Budget, Employment, etc.)
9. **Test backup/restore**
10. **Compare performance**

## Rollback Plan

If Electron migration fails or doesn't improve performance:
```bash
git checkout main
git branch -D electron-migration
```

Current Tauri version is safe at tag `tauri-checkpoint-v1`

## Estimated Effort

- **Developer time**: 2-3 days
- **Risk level**: Medium (architecture change but similar patterns)
- **Testing needed**: Extensive (all file operations)

## Success Criteria

- [ ] App builds and runs on Linux
- [ ] All encryption works (can read existing data)
- [ ] Smooth scrolling in Budget Manager (60fps)
- [ ] All panels function correctly
- [ ] Backup/restore works
- [ ] Binary size acceptable (<150MB)
- [ ] Memory usage acceptable (<200MB idle)

## Notes

- Electron binary will be ~80-120MB vs Tauri ~3-5MB
- For personal use, binary size doesn't matter
- Smooth UX > small binary
- Many production apps use Electron successfully (VSCode, Slack, Discord)
