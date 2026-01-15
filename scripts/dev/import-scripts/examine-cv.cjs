const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function extractCV() {
  try {
    const cvPath = path.join(__dirname, 'public', 'CV_JUNE_2025.docx');

    // Extract raw text
    const result = await mammoth.extractRawText({ path: cvPath });
    const text = result.value;

    console.log('=== CV TEXT EXTRACTED ===');
    console.log('Total length:', text.length, 'characters');
    console.log('\n=== FULL TEXT ===');
    console.log(text);

    // Try to identify employment sections
    console.log('\n\n=== ANALYSIS ===');

    const lines = text.split('\n').filter(line => line.trim());
    console.log('Total lines:', lines.length);

    // Look for common employment section headers
    const employmentKeywords = ['employment', 'work history', 'experience', 'career', 'positions'];
    const employmentLines = lines.filter((line, index) => {
      const lower = line.toLowerCase();
      return employmentKeywords.some(keyword => lower.includes(keyword));
    });

    if (employmentLines.length > 0) {
      console.log('\n=== POTENTIAL EMPLOYMENT SECTIONS ===');
      employmentLines.forEach(line => console.log(line));
    }

  } catch (error) {
    console.error('Error reading CV:', error);
  }
}

extractCV();
