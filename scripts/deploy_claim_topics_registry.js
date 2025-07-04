const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🎯 ClaimTopicsRegistry Component Deployment");
  console.log("Deployer:", deployer.address);

  try {
    const ClaimTopicsRegistry = await ethers.getContractFactory('ClaimTopicsRegistry');
    const claimTopicsRegistry = await ClaimTopicsRegistry.deploy();
    await claimTopicsRegistry.deployed();
    const address = claimTopicsRegistry.address;
    
    // Initialize the contract to set the owner
    console.log("🔧 Initializing ClaimTopicsRegistry...");
    const initTx = await claimTopicsRegistry.init();
    await initTx.wait();
    console.log("✅ ClaimTopicsRegistry initialized");
    
    console.log("✅ ClaimTopicsRegistry deployed successfully at:", address);
    console.log("DEPLOYED_ADDRESS:" + address);
    
    // Save to deployments.json
    const fs = require('fs');
    const path = require('path');
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    const deploymentId = `claim_topics_registry_${Date.now()}`;
    deployments.push({
      deploymentId,
      component: 'ClaimTopicsRegistry',
      address: address,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("📝 Deployment saved to deployments.json");
    
  } catch (error) {
    console.error("❌ ClaimTopicsRegistry deployment failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});