# Personal Hub - Development Notes

## Recently Completed

### February 2026

**v1.0.4 Release** ✓
- My Files panel with custom categories (replaced empty Photos panel)
- Update notifications now display in GUI (not just terminal)
- Hourly update checks for long-running sessions
- PDF scroll fix (min-h-0 for flexbox overflow)
- Search input text color fix (Certificate, Education panels)
- Documentation cleanup (removed obsolete migration docs)

### January 2026

**Public Release v1.0.0** ✓
- Auto-updates via electron-updater
- GitHub releases as distribution mechanism
- .deb and AppImage packages for Linux

**Pets Panel** ✓
- Pet basic info, health records, vaccinations, vet visits, insurance
- Reminders for boosters, renewals, follow-ups

**Dental Panel** ✓
- Appointments, costs, documents, next appointment reminders

**Smart Panel Ordering** ✓
- Panels with alerts appear first, usage tracking, time-decay scoring

**Data Migration System** ✓
- Schema versioning (`src/services/migrations.ts`)
- Automatic migrations on app load
- Backup compatibility checking

---

## Current State

**Completed:**
- 14+ panels fully functional
- Encryption with master password
- Auto-update system
- Data migration framework
- PDF.js viewer (avoids font enumeration delay)

**Version:** 1.0.4

---

## TODO - Small Things

### Design Consistency
- [ ] Audit all panels for button placement (some top, some bottom)
- [ ] Standardize modal structures per `docs/DESIGN_SYSTEM.md`
- [ ] Create shared `<ViewModal>` and `<EditModal>` components

### Code Quality
- [ ] Extract common hooks: `useCRUDForm`, `useListView`
- [ ] Extract shared components: `FormField`, `DocumentChip`
- [ ] Consolidate `formatDate`/`formatCurrency` utilities

### UX Polish
- [ ] Add loading states to all async operations
- [ ] Consistent empty states across panels
- [ ] Keyboard navigation improvements

---

## TODO - Big Things

### Platform Support
- [ ] Windows build + testing
- [ ] macOS build + testing
- [ ] Code signing for Windows (avoid "Unknown publisher" warning)
- [ ] Code signing + notarization for macOS (required for auto-update)

### Performance
- [ ] React.lazy for panel code splitting (when panel count grows)
- [ ] Dynamic panel loading (replace if-statements in App.tsx)

### Technical Debt
- [ ] Split large components (Property: 3100 LOC, Vehicle: 3000 LOC)
- [ ] Reduce ~90% pattern duplication across panels

---

## Future Panel Ideas

From `docs/PANEL_PLUGIN_ARCHITECTURE.md`:
- Subscriptions (recurring services, renewal dates)
- Warranties (product warranties, expiry tracking)
- Travel (bookings, itineraries)
- Fitness (workouts, gym membership)
- Books/Library (reading list, loans)

---

## Reference Notes

### PDF Viewing
Large PDFs need Blob URLs. Using pdf.js instead of Chromium's PDFium to avoid font enumeration delays.

### Document Viewer Style
- Dark header (#1a1a1a) with white text
- Download and close buttons (white, hover:bg-white/10)
- Full-screen dark overlay

---

*Last updated: February 2026*
