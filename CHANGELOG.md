# Changelog

All notable changes to Personal Hub are documented here.

## [Unreleased]

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
