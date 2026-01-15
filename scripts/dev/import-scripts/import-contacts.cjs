const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, 'public', 'Addresses.xlsx'));

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON
const addresses = XLSX.utils.sheet_to_json(sheet);

console.log(`Processing ${addresses.length} contacts...`);

// Map to Contact interface format
const contacts = addresses.map((addr, index) => {
  // Combine first and last name
  const firstName = addr.Firstname || '';
  const lastName = addr.Lastname || '';
  const fullName = `${firstName} ${lastName}`.trim();

  // Handle notes - include relationship category if present
  let notes = addr.Notes || '';
  if (addr.BusinessPhone && addr.BusinessPhone !== '') {
    const category = addr.BusinessPhone;
    notes = notes ? `[${category}] ${notes}` : `[${category}]`;
  }

  return {
    id: Date.now().toString() + index, // Unique ID
    name: fullName || 'Unnamed Contact',
    email: addr.Email || '',
    phone: addr.MobilePhone || '',
    address: addr.Address || '',
    notes: notes
  };
});

// Write to JSON file
const output = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  entries: contacts
};

fs.writeFileSync(
  path.join(__dirname, 'public', 'imported-contacts.json'),
  JSON.stringify(output, null, 2)
);

console.log(`✅ Successfully converted ${contacts.length} contacts`);
console.log(`📁 Saved to: public/imported-contacts.json`);

// Show summary
const withEmail = contacts.filter(c => c.email).length;
const withPhone = contacts.filter(c => c.phone).length;
const withAddress = contacts.filter(c => c.address).length;

console.log('\n📊 Summary:');
console.log(`  Total contacts: ${contacts.length}`);
console.log(`  With email: ${withEmail}`);
console.log(`  With phone: ${withPhone}`);
console.log(`  With address: ${withAddress}`);
