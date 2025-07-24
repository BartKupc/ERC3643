const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🎯 IdentityRegistry Component Deployment");
  
  // Get Hardhat signer (first account) - using local Hardhat accounts only
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    const IdentityRegistry = await ethers.getContractFactory('IdentityRegistry', signer);
    const identityRegistry = await IdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
    const address = await identityRegistry.getAddress();
    
    // Note: IdentityRegistry requires initialization with other registry addresses
    // For individual component deployment, we'll skip initialization for now
    // The contract will need to be initialized later with proper registry addresses
    console.log("⚠️  Note: IdentityRegistry requires initialization with registry addresses");
    console.log("   This contract will need to be initialized later with:");
    console.log("   - TrustedIssuersRegistry address");
    console.log("   - ClaimTopicsRegistry address"); 
    console.log("   - IdentityRegistryStorage address");
    
    console.log("✅ IdentityRegistry deployed successfully at:", address);
    console.log("DEPLOYED_ADDRESS:" + address);
    
    // Save to deployments.json
    const fs = require('fs');
    const path = require('path');
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deploymentsObj = { easydeploy: [], advanced: [] };
    if (fs.existsSync(deploymentsPath)) {
      const raw = fs.readFileSync(deploymentsPath, 'utf8');
      if (raw.trim().startsWith('{')) {
        deploymentsObj = JSON.parse(raw);
        if (!deploymentsObj.easydeploy) deploymentsObj.easydeploy = [];
        if (!deploymentsObj.advanced) deploymentsObj.advanced = [];
      }
    }
    const deploymentId = `identity_registry_${Date.now()}`;
    deploymentsObj.advanced.push({
      deploymentId,
      component: 'IdentityRegistry',
      address: address,
      deployer: deployerAddress,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentsObj, null, 2));
    console.log("📝 Deployment saved to deployments.json");
    
  } catch (error) {
    console.error("❌ IdentityRegistry deployment failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});