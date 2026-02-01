# Personal Hub Design System

## Last Updated: 2026-02-01

This document defines the UI patterns used across panels. Follow these guidelines when creating or modifying panels.

## Modal Patterns

### View Modal (Read-Only)
```
+-------------------------------------+
| Header                              |
| +----------------------------------+|
| | [Icon] Title           [X Close] ||
| | Subtitle/Description             ||
| +----------------------------------+|
|                                     |
| Content Area (scrollable)           |
|                                     |
| Footer (border-t separator)         |
| +----------------------------------+|
| | [Edit Button]   [Close Button]   ||
| +----------------------------------+|
+-------------------------------------+
```

**Rules:**
1. Title with icon in header, X button for quick close
2. Content area scrollable if needed
3. Action buttons at BOTTOM in footer
4. Use `border-t` separator before footer

### Edit Modal
```
+-------------------------------------+
| Header                              |
| +----------------------------------+|
| | [Icon] Edit [Item Name]     [X]  ||
| +----------------------------------+|
|                                     |
| Form Content                        |
|                                     |
| Footer (border-t separator)         |
| +----------------------------------+|
| | [Save Button]   [Cancel Button]  ||
| +----------------------------------+|
+-------------------------------------+
```

## Button Standards

### Primary Actions (Edit, Save, Add)
```tsx
className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
```

### Secondary Actions (Close, Cancel)
```tsx
className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
```

### Danger Actions (Delete)
```tsx
className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
```

### Icon Buttons (inline actions)
```tsx
className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
```

## Icons (lucide-react)

| Action | Icon | Size |
|--------|------|------|
| View | Eye | w-4 h-4 |
| Edit | Edit2 | w-4 h-4 |
| Delete | Trash | w-4 h-4 |
| Close | X | w-4 h-4 |
| Add | Plus | w-4 h-4 |
| Save | Save or Check | w-4 h-4 |
| Documents | FileText | w-4 h-4 |
| Download | Download | w-4 h-4 |

Header icons: w-5 h-5, Panel icons: w-6 h-6

## Modal Sizing

| Size | Class | Use Case |
|------|-------|----------|
| Small | max-w-md | Confirmations, simple forms |
| Medium | max-w-2xl | Standard viewing |
| Large | max-w-4xl | Detailed views, complex forms |
| Full | max-w-6xl | Tables, comprehensive data |

Always use `max-h-[90vh]` and `overflow-y-auto` on content.

## Colors

### Status Colors
| Status | Background | Text |
|--------|------------|------|
| Success | green-100 | green-700 |
| Warning | orange-100 | orange-700 |
| Error | red-100 | red-700 |
| Info | blue-100 | blue-700 |

### Document Chips
```tsx
const documentColors = {
  pdf: 'bg-red-100 text-red-700',
  image: 'bg-blue-100 text-blue-700',
  finance: 'bg-green-100 text-green-700',
  insurance: 'bg-purple-100 text-purple-700',
  default: 'bg-gray-100 text-gray-700'
};
```

Documents displayed as clickable chips, not rows with buttons.

## Form Patterns

### Input Fields
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

### Date Inputs
Always use `type="date"` for calendar picker support.

### Money Inputs
```tsx
<input type="number" step="0.01" min="0" />
```

## Spacing

| Context | Gap |
|---------|-----|
| Button groups | gap-2 |
| Form fields | gap-4 |
| Sections | gap-6 |
| Card padding | p-4 or p-6 |

## Responsive Grids

```tsx
// Cards/items
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Form fields
className="grid grid-cols-1 md:grid-cols-2 gap-4"
```

## Design Principles

1. **Consistency**: Same patterns everywhere
2. **Predictability**: Users know where to look
3. **Actions at bottom**: Read content, then act
4. **Document chips**: Colored clickable badges, not button lists
5. **Clear hierarchy**: Headers > Content > Actions

## Checklist for New Panels

- [ ] View modal has footer with Edit/Close buttons
- [ ] Edit modal has footer with Save/Cancel buttons
- [ ] Uses `border-t` separator before actions
- [ ] Consistent button styles (slate-600 primary, gray-200 secondary)
- [ ] Documents displayed as colored chips
- [ ] Responsive grid layout
- [ ] Proper icon sizes
