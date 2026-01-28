# Personal Hub - TODO List

## Critical Issues 🔴

### 1. Fix Orphaned Files Issue
**Priority: HIGH**
- [ ] Implement atomic delete operations
- [ ] Add transaction support for file + metadata operations
- [ ] Add verification after file deletion
- [ ] Create cleanup utility for existing orphaned files
- [ ] Add error recovery mechanism
- **Files**: `src/services/document-service.ts`, all `*ManagerSecure.tsx` components
- **Details**: See `ORPHANED_FILES_ANALYSIS.md`

### 2. Standardize UI/UX Across Panels
**Priority: HIGH**
- [ ] Fix Property panel - move Edit/Close buttons to bottom
- [ ] Audit all panels for consistency
- [ ] Implement Vehicle panel pattern as standard
- [ ] Create consistent modal layouts
- **Pattern**: Edit/Close buttons at BOTTOM of view modals
- **Details**: See `DESIGN_SYSTEM.md`

## Design System Implementation 🎨

### Phase 1: Quick Fixes
- [ ] Property panel - move view modal buttons to footer
- [ ] Certificates panel - standardize button placement
- [ ] Education panel - standardize button placement
- [ ] Employment panel - standardize button placement
- [ ] Health panel - standardize button placement
- [ ] All panels - use consistent button styles

### Phase 2: Component Library
- [ ] Create `src/components/ui/Modal.tsx`
- [ ] Create `src/components/ui/Button.tsx`
- [ ] Create `src/components/ui/FormField.tsx`
- [ ] Create `src/components/ui/DocumentChip.tsx`
- [ ] Create `src/components/ui/DateInput.tsx`
- [ ] Create `src/components/ui/MoneyInput.tsx`
- [ ] Create `src/components/ui/ConfirmDialog.tsx`

### Phase 3: Refactor to Use Components
- [ ] Replace all custom modals with Modal component
- [ ] Replace all buttons with Button component
- [ ] Replace all date inputs with DateInput component
- [ ] Replace all document displays with DocumentChip

## Technical Debt 💻

### Code Quality
- [ ] Remove unused DateInput component or integrate it
- [ ] Remove unused locale.ts utility or integrate it
- [ ] Fix TypeScript 'any' types
- [ ] Add proper error boundaries
- [ ] Improve error messages

### Performance
- [ ] Implement virtualization for large lists
- [ ] Add lazy loading for document previews
- [ ] Optimize bundle size
- [ ] Add loading states for all async operations

### Testing
- [ ] Add unit tests for critical functions
- [ ] Add integration tests for file operations
- [ ] Add E2E tests for main workflows
- [ ] Test with large datasets

## Feature Improvements ✨

### User Experience
- [ ] Add undo/redo functionality
- [ ] Add bulk operations (delete multiple)
- [ ] Add search across all panels
- [ ] Add data export functionality
- [ ] Add keyboard shortcuts
- [ ] Add drag-and-drop for documents

### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Improve keyboard navigation in modals
- [ ] Add focus management
- [ ] Add screen reader announcements
- [ ] Test with accessibility tools

### Security
- [ ] Add password strength meter
- [ ] Add 2FA option
- [ ] Add session timeout
- [ ] Add audit logging
- [ ] Review encryption implementation

## New Features (Lower Priority) 🌟

### Panels
- [ ] Add Warranties panel
- [ ] Add Subscriptions panel
- [ ] Add Travel panel
- [ ] Add Pets panel
- [ ] Add password manager panel

### Functionality
- [ ] Add data backup to cloud
- [ ] Add data sync between devices
- [ ] Add shared access (family members)
- [ ] Add reminders/notifications
- [ ] Add dashboard/overview page
- [ ] Add reports/analytics

## Documentation 📚

- [ ] Update README with better instructions
- [ ] Create user guide
- [ ] Document backup/restore process
- [ ] Create troubleshooting guide
- [ ] Add code comments
- [ ] Create API documentation

## DevOps 🔧

- [ ] Set up CI/CD pipeline
- [ ] Add automated tests
- [ ] Add code quality checks
- [ ] Set up error monitoring
- [ ] Add performance monitoring
- [ ] Create release process

## Completed Recently ✅

- [x] Fixed calendar date pickers
- [x] Created design system documentation
- [x] Analyzed orphaned files issue
- [x] Added comprehensive session notes
- [x] Updated git repository

## Priority Order

1. **Immediate** (This Week)
   - Fix orphaned files issue
   - Standardize Property panel UI
   - Create Modal and Button components

2. **Soon** (Next 2 Weeks)
   - Standardize all panel UIs
   - Create component library
   - Add error boundaries

3. **Next Month**
   - Add tests
   - Improve performance
   - Add accessibility features

4. **Future**
   - New panels
   - Cloud features
   - Advanced functionality

## Notes

- User preference: Edit/Close buttons at BOTTOM of modals (like Vehicle panel)
- UK-focused app (dates in DD/MM/YYYY, Council Tax, etc.)
- NO calendar panel (user specifically doesn't want this)
- All data encrypted with master password
- Electron + React + TypeScript stack

## How to Contribute

1. Pick an item from the TODO list
2. Create a branch
3. Follow patterns in `DESIGN_SYSTEM.md`
4. Test thoroughly
5. Submit PR

## Questions?

See:
- `CLAUDE.md` - Development instructions
- `DESIGN_SYSTEM.md` - UI/UX standards
- `ORPHANED_FILES_ANALYSIS.md` - Specific issue details
- `CLAUDE_SESSION_NOTES.md` - Recent development notes