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
- Style guide: `docs/STYLE_CONVENTIONS.md`
- Panel architecture notes: `docs/PANEL_PLUGIN_ARCHITECTURE.md`

## Common Tasks

### Adding a New Panel

1. Add to `src/config/panels.ts`:
```typescript
{
  id: 'newpanel',
  title: 'New Panel',
  icon: SomeIcon,
  description: 'Description here',
  group: 'lifestyle',  // or core, finance, regional
  defaultVisible: false,  // true for essential, false for niche
  region: 'global',
  tags: ['searchable', 'keywords'],
}
```

2. Create `src/app/components/NewPanelManagerSecure.tsx` following existing patterns

3. In `App.tsx`:
   - Add import
   - Add to PanelId type in `src/config/panels.ts`
   - Add rendering conditional

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
