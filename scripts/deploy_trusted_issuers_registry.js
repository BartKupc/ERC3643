const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🎯 TrustedIssuersRegistry Component Deployment");
  
  // Get MetaMask provider and signer
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []); // Request account access
  const signer = provider.getSigner();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    const TrustedIssuersRegistry = await ethers.getContractFactory('TrustedIssuersRegistry', signer);
    const trustedIssuersRegistry = await TrustedIssuersRegistry.deploy();
    await trustedIssuersRegistry.deployed();
    const address = trustedIssuersRegistry.address;
    
    // Initialize the contract to set the owner
    console.log("🔧 Initializing TrustedIssuersRegistry...");
    const initTx = await trustedIssuersRegistry.init();
    await initTx.wait();
    console.log("✅ TrustedIssuersRegistry initialized");
    
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
      deployer: deployerAddress,
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