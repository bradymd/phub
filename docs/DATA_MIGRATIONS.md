# Data Migrations Guide

This guide explains how to handle data changes when updating PersonalHub. Written for non-programmers with detailed examples.

## When Do You Need a Migration?

You need a migration when you change the **structure** of stored data:

| Change Type | Migration Needed? | Example |
|-------------|-------------------|---------|
| Add a new field to existing records | **YES** | Adding `email` field to contacts |
| Rename a field | **YES** | Changing `phone` to `phoneNumber` |
| Remove a field | **YES** (to clean up) | Removing unused `fax` field |
| Change field type | **YES** | Changing `cost` from string to number |
| Add a completely new panel | **NO** | Adding a new "Garden" panel |
| Change UI/display only | **NO** | Changing button colors |

## The Migration File

All migrations are defined in: `src/services/migrations.ts`

This file has two important parts:

### 1. Schema Versions

```typescript
export const SCHEMA_VERSIONS: Record<string, number> = {
  contacts: 1,        // Current version of contacts data
  vehicles: 1,        // Current version of vehicles data
  pets: 1,            // etc.
  // ... other data types
};
```

**The version number tells the app what structure to expect.**

### 2. Migrations Registry

```typescript
const migrations: Record<string, Migration[]> = {
  contacts: [],       // No migrations yet (still v1)
  vehicles: [],       // No migrations yet (still v1)
  pets: [],           // No migrations yet (still v1)
  // ... other data types
};
```

**This is where you add migration functions when you change data structure.**

---

## Example 1: Adding a New Field

**Scenario:** You want to add an `email` field to contacts.

### Step 1: Update the Schema Version

In `src/services/migrations.ts`, change:

```typescript
export const SCHEMA_VERSIONS: Record<string, number> = {
  contacts: 1,  // OLD
  // ...
};
```

To:

```typescript
export const SCHEMA_VERSIONS: Record<string, number> = {
  contacts: 2,  // NEW - bumped from 1 to 2
  // ...
};
```

### Step 2: Add the Migration Function

In the same file, find the `migrations` object and add:

```typescript
const migrations: Record<string, Migration[]> = {
  contacts: [
    {
      version: 2,
      description: 'Add email field to contacts',
      up: (data) => data.map(contact => ({
        ...contact,
        email: contact.email || ''  // Add email, default to empty string
      }))
    }
  ],
  // ... rest stays the same
};
```

### What This Does

When a user with old data (v1) opens the app:
1. App sees their data is v1, but current schema is v2
2. App runs the migration function
3. Each contact gets an `email` field added (empty by default)
4. User's data is now compatible with the new app

### Step 3: Update the Component

In `ContactsManagerSecure.tsx`, add the email field to:
- The TypeScript interface
- The form inputs
- The display

---

## Example 2: Renaming a Field

**Scenario:** You want to rename `phone` to `phoneNumber` in contacts.

### Step 1: Bump Version

```typescript
export const SCHEMA_VERSIONS: Record<string, number> = {
  contacts: 3,  // Bumped from 2 to 3
};
```

### Step 2: Add Migration

```typescript
const migrations: Record<string, Migration[]> = {
  contacts: [
    {
      version: 2,
      description: 'Add email field to contacts',
      up: (data) => data.map(contact => ({
        ...contact,
        email: contact.email || ''
      }))
    },
    {
      version: 3,
      description: 'Rename phone to phoneNumber',
      up: (data) => data.map(contact => ({
        ...contact,
        phoneNumber: contact.phoneNumber || contact.phone || '',  // Copy old value
        phone: undefined  // Remove old field
      }))
    }
  ],
};
```

**Note:** Migrations run in order. A user with v1 data will run both migrations (v1→v2→v3).

---

## Example 3: Adding a New Panel (No Migration Needed)

**Scenario:** You want to add a "Garden" panel.

**No migration is needed** because you're not changing existing data - you're adding a completely new data type.

### Just Do This:

