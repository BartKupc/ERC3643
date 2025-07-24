const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🎯 Individual Token Deployment (Advanced Tab)");

  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  console.log("Deployer:", deployerAddress);

  // Load token details from environment
  let tokenDetails = {};
  if (process.env.TOKEN_CONFIG_PATH && fs.existsSync(process.env.TOKEN_CONFIG_PATH)) {
    try {
      tokenDetails = JSON.parse(fs.readFileSync(process.env.TOKEN_CONFIG_PATH, 'utf8'));
      console.log("Loaded token config:", tokenDetails);
    } catch (e) {
      console.error("Failed to read token config:", e);
      process.exit(1);
    }
  } else {
    console.error("❌ TOKEN_CONFIG_PATH not provided or file not found.");
    process.exit(1);
  }

  const { name, symbol, decimals, identityRegistryAddress, complianceAddress } = tokenDetails;

  if (!identityRegistryAddress || !complianceAddress) {
    console.error("❌ Missing Identity Registry or ModularCompliance addresses in token config.");
    process.exit(1);
  }

  console.log(`\n📋 Deploying Token: ${name} (${symbol}) with ${decimals} decimals`);
  console.log(`   Identity Registry: ${identityRegistryAddress}`);
  console.log(`   ModularCompliance: ${complianceAddress}`);

  try {
    // Step 1: Deploy Token contract
    console.log("\n📋 Step 1: Deploying Token contract...");
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy();
    await token.waitForDeployment();
    
    const tokenAddress = await token.getAddress();
    console.log("✅ Token deployed at:", tokenAddress);
    
    // Step 2: Initialize the token
    console.log("\n📋 Step 2: Initializing Token...");
    
    // First, try to set the token as owner of the ModularCompliance
    try {
      console.log("Setting token as owner of ModularCompliance...");
      const compliance = await ethers.getContractAt("ModularCompliance", complianceAddress);
      
      const currentOwner = await compliance.owner();
      console.log("Current ModularCompliance owner:", currentOwner);
      
      if (currentOwner.toLowerCase() !== tokenAddress.toLowerCase()) {
        console.log("Transferring ModularCompliance ownership to token...");
        const transferTx = await compliance.transferOwnership(tokenAddress);
        await transferTx.wait();
        console.log("✅ ModularCompliance ownership transferred to token");
      } else {
        console.log("✅ Token is already owner of ModularCompliance");
      }
    } catch (ownershipError) {
      console.log("⚠️ Could not set token as ModularCompliance owner:", ownershipError.message);
      console.log("Will try to initialize token anyway...");
    }
    
    // Initialize the token
    const initTx = await token.init(
      identityRegistryAddress,
      complianceAddress,
      name,
      symbol,
      decimals,
      deployerAddress
    );
    await initTx.wait();
    
    console.log("✅ Token initialized successfully");
    
    // Step 3: Save deployment to deployments.json
    console.log("\n📋 Step 3: Saving deployment data...");
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
    
    const tokenDeployment = {
      component: 'Token',
      address: tokenAddress,
      timestamp: new Date().toISOString(),
      tokenDetails: {
        name: name,
        symbol: symbol,
        decimals: decimals,
        identityRegistry: identityRegistryAddress,
        modularCompliance: complianceAddress,
        owner: deployerAddress
      }
    };
    
    // Add to advanced deployments
    deploymentsObj.advanced.push(tokenDeployment);
    fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentsObj, null, 2));
    
    console.log("\n✅ Token deployment completed successfully!");
    console.log("Token Address:", tokenAddress);
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Token Decimals:", decimals);
    
    // Output for backend parsing
    console.log(`DEPLOYED_ADDRESS:${tokenAddress}`);
    console.log("📝 Deployment saved to deployments.json");
    
  } catch (error) {
    console.error("❌ Token deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });