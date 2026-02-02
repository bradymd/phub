/**
 * Panel Registry
 *
 * Central configuration for all panels in the application.
 * Panels can be shown/hidden by users via Settings.
 *
 * To add a new panel:
 * 1. Create the component in src/app/components/
 * 2. Add entry here with appropriate metadata
 * 3. Import and render in App.tsx
 */

import {
  Award,
  GraduationCap,
  Briefcase,
  Heart,
  Wallet,
  PiggyBank,
  Receipt,
  BookOpen,
  Car,
  Home,
  FolderOpen,
  Users,
  Store,
  Smile,        // Dental
  LucideIcon,
  // Future panel icons
  Flower2,      // Gardening
  Wine,         // Wine/Spirits
  Book,         // Books/Library
  Wrench,       // Tools
  UtensilsCrossed, // Recipes
  CreditCard,   // Subscriptions
  ShieldCheck,  // Warranties
  Plane,        // Travel
  Dumbbell,     // Fitness
  Palette,      // Art/Collectibles
  Music,        // Music
  Gamepad2,     // Games
  Baby,         // Family/Kids
  PawPrint,     // Pets
} from 'lucide-react';

// Panel group categories for organization in settings
export type PanelGroup =
  | 'core'        // Essential life admin panels
  | 'finance'     // Money-related panels
  | 'lifestyle'   // Hobbies and interests
  | 'regional'    // Region-specific variants
  | 'system';     // App system panels (backup, AI, etc.)

// Region tags for regional variants
export type Region = 'global' | 'uk' | 'us' | 'eu';

// Tailwind color classes for panel accents
export type PanelColor = 'amber' | 'indigo' | 'blue' | 'rose' | 'teal' | 'sky' | 'slate' | 'emerald' | 'orange' | 'cyan' | 'purple' | 'green' | 'pink';

export interface PanelDefinition {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;

  // Organization
  group: PanelGroup;

  // Visibility
  defaultVisible: boolean;  // Show by default for new users

  // Regional
  region: Region;           // 'global' = available everywhere

  // Appearance
  color: PanelColor;        // Accent color for the panel

  // Future expansion
  tags?: string[];          // Searchable tags
  version?: string;         // For tracking panel versions
  sortOrder?: number;       // Custom sort within group
}

// Type for panel IDs - update when adding new panels
export type PanelId =
  | 'certificates'
  | 'education'
  | 'employment'
  | 'health'
  | 'dental'
  | 'finance'
  | 'pensions'
  | 'budget'
  | 'kakeibo'
  | 'vehicles'
  | 'property'
  | 'files'
  | 'contacts'
  | 'websites'
  | 'pets'
  | 'holidayplans'
  // Future panels (uncomment as implemented)
  // | 'gardening'
  // | 'wine'
  // | 'books'
  // | 'tools'
  // | 'recipes'
  // | 'subscriptions'
  // | 'warranties'
  // | 'fitness'
  // | 'collectibles'
  // | 'property-us'
  ;

/**
 * Panel Registry
 *
 * All panels defined here with metadata.
 * Order here determines default display order.
 */
