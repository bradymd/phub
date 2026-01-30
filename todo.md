# Personal Hub - Development Notes

## Recently Completed

### January 2026 - Latest Session

**Pets Panel** ✓
- Pet basic info: name, species, breed, DOB, gender, microchip, neutered, passport
- Health records: weight, allergies, conditions, medications, diet
- Vaccinations with booster due dates (triggers reminders)
- Vet visits with documents, costs, follow-up dates
- Pet insurance with renewal dates and document attachments
- Expandable sections for vaccinations, visits, and insurance details
- Reminders for: vaccination boosters, insurance renewal, follow-up appointments
- Grid and list views with search and summary cards

**Smart Panel Ordering** ✓
- Panels with alerts (overdue/due soon) now appear first on dashboard
- Usage tracking: frequently used panels rise in the list
- Time-decay scoring (recent usage counts more)
- Fallback to alphabetical order
- Settings panel shows panels alphabetically within categories

**Reminder System Improvements** ✓
- Real-time refresh: reminders update immediately when data changes
- Added `notifyDataChange()` mechanism to StorageContext
- All reminder-contributing panels now trigger refresh on save
- Fixed double-counting bug (was caused by shallow copy in React StrictMode)

**Dental Panel** ✓
- Surgery/practice details with autocomplete from history
- Patient name with autocomplete (family members)
- Appointment types and times
- Cost tracking with payment methods
- Next appointment dates with reminders
- Document attachments
- Future appointments sorted to top, past sorted by most recent

---

## TODO: Auto-Updates with electron-updater (Before Public Release)

**Priority: High** - Essential for distributing updates to users

### How It Works
- App checks GitHub releases on startup
- Notifies user when new version available
- Downloads and installs automatically (on restart)

### Platform Support
| Platform | Update Method | Code Signing |
|----------|--------------|--------------|
| Windows | Full automatic | Recommended (~$100-400/yr) to avoid "Unknown publisher" warning |
| macOS | Full automatic | **Required** ($99/yr Apple Developer) for auto-update to work |
| Linux AppImage | Full automatic | Not required |
| Linux .deb | Notification only | Not required |

### Implementation Steps

1. **Install package:**
   ```bash
   npm install electron-updater
   ```

2. **Add to electron/main.cjs:**
   ```javascript
   const { autoUpdater } = require('electron-updater');

   app.whenReady().then(() => {
     autoUpdater.checkForUpdatesAndNotify();
   });

   autoUpdater.on('update-available', () => {
     // Notify user
   });

   autoUpdater.on('update-downloaded', () => {
     // Prompt to restart
   });
   ```

3. **Configure package.json** - add publish config:
   ```json
   "build": {
     "publish": {
       "provider": "github",
       "owner": "bradymd",
       "repo": "phub"
     }
   }
   ```

4. **Release workflow:**
   - Bump version in package.json
   - Build: `npm run build:linux` (or build:all)
   - Create GitHub release, upload the built files
   - Users get notified automatically

---

## TODO: Data Versioning & Migration System (Before Public Release)

**Priority: High** - Required before distributing to other users

### Why This Matters
When data structures change between versions (add fields, rename fields, restructure), users' existing data needs to migrate cleanly. Without this, upgrades could corrupt or lose user data.

### Implementation Plan

1. **Add schema versioning to storage**
   ```typescript
   interface StoredData<T> {
     schemaVersion: number;
     data: T[];
   }
   ```

2. **Create migrations registry** (`src/services/migrations.ts`)
   - Define migrations per storage key
   - Each migration: `{ version: number, up: (oldData) => newData }`
   - Run migrations automatically on app load if version mismatch

3. **App versioning**
   - Use semantic versioning in package.json (MAJOR.MINOR.PATCH)
   - Store app version that created each backup
   - Check compatibility on restore

4. **Backup compatibility**
   - Include version metadata in backups
   - On restore: check version, run migrations if needed
   - Warn if backup is from newer version than app

5. **Platform distribution prep**
   - Windows: Code signing (avoid security warnings)
   - macOS: Code signing + notarization (Gatekeeper)
   - Linux: AppImage/deb/rpm packaging

### Storage Keys to Version
- `contacts`, `finance_items`, `vehicles`, `properties`, `medical_history`
- `dental_records`, `pets`, `budget_items`, `pension_items`
- `certificates`, `education`, `employment`, `documents_*`
- `panel_usage`, `kakeibo_*`

---

## Architecture Notes (Long-term Planning)

### Current State (14 panels)

**Strengths:**
- Central panel registry (`src/config/panels.ts`) - good decoupling
- Clean storage abstraction layer (LocalStorage/Tauri implementations)
- Security-first: master key wrapping, encrypted storage
- Consistent naming (*ManagerSecure components)

**Technical Debt to Address:**

1. **Component Size** - Several panels are 2000-3100 lines
   - PropertyManagerSecure: 3,124 LOC
   - VehicleManagerSecure: 3,047 LOC
   - PetsManagerSecure: 2,030 LOC

2. **Code Duplication** (~90% pattern repetition across panels)
   - Form state management (showAddForm, editingItem, newItem, etc.)
   - CRUD operations (load, add, update, delete)
   - Modal headers and structure
   - Date/currency formatting
   - Search/filter logic
   - Grid/list view toggle

3. **App.tsx Scaling** - Manual if-statements for each panel modal
   - Currently 15 conditionals, grows with each new panel

### Recommended Refactoring Priorities

**Priority 1: Extract Common Hooks**
```typescript
// hooks/useCRUDForm.ts - encapsulate form state + CRUD
// hooks/useListView.ts - manage grid/list/sort/filter
// hooks/useAsyncData.ts - loading/error/data pattern
```

**Priority 2: Extract UI Components**
```typescript
// components/ManagerModal.tsx - standard modal wrapper
// components/ListView.tsx - sortable/filterable list
// components/FormField.tsx - standardized inputs
```

**Priority 3: Consolidate Utilities**
```typescript
// utils/formatting.ts - date, currency (currently duplicated in 4+ files)
// utils/storage-keys.ts - centralized storage key registry
```

**Priority 4: Dynamic Panel Loading**
- Replace if-statements with panel component registry
- Add React.lazy for code splitting as panel count grows

### Scalability Path

| Panel Count | Risk Level | Actions Needed |
|-------------|-----------|----------------|
| 14 (current) | Low | Continue development |
| 20-25 | Medium | Extract hooks, consolidate utils |
| 30+ | High | Need full abstraction layer |

---

## PDF Viewing - Reference

Large PDFs need Blob URLs (Chromium limitation):

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

---

## Document Viewer Consistency

All panels should use:
- Dark header (#1a1a1a) with white text
- Download icon button (white, hover:bg-white/10)
- X close button (white, hover:bg-white/10)
- Full-screen dark overlay

---

## Future Panel Ideas

From docs/PANEL_PLUGIN_ARCHITECTURE.md:
- Subscriptions (recurring services, renewal dates)
- Warranties (product warranties, expiry tracking)
- Travel (bookings, itineraries)
- Gardening (plants, care schedules)
- Wine Cellar (collection, tasting notes)
- Books/Library (reading list, loans)
- Fitness (workouts, gym membership)

---

*Last updated: January 2026*
