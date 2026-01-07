# Technical Implementation Notes

**Last Updated:** 2026-01-07
**Purpose:** Critical technical details that must be preserved across context resets

---

## 🔐 Cryptography Implementation

### Password Hashing
- **Format:** Base64 (NOT hex!)
- **Algorithm:** SHA-256
- **Storage Key:** `master_password_hash` in localStorage
- **Implementation:** `src/utils/crypto.ts:hashPassword()`

```typescript
// Correct hash format (base64):
arrayBufferToBase64(new Uint8Array(hashBuffer))
// Example: "5K9k8h3j2l1m0n9o8p7q6r5s4t3u2v1w0x9y8z7a6b5c4d3e2f1="

// WRONG - Do NOT use hex:
hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
// Example: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

**Critical:** Any password verification code MUST use base64 format, or it will reject valid passwords!

### Encryption Implementation
- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Salt Length:** 16 bytes
- **IV Length:** 12 bytes
- **Storage Format:** Base64 string containing: `[salt(16) | iv(12) | encrypted_data]`

### Storage Keys (all encrypted)
```javascript
'virtual_street_encrypted'    // Website passwords
'finance_items_encrypted'     // Financial accounts
'documents_Certificates_encrypted'  // Birth cert, etc.
'documents_Education_encrypted'     // Diplomas, etc.
'documents_Health_encrypted'        // Medical records
'employment_records_encrypted'      // Work history
'contacts_encrypted'          // Personal contacts
'photos_encrypted'           // Photo gallery
```

---

## 🏗️ Architecture Decisions

### Storage Service Layer (Phase 1: LocalStorage)

**File:** `src/services/storage.ts`

**Current Implementation:** LocalStorageService
- Uses browser localStorage
- Encrypts ALL data before storage
- 5MB limit per domain (browser dependent)
- **Limitation:** Cannot handle large datasets (1,000+ entries causes slowdown)

**Interface:**
```typescript
interface StorageService {
  get<T>(key: string): Promise<T[]>;
  save<T>(key: string, items: T[], onProgress?: ProgressCallback): Promise<void>;
  add<T>(key: string, item: T): Promise<void>;
  update<T>(key: string, id: string, item: T): Promise<void>;
  delete(key: string, id: string): Promise<void>;
  clear(key: string): Promise<void>;
  clearAll(): Promise<void>;
}
```

**Factory Pattern:**
```typescript
export function createStorageService(masterPassword: string): StorageService {
  return new LocalStorageService(masterPassword);
  // Phase 2: return new IndexedDBService(masterPassword);
}
```

### React Context for Dependency Injection

**File:** `src/contexts/StorageContext.tsx`

**Purpose:** Eliminates prop-drilling of masterPassword through component tree

**Usage:**
```typescript
// In App.tsx:
<StorageProvider masterPassword={masterPassword}>
  <YourComponents />
</StorageProvider>

// In any child component:
const storage = useStorage();
const items = await storage.get('key');
```

---

## 📊 Data Import System

### CSV Import (1,733 Websites)

**Files:**
- `import-websites.js` - Node.js script to convert CSV → JSON
- `public/imported-websites.json` - Converted data (1,733 entries)
- `public/import.html` - Standalone HTML page for encrypted import

**Process:**
1. User runs: `node import-websites.js`
2. Script reads `/home/mb12aeh/src/phub/output.csv`
3. Converts to JSON with automatic categorization
4. User opens: `http://localhost:5173/import.html`
5. Enters master password
6. Data is encrypted and merged with existing entries

**Category Breakdown:**
- Other: 1,553
- Social: 92 (Google, Proton, Apple, etc.)
- Shopping: 66 (Amazon, eBay, etc.)
- Banking: 14 (PayPal, Coinbase, etc.)
- Entertainment: 8 (Spotify, Netflix, etc.)

**CSV Structure:**
```csv
type,name,url,email,username,note,totp,createTime,modifyTime,vault
login,amazon.co.uk,https://amazon.co.uk/,mark.brady@fabio.org.uk,,Autosaved,,1699192199,1699192199,Personal
```

**Note:** Password column (6th column) was removed using:
```bash
cut -d',' -f1-5,7- output.csv > output-no-passwords.csv
```

---

## 🔍 Search Implementation

### Virtual High Street Search (added 2026-01-07)

**File:** `src/app/components/VirtualHighStreetSecure.tsx`

**Features:**
- Real-time search across: name, URL, username, notes
- Category filter dropdown (All, Shopping, Banking, Social, Entertainment, Other)
- Results counter showing "X of Y websites"
- Works in both grid and list views

**Implementation:**
```typescript
const filteredEntries = entries.filter(entry => {
  if (filterCategory !== 'all' && entry.category !== filterCategory) {
    return false;
  }
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(query) ||
      entry.url.toLowerCase().includes(query) ||
      entry.username.toLowerCase().includes(query) ||
      entry.notes.toLowerCase().includes(query)
    );
  }
  return true;
});
```

