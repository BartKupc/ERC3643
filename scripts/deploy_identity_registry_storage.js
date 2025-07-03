const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🎯 IdentityRegistryStorage Component Deployment");
  console.log("Deployer:", deployer.address);

  try {
    const IdentityRegistryStorage = await ethers.getContractFactory('IdentityRegistryStorage');
    const identityRegistryStorage = await IdentityRegistryStorage.deploy();
    await identityRegistryStorage.deployed();
    const address = identityRegistryStorage.address;
    
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
      deployer: deployer.address,
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