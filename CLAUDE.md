# Claude Code Instructions for Personal Hub

This file contains important context for AI assistants working on this codebase.

## Project Overview

Personal Hub (phub) is an Electron + React + TypeScript application for secure personal data management. All data is encrypted with a master password.

## Key Architecture Decisions

### Panel System

**IMPORTANT: Panels are defined in a central registry.**

Location: `src/config/panels.ts`

When adding, modifying, or discussing panels:

1. **Panel definitions live in `src/config/panels.ts`** - NOT inline in App.tsx
2. Each panel has metadata:
   - `id`: Unique identifier
   - `title`: Display name
   - `icon`: Lucide icon component
   - `description`: Short description
   - `group`: 'core' | 'finance' | 'lifestyle' | 'regional' | 'system'
   - `defaultVisible`: Whether shown for new users (false = hidden by default)
   - `region`: 'global' | 'uk' | 'us' | 'eu'

3. **To add a new panel:**
   ```
   1. Add entry to src/config/panels.ts
   2. Create component in src/app/components/[Name]ManagerSecure.tsx
   3. Add import and rendering in src/app/App.tsx
   ```

4. **Niche panels should have `defaultVisible: false`** - Users opt-in via Settings

5. **Regional panels** (like UK Property with Council Tax) should have appropriate `region` tag

### UI Style Conventions

See `docs/STYLE_CONVENTIONS.md` for detailed UI patterns including:
- Document display (colored clickable chips, not separate buttons)
- Panel modal structure
- Form input handling (especially zero values)
- View vs Edit mode principles

### Storage API

```typescript
// CORRECT - three arguments
await storage.update('storeName', item.id, item);

// WRONG - will fail
await storage.update('storeName', item);
```

### Inline Editing in Clickable Cards

**NEVER use inline edit forms inside clickable card elements.** When a card has an `onClick` handler (e.g., to open a details view), embedding an edit form inline causes clicks on form fields to leak through to the parent card's handler, switching back to view mode. `stopPropagation` wrappers are unreliable for this.

**Always use a modal for editing**, even in grid view. The Pension panel was fixed for this - check other panels if they exhibit the same bug (click to edit, then clicking a field snaps back to view mode).

### Document Display

Documents should be displayed as **colored clickable chips**, not as rows with separate view buttons:
```tsx
<button onClick={() => viewFile(doc)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
  <FileText className="w-3 h-3" />
  {doc.filename}
</button>
```

### PDF Viewing

Large PDFs need Blob URLs, not data URLs:
```typescript
const dataUrlToBlobUrl = (dataUrl: string): string => {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'application/pdf';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  const blob = new Blob([array], { type: mimeType });
  return URL.createObjectURL(blob);
};
```

## File Locations

- Panel registry: `src/config/panels.ts`
- Panel components: `src/app/components/*ManagerSecure.tsx`
- Main app: `src/app/App.tsx`
- Storage context: `src/contexts/StorageContext.tsx`
- Document service: `src/services/document-service.ts`
- Design system: `docs/DESIGN_SYSTEM.md`
- Style conventions: `docs/STYLE_CONVENTIONS.md`
- Panel architecture: `docs/PANEL_PLUGIN_ARCHITECTURE.md`

## Document Categories

Currently defined document categories (in `src/services/document-service.ts`):
- `medical` - Medical History panel
- `education` - Education panel
- `certificates` - Certificates & Property panels (shared)
- `pets` - Pets panel
- `dental` - Dental panel
- `holiday_plans` - Holiday Plans panel

When adding document support to a new panel, you MUST add its category to both the type definition and the directory creation list.

## Important Development Considerations

### Print Function Updates

When adding new data sections or forms to existing panels, **you MUST update the print function** if one exists. Users expect to see ALL data in printed summaries.

Example: The Holiday Plans panel has these sections:
- Travelers
- Travel
- Accommodation
- Car Hire
- **Itinerary** (initially missing from print!)
- Activities
- Notes

