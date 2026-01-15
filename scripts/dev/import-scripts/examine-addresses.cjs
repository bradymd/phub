const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, 'public', 'Addresses.xlsx'));

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(sheet);

console.log('=== ADDRESS BOOK STRUCTURE ===');
console.log(`Total entries: ${data.length}`);
console.log('\nFirst entry (sample):');
console.log(JSON.stringify(data[0], null, 2));

console.log('\nColumn names:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}

console.log('\nFirst 3 entries (preview):');
data.slice(0, 3).forEach((entry, index) => {
  console.log(`\n--- Entry ${index + 1} ---`);
  Object.entries(entry).forEach(([key, value]) => {
    if (value) {
      console.log(`  ${key}: ${value}`);
    }
  });
});
