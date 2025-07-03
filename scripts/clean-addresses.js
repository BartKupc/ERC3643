const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning deployed addresses...');

const addressesPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/addresses.js');

const defaultAddresses = `// T-REX Contract Addresses
// These will be populated after deployment
const addresses = {
  ceaErc20: "0xa6dF0C88916f3e2831A329CE46566dDfBe9E74b7",
  // T-REX Addresses (to be filled after deployment)
  TREXFactory: "0x0000000000000000000000000000000000000000",
  Token: "0x0000000000000000000000000000000000000000",
  ModularCompliance: "0x0000000000000000000000000000000000000000",
  IdentityRegistry: "0x0000000000000000000000000000000000000000",
  ClaimTopicsRegistry: "0x0000000000000000000000000000000000000000",
  TrustedIssuersRegistry: "0x0000000000000000000000000000000000000000",
};
export default addresses;
`;

try {
  fs.writeFileSync(addressesPath, defaultAddresses);
  console.log('✅ Addresses cleared successfully!');
  console.log('📁 File updated: trex-scaffold/packages/contracts/src/addresses.js');
  
  // Clear deployments
  const deploymentsPath = path.join(__dirname, '../deployments.json');
  fs.writeFileSync(deploymentsPath, '[]');
  console.log('✅ Deployments cleared successfully!');
  console.log('📁 File updated: deployments.json');
} catch (error) {
  console.error('❌ Error clearing addresses:', error.message);
  process.exit(1);
} 