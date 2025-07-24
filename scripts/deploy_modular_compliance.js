const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🎯 ModularCompliance Component Deployment");
  
  // Get Hardhat signer (first account) - using local Hardhat accounts only
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    const ModularCompliance = await ethers.getContractFactory('ModularCompliance', signer);
    const modularCompliance = await ModularCompliance.deploy();
    await modularCompliance.waitForDeployment();
    const address = await modularCompliance.getAddress();
    
    console.log("✅ ModularCompliance deployed successfully at:", address);
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
    const deploymentId = `modular_compliance_${Date.now()}`;
    deploymentsObj.advanced.push({
      deploymentId,
      component: 'ModularCompliance',
      address: address,
      deployer: deployerAddress,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentsObj, null, 2));
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