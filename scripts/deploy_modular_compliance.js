const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🎯 ModularCompliance Component Deployment");
  console.log("Deployer:", deployer.address);

  try {
    const ModularCompliance = await ethers.getContractFactory('ModularCompliance');
    const modularCompliance = await ModularCompliance.deploy();
    await modularCompliance.deployed();
    const address = modularCompliance.address;
    
    console.log("✅ ModularCompliance deployed successfully at:", address);
    console.log("DEPLOYED_ADDRESS:" + address);
    
    // Save to deployments.json
    const fs = require('fs');
    const path = require('path');
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    const deploymentId = `modular_compliance_${Date.now()}`;
    deployments.push({
      deploymentId,
      component: 'ModularCompliance',
      address: address,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log("📝 Deployment saved to deployments.json");
    
  } catch (error) {
    console.error("❌ ModularCompliance deployment failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});