export const panels: PanelDefinition[] = [
  // ============================================
  // CORE - Essential life admin (shown by default)
  // ============================================
  {
    id: 'certificates',
    title: 'Certificates',
    icon: Award,
    description: 'Birth certificate, marriage license, and other official documents',
    group: 'core',
    defaultVisible: true,
    region: 'global',
    color: 'amber',
    tags: ['documents', 'official', 'birth', 'marriage', 'passport'],
    sortOrder: 1,
  },
  {
    id: 'education',
    title: 'Education',
    icon: GraduationCap,
    description: 'Diplomas, transcripts, and educational records',
    group: 'core',
    defaultVisible: true,
    region: 'global',
    color: 'indigo',
    tags: ['school', 'university', 'qualifications', 'degrees'],
    sortOrder: 2,
  },
  {
    id: 'employment',
    title: 'Employment',
    icon: Briefcase,
    description: 'Work history, roles, responsibilities, and achievements',
    group: 'core',
    defaultVisible: true,
    region: 'global',
    color: 'blue',
    tags: ['work', 'jobs', 'career', 'cv', 'resume'],
    sortOrder: 3,
  },
  {
    id: 'health',
    title: 'Health',
    icon: Heart,
    description: 'Medical records, conditions, medications, and appointments',
    group: 'core',
    defaultVisible: true,
    region: 'global',
    color: 'rose',
    tags: ['medical', 'doctor', 'hospital', 'prescriptions'],
    sortOrder: 4,
  },
  {
    id: 'dental',
    title: 'Dental',
    icon: Smile,
    description: 'Dental appointments, hygienist visits, and treatment records',
    group: 'core',
    defaultVisible: false,
    region: 'global',
    color: 'teal',
    tags: ['dentist', 'teeth', 'hygienist', 'checkup', 'dental'],
    sortOrder: 5,
  },
  {
    id: 'vehicles',
    title: 'Vehicles',
    icon: Car,
    description: 'Cars, insurance, MOT, service history, and running costs',
    group: 'core',
    defaultVisible: true,
    region: 'global',
    color: 'sky',
    tags: ['car', 'motorbike', 'insurance', 'mot', 'service'],
    sortOrder: 6,
  },
  {
    id: 'property',
    title: 'Property',
    icon: Home,
    description: 'Homes, mortgages, insurance, council tax, maintenance, and utilities',
    group: 'core',
    defaultVisible: true,
    region: 'uk',  // UK-specific (council tax)
    color: 'slate',
    tags: ['house', 'flat', 'mortgage', 'rent', 'utilities'],
    sortOrder: 7,
  },
  {
    id: 'contacts',
    title: 'Contacts',
    icon: Users,
    description: 'Important people, emergency contacts, and key relationships',
    group: 'core',
    defaultVisible: true,
    region: 'global',
    color: 'purple',
    tags: ['people', 'family', 'friends', 'emergency'],
    sortOrder: 8,
  },

  // ============================================
  // FINANCE - Money management
  // ============================================
  {
    id: 'finance',
    title: 'Banks & Savings',
    icon: Wallet,
    description: 'Bank accounts, savings accounts, and ISAs',
    group: 'finance',
    defaultVisible: true,
    region: 'global',
    color: 'emerald',
    tags: ['bank', 'savings', 'isa', 'accounts', 'money'],
    sortOrder: 1,
  },
  {
    id: 'pensions',
    title: 'Pensions',
    icon: PiggyBank,
    description: 'Retirement savings, workplace pensions, and SIPPs',
    group: 'finance',
    defaultVisible: true,
    region: 'global',
    color: 'pink',
    tags: ['retirement', 'pension', 'sipp', '401k'],
    sortOrder: 2,
  },
  {
    id: 'budget',
    title: 'Budget',
    icon: Receipt,
    description: 'Monthly expenses, bills, and direct debits',
    group: 'finance',
    defaultVisible: true,
    region: 'global',
    color: 'green',
    tags: ['expenses', 'bills', 'spending', 'direct debit'],
    sortOrder: 3,
  },
  {
    id: 'kakeibo',
    title: 'Kakeibo',
    icon: BookOpen,
    description: 'Mindful Japanese budgeting with the four pillars',
    group: 'finance',
    defaultVisible: false,  // Niche - hidden by default
    region: 'global',
    color: 'rose',
    tags: ['japanese', 'mindful', 'budgeting', 'savings'],
    sortOrder: 4,
  },

  // ============================================
  // LIFESTYLE - Hobbies and interests
  // ============================================
  {
    id: 'files',
    title: 'My Files',
    icon: FolderOpen,
    description: 'Organize files in custom categories',
    group: 'lifestyle',
    defaultVisible: true,
    region: 'global',
    color: 'blue',
    tags: ['files', 'documents', 'photos', 'receipts', 'storage'],
    sortOrder: 1,
  },
  {
    id: 'websites',
    title: 'Websites',
    icon: Store,
    description: 'Your virtual high street of favorite websites and logins',
    group: 'lifestyle',
    defaultVisible: true,
    region: 'global',
    color: 'indigo',
    tags: ['bookmarks', 'logins', 'passwords', 'links'],
    sortOrder: 2,
  },
  {
    id: 'pets',
    title: 'Pets',
    icon: PawPrint,
    description: 'Pet records, vet visits, vaccinations, and insurance',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    color: 'orange',
    tags: ['pets', 'dog', 'cat', 'vet', 'vaccinations', 'animals'],
    sortOrder: 3,
  },
  {
    id: 'holidayplans',
    title: 'Holiday Plans',
    icon: Plane,
    description: 'Plan holidays with accommodation, travel, activities, and documents',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    color: 'cyan',
    tags: ['holiday', 'vacation', 'travel', 'trip', 'flights', 'hotels', 'booking'],
    sortOrder: 4,
  },

  // ============================================
  // FUTURE PANELS - Templates for expansion
  // Uncomment and implement as needed
  // ============================================

  /*
  {
    id: 'gardening',
    title: 'Garden',
    icon: Flower2,
    description: 'Plants, planting schedules, garden layout, and care reminders',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['plants', 'garden', 'flowers', 'vegetables'],
    sortOrder: 10,
  },
  {
    id: 'wine',
    title: 'Wine Cellar',
    icon: Wine,
    description: 'Wine collection, tasting notes, and cellar inventory',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['wine', 'cellar', 'collection', 'tasting'],
    sortOrder: 11,
  },
  {
    id: 'books',
    title: 'Library',
    icon: Book,
    description: 'Book collection, reading list, and loans',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['books', 'reading', 'library', 'ebooks'],
    sortOrder: 12,
  },
  {
    id: 'tools',
    title: 'Tools & Equipment',
    icon: Wrench,
    description: 'Tool inventory, manuals, and maintenance schedules',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['tools', 'equipment', 'diy', 'manuals'],
    sortOrder: 13,
  },
  {
    id: 'recipes',
    title: 'Recipes',
    icon: UtensilsCrossed,
    description: 'Favorite recipes, meal plans, and cooking notes',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['cooking', 'food', 'recipes', 'meals'],
    sortOrder: 14,
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    icon: CreditCard,
    description: 'Recurring subscriptions, streaming services, and renewals',
    group: 'finance',
    defaultVisible: false,
    region: 'global',
    tags: ['subscription', 'recurring', 'streaming', 'membership'],
    sortOrder: 10,
  },
  {
    id: 'warranties',
    title: 'Warranties',
    icon: ShieldCheck,
    description: 'Product warranties, guarantees, and expiry tracking',
    group: 'core',
    defaultVisible: false,
    region: 'global',
    tags: ['warranty', 'guarantee', 'appliances', 'electronics'],
    sortOrder: 10,
  },
  {
    id: 'pets',
    title: 'Pets',
    icon: PawPrint,
    description: 'Pet records, vet visits, vaccinations, and insurance',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['pets', 'dog', 'cat', 'vet', 'vaccinations'],
    sortOrder: 15,
  },
  {
    id: 'travel',
    title: 'Travel',
    icon: Plane,
    description: 'Trip planning, bookings, itineraries, and travel documents',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['travel', 'holidays', 'flights', 'hotels', 'trips'],
    sortOrder: 16,
  },
  {
    id: 'fitness',
    title: 'Fitness',
    icon: Dumbbell,
    description: 'Workout plans, gym memberships, and fitness goals',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['gym', 'exercise', 'workout', 'health'],
    sortOrder: 17,
  },
  {
    id: 'collectibles',
    title: 'Collections',
    icon: Palette,
    description: 'Collectibles, art, stamps, coins, and valuables',
    group: 'lifestyle',
    defaultVisible: false,
    region: 'global',
    tags: ['collection', 'art', 'stamps', 'coins', 'antiques'],
    sortOrder: 18,
  },

  // Regional variants
  {
    id: 'property-us',
    title: 'Property (US)',
    icon: Home,
    description: 'Homes, mortgages, HOA, property taxes, and utilities',
    group: 'regional',
    defaultVisible: false,
    region: 'us',
    tags: ['house', 'mortgage', 'hoa', 'property tax'],
    sortOrder: 1,
  },
  */
];