**Performance Note:** With 1,733 entries, search is instant. If dataset grows to 10,000+, consider debouncing.

---

## ✏️ Edit Functionality

### Implementation Status: ✅ Complete (All Components)

**Pattern Used:**
1. State: `editingItem`, `showEditForm`
2. Function: `startEdit(item)` - Sets editing state
3. Function: `updateItem()` - Calls `storage.update()`
4. UI: Green-styled edit form (vs blue for add form)
5. Button: Edit icon with `stopPropagation()` to prevent parent click handlers

**Components with Edit:**
- ✅ VirtualHighStreetSecure - Edit websites
- ✅ FinanceManagerSecure - Edit finance items
- ✅ ContactsManagerSecure - Edit contacts
- ✅ PhotoGallerySecure - Edit photo metadata
- ✅ DocumentManagerSecure - Edit document names
- ✅ EmploymentManagerSecure - Edit employment records

**Critical Fix:** List view edit buttons required `e.stopPropagation()` to prevent event bubbling to parent click handlers.

```typescript
<button
  onClick={(e) => {
    e.stopPropagation();  // REQUIRED!
    startEdit(entry);
  }}
>
  <Edit className="w-4 h-4" />
</button>
```

---

## 🚧 Known Limitations

### 1. LocalStorage Performance
- **Problem:** With 1,733 websites, encryption/decryption takes ~500ms
- **Impact:** Noticeable delay when opening Virtual High Street
- **Solution:** Phase 2 migration to IndexedDB (see below)

### 2. LocalStorage Size Limit
- **Limit:** ~5MB per domain (varies by browser)
- **Current Usage:** ~2MB with 1,733 websites
- **Risk:** Adding photos or large documents will hit limit
- **Solution:** Phase 2 migration to IndexedDB (see below)

### 3. No Cross-Device Sync
- **Current:** Each browser has separate localStorage
- **Workaround:** Use export.html to export data, then import on other device
- **Future:** Could add cloud sync with end-to-end encryption (complex)

### 4. Import Page is Standalone
- **Issue:** `public/import.html` duplicates crypto logic from `src/utils/crypto.ts`
- **Risk:** If crypto implementation changes, import.html must be updated manually
- **Better Solution:** Create a React component for import instead of standalone HTML

---

## 🔮 Phase 2: IndexedDB Migration

### Why IndexedDB?

**Advantages:**
- **Size:** 50MB+ storage (vs 5MB for localStorage)
- **Performance:** Asynchronous API, won't block UI thread
- **Indexing:** Can search/filter without decrypting everything
- **Transactions:** Atomic operations, better data integrity

**Research:** User provided Perplexity research on localStorage vs IndexedDB (saved in conversation history)

### Migration Strategy

**Step 1:** Implement `IndexedDBService` class
```typescript
class IndexedDBService implements StorageService {
  private db: IDBDatabase;
  private masterPassword: string;

  async get<T>(key: string): Promise<T[]> {
    // Decrypt only what's needed
  }

  async save<T>(key: string, items: T[], onProgress?: ProgressCallback): Promise<void> {
    // Batch operations with progress tracking
  }

  // ... other methods
}
```

**Step 2:** Update factory to switch implementations
```typescript
export function createStorageService(masterPassword: string): StorageService {
  const useIndexedDB = localStorage.getItem('use_indexeddb') === 'true';

  if (useIndexedDB) {
    return new IndexedDBService(masterPassword);
  }
  return new LocalStorageService(masterPassword);
}
```

**Step 3:** Add migration UI
- Settings page with "Migrate to IndexedDB" button
- Shows progress bar during migration
- Falls back to localStorage if IndexedDB unavailable

**Step 4:** Test thoroughly
- Test with empty database
- Test with 1,733 websites
- Test concurrent operations
- Test browser compatibility (Chrome, Firefox, Safari)

### IndexedDB Schema (Proposed)

```javascript
// Database: personal_hub_v1
// Object Stores:
{
  websites: {
    keyPath: 'id',
    indexes: {
      category: 'category',
      name: 'name',
      url: 'url'
    }
  },
  finance: { keyPath: 'id' },
  documents: { keyPath: 'id', indexes: { category: 'category' } },
  employment: { keyPath: 'id' },
  contacts: { keyPath: 'id' },
  photos: { keyPath: 'id' }
}
```

**Encryption Strategy for IndexedDB:**
- **Option A:** Encrypt entire records (current approach, simple)
- **Option B:** Encrypt only sensitive fields, index on non-sensitive fields (complex, better search)
- **Recommendation:** Start with Option A, migrate to Option B if search performance is poor

---

## 🐛 Bugs Fixed This Session

