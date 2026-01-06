# Personal Hub - Development Plan

## Project Vision

A **private, local-first** desktop application for organizing your entire life - from education and career history to contacts, documents, photos, and online accounts. This is a personal tool that stays on your machine, not in the cloud.

**Target Platform:** Linux desktop (eventual packaging as snap/container)
**Privacy First:** No cloud sync, no data collection, all data stays local
**Security Focus:** Encryption for sensitive data, especially passwords

---

## Current State Assessment

### What Works Well
- ✅ Document Manager (metadata tracking)
- ✅ Finance Manager (fully functional)
- ✅ Employment Manager (excellent - includes CV export)
- ✅ Photo Gallery (URL-based)
- ✅ Contacts Manager (complete)
- ✅ Virtual High Street (innovative website/credential manager)
- ✅ AI Overview (data aggregation dashboard)
- ✅ Beautiful UI with shadcn/ui components

### What Needs Work
- ⚠️ No actual file uploads/storage
- ⚠️ Passwords stored in plain text (localStorage)
- ⚠️ No encryption
- ⚠️ No data backup/export (except Employment)
- ⚠️ No search/filter functionality
- ⚠️ PasswordManager component exists but unused
- ⚠️ Photo uploads don't handle actual files

---

## Architecture Decisions

### Local-First Approach
Instead of building a traditional client-server architecture:

1. **Frontend:** React + Vite (current)
2. **Local Storage:**
   - Replace localStorage with **IndexedDB** (better for files)
   - Use **SQLite** via Tauri or Electron for structured data
3. **File Storage:** Local filesystem with organized directory structure
4. **Encryption:** Client-side encryption for sensitive data
5. **Packaging:** Tauri (Rust) or Electron (Node.js) for desktop app

### Technology Stack Options

#### Option A: Keep it Browser-Based (Simplest)
- Current: React + Vite
- Storage: IndexedDB + FileSystem API
- Pros: No rebuild needed, works immediately
- Cons: Limited file access, browser-dependent, less secure

#### Option B: Tauri Desktop App (Recommended)
- Frontend: React + Vite (keep current)
- Backend: Rust + SQLite
- Pros: Native performance, small binary, secure, cross-platform
- Cons: Need to learn Rust basics, requires rebuild

#### Option C: Electron Desktop App
- Frontend: React + Vite (keep current)
- Backend: Node.js + SQLite
- Pros: Easier for JS developers, mature ecosystem
- Cons: Larger binary size, more memory usage

**Recommendation:** Start with browser-based improvements (Option A), then migrate to Tauri (Option B) later for true desktop packaging.

---

## Development Phases

### Phase 1: Foundation & Security (PRIORITY)
**Goal:** Make what exists more robust and secure

1. **Replace localStorage with IndexedDB**
   - Better storage limits
   - Can store binary data (files)
   - More performant for large datasets

2. **Implement Encryption**
   - Use Web Crypto API
   - Encrypt passwords and sensitive financial data
   - User sets a master password on first launch
   - Derive encryption key from master password (PBKDF2)

3. **Add Input Validation**
   - Validate emails, URLs, dates
   - Prevent XSS and injection attacks
   - Better error messages

4. **Implement Data Export/Import**
   - Export all data to encrypted JSON file
   - Import from backup
   - Per-feature export (like Employment CV)

### Phase 2: File Management
**Goal:** Handle actual file uploads and storage

1. **Document Manager Upgrade**
   - Real file uploads (PDF, DOCX, images)
   - Store files in IndexedDB or FileSystem API
   - File preview functionality
   - Download/export files
   - File size management

2. **Photo Gallery Upgrade**
   - Real photo uploads
   - Thumbnail generation
   - Basic organization (albums, tags)
   - EXIF data extraction

3. **File Organization**
   - Create logical file structure
   - Deduplication
   - Compression for large files

### Phase 3: Search & Organization
**Goal:** Find anything quickly

1. **Global Search**
   - Search across all features
   - Fuzzy matching
   - Highlighted results

2. **Filtering & Sorting**
   - Per-feature filters
   - Custom sort options
   - Save filter presets

3. **Tags & Categories**
   - User-defined tags
   - Tag management UI
   - Tag-based filtering

### Phase 4: Enhanced Features
**Goal:** Make existing features more powerful

1. **Finance Manager**
   - Transaction history
   - Basic budgeting
   - Charts and trends
   - Investment tracking

2. **Employment Manager**
   - Skills tracking
   - Reference contacts
   - Interview preparation notes
   - Export to proper CV format (PDF, DOCX)

3. **Virtual High Street**
   - Password strength meter
   - Password generator
   - Breach checking (Have I Been Pwned API)
   - Two-factor authentication code storage

4. **Contacts Manager**
   - Contact groups
   - Relationship tracking
   - Important dates (birthdays)
   - Contact history/notes

