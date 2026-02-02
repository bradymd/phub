/**
 * Demo Data Generator for Personal Hub Screenshots
 *
 * Creates fictional data for a demo user to showcase the app.
 *
 * Usage: node scripts/generate-demo-data.cjs <password>
 *
 * This will create encrypted data files in a 'demo-output' directory
 * that can be copied to the app's data directory.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Encryption functions (same as app uses)
// The app uses raw master key bytes directly (no PBKDF2 derivation for data)
// Format: base64(salt + iv + AES-GCM encrypted data)

const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// Global master key - set during initialization
let storedMasterKey = null;

function encryptWithMasterKey(data, masterKey) {
  // Generate random salt and IV (salt kept for format compatibility)
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Use master key directly (no derivation)
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);

  const jsonString = JSON.stringify(data);
  let encrypted = cipher.update(jsonString, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + encrypted + authTag
  const combined = Buffer.concat([salt, iv, encrypted, authTag]);

  // Return as base64 string (app expects this format)
  return combined.toString('base64');
}

// Demo data for Sarah Mitchell
const demoData = {
  // Properties - one house with upcoming insurance renewal
  properties: [
    {
      id: '1',
      address: '42 Harbourside Walk',
      postcode: 'BS1 4RN',
      propertyType: 'flat',
      financeType: 'mortgage',
      monthlyPayment: 1450,
      lender: 'Nationwide Building Society',
      movedInDate: '2019-06-15',
      financeEndDate: '2044-06-01',
      insuranceCompany: 'Aviva',
      insurancePolicyNumber: 'HOM-2847593',
      insuranceAnnualCost: 385,
      insuranceRenewalDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 18 days from now - due soon
      councilTaxBand: 'D',
      councilTaxAnnualCost: 2180,
      councilTaxAuthority: 'Bristol City Council',
      maintenanceItems: [
        {
          id: 'm1',
          name: 'Boiler Service',
          company: 'Bristol Gas Services',
          contactDetails: '0117 456 7890',
          annualCost: 95,
          lastDate: '2024-11-15',
          nextDueDate: '2025-11-15',
          documents: []
        }
      ],
      maintenanceHistory: [
        {
          id: 'mh1',
          date: '2024-08-20',
          type: 'repair',
          description: 'Dishwasher repair - replaced pump',
          contractor: 'Appliance Fix Bristol',
          cost: 145,
          documents: []
        }
      ],
      utilities: [
        {
          id: 'u1',
          type: 'energy',
          company: 'Octopus Energy',
          accountNumber: 'A-12847593',
          monthlyCost: 125,
          websiteUrl: 'octopus.energy'
        },
        {
          id: 'u2',
          type: 'broadband',
          company: 'Zen Internet',
          accountNumber: 'ZEN-847261',
          monthlyCost: 38,
          websiteUrl: 'zen.co.uk'
        }
      ],
      notes: 'Ground floor flat with small courtyard garden. Lease has 112 years remaining.',
      financeDocuments: [],
      insuranceDocuments: [],
      councilTaxDocuments: []
    }
  ],

  // Medical history - one with overdue follow-up
  medical_history: [
    {
      id: '1',
      date: '2024-10-15',
      condition: 'Annual Health Check',
      provider: 'Harbourside Medical Practice',
      practitioner: 'Dr. Helen Patel',
      notes: 'Routine annual checkup. Blood pressure slightly elevated - 142/88. Advised lifestyle changes.',
      followUpDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago - overdue
      documents: []
    },
    {
      id: '2',
      date: '2024-06-22',
      condition: 'Seasonal allergies',
      provider: 'Harbourside Medical Practice',
      practitioner: 'Dr. James Morrison',
      prescription: 'Cetirizine 10mg daily',
      notes: 'Hay fever symptoms. Prescribed antihistamines.',
      documents: []
    }
  ],

  // Dental records
  dental_records: [
    {
      id: '1',
      surgeryName: 'Park Street Dental',
      surgeryAddress: '28 Park Street, Bristol BS1 5JA',
      surgeryPhone: '0117 929 4567',
      practitionerName: 'Dr. Sarah Chen',
      practitionerType: 'dentist',
      patientName: 'Sarah Mitchell',
      date: '2024-09-10',
      type: 'checkup',
      description: 'Routine 6-month checkup. No issues found.',
      cost: 25,
      paymentMethod: 'plan',
      nextAppointmentDate: '2025-03-10',
      documents: []
    }
  ],

  // Budget - monthly expenses
  budget_items: [
    {
      id: '1',
      name: 'Mortgage',
      amount: 1450,
      frequency: 'monthly',
      category: 'housing',
      type: 'expense',
      isDirectDebit: true,
      dayOfMonth: 1
    },
    {
      id: '2',
      name: 'Council Tax',
      amount: 182,
      frequency: 'monthly',
      category: 'housing',
      type: 'expense',
      isDirectDebit: true,
      dayOfMonth: 15
    },
    {
      id: '3',
      name: 'Salary',
      amount: 4200,
      frequency: 'monthly',
      category: 'income',
      type: 'income',
      dayOfMonth: 28
    },
    {
      id: '4',
      name: 'Car Insurance',
      amount: 42,
      frequency: 'monthly',
      category: 'transport',
      type: 'expense',
      isDirectDebit: true,
      dayOfMonth: 5
    },
    {
      id: '5',
      name: 'Gym Membership',
      amount: 35,
      frequency: 'monthly',
      category: 'health',
      type: 'expense',
      isDirectDebit: true,
      dayOfMonth: 1
    },
    {
      id: '6',
      name: 'Netflix',
      amount: 15.99,
      frequency: 'monthly',
      category: 'entertainment',
      type: 'expense',
      isDirectDebit: true,
      dayOfMonth: 12
    },
    {
      id: '7',
      name: 'Mobile Phone',
      amount: 28,
      frequency: 'monthly',
      category: 'utilities',
      type: 'expense',
      isDirectDebit: true,
      dayOfMonth: 20
    }
  ],

  // Kakeibo - mindful spending
  kakeibo_entries: [
    {
      id: '1',
      date: '2025-01-15',
      amount: 45.80,
      category: 'needs',
      subcategory: 'Groceries',
      description: 'Weekly shop - Waitrose',
      paymentMethod: 'card'
    },
    {
      id: '2',
      date: '2025-01-18',
      amount: 12.50,
      category: 'wants',
      subcategory: 'Coffee',
      description: 'Coffee and cake with Emma',
      paymentMethod: 'card'
    },
    {
      id: '3',
      date: '2025-01-20',
      amount: 35.00,
      category: 'culture',
      subcategory: 'Books',
      description: 'Waterstones - 2 novels',
      paymentMethod: 'card'
    },
    {
      id: '4',
      date: '2025-01-22',
      amount: 28.90,
      category: 'needs',
      subcategory: 'Transport',
      description: 'Petrol',
      paymentMethod: 'card'
    },
    {
      id: '5',
      date: '2025-01-25',
      amount: 65.00,
      category: 'wants',
      subcategory: 'Clothing',
      description: 'M&S - new jumper',
      paymentMethod: 'card'
    }
  ],

  kakeibo_monthly: [
    {
      id: '1',
      month: '2025-01',
      income: 4200,
      savingsGoal: 400,
      reflection: 'Good month overall. Stayed within budget for eating out.'
    }
  ],

  // Pets - one cat with upcoming vaccination
  pets: [
    {
      id: '1',
      name: 'Willow',
      species: 'Cat',
      breed: 'British Shorthair',
      dateOfBirth: '2021-04-12',
      colour: 'Blue (grey)',
      microchipNumber: '941000024857361',
      vetPractice: 'Clifton Vets',
      vetPhone: '0117 973 1234',
      vaccinations: [
        {
          id: 'v1',
          name: 'FVRCP (Core vaccine)',
          date: '2024-04-15',
          nextDueDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 75 days from now
          vet: 'Clifton Vets',
          documents: []
        }
      ],
      vetVisits: [
        {
          id: 'vv1',
          date: '2024-04-15',
          reason: 'Annual checkup and vaccination',
          vetPractice: 'Clifton Vets',
          diagnosis: 'Healthy, good weight',
          treatment: 'FVRCP booster administered',
          cost: 85,
          documents: []
        }
      ],
      insurance: {
        provider: 'Petplan',
        policyNumber: 'PP-7283947',
        monthlyPremium: 18,
        renewalDate: '2025-05-01',
        documents: []
      },
      notes: 'Indoor cat. Loves chin scratches. Favourite toy is the feather wand.'
    }
  ],

  // Contacts
  contacts: [
    {
      id: '1',
      name: 'Emma Richardson',
      relationship: 'Best Friend',
      phone: '07700 123456',
      email: 'emma.r@email.com',
      address: '15 Queens Road, Clifton, Bristol',
      notes: 'Known since university. Birthday: March 15th'
    },
    {
      id: '2',
      name: 'Mum (Patricia Mitchell)',
      relationship: 'Mother',
      phone: '01onal 234567',
      email: 'pat.mitchell@email.com',
      address: '8 Oak Lane, Taunton, Somerset',
      isEmergencyContact: true
    }
  ],

  // Banks & Savings
  finance_accounts: [
    {
      id: '1',
      name: 'Current Account',
      provider: 'Starling Bank',
      accountType: 'current',
      sortCode: '60-83-71',
      accountNumber: '12847593',
      balance: 2840,
      notes: 'Main spending account'
    },
    {
      id: '2',
      name: 'Savings',
      provider: 'Marcus by Goldman Sachs',
      accountType: 'savings',
      balance: 8500,
      interestRate: 4.5,
      notes: 'Emergency fund - 3 months expenses'
    },
    {
      id: '3',
      name: 'Stocks & Shares ISA',
      provider: 'Vanguard',
      accountType: 'isa',
      balance: 15200,
      notes: 'Global All Cap Index Fund'
    }
  ],

  // Vehicles
  vehicles: [
    {
      id: '1',
      make: 'Volkswagen',
      model: 'Polo',
      year: 2020,
      registration: 'WR20 ABC',
      colour: 'Deep Black Pearl',
      fuelType: 'Petrol',
      motDueDate: '2025-08-15',
      taxDueDate: '2025-06-01',
      insuranceCompany: 'Admiral',
      insurancePolicyNumber: 'ADM-4827361',
      insuranceRenewalDate: '2025-04-10',
      serviceHistory: [
        {
          id: 's1',
          date: '2024-08-10',
          mileage: 28500,
          type: 'Full Service',
          garage: 'Bristol VW',
          cost: 285,
          notes: 'Oil change, filters, brake fluid',
          nextServiceDate: '2025-08-10',
          documents: []
        }
      ],
      notes: 'Purchased used in 2022 with 15,000 miles'
    }
  ],

  // Employment
  employment: [
    {
      id: '1',
      company: 'Bright Ideas Marketing Ltd',
      role: 'Marketing Manager',
      startDate: '2021-03-01',
      salary: 52000,
      location: 'Bristol (Hybrid)',
      manager: 'David Thompson',
      notes: 'Lead a team of 4. Responsible for digital marketing strategy.',
      documents: []
    }
  ],

  // Holiday Plans - one upcoming
  holiday_plans: [
    {
      id: '1',
      name: 'Lake District Weekend',
      startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
      endDate: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      travelers: [
        { id: 't1', name: 'Sarah Mitchell' },
        { id: 't2', name: 'Emma Richardson' }
      ],
      accommodation: [
        {
          id: 'a1',
          name: 'Lakeside Cottage',
          address: 'Ambleside, Cumbria',
          checkIn: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          checkOut: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cost: 320,
          confirmationNumber: 'SC-284751',
          documents: []
        }
      ],
      travel: [],
      activities: [
        {
          id: 'act1',
          name: 'Helvellyn Hike',
          date: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Weather dependent - have backup plan',
          documents: []
        }
      ],
      notes: 'Girls weekend away! Remember walking boots.',
      documents: []
    }
  ]
};

// Main execution
const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/generate-demo-data.cjs <password>');
  console.log('');
  console.log('This will generate encrypted demo data files for screenshots.');
  console.log('Example: node scripts/generate-demo-data.cjs demo123');
  process.exit(1);
}

// Create output directory
const outputDir = path.join(__dirname, 'demo-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate encrypted files
console.log('Generating demo data with password:', password);
console.log('');

// First, create master key (needed to encrypt data files)
// The app uses Key Wrapping Pattern:
// - Master Key (DEK): Random 256-bit key that encrypts all data
// - KEK: Derived from password, encrypts Master Key
// - Stored: base64(salt + iv + AES-GCM-encrypted-master-key)

const WRAP_ITERATIONS = 100000;

// Generate random master key (this is what actually encrypts the data)
const masterKey = crypto.randomBytes(32);
storedMasterKey = masterKey;

// Generate salt and IV for wrapping the master key
const wrapSalt = crypto.randomBytes(SALT_LENGTH);
const wrapIv = crypto.randomBytes(IV_LENGTH);

// Derive KEK from password (same as app uses)
const kek = crypto.pbkdf2Sync(password, wrapSalt, WRAP_ITERATIONS, 32, 'sha256');

// Encrypt master key with AES-256-GCM
const wrapCipher = crypto.createCipheriv('aes-256-gcm', kek, wrapIv);
let wrappedMasterKey = wrapCipher.update(masterKey);
wrappedMasterKey = Buffer.concat([wrappedMasterKey, wrapCipher.final()]);
const wrapAuthTag = wrapCipher.getAuthTag();

// Combine: salt + iv + encrypted master key + auth tag
const combined = Buffer.concat([wrapSalt, wrapIv, wrappedMasterKey, wrapAuthTag]);

// Write as plain base64 string (no JSON wrapper)
fs.writeFileSync(path.join(outputDir, 'master.key'), combined.toString('base64'));
console.log('Created: master.key');

// Now encrypt data files with the master key
for (const [key, data] of Object.entries(demoData)) {
  const encrypted = encryptWithMasterKey(data, storedMasterKey);
  const filename = `${key}.encrypted.json`;
  const filepath = path.join(outputDir, filename);
  // Write as JSON string (app expects to JSON.parse the file, then decrypt the string)
  fs.writeFileSync(filepath, JSON.stringify(encrypted));
  console.log(`Created: ${filename} (${data.length || Object.keys(data).length} items)`);
}


console.log('');
console.log('Done! Files created in:', outputDir);
console.log('');
console.log('To use:');
console.log('1. Backup your existing data first!');
console.log('2. Copy files from demo-output/ to your PersonalHub data directory');
console.log('3. Restart the app and login with password:', password);
