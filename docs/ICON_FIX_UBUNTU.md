# Icon Display Fix for Ubuntu 24.04

## Problem
The application icon was appearing as a black square in Ubuntu 24.04 with GNOME/Wayland, affecting both development mode and the AppImage distribution.

## Root Causes
1. **Wayland + Electron issue**: Known compatibility issue with Electron apps on Wayland
2. **AppImage broken symlinks**: Icons weren't properly embedded in the AppImage
3. **Missing icon configuration**: The Electron main process wasn't configured with an icon path

## Solutions Applied

### 1. Fixed Electron Configuration
Added icon path to BrowserWindow in `electron/main.cjs`:
```javascript
const iconPath = path.resolve(path.join(__dirname, '../build/icon.png'));
mainWindow = new BrowserWindow({
  icon: iconPath,
  // ... other options
});
```

### 2. Added Wayland Support Flags
Updated `package.json` to include Wayland compatibility flags:
```json
"electron:dev": "... electron . --no-sandbox --enable-features=UseOzonePlatform,WaylandWindowDecorations --ozone-platform-hint=auto"
```

### 3. Fixed Icon Build Configuration
Corrected the Linux build configuration in `package.json`:
```json
"linux": {
  "icon": "build/icon.png",  // Direct path to icon file
  // ... other options
}
```

### 4. Use .deb Package Instead of AppImage
The .deb package properly installs icons in system directories:
- Icon: `/usr/share/icons/hicolor/256x256/apps/personal-hub.png`
- Desktop file: `/usr/share/applications/personal-hub.desktop`

## Building and Installing

### Build packages:
```bash
npm run build:linux
```

This creates both:
- `dist-electron/PersonalHub-1.0.6-x86_64.AppImage`
- `dist-electron/PersonalHub-1.0.6-amd64.deb` (recommended)

### Install the .deb package:
```bash
sudo apt install ./dist-electron/PersonalHub-1.0.6-amd64.deb
```

## Testing

### Development mode:
```bash
npm run electron:dev
```

### Installed version:
```bash
personal-hub
```

Both should now display the icon correctly in:
- Application launcher
- Taskbar
- Alt+Tab switcher
- Window title bar

## Workarounds for Persistent Issues

If icons still don't display correctly:

### Force X11 backend (most reliable):
```bash
GDK_BACKEND=x11 npm run electron:dev
```

### Set Electron Ozone hint:
```bash
ELECTRON_OZONE_PLATFORM_HINT=auto npm run electron:dev
```

## Related Files Modified
- `electron/main.cjs` - Added icon configuration
- `package.json` - Fixed build configuration and added Wayland flags
- `build/icon.png` - Replaced with working icon file
- `build/personal-hub.desktop` - Updated desktop entry file

## Known Issues
- AppImage may still have icon issues on some systems due to Wayland limitations
- The .deb package is the recommended distribution method for Ubuntu users