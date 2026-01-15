const fs = require('fs');
const path = require('path');

// Certificate data for the 3 certificates in public directory
const certificates = [
  {
    id: Date.now().toString() + '0',
    name: 'Birth Certificate',
    type: 'birth',
    issueDate: '', // User can fill in
    expiryDate: '', // Birth certificates don't expire
    issuingAuthority: '', // e.g., General Register Office
    referenceNumber: '', // User can fill in
    notes: '',
    filename: 'birth.pdf'
  },
  {
    id: Date.now().toString() + '1',
    name: 'Driving License',
    type: 'driving',
    issueDate: '', // User can fill in
    expiryDate: '', // User should fill in for renewal tracking
    issuingAuthority: 'DVLA',
    referenceNumber: '', // User can fill in
    notes: '',
    filename: 'driving.pdf'
  },
  {
    id: Date.now().toString() + '2',
    name: 'Marriage Certificate',
    type: 'marriage',
    issueDate: '', // User can fill in
    expiryDate: '', // Marriage certificates don't expire
    issuingAuthority: '', // e.g., Register Office location
    referenceNumber: '', // User can fill in
    notes: '',
    filename: 'marriage.pdf'
  }
];

console.log(`Processing ${certificates.length} certificate records...`);

// Write to JSON file
const output = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  source: 'Certificate PDFs in public directory',
  entries: certificates
};

fs.writeFileSync(
  path.join(__dirname, 'public', 'imported-certificates.json'),
  JSON.stringify(output, null, 2)
);

console.log(`✅ Successfully created ${certificates.length} certificate records`);
console.log(`📁 Saved to: public/imported-certificates.json`);

// Show summary
console.log('\n📊 Summary:');
certificates.forEach((cert, index) => {
  console.log(`  ${index + 1}. ${cert.name} (${cert.filename})`);
});

console.log('\n📝 Note: You can edit these records in the app to add:');
console.log('  - Issue dates');
console.log('  - Expiry dates (for driving license)');
console.log('  - Reference numbers');
console.log('  - Issuing authority details');
