# UI Style Conventions

This document tracks established UI patterns and conventions to maintain consistency across panels.

## Document Display

### View Mode (Read-only)
- **Clickable colored chips** - Documents displayed as colored pill/chip buttons
- Clicking the chip opens the document viewer
- Color-coded by document type:
  - Finance/Deeds: Blue (`bg-blue-100 text-blue-700 hover:bg-blue-200`)
  - Insurance: Green (`bg-green-100 text-green-700 hover:bg-green-200`)
  - Council Tax: Amber (`bg-amber-100 text-amber-700 hover:bg-amber-200`)
  - Maintenance: Purple (`bg-purple-100 text-purple-700 hover:bg-purple-200`)
  - Service History: Purple
  - Breakdown: Orange
- Layout: `flex flex-wrap gap-2` - chips flow horizontally
- Each chip: `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm`
- Icon: `FileText` at `w-3 h-3`

### Edit Mode
- Same colored chips as view mode
- Small trash icon button next to chip for removal
- Trash icon: `w-3 h-3 text-red-500 hover:bg-red-50`

### Document Viewer Modal
- Dark header (`#1a1a1a` / `bg-[#1a1a1a]`) with white text
- Filename displayed (truncated with ellipsis if long)
- Download icon button (white, `hover:bg-white/10`)
- X close button (white, `hover:bg-white/10`)
- Full-screen dark overlay for immersive viewing
- PDFs: Use Blob URLs (not data URLs) to handle large files

## Panel Layout

### Modal Structure
- Full-screen overlay: `fixed inset-0 bg-black/60 z-50 overflow-hidden`
- Inner card: `absolute inset-2 bg-white rounded-2xl shadow-2xl flex flex-col`
- Header: `bg-gradient-to-r from-slate-600 to-slate-800 text-white p-6 rounded-t-2xl`
- Content: `flex-1 overflow-y-auto min-h-0 p-6`

### Header Controls
Located in header bar (right side):
1. Search input (in header, not content area)
2. Grid/List view toggle buttons
3. Summary show/hide toggle (Eye/EyeOff icon)
4. Divider (`w-px h-8 bg-white/30 mx-1`)
5. Add button (white background, slate text)
6. Close X button

### Empty State
- Centered icon (large, muted color)
- "No [items] yet" heading
- Helpful subtext
- Add button (if no search query active)

## Form Inputs

### Number Inputs with Zero Values
- Use `value={field ?? ''}` not `value={field || ''}`
- The `??` operator preserves 0, while `||` treats 0 as falsy
- Handle empty string in onChange: `e.target.value === '' ? 0 : parseFloat(e.target.value)`

### Currency Fields
- Always show currency symbol in label: "Monthly Payment (£)"
- Use `step="0.01"` for decimal values
- Use `min="0"` to prevent negatives
- Add helpful placeholder if relevant (e.g., "0 if paid off")

## View vs Edit Sections

### Principle
- View mode should show ALL relevant data without needing to enter Edit mode
- Don't hide fields in view mode that have data
- Include notes/comments fields in view mode display

### Conditional Display
- Show sections if ANY relevant field has data
- Example: `{(field1 || field2 || field3 || docs?.length > 0) && (...section...)}`

## Colors by Category

- Vehicles: Slate/Gray gradient
- Property: Emerald/Green accent
- Finance: Blue
- Insurance: Green
- Medical: Red/Rose
- Education: Indigo
- Employment: Amber

## Storage API

### Update Method
```typescript
// Correct - three arguments
await storage.update('storeName', item.id, item);

// Wrong - missing id
await storage.update('storeName', item);
```

---

*Last updated: January 2026*