1. Add to `SCHEMA_VERSIONS`:
   ```typescript
   garden_plants: 1,  // New data type starts at v1
   ```

2. Add empty migration array:
   ```typescript
   garden_plants: [],  // No migrations yet
   ```

3. Create the component (`GardenManagerSecure.tsx`)
4. Add to `panels.ts`
5. Add to `App.tsx`

---

## Example 4: Changing a Field Type

**Scenario:** The `cost` field in vehicles is stored as a string `"150.00"` but you want it as a number `150`.

### Step 1: Bump Version

```typescript
export const SCHEMA_VERSIONS: Record<string, number> = {
  vehicles: 2,
};
```

### Step 2: Add Migration

```typescript
const migrations: Record<string, Migration[]> = {
  vehicles: [
    {
      version: 2,
      description: 'Convert cost from string to number',
      up: (data) => data.map(vehicle => ({
        ...vehicle,
        // Convert each service entry's cost
        serviceHistory: (vehicle.serviceHistory || []).map(entry => ({
          ...entry,
          cost: typeof entry.cost === 'string'
            ? parseFloat(entry.cost) || 0
            : entry.cost
        }))
      }))
    }
  ],
};
```

---

## Understanding the Migration Function

Let's break down what a migration function does:

```typescript
{
  version: 2,                              // Target version
  description: 'Add email field',          // Human-readable description
  up: (data) => data.map(item => ({       // The transformation function
    ...item,                               // Keep all existing fields
    email: item.email || ''                // Add/ensure the new field
  }))
}
```

### The `up` Function Explained

```typescript
up: (data) => data.map(item => ({
  ...item,
  newField: item.newField || 'default'
}))
```

- `data` = array of all records (e.g., all contacts)
- `data.map(...)` = do something to each record
- `item` = one record (e.g., one contact)
- `...item` = copy all existing fields from that record
- `newField: ...` = add or modify a field

### Common Patterns

**Add a field with default value:**
```typescript
up: (data) => data.map(item => ({
  ...item,
  newField: item.newField || 'default value'
}))
```

**Add a field with empty array:**
```typescript
up: (data) => data.map(item => ({
  ...item,
  items: item.items || []
}))
```

**Rename a field:**
```typescript
up: (data) => data.map(item => ({
  ...item,
  newName: item.newName || item.oldName || '',
  oldName: undefined
}))
```

**Remove a field:**
```typescript
up: (data) => data.map(item => {
  const { fieldToRemove, ...rest } = item;
  return rest;
})
```

---

## Testing Migrations

Before releasing an update with migrations:

1. **Backup your data** (use the app's backup feature)
2. **Test with old data:**
   - Export your current data
   - Apply the code changes
   - Run the app
   - Verify data loads correctly
3. **Test fresh install:**
   - Clear all data
   - Run the app
   - Add new records
   - Verify new structure works

---

## Checklist for Data Changes

When changing data structure:

- [ ] Bump version in `SCHEMA_VERSIONS`
- [ ] Add migration function to `migrations` registry
- [ ] Update TypeScript interface in the component
- [ ] Update form inputs
- [ ] Update display code
- [ ] Test with existing data
- [ ] Test with fresh install
- [ ] Bump app version in `package.json`

---

## FAQ

**Q: What if I forget to add a migration?**
A: Old users' data won't have the new field. The app might crash or show errors when it tries to use the missing field.

**Q: Can I change multiple things in one migration?**
A: Yes, but it's cleaner to do one change per migration. If they're related, you can combine them.

**Q: What if a migration fails?**
A: The app will show an error. Users would need to restore from backup. Always test migrations thoroughly.

**Q: Do I need migrations for the Settings panel changes?**
A: No, settings visibility is stored separately (in localStorage) and doesn't need migrations.

**Q: What about document files (PDFs, images)?**
A: Document files aren't migrated - they're just binary files. Only the structured data (contacts, vehicles, etc.) needs migrations.