// ============================================
// Helper functions
// ============================================

/**
 * Get panels filtered by group
 */
export function getPanelsByGroup(group: PanelGroup): PanelDefinition[] {
  return panels
    .filter(p => p.group === group)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
}

/**
 * Get all panel groups with their panels
 */
export function getPanelGroups(): { group: PanelGroup; label: string; panels: PanelDefinition[] }[] {
  const groupLabels: Record<PanelGroup, string> = {
    core: 'Core',
    finance: 'Finance',
    lifestyle: 'Lifestyle',
    regional: 'Regional',
    system: 'System',
  };

  const groups: PanelGroup[] = ['core', 'finance', 'lifestyle', 'regional', 'system'];

  return groups
    .map(group => ({
      group,
      label: groupLabels[group],
      panels: getPanelsByGroup(group),
    }))
    .filter(g => g.panels.length > 0);
}

/**
 * Get default visible panel IDs for new users
 */
export function getDefaultVisiblePanels(): string[] {
  return panels
    .filter(p => p.defaultVisible)
    .map(p => p.id);
}

/**
 * Get panel by ID
 */
export function getPanel(id: string): PanelDefinition | undefined {
  return panels.find(p => p.id === id);
}

/**
 * Get panels for a specific region (includes global panels)
 */
export function getPanelsForRegion(region: Region): PanelDefinition[] {
  return panels.filter(p => p.region === 'global' || p.region === region);
}
