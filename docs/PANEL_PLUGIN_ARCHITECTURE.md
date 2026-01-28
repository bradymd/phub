# Panel Plugin Architecture - Design Exploration

## The Idea

Could panels be written to a standard convention, allowing:
- Central development of new panels
- Community contributions
- Users uploading/installing new panel types
- A "panel marketplace" concept

## Current Architecture

Each panel is currently a monolithic React component (~1500-2500 lines) containing:
- TypeScript interfaces (data models)
- State management (useState hooks)
- CRUD operations (create, read, update, delete)
- Document handling (upload, view, delete)
- UI rendering (forms, lists, modals, viewers)
- Styling (Tailwind classes)

**Tightly coupled to:**
- `useStorage` context (IndexedDB via Electron)
- `useDocumentService` context (encrypted file storage)
- Lucide React icons
- Tailwind CSS
- React patterns and hooks

## What a Plugin System Would Require

### 1. Panel Definition Schema

```typescript
interface PanelDefinition {
  id: string;
  name: string;
  icon: string;  // Icon name or SVG
  version: string;

  // Data model
  schema: {
    fields: FieldDefinition[];
    nestedCollections?: NestedCollectionDefinition[];
  };

  // UI configuration
  ui: {
    cardView: CardViewConfig;
    listView: ListViewConfig;
    detailView: DetailViewConfig;
    editForm: FormConfig;
    summaryCards?: SummaryCardConfig[];
  };

  // Business logic
  validation?: ValidationRules;
  computedFields?: ComputedFieldDefinition[];
  alerts?: AlertDefinition[];  // e.g., "MOT due soon"
}
```

### 2. Field Types to Support

```typescript
type FieldType =
  | 'text' | 'textarea' | 'number' | 'currency' | 'date'
  | 'select' | 'multiselect' | 'boolean' | 'email' | 'phone' | 'url'
  | 'documents'  // Special handling for file attachments
  | 'nested';    // Sub-collections (like service history in vehicles)
```

### 3. Runtime Panel Renderer

A generic component that:
- Parses the panel definition
- Generates forms dynamically
- Handles CRUD via standard storage API
- Renders views based on configuration

## Feasibility Assessment

### What's Achievable (Medium Effort)

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Basic CRUD forms | Medium | Field types, validation |
| List/Grid views | Medium | Sortable, searchable |
| Document attachments | Medium | Already have document service |
| Summary statistics | Medium | Count, sum, alerts |
| Date-based alerts | Low | "Due within 30 days" logic |

### What's Challenging (High Effort)

| Feature | Difficulty | Notes |
|---------|------------|-------|
| Complex nested data | High | Service history, maintenance items |
| Custom business logic | High | Panel-specific calculations |
| Conditional UI | High | "Show field X if field Y = Z" |
| Custom styling | Medium | Theming within constraints |
| Inter-panel relationships | Very High | "Link to vehicle" from insurance |

### What Would Be Compromised

1. **Flexibility** - Custom panels can do anything; schema-based panels are constrained
2. **Performance** - Runtime interpretation vs compiled components
3. **Complex interactions** - Nested modals, multi-step workflows
4. **Custom visualizations** - Charts, timelines, special displays
5. **Deep integrations** - Panels that need to interact with each other

## Architecture Options

### Option A: JSON Schema + Renderer (Simplest)

**Pros:**
- Panels defined as JSON files
- Easy to create, share, validate
- No code execution = secure
- Could be stored in user's data

**Cons:**
- Very limited functionality
- No custom logic
- Basic form generation only
- Would feel "generic"

**Effort:** 2-3 weeks for basic implementation

### Option B: DSL + Interpreter (Middle Ground)

A domain-specific language that allows:
- Field definitions
- Validation rules
- Simple computed fields
- Conditional display logic

**Pros:**
- More expressive than pure JSON
- Still sandboxed/safe
- Could handle 70% of use cases

**Cons:**
- Need to design and implement DSL
- Learning curve for panel creators
- Still can't do everything

**Effort:** 1-2 months

### Option C: Sandboxed JavaScript (Most Flexible)

Panels as JavaScript modules running in sandboxed environment.

**Pros:**
- Full flexibility
- Familiar to developers
- Can do almost anything

**Cons:**
- Security nightmare
- Need robust sandboxing (Web Workers, iframes)
- Dependency management
- Version compatibility issues

**Effort:** 2-3 months + ongoing security work

### Option D: Hybrid Approach (Recommended)

- **Core panels** remain as compiled React components (current approach)
- **Simple panels** can be JSON-defined for basic data tracking
- **Template system** for common patterns

```typescript
// User creates simple panel via UI or JSON
{
  "name": "Wine Collection",
  "icon": "wine",
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "vintage", "type": "number" },
    { "name": "region", "type": "text" },
    { "name": "purchasePrice", "type": "currency" },
    { "name": "purchaseDate", "type": "date" },
    { "name": "notes", "type": "textarea" },
    { "name": "documents", "type": "documents" }
  ],
  "listDisplay": ["name", "vintage", "region"],
  "cardColor": "rose"
}
```

**Effort:** 3-4 weeks for basic version

## Overhead Analysis

### Development Overhead
- Initial: 3-8 weeks depending on approach
- Ongoing: Maintenance of renderer, schema updates, bug fixes

