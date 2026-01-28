# Claude Session Notes - Personal Hub Project

## Last Updated: 2026-01-28

## Session Summary

### Issues Fixed Today
1. **Locale Configuration**
   - Fixed LANGUAGE and LANG environment variables (en_GB.UTF-8)
   - Resolved locale-related date picker issues

2. **Calendar Date Pickers**
   - Restored HTML5 date input calendar pickers across all components
   - Fixed Property panel date fields:
     - Moved In Date
     - Maintenance Last Done dates
     - Maintenance Next Due dates
   - Added CSS to ensure calendar icons are visible with Tailwind CSS
   - Removed manual DD/MM/YYYY text input parsing

## Code Quality Review

### Strengths
1. **Good Architecture**
   - Clean separation of concerns with panel registry system
   - Secure data handling with encryption
   - Modular component structure
   - TypeScript for type safety

2. **User Experience**
   - Consistent UI patterns across panels
   - Document display as clickable chips
   - Clear modal/dialog patterns
   - Responsive design

### Areas for Optimization

#### 1. Date Handling (PRIORITY)
- **Current State**: Mixed approach with HTML5 date inputs and formatDateUK utility
- **Issue**: The DateInput component exists but isn't being used
- **Recommendation**:
  - Either use DateInput component consistently across all panels
  - OR remove DateInput component and stick with native HTML5 date inputs
  - Current hybrid approach creates maintenance overhead

#### 2. Component Duplication
- **Issue**: Similar date input patterns repeated across multiple components
- **Recommendation**: Create shared form components:
  ```tsx
  // src/components/forms/DateField.tsx
  // src/components/forms/MoneyField.tsx
  // src/components/forms/DocumentUpload.tsx
  ```

#### 3. Performance Considerations
- **Large Data Sets**: Property maintenance items could benefit from virtualization
- **Document Handling**: Consider lazy loading for document previews
- **State Management**: Some components have complex local state that could benefit from useReducer

#### 4. Error Handling
- **Current**: Basic error handling in place
- **Improvement**: Add error boundaries and user-friendly error messages
- **Add**: Loading states for async operations

#### 5. Accessibility
- **Missing**: ARIA labels on some interactive elements
- **Needed**: Keyboard navigation improvements for modals
- **Add**: Focus management when opening/closing dialogs

## Technical Debt

1. **Unused Components**
   - DateInput.tsx created but not integrated
   - locale.ts utility created but not used
   - Decision needed: integrate or remove

2. **CSS Organization**
   - Calendar picker CSS added to theme.css
   - Consider moving to dedicated form-overrides.css file

3. **Type Safety**
   - Some 'any' types in event handlers
   - Missing interfaces for complex objects

## Design Patterns to Maintain

1. **Panel Registry Pattern** ✅
   - Central configuration in src/config/panels.ts
   - Dynamic panel loading based on user preferences

2. **Secure Storage Pattern** ✅
   - All data encrypted with master password
   - Storage context for data access

3. **Document Service Pattern** ✅
   - Centralized document handling
   - Blob URLs for large files

## Future Improvements

### High Priority
1. Consolidate date input approach (use DateInput component OR native, not both)
2. Create shared form components to reduce duplication
3. Add comprehensive error boundaries

### Medium Priority
1. Implement virtualization for large lists
2. Add loading states for all async operations
3. Improve keyboard navigation

### Low Priority
1. Add unit tests for critical components
2. Implement analytics for feature usage
3. Add data export functionality

## Environment Notes

- **Platform**: Linux (Ubuntu)
- **Locale**: en_GB.UTF-8 (British English)
- **Node Version**: Check with `node -v`
- **Electron**: Latest version in package.json
- **Build System**: Vite

## Git Repository

- **Remote**: https://github.com/bradymd/phub.git
- **Branch**: main
- **Status**: Up to date as of 2026-01-28
- **Recent Commits**:
  - Restore calendar date pickers for all date inputs
  - Fix backup restore to use full-replace model
  - Add Vehicle, Kakeibo panels and fix PDF viewing

## Important Reminders

1. **Never use Calendar Panel** - User explicitly doesn't want this
2. **Date inputs should have calendar pickers** - Use type="date"
3. **UK-focused app** - Property panel has Council Tax, dates in DD/MM/YYYY
4. **Test in Electron** - Not just browser, behavior can differ
5. **Maintain CLAUDE.md** - Keep instructions current for future sessions

## Component Status

### Completed & Working
- ✅ PropertyManagerSecure (with calendar pickers)
- ✅ VehicleManagerSecure
- ✅ DocumentManagerSecure
- ✅ CertificateManagerSecure
- ✅ EmploymentManagerSecure
- ✅ KakeiboManagerSecure
- ✅ All other existing panels

### Needs Review
- ⚠️ DateInput component (created but unused)
- ⚠️ locale.ts utility (created but unused)

## Testing Checklist

When making changes:
1. [ ] Test date inputs show calendar picker
2. [ ] Test data saves correctly
3. [ ] Test document upload/view
4. [ ] Test in both light and dark themes
5. [ ] Verify no console errors
6. [ ] Check responsive layout

## Contact & Support

- Repository: https://github.com/bradymd/phub
- Report issues at: https://github.com/anthropics/claude-code/issues