# Personal Hub Design System

## Last Updated: 2026-01-28

## Current State: INCONSISTENT ⚠️

There is currently NO consistent design policy across panels. Each panel implements UI patterns differently, creating a confusing user experience.

## Major Inconsistencies Found

### 1. Button Placement

#### Property Panel (INCONSISTENT)
- **View Modal**: Edit/Close buttons at TOP RIGHT in header
- **Position**: Part of modal header, inline with title
- **Style**: Edit button with icon, X button minimal

#### Vehicle Panel (PREFERRED ✓)
- **View Modal**: Edit/Close buttons at BOTTOM in footer
- **Position**: Full-width buttons after content, separated by border
- **Style**: Both buttons full-width, clear labels

### 2. Modal Structures

Different panels use different modal layouts:
- Some have actions in header
- Some have actions in footer
- Some use X button only
- Some use labeled Close button

### 3. Button Styles

No consistency in:
- Button colors (slate-600, blue-600, gray-200)
- Button sizes (p-2, px-3 py-2, px-4 py-2)
- Icon usage (some with, some without)
- Button grouping (flex gap-2, justify-between, etc.)

## Proposed Design System

### Modal Patterns

#### View Modal (Read-Only)
```
┌─────────────────────────────────────┐
│ Header                              │
│ ┌─────────────────────────────────┐ │
│ │ [Icon] Title          [X Close] │ │
│ │ Subtitle/Description            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Content Area                        │
│ [Scrollable content here]           │
│                                     │
│ Footer (Actions)                    │
│ ┌─────────────────────────────────┐ │
│ │ [Edit Button]  [Close Button]   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Rules:**
1. **Header**: Title with icon, X button for quick close
2. **Content**: Main information, scrollable if needed
3. **Footer**: Action buttons at BOTTOM after content
4. **Border**: Separator between content and actions

#### Edit Modal
```
┌─────────────────────────────────────┐
│ Header                              │
│ ┌─────────────────────────────────┐ │
│ │ [Icon] Edit [Item Name]    [X]  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Form Content                        │
│ [Input fields]                      │
│                                     │
│ Footer (Actions)                    │
│ ┌─────────────────────────────────┐ │
│ │ [Save Button]  [Cancel Button]   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Button Standards

#### Primary Actions (Edit, Save, Add)
```tsx
className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
```

#### Secondary Actions (Close, Cancel)
```tsx
className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
```

#### Danger Actions (Delete)
```tsx
className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
```

#### Icon Buttons (inline actions)
```tsx
className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
```

### Icon Usage

#### Standard Icons (from lucide-react)
- **View**: Eye
- **Edit**: Edit2 (pencil)
- **Delete**: Trash
- **Close**: X
- **Add**: Plus
- **Save**: Save or Check
- **Cancel**: X or XCircle
- **Documents**: FileText
- **Download**: Download
- **Upload**: Upload

#### Icon Sizes
- **In buttons**: w-4 h-4
- **In headers**: w-5 h-5
- **Panel icons**: w-6 h-6
- **Large displays**: w-8 h-8

### Modal Sizing

#### Standard Widths
- **Small**: max-w-md (forms, confirmations)
- **Medium**: max-w-2xl (standard viewing)
- **Large**: max-w-4xl (detailed views, complex forms)
- **Full**: max-w-6xl (tables, comprehensive data)

#### Height
- **Max height**: max-h-[90vh] (always leave breathing room)
- **Scrollable**: overflow-y-auto on content area

### Color Palette

#### Status Colors
- **Success**: green-600/green-100
- **Warning**: orange-600/orange-100
- **Error**: red-600/red-100
- **Info**: blue-600/blue-100
- **Neutral**: gray-600/gray-100

#### Document Type Colors
```tsx
// Consistent document chip colors
const documentColors = {
  pdf: 'bg-red-100 text-red-700',
  image: 'bg-blue-100 text-blue-700',
  finance: 'bg-green-100 text-green-700',
  insurance: 'bg-purple-100 text-purple-700',
  maintenance: 'bg-orange-100 text-orange-700',
  default: 'bg-gray-100 text-gray-700'
};
```