### Runtime Overhead
- Schema parsing on load
- Dynamic form generation
- Additional abstraction layers
- Estimated: 10-20% slower than compiled panels

### User Experience Overhead
- Panel creator UI needed
- Documentation for schema format
- Debugging tools for custom panels

## Recommendation

**Start with Option D (Hybrid)** but keep scope minimal:

1. **Phase 1:** Create a "Custom List" panel type
   - User defines fields via UI
   - Basic CRUD only
   - No nested data, no documents initially
   - Proves the concept

2. **Phase 2:** Add document support
   - Attach files to custom list items
   - Re-use existing document service

3. **Phase 3:** Add templates
   - Pre-built schemas for common use cases
   - "Wine Collection", "Book Library", "Tool Inventory"

4. **Evaluate:** After Phase 3, assess if more complexity is warranted

## Does It Make Sense?

**Yes, if:**
- Users frequently want simple tracking lists
- You want to reduce development burden for basic panels
- Community contribution is a goal

**No, if:**
- Each panel needs unique, complex functionality
- Performance is critical
- Development resources are limited
- The 80/20 rule applies (20% of panels cover 80% of needs)

## Current Panels Analysis

| Panel | Could be schema-based? | Why/Why not |
|-------|----------------------|-------------|
| Vehicles | Partially | Service history nesting is complex |
| Property | Partially | Maintenance items, utilities are nested |
| Certificates | Yes | Simple list with documents |
| Education | Yes | Simple list with documents |
| Medical | Partially | Multiple sub-categories |
| Employment | Yes | Simple list with documents |
| Finance | No | Complex calculations, accounts |
| Contacts | Yes | Simple list |
| Budget/Kakeibo | No | Complex logic, calculations |

**Conclusion:** About 40% of current panels could potentially be schema-based, but the most useful panels (Vehicles, Property, Finance) need custom logic.

---

## Simpler Alternative: Panel Library (Recommended)

The plugin architecture above may be over-engineering. A simpler approach:

### The Problem Restated

- **Regional differences**: Property panel has UK-specific fields (Council Tax). US/EU users need different versions.
- **Niche interests**: Some users want Gardening, Wine Collection, Tool Inventory - but not everyone.
- **Bloat concern**: Shipping 50 panels when users need 10.

### Simple Solution: Ship All, Show Few

**Already have this infrastructure:**
- Panel Visibility Settings page exists
- Users can show/hide panels
- Settings persist per user

**What's needed:**
1. Develop more panels centrally (normal development)
2. Categorize panels:
   - **Core** (shown by default): Vehicles, Finance, Medical, Certificates, etc.
   - **Regional** (shown based on locale or preference): UK Property, US Property, EU Property
   - **Niche** (hidden by default): Gardening, Wine, Books, Tools, Recipes, etc.
3. Users enable what they want via existing Settings page
4. Updates bring new panels - users opt-in to show them

### Benefits Over Plugin System

| Aspect | Plugin System | Panel Library |
|--------|---------------|---------------|
| Development | Complex renderer + schema | Normal React components |
| Security | Sandboxing concerns | No third-party code |
| Quality | Variable (user-created) | Consistent (centrally developed) |
| Maintenance | Schema versioning issues | Standard code updates |
| User effort | Learn schema format | Just toggle on/off |

### Regional Panel Variants

```
panels/
  property/
    PropertyManagerUK.tsx      # Council Tax, UK terminology
    PropertyManagerUS.tsx      # HOA fees, US terminology
    PropertyManagerGeneric.tsx # Basic version
```

User selects region in settings, or panels auto-detect from locale.

### Niche Panel Examples

Could ship (hidden by default):
- **Gardening**: Plants, planting dates, care schedules, seed inventory
- **Wine/Spirits**: Cellar inventory, tasting notes, purchase history
- **Books**: Library, reading list, loans
- **Collections**: Generic collectibles (stamps, coins, etc.)
- **Recipes**: Recipe storage with ingredients, documents
- **Tools/Equipment**: Inventory, maintenance, manuals
- **Subscriptions**: Track recurring services, renewal dates
- **Warranties**: Product warranties, documents, expiry alerts

### Implementation Effort

| Task | Effort |
|------|--------|
| Add panel category metadata | 1 day |
| Update Settings page with categories | 1-2 days |
| Create one new niche panel | 2-3 days each |
| Regional property variants | 1 week |

**Total for infrastructure: ~1 week**
**Each new panel: 2-3 days**

### Contribution Model

- Users request panels via GitHub issues
- Community can submit PRs for new panels
- Panels reviewed for quality/security before merging
- Released in app updates

This is essentially how most apps work - VS Code extensions, but without the runtime loading complexity.

---

## Conclusion

**Don't build a plugin system.** Instead:

1. Keep developing panels as normal React components
2. Add more panels over time (regional variants, niche interests)
3. Improve the Panel Visibility Settings to categorize and filter
4. Let users toggle what they need
5. Accept community contributions via normal PR process

The "plugin" is just a hidden panel that ships with the app.

---

## Next Steps (Practical)

1. [ ] Add panel metadata (category, region, defaultVisible)
2. [ ] Update Settings page to show panels by category
3. [ ] Create PropertyManagerUS variant
4. [ ] Create 2-3 niche panels (Gardening? Subscriptions?)
5. [ ] Document panel development guidelines for contributors

---

*Updated: January 2026*
