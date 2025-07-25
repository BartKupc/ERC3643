const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get RPC URL from environment variable with fallback
const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';

// Configuration object
const config = {
  RPC_URL: rpcUrl
};

// Generate root config.json
const rootConfigPath = path.join(__dirname, '..', 'config.json');
fs.writeFileSync(rootConfigPath, JSON.stringify(config, null, 2));
console.log(`✅ Generated ${rootConfigPath}`);

// Generate react-app config.json
const reactAppConfigPath = path.join(__dirname, '..', 'trex-scaffold', 'packages', 'react-app', 'src', 'config.json');
fs.writeFileSync(reactAppConfigPath, JSON.stringify(config, null, 2));
console.log(`✅ Generated ${reactAppConfigPath}`);

console.log(`\n📋 Configuration generated with RPC_URL: ${rpcUrl}`);
console.log('💡 To change the RPC URL, update the RPC_URL variable in your .env file and run this script again.'); 