### Form Patterns

#### Date Inputs
```tsx
<input
  type="date"
  value={dateValue}
  onChange={(e) => setValue(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
/>
```
**Note**: Always use type="date" for calendar picker support

#### Money Inputs
```tsx
<input
  type="number"
  step="0.01"
  min="0"
  value={amount}
  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
/>
```

### Spacing

#### Consistent Gaps
- **Button groups**: gap-2
- **Form fields**: gap-4
- **Sections**: gap-6
- **Cards**: p-4 or p-6

### Responsive Design

#### Breakpoints
- **Mobile**: Default
- **Tablet**: md: (768px)
- **Desktop**: lg: (1024px)
- **Wide**: xl: (1280px)

#### Grid Layouts
- **Mobile**: grid-cols-1
- **Tablet**: md:grid-cols-2
- **Desktop**: lg:grid-cols-3 or lg:grid-cols-4

## Implementation Priority

### Phase 1: Standardize View Modals (HIGH PRIORITY)
1. Move ALL Edit/Close buttons to footer
2. Use consistent button styles
3. Add border separator before actions
4. Implement Vehicle panel pattern everywhere

### Phase 2: Standardize Edit Modals
1. Consistent Save/Cancel placement
2. Uniform form layouts
3. Consistent validation displays

### Phase 3: Document Components
1. Create reusable DocumentChip component
2. Standardize document display colors
3. Uniform document action buttons

### Phase 4: Create Shared Components
```tsx
// src/components/ui/Modal.tsx
// src/components/ui/Button.tsx
// src/components/ui/FormField.tsx
// src/components/ui/DocumentChip.tsx
```

## Current Panel Audit

| Panel | View Modal Actions | Edit Modal Actions | Consistency |
|-------|-------------------|-------------------|-------------|
| Property | Top (header) | Bottom | ❌ |
| Vehicle | Bottom (footer) | Bottom | ✅ |
| Certificates | ? | ? | ❓ |
| Education | ? | ? | ❓ |
| Employment | ? | ? | ❓ |
| Health | ? | ? | ❓ |
| Finance | ? | ? | ❓ |
| Contacts | ? | ? | ❓ |
| Photos | ? | ? | ❓ |

## User Preference Statement

> "My preference is they browse through, then see the Edit and Close at the bottom like the vehicle items do."

**Decision**: Adopt Vehicle panel pattern as standard:
- Actions at BOTTOM of modal
- Clear visual hierarchy
- Natural reading flow (top to bottom)
- Actions after content consumption

## Next Steps

1. **Immediate**: Fix Property panel to match Vehicle panel
2. **Soon**: Audit and fix all other panels
3. **Future**: Extract common components
4. **Long-term**: Automated design system testing

## Design Principles

1. **Consistency**: Same patterns everywhere
2. **Predictability**: Users know where to look
3. **Clarity**: Clear visual hierarchy
4. **Efficiency**: Reusable components
5. **Accessibility**: Keyboard navigation, ARIA labels

## Component Library Needed

### Priority Components
1. `<ViewModal>` - Standardized view modal
2. `<EditModal>` - Standardized edit modal
3. `<Button>` - Consistent button styles
4. `<FormField>` - Consistent form inputs
5. `<DocumentChip>` - Document display
6. `<DateInput>` - Date picker wrapper
7. `<MoneyInput>` - Currency input
8. `<ConfirmDialog>` - Delete confirmations

## Testing Checklist

When implementing changes:
- [ ] Buttons in consistent position
- [ ] Consistent colors and sizes
- [ ] Proper icon usage
- [ ] Responsive on mobile
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Visual hierarchy clear
- [ ] Actions predictable

## Enforcement

1. Document all patterns here
2. Create component library
3. Code review checklist
4. Periodic design audits
5. User feedback incorporation