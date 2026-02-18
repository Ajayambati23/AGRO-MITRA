#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the dummy accounts file
const accountsFile = path.join(__dirname, 'dummy-accounts.json');
const accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));

console.log('🌾 AgroMitra Dummy Accounts Test\n');
console.log('=====================================\n');

// Display account information
accounts.dummy_accounts.forEach((account, index) => {
  console.log(`Account ${index + 1}: ${account.name}`);
  console.log(`Email: ${account.email}`);
  console.log(`Phone: ${account.phone}`);
  console.log(`Password: ${account.password}`);
  console.log(`Language: ${account.preferredLanguage}`);
  console.log(`Location: ${account.location.village}, ${account.location.district}, ${account.location.state}`);
  console.log(`Soil Type: ${account.soilType}`);
  console.log(`Farm Size: ${account.farmSize} acres`);
  console.log(`Experience: ${account.experience}`);
  console.log(`Description: ${account.description}`);
  console.log('---\n');
});

console.log('🔗 API Endpoints:');
console.log(`Login: POST http://localhost:3001/api/auth/login`);
console.log(`Register: POST http://localhost:3001/api/auth/register`);
console.log(`Profile: GET http://localhost:3001/api/auth/profile (with Authorization header)`);
console.log('\n📝 Note: All accounts use the same password: "password123"');
console.log('\n✅ All dummy accounts have been created and saved to dummy-accounts.json');