### Bug 1: List View Edit Button Not Working
**File:** `VirtualHighStreetSecure.tsx`
**Problem:** Edit button only worked in grid view, not list view
**Root Cause:** Missing edit button in list view, event bubbling issues
**Fix:** Added edit button + `e.stopPropagation()`
**Date:** 2026-01-07

### Bug 2: Import Password Verification Failed
**File:** `public/import.html`
**Problem:** Valid password rejected as "wrong password"
**Root Cause:** Hash format mismatch (hex vs base64)
**Fix:** Changed from hex to base64 to match `crypto.ts`
**Date:** 2026-01-07

---

## 📁 File Structure (Important Files)

```
phub/
├── src/
│   ├── app/
│   │   ├── App.tsx                          # Main app, wraps with StorageProvider
│   │   └── components/
│   │       ├── VirtualHighStreetSecure.tsx  # Password manager (1,733 entries)
│   │       ├── FinanceManagerSecure.tsx     # Financial accounts
│   │       ├── ContactsManagerSecure.tsx    # Contacts
│   │       ├── PhotoGallerySecure.tsx       # Photos
│   │       ├── DocumentManagerSecure.tsx    # Documents (3 categories)
│   │       ├── EmploymentManagerSecure.tsx  # Employment history
│   │       ├── MasterPasswordSetup.tsx      # Initial setup
│   │       └── MasterPasswordUnlock.tsx     # Unlock screen
│   ├── contexts/
│   │   └── StorageContext.tsx               # React context for storage service
│   ├── services/
│   │   └── storage.ts                       # Storage service interface + LocalStorage impl
│   └── utils/
│       └── crypto.ts                        # Encryption utilities (AES-256-GCM)
├── public/
│   ├── import.html                          # Standalone import page
│   └── imported-websites.json               # 1,733 converted websites
├── import-websites.js                       # CSV → JSON converter
├── output.csv                               # Original CSV (1,733 websites)
├── NEXT_SESSION.md                          # Session continuity notes
├── TECHNICAL_NOTES.md                       # This file (implementation details)
└── README.md                                # Project overview
```

---

## 🔧 Dev Commands

```bash
# Start dev server
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Convert CSV to JSON
node import-websites.js

# Import data
# → Open http://localhost:5173/import.html

# Git operations
git status
git add .
git commit -m "message"
git push origin main
```

---

## 💡 Future Enhancements (Post-IndexedDB)

### 1. Virtual Scrolling
- **When:** After 10,000+ entries
- **Library:** react-window or react-virtualized
- **Benefit:** Render only visible items, improve performance

### 2. Offline PWA
- **What:** Progressive Web App with service worker
- **Benefit:** Works offline, installable on desktop/mobile
- **Complexity:** Medium (need to cache all assets)

### 3. Biometric Unlock
- **What:** Use WebAuthn for fingerprint/face unlock
- **Benefit:** Faster unlock, still secure
- **Complexity:** High (browser support varies)

### 4. Cloud Sync (End-to-End Encrypted)
- **What:** Sync encrypted data across devices
- **Benefit:** Access from any device
- **Complexity:** Very High (need backend, key management)

### 5. Password Audit
- **What:** Check for weak/reused passwords
- **Benefit:** Improve security posture
- **Complexity:** Low (can use zxcvbn library)

### 6. Import from Other Password Managers
- **What:** Import from 1Password, LastPass, Bitwarden
- **Benefit:** Easier migration
- **Complexity:** Medium (need parsers for each format)

---

## ⚠️ Security Notes

### What's Secure
- ✅ Master password never stored (only hash)
- ✅ All sensitive data encrypted with AES-256-GCM
- ✅ PBKDF2 with 100,000 iterations (prevents brute force)
- ✅ Random salt and IV for each encryption
- ✅ Data encrypted before leaving JavaScript (no plain text in localStorage)

### What's NOT Secure
- ❌ No protection if browser is compromised (keylogger, malware)
- ❌ No protection if laptop unlocked and browser open
- ❌ No rate limiting on password attempts (could brute force in DevTools)
- ❌ No backup/recovery if master password forgotten
- ❌ Import page (`import.html`) could be phished (no domain verification)

### Best Practices
1. Use a strong, unique master password
2. Lock your laptop when away (OS level)
3. Close browser when not using the app
4. Export data regularly as backup (encrypted)
5. Don't access on public/shared computers

---

## 📞 Contact / Support

**User:** bradymd
**Email:** bradymd@protonmail.com
**GitHub:** https://github.com/bradymd/phub

**Claude Sessions:** This is a multi-session project. If context is lost:
1. Read this file (TECHNICAL_NOTES.md)
2. Read NEXT_SESSION.md
3. Read README.md
4. Check recent git commits for changes

---

**Last Updated:** 2026-01-07 17:30
**Next Review:** When starting Phase 2 (IndexedDB migration)
