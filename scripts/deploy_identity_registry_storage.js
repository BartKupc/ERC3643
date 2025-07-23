const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🎯 IdentityRegistryStorage Component Deployment");
  
  // Get Hardhat signer (first account) - using local Hardhat accounts only
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    const IdentityRegistryStorage = await ethers.getContractFactory('IdentityRegistryStorage', signer);
    const identityRegistryStorage = await IdentityRegistryStorage.deploy();
    await identityRegistryStorage.waitForDeployment();
    const address = await identityRegistryStorage.getAddress();
    
    console.log("✅ IdentityRegistryStorage deployed successfully at:", address);
    console.log("DEPLOYED_ADDRESS:" + address);
    
    // Save to deployments.json
    const fs = require('fs');
    const path = require('path');
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    const deploymentId = `identity_registry_storage_${Date.now()}`;
    deployments.push({
      deploymentId,
      component: 'IdentityRegistryStorage',
      address: address,
      deployer: deployerAddress,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("📝 Deployment saved to deployments.json");
    
  } catch (error) {
    console.error("❌ IdentityRegistryStorage deployment failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});