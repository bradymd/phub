# Changelog

All notable changes to Personal Hub are documented here.

## [1.0.8] - 2026-02-05

### Fixed
- **Holiday Plans**: Car hire total cost now included in overall holiday cost calculation
- **Holiday Plans**: Car hire section now included in print summary
- **Pensions panel**: Fixed click propagation bug where clicking in edit form fields opened the details modal
- **Pensions panel**: Scroll position now preserved after saving edits (no longer jumps to top)
- **Update checker**: Now works for .deb package installs (directs to GitHub releases page)

### Changed
- **Pensions panel**: Notes text areas now vertically resizable

### Added
- **macOS build**: Added macOS support (.zip distribution)
- **Installation guide**: New `docs/INSTALLATION.md` with platform-specific instructions
- **AppStream metadata**: Added `com.personalhub.app.metainfo.xml` for Linux software center integration (App Details)

## [1.0.7] - 2026-02-03

### Fixed
- **Panel visibility persistence**: User visibility preferences now persist across backup/restore operations
  - Hidden panels no longer reset to defaults after restore
  - Panel usage statistics also preserved
- **Line break display in notes**: Fixed whitespace handling across all panels (7 panels, 10 locations)
  - Holiday Plans: travel, accommodation, car hire, itinerary, activities notes
  - Pets: insurance notes
  - Certificates: certificate notes in list view
  - Medical History: provider notes
  - Property: maintenance entry notes
  - Password Manager: entry notes
  - Virtual High Street: entry notes
- **Application icon on Ubuntu 24.04**: Fixed icon transparency and display issues

### Added
- **Search finds hidden panels**: Search bar now searches ALL panels regardless of visibility
  - Hidden panels shown in search results with "Hidden" badge
  - Info message: "Searching all panels (including hidden ones)"
- **Holiday Plans**: Accommodation balance payment tracking with reminders
- **Windows icon file** for electron-builder

### Changed
- Panel color gradients unified for consistent visual design

## [1.0.6] - 2026-02-02

### Added
- Help menu with About, Release Notes, Check for Updates, Report an Issue
- Alert badges on Pet section headers (Vaccinations, Vet Visits, Insurance) to show which section has overdue/due soon items
- "Mark as complete" button for follow-up dates (Health, Dental, Pets panels)
- Colored accent bars on dashboard panel cards for visual distinction
- Panels with reminders now auto-show on dashboard even if hidden in settings
- Property panel: Maintenance History now visible in View mode (not just Edit)
- Holiday Plans: Edit/Delete functionality for Notes & Documents section
- Demo data generator script for screenshots (scripts/generate-demo-data.cjs)
- Screenshots in README showcasing app features

## [1.0.5] - 2026-02-01

### Fixed
- PDF viewer now scrolls properly when zoomed in (min-h-0 flexbox fix)
- Search input text now visible in Certificate and Education panels
- AppImage documentation updated with --disable-gpu flag

### Changed
- Reorganized documentation (moved DESIGN_SYSTEM.md, TECHNICAL_NOTES.md to docs/)
- Removed obsolete migration documentation files
- Updated todo.md with current state

## [1.0.4] - 2026-01-31

### Added
- My Files panel with custom categories (replaces Photos panel)
- Hourly update checks for long-running sessions
- Update notifications now appear in the GUI

### Fixed
- Update notification timing (waits for React to mount)

## [1.0.3] - 2026-01-31

### Fixed
- Minor update notification improvements

## [1.0.2] - 2026-01-31

### Added
- My Files panel initial implementation

## [1.0.1] - 2026-01-31

### Added
- Version number display on main page

## [1.0.0] - 2026-01-31

### Added
- Initial public release
- Auto-updates via electron-updater
- GitHub releases distribution
- Linux packages (.deb, AppImage)

### Features
- 14 data management panels
- AES-256-GCM encryption with master password
- Automatic backup system
- Key Dates dashboard with reminders
- PDF.js viewer (avoids font enumeration delays)
- Smart panel ordering based on usage and alerts
