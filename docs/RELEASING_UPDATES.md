# Releasing Updates Guide

This guide explains how to release new versions of PersonalHub so users get automatic updates.

## Overview

The update system works like this:

1. You build a new version of the app
2. You upload it to GitHub as a "Release"
3. Users' apps check GitHub for new versions
4. If newer version exists, user sees "Update Available" notification
5. User clicks "Download Now" → app downloads in background
6. User clicks "Restart Now" → app installs update and restarts

---

## Step-by-Step: Releasing a New Version

### Step 1: Update the Version Number

Edit `package.json` and change the version:

```json
{
  "name": "personal-hub",
  "version": "1.0.0",  ← Change this
  ...
}
```

**Version format:** `MAJOR.MINOR.PATCH`
- `MAJOR` (1.x.x) - Big changes, might break things
- `MINOR` (x.1.x) - New features, backwards compatible
- `PATCH` (x.x.1) - Bug fixes only

**Examples:**
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature like adding a panel)
- `1.1.0` → `2.0.0` (major redesign)

### Step 2: Build the App

```bash
# For Linux
npm run build:linux

# For Windows
npm run build:win

# For macOS
npm run build:mac

# For all platforms
npm run build:all
```

**Output files** (in `dist-electron/`):
- Linux: `PersonalHub-X.X.X.AppImage`
- Windows: `PersonalHub Setup X.X.X.exe`
- macOS: `PersonalHub-X.X.X.dmg`

### Step 3: Create GitHub Release

1. Go to: https://github.com/bradymd/phub/releases
2. Click **"Draft a new release"**
3. Fill in:
   - **Tag:** `vX.X.X` (e.g., `v1.1.0`) - must start with `v`
   - **Title:** `Version X.X.X`
   - **Description:** What changed (optional but helpful)
4. **Upload files** (drag and drop):
   - The AppImage/exe/dmg file(s)
   - The `latest-linux.yml` file (for Linux)
   - The `latest.yml` file (for Windows, if building Windows)
5. Click **"Publish release"**

### Step 4: Verify

1. Open the app on a machine with the old version
2. Wait a few seconds (it checks on startup)
3. Should see "Update Available" notification

---

## The `latest-*.yml` Files

These files tell the updater about the latest version. They're auto-generated during build.

**`latest-linux.yml` example:**
```yaml
version: 1.1.0
files:
  - url: PersonalHub-1.1.0.AppImage
    sha512: abc123...
    size: 347000000
path: PersonalHub-1.1.0.AppImage
sha512: abc123...
releaseDate: '2026-01-30T20:08:00.000Z'
```

**Important:** Always upload the matching `.yml` file with your release!

---

## Testing Updates Locally

You can test the update flow without publishing to GitHub:

### Method 1: Two Versions

1. Build version 1.0.0, run it
2. Change to 1.1.0, build again
3. Create a GitHub release with 1.1.0
4. The running 1.0.0 app will detect the update

### Method 2: Check Update Status

In the app, open DevTools (View → Toggle Developer Tools) and look at console:
```
Checking for updates...
Update available: 1.1.0
```

---

## Troubleshooting

### "Update check failed"

**Possible causes:**
- No internet connection
- GitHub is down
- No releases published yet
- Release is a "draft" (must be published)

### "Update downloaded but won't install"

**Linux AppImage:** The app needs write permission to replace itself. Make sure the AppImage isn't in a read-only location.

### Users don't see updates

- Make sure the release is **published** (not draft)
- Make sure the version in package.json is higher than what they have
- Make sure you uploaded the `latest-linux.yml` file

---

## Platform-Specific Notes

### Linux (AppImage)

- Updates work fully automatically
- AppImage replaces itself on update
- No code signing required

### Windows

- Updates work automatically
- Users may see "Unknown Publisher" warning without code signing
- Code signing certificate costs $100-400/year

### macOS

- **Requires code signing** for updates to work smoothly
- Without signing: users get security warnings, auto-update may fail
- Apple Developer account costs $99/year

---

## Release Checklist

Before each release:

- [ ] Update version in `package.json`
- [ ] If data structure changed: add migrations (see DATA_MIGRATIONS.md)
- [ ] Build the app: `npm run build:linux` (or appropriate platform)
- [ ] Test the built app runs correctly
- [ ] Commit and push code changes
- [ ] Create GitHub release with correct tag (`vX.X.X`)
- [ ] Upload build files AND `latest-*.yml` files
- [ ] Publish the release (not draft)
- [ ] Test update on a machine with old version

---

## Version History

Keep track of releases here:

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2026 | Initial release |

---

## Quick Reference

```bash
# Full release process
1. Edit package.json → change version to "X.X.X"
2. npm run build:linux
3. git add -A && git commit -m "Release vX.X.X"
4. git push
5. Go to GitHub → Releases → Draft new release
6. Tag: vX.X.X, Upload files, Publish
```
