import fs from 'fs';

// Proper CSV parser that handles quoted fields with commas
function parseCSV(csvText) {
  const lines = [];
  let currentLine = '';
  let insideQuotes = false;

  // First, properly split lines handling quoted fields that span multiple lines
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if (char === '\n' && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  // Parse each line properly handling quoted fields
  function parseLine(line) {
    const fields = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Check for escaped quote (double quotes)
        if (insideQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField); // Add last field

    return fields;
  }

  const headers = parseLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

// Category mapping based on domain keywords
const categoryMap = {
  shopping: ['amazon', 'ebay', 'etsy', 'shop', 'store', 'retail', 'walmart', 'target', 'argos', 'tesco', 'sainsbury', 'waitrose', 'asda', 'morrisons', 'lidl', 'aldi'],
  banking: ['bank', 'paypal', 'stripe', 'wise', 'revolut', 'monzo', 'starling', 'hsbc', 'barclays', 'lloyds', 'natwest', 'santander', 'coinbase', 'binance', 'crypto', 'finance'],
  social: ['facebook', 'twitter', 'instagram', 'linkedin', 'reddit', 'discord', 'slack', 'whatsapp', 'telegram', 'signal', 'snapchat', 'tiktok', 'pinterest', 'tumblr', 'mastodon', 'google', 'microsoft', 'apple', 'icloud', 'gmail', 'outlook', 'proton', 'mail', 'email'],
  entertainment: ['netflix', 'spotify', 'youtube', 'twitch', 'steam', 'playstation', 'xbox', 'nintendo', 'hulu', 'disney', 'prime', 'music', 'podcast', 'gaming', 'game'],
  other: []
};

const categoryColors = {
  shopping: '#FF9900',
  banking: '#10B981',
  social: '#4F46E5',
  entertainment: '#8B5CF6',
  other: '#6B7280'
};

function categorizeWebsite(name, url) {
  const text = `${name} ${url}`.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (category === 'other') continue;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return 'other';
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return url.replace('www.', '');
  }
}

function convertCsvToEntries(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);

  const entries = records.map((record, index) => {
    const name = record.name || extractDomain(record.url);
    const username = record.email || record.username || '';
    const category = categorizeWebsite(name, record.url);
    const domain = extractDomain(record.url);

    return {
      id: `${Date.now() + index}`,
      name: name,
      url: record.url,
      username: username,
      password: '', // No passwords as requested
      category: category,
      color: categoryColors[category],
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      notes: record.note || ''
    };
  });

  return { entries };
}

// Convert the CSV
const outputData = convertCsvToEntries('/home/mb12aeh/src/phub/output.csv');

// Write to a temporary JSON file
fs.writeFileSync(
  '/home/mb12aeh/src/phub/imported-websites.json',
  JSON.stringify(outputData, null, 2)
);

console.log(`Successfully converted ${outputData.entries.length} websites`);
console.log('\nCategory breakdown:');
const categoryCounts = {};
outputData.entries.forEach(entry => {
  categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
});
Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});
