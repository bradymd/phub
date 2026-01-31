/**
 * Data Migration System
 *
 * Handles schema versioning and automatic data migrations when the app updates.
 * Each storage key has its own schema version and migration chain.
 */

// Current schema versions for each data type
export const SCHEMA_VERSIONS: Record<string, number> = {
  contacts: 1,
  finance_items: 1,
  vehicles: 1,
  properties: 1,
  medical_history: 1,
  medical_profile: 1,
  dental_records: 1,
  pets: 1,
  budget_items: 1,
  pension_items: 1,
  certificates: 1,
  education: 1,
  employment: 1,
  panel_usage: 1,
  kakeibo_entries: 1,
  kakeibo_goals: 1,
  virtual_street: 1,
  user_files: 1,
  file_categories: 1,
};

// Type for migration function
type MigrationFn = (data: any[]) => any[];

// Migration definition
interface Migration {
  version: number;
  description: string;
  up: MigrationFn;
}

// Migrations registry - add new migrations here as schema changes
const migrations: Record<string, Migration[]> = {
  // Example migrations (currently all at v1, no migrations needed yet)
  // When you need to add a migration, add it like this:
  //
  // vehicles: [
  //   {
  //     version: 2,
  //     description: 'Add taxDueDate field',
  //     up: (data) => data.map(item => ({
  //       ...item,
  //       taxDueDate: item.taxDueDate || item.taxDate || ''
  //     }))
  //   },
  //   {
  //     version: 3,
  //     description: 'Add serviceHistory array',
  //     up: (data) => data.map(item => ({
  //       ...item,
  //       serviceHistory: item.serviceHistory || []
  //     }))
  //   }
  // ],

  contacts: [],
  finance_items: [],
  vehicles: [],
  properties: [],
  medical_history: [],
  medical_profile: [],
  dental_records: [],
  pets: [],
  budget_items: [],
  pension_items: [],
  certificates: [],
  education: [],
  employment: [],
  panel_usage: [],
  kakeibo_entries: [],
  kakeibo_goals: [],
  virtual_street: [],
  user_files: [],
  file_categories: [],
};

/**
 * Stored data wrapper with schema version
 */
export interface VersionedData<T = any> {
  schemaVersion: number;
  data: T[];
}

/**
 * Check if data needs migration
 */
export function needsMigration(storageKey: string, currentVersion: number): boolean {
  const targetVersion = SCHEMA_VERSIONS[storageKey];
  if (targetVersion === undefined) {
    console.warn(`Unknown storage key: ${storageKey}`);
    return false;
  }
  return currentVersion < targetVersion;
}

/**
 * Run migrations on data from currentVersion to latest
 */
export function migrateData<T>(
  storageKey: string,
  data: T[],
  fromVersion: number
): { data: T[]; toVersion: number } {
  const targetVersion = SCHEMA_VERSIONS[storageKey];
  if (targetVersion === undefined) {
    console.warn(`Unknown storage key: ${storageKey}`);
    return { data, toVersion: fromVersion };
  }

  const keyMigrations = migrations[storageKey] || [];
  let migratedData = data;
  let currentVersion = fromVersion;

  // Get migrations that need to run (versions > fromVersion, sorted ascending)
  const pendingMigrations = keyMigrations
    .filter(m => m.version > fromVersion && m.version <= targetVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pendingMigrations) {
    console.log(`Running migration for ${storageKey}: v${currentVersion} -> v${migration.version} (${migration.description})`);
    try {
      migratedData = migration.up(migratedData);
      currentVersion = migration.version;
    } catch (err) {
      console.error(`Migration failed for ${storageKey} v${migration.version}:`, err);
      throw new Error(`Migration failed: ${migration.description}`);
    }
  }

  return { data: migratedData, toVersion: currentVersion };
}

/**
 * Wrap raw data array with version info
 */
export function wrapWithVersion<T>(storageKey: string, data: T[]): VersionedData<T> {
  return {
    schemaVersion: SCHEMA_VERSIONS[storageKey] || 1,
    data
  };
}

/**
 * Unwrap versioned data, running migrations if needed
 */
export function unwrapAndMigrate<T>(
  storageKey: string,
  versionedData: VersionedData<T> | T[]
): T[] {
  // Handle legacy data (array without version wrapper)
  if (Array.isArray(versionedData)) {
    console.log(`Legacy data detected for ${storageKey}, assuming v1`);
    const { data } = migrateData(storageKey, versionedData, 1);
    return data;
  }

  // Handle versioned data
  const { schemaVersion, data } = versionedData;

  if (needsMigration(storageKey, schemaVersion)) {
    console.log(`Migrating ${storageKey} from v${schemaVersion} to v${SCHEMA_VERSIONS[storageKey]}`);
    const { data: migratedData } = migrateData(storageKey, data, schemaVersion);
    return migratedData;
  }

  return data;
}

/**
 * Get current app version from package.json (embedded at build time)
 */
export function getAppVersion(): string {
  // This will be replaced by the build process or read from electron
  return '1.0.0';
}

/**
 * Backup metadata including versions
 */
export interface BackupMetadata {
  appVersion: string;
  backupDate: string;
  schemaVersions: Record<string, number>;
}

/**
 * Create backup metadata
 */
export function createBackupMetadata(): BackupMetadata {
  return {
    appVersion: getAppVersion(),
    backupDate: new Date().toISOString(),
    schemaVersions: { ...SCHEMA_VERSIONS }
  };
}

/**
 * Check if backup is compatible with current app
 */
export function checkBackupCompatibility(metadata: BackupMetadata): {
  compatible: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check if backup is from a newer version
  const backupVersion = metadata.appVersion.split('.').map(Number);
  const currentVersion = getAppVersion().split('.').map(Number);

  if (backupVersion[0] > currentVersion[0]) {
    return {
      compatible: false,
      warnings: [`Backup is from a newer major version (${metadata.appVersion}). Please update the app first.`]
    };
  }

  // Check schema versions
  for (const [key, backupSchemaVersion] of Object.entries(metadata.schemaVersions)) {
    const currentSchemaVersion = SCHEMA_VERSIONS[key];
    if (currentSchemaVersion === undefined) {
      warnings.push(`Unknown data type in backup: ${key}`);
    } else if (backupSchemaVersion > currentSchemaVersion) {
      warnings.push(`Data type '${key}' is from a newer schema version`);
    }
  }

  return {
    compatible: true,
    warnings
  };
}