### Phase 5: Desktop App Migration (Future)
**Goal:** Package as native Linux app

1. **Tauri Setup**
   - Integrate Tauri with existing React app
   - SQLite database setup
   - File system integration

2. **Native Features**
   - System tray icon
   - Keyboard shortcuts
   - File associations
   - Auto-backup scheduling

3. **Packaging**
   - .deb package
   - Snap package
   - AppImage
   - Flatpak

---

## Immediate Next Steps (Sprint 1)

Let me propose starting with one complete, working feature as a proof of concept:

### Option 1: Upgrade Document Manager (Most Practical)
- Implement real file uploads
- Store files in IndexedDB
- Add file preview
- Add encryption for sensitive documents
- Add export/import

### Option 2: Secure Virtual High Street (Most Critical)
- Implement master password
- Encrypt all passwords with Web Crypto API
- Add password generator
- Add password strength indicator
- Export/import encrypted vault

### Option 3: Fix & Enhance Employment Manager (Quick Win)
- Already mostly works
- Add skills section
- Improve CV export (PDF format)
- Add references section
- Add cover letter template

**Which would you like to start with?** I recommend Option 2 (Virtual High Street security) because:
1. Passwords are currently in plain text (security risk)
2. It's a focused scope
3. The encryption pattern can be reused for other features
4. It's the most concerning security issue

---

## Development Approach

### How We'll Work Together
1. **Small iterations** - Complete one feature at a time
2. **Git branches** - Create branch for each feature
3. **Testing** - You test after each change, provide feedback
4. **Documentation** - Update this file as we progress
5. **Rollback safety** - Git lets us revert if needed

### Code Quality Standards
- TypeScript strict mode
- Proper error handling
- Input validation
- Security best practices
- Clean, commented code
- Consistent patterns

### Testing Strategy
- Manual testing by you after each feature
- Test edge cases (empty states, large datasets)
- Test error handling
- Cross-browser testing (Chrome, Firefox)

---

## Security Considerations

### Current Risks
1. ⚠️ **CRITICAL:** Passwords in plain text in localStorage
2. ⚠️ **HIGH:** No encryption for financial data
3. ⚠️ **MEDIUM:** No input validation (XSS risk)
4. ⚠️ **LOW:** No backup mechanism (data loss risk)

### Security Roadmap
1. Master password implementation
2. Web Crypto API for encryption
3. PBKDF2 key derivation
4. Encrypted storage for sensitive fields
5. Auto-lock after inactivity
6. Secure password generation
7. Optional two-factor setup

### What We Won't Do (Out of Scope)
- Cloud sync (intentionally local-only)
- Multi-user support
- Network features
- Telemetry/analytics
- Automatic updates (until desktop app phase)

---

## Success Criteria

### Sprint 1 (First Complete Feature)
- [ ] One feature fully working with file uploads OR encryption
- [ ] Proper error handling
- [ ] User can backup/restore data for that feature
- [ ] Code is clean and well-documented
- [ ] Git history shows clear commits

### Overall Project
- [ ] All features handle real files/data
- [ ] All sensitive data encrypted
- [ ] Global search works
- [ ] Data export/import for disaster recovery
- [ ] Smooth user experience
- [ ] Ready for daily personal use

---

## Decision Points

### Question 1: Where to Start?
**Options:**
A. Secure the Virtual High Street (encrypt passwords)
B. Add real file uploads to Document Manager
C. Enhance Employment Manager with better export

**Your choice?** [Pending]

### Question 2: Storage Strategy?
**Options:**
A. Start with IndexedDB (browser-based)
B. Jump straight to Tauri + SQLite (requires app rebuild)

**Recommendation:** Start with A (IndexedDB), migrate to B later

### Question 3: Master Password?
**Should we implement a master password system for encryption?**
- Required for proper security
- User sets it on first launch
- Used to encrypt/decrypt sensitive data

**Your preference?** [Pending]

---

## Notes & Ideas

- Consider adding a "Life Timeline" view showing education → career → retirement
- Emergency contact quick access feature
- Document expiry reminders (passport, certifications)
- Password breach monitoring integration
- Secure notes feature for miscellaneous sensitive info
- Health records section (prescriptions, vaccinations, allergies)
- Vehicle information (maintenance logs, insurance)
- Property/asset tracking
- Goals and planning section

---

## Progress Log

### 2026-01-06
- ✅ Initial git repository created
- ✅ Comprehensive codebase analysis completed
- ✅ Development plan drafted
- 📋 Awaiting decision on Sprint 1 focus

---

## Resources & References

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [IndexedDB Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Tauri Framework](https://tauri.app/)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Last Updated:** 2026-01-06
**Status:** Planning Phase
**Next Action:** Choose Sprint 1 feature focus
