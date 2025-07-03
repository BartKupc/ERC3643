const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🎯 TrustedIssuersRegistry Component Deployment");
  console.log("Deployer:", deployer.address);

  try {
    const TrustedIssuersRegistry = await ethers.getContractFactory('TrustedIssuersRegistry');
    const trustedIssuersRegistry = await TrustedIssuersRegistry.deploy();
    await trustedIssuersRegistry.deployed();
    const address = trustedIssuersRegistry.address;
    
    console.log("✅ TrustedIssuersRegistry deployed successfully at:", address);
    console.log("DEPLOYED_ADDRESS:" + address);
    
    // Save to deployments.json
    const fs = require('fs');
    const path = require('path');
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    const deploymentId = `trusted_issuers_registry_${Date.now()}`;
    deployments.push({
      deploymentId,
      component: 'TrustedIssuersRegistry',
      address: address,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("📝 Deployment saved to deployments.json");
    
  } catch (error) {
    console.error("❌ TrustedIssuersRegistry deployment failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});