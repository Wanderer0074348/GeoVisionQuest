#!/usr/bin/env node

/**
 * Helper script to format Google Cloud service account private key for .env file
 * Usage: node scripts/format-key.js path/to/service-account-key.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/format-key.js path/to/service-account-key.json');
  process.exit(1);
}

const keyPath = args[0];

try {
  const keyFile = fs.readFileSync(keyPath, 'utf8');
  const keyData = JSON.parse(keyFile);

  console.log('\n=== Copy these values to your .env.local file ===\n');
  console.log(`GEE_SERVICE_ACCOUNT=${keyData.client_email}`);
  console.log(`GEE_PRIVATE_KEY="${keyData.private_key.replace(/\n/g, '\\n')}"`);
  console.log('\n=== End of configuration ===\n');

  console.log('Note: Make sure to copy the entire private key including the quotes!');
} catch (error) {
  console.error('Error reading key file:', error.message);
  process.exit(1);
}