Always check and update:
1. Look for print functions (e.g., `printHolidaySummary`, `printPanel`, etc.)
2. Add HTML generation for new sections in the same style
3. Maintain consistent formatting with existing sections
4. Test that all data appears in the print preview

### External Document Opening

For documents that can't be previewed in-browser (e.g., .docx, .xlsx, .pptx):
- Use `documentService.openDocumentExternal()` to open with system default application
- Provide clear UI feedback about what will happen
- This creates a temp file and opens it with the OS default handler

## Common Tasks

### Adding a New Panel - COMPLETE CHECKLIST

When adding a new panel, follow this checklist to ensure everything is properly integrated:

#### 1. Panel Definition
Add to `src/config/panels.ts`:
```typescript
{
  id: 'newpanel',  // Unique ID, lowercase, no spaces
  title: 'New Panel',
  icon: SomeIcon,  // Import from lucide-react
  description: 'Description here',
  group: 'lifestyle',  // or core, finance, regional, system
  defaultVisible: false,  // true for essential, false for niche
  region: 'global',  // or uk, us, eu
  tags: ['searchable', 'keywords'],  // For search functionality
}
```

#### 2. Component Implementation
Create `src/app/components/NewPanelManagerSecure.tsx`:
- Follow existing panel patterns for structure
- Choose a consistent store name (e.g., 'new_panel_items')
- Use storage API correctly: `storage.update('store_name', id, data)`
- If using documents, integrate with `documentService`

**IMPORTANT - Document Support Requirements:**
If your panel uses document uploads via `documentService`:
1. **Add your category to the DocumentCategory type** in `src/services/document-service.ts`:
   ```typescript
   export type DocumentCategory = '...' | 'your_panel_name';
   ```
2. **Add your category to the directory creation list** in `ensureDocumentDirectories()`:
   ```typescript
   const categories: DocumentCategory[] = [..., 'your_panel_name'];
   ```
3. **Use a consistent category name** when calling document methods:
   ```typescript
   documentService.saveDocument('your_panel_name', ...)
   documentService.loadDocument('your_panel_name', ...)
   documentService.deleteDocuments('your_panel_name', ...)
   ```
4. **Never assume the directory exists** - the DocumentService will create it on startup, but only if it's in the categories list!

#### 3. App Integration
In `src/app/App.tsx`:
- Add import statement
- Add to PanelId type union in `src/config/panels.ts`
- Add rendering conditional in the modal section

#### 4. Data Persistence & Backup
**CRITICAL**: The backup system automatically includes all `.encrypted.json` files from the data directory. Your panel's data will be backed up if:
- You use the standard storage API (`storage.get`, `storage.update`, etc.)
- Your store name creates a file like `[store_name].encrypted.json`
- Documents are stored via `documentService` (automatically backed up)

#### 5. Testing Checklist
- [ ] Panel appears in Settings under correct group
- [ ] Panel opens and closes properly
- [ ] Data persists after app restart
- [ ] Search works (if tags are set)
- [ ] Backup includes panel data (check data/[store_name].encrypted.json exists)
- [ ] Restore brings back panel data correctly
- [ ] Panel visibility setting persists

#### 6. Common Store Names (for consistency)
- `certificates` → `documents_certificates`
- `education` → `education_records`
- `health` → `medical_records`
- `dental` → `dental_records`
- `vehicles` → `vehicles`
- `property` → `properties`
- `contacts` → `contacts`
- `finance` → `finance_items`
- `pensions` → `pensions`
- `budget` → `budget_items` + `custom_categories`
- `kakeibo` → `kakeibo_months`
- `files` → `user_files` + `file_categories`
- `pets` → `pets`
- `holidayplans` → `holiday_plans`

### Checking Current Panels

```bash
grep -E "id:|defaultVisible:" src/config/panels.ts
```

## Development

```bash
npm run electron:dev  # Start development
```

## Notes

- This is a UK-based app originally (Property panel has Council Tax)
- Panels can be region-specific or global
- Users show/hide panels via Settings page
- New users only see `defaultVisible: true` panels
