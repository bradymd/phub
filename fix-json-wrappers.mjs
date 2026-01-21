#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), 'Documents', 'PersonalHub', 'data');

async function fix() {
  const files = await readdir(DATA_DIR);
  const encryptedFiles = files.filter(f => f.endsWith('.encrypted.json'));

  for (const file of encryptedFiles) {
    const filePath = join(DATA_DIR, file);
    const content = await readFile(filePath, 'utf-8');

    // Check if already wrapped in JSON
    try {
      JSON.parse(content);
      console.log(`✓ ${file} - already wrapped`);
    } catch {
      // Not valid JSON, needs wrapping
      const wrapped = JSON.stringify(content);
      await writeFile(filePath, wrapped, 'utf-8');
      console.log(`✓ ${file} - wrapped`);
    }
  }

  console.log('\nDone!');
}

fix();
