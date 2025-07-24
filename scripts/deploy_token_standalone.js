const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🎯 Standalone Token Deployment");
  
  // Get Hardhat signer (first account)
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  // Load token details from environment or use defaults
  let tokenDetails = {
    name: "My Security Token",
    symbol: "MST",
    decimals: 18
  };

  // Load token details from config file if provided
  if (process.env.TOKEN_CONFIG_PATH && fs.existsSync(process.env.TOKEN_CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(process.env.TOKEN_CONFIG_PATH, 'utf8'));
      if (config.name) tokenDetails.name = config.name;
      if (config.symbol) tokenDetails.symbol = config.symbol;
      if (config.decimals) tokenDetails.decimals = config.decimals;
    } catch (e) {
      console.error("Failed to read token config:", e);
    }
  }

  // Load deployments to get Identity Registry and ModularCompliance addresses
  const deploymentsPath = path.join(__dirname, '../deployments.json');
  if (!fs.existsSync(deploymentsPath)) {
    console.error("❌ No deployments found. Please deploy Identity Registry and ModularCompliance first.");
    process.exit(1);
  }

  let deploymentsObj = { easydeploy: [], advanced: [] };
  const raw = fs.readFileSync(deploymentsPath, 'utf8');
  if (raw.trim().startsWith('{')) {
    deploymentsObj = JSON.parse(raw);
    if (!deploymentsObj.easydeploy) deploymentsObj.easydeploy = [];
    if (!deploymentsObj.advanced) deploymentsObj.advanced = [];
  }
  
  const allDeployments = [...deploymentsObj.easydeploy, ...deploymentsObj.advanced];
  
  // Find latest Identity Registry
  const identityRegistryDeployments = allDeployments
    .filter(d => d.component === 'IdentityRegistry')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Find latest ModularCompliance
  const modularComplianceDeployments = allDeployments
    .filter(d => d.component === 'ModularCompliance')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  if (identityRegistryDeployments.length === 0) {
    console.error("❌ No Identity Registry found. Please deploy one first.");
    process.exit(1);
  }
  
  if (modularComplianceDeployments.length === 0) {
    console.error("❌ No ModularCompliance found. Please deploy one first.");
    process.exit(1);
  }
  
  const identityRegistryAddress = identityRegistryDeployments[0].address;
  const modularComplianceAddress = modularComplianceDeployments[0].address;
  
  console.log("\n📋 Using contracts:");
  console.log("Identity Registry:", identityRegistryAddress);
  console.log("ModularCompliance:", modularComplianceAddress);
  console.log("Token Details:", tokenDetails);

  try {
    // Deploy Token contract
    console.log("\n📋 Step 1: Deploying Token contract...");
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy();
    await token.waitForDeployment();
    
    const tokenAddress = await token.getAddress();
    console.log("✅ Token deployed at:", tokenAddress);
    
    // Initialize the token
    console.log("\n📋 Step 2: Initializing Token...");
    
    // First, try to set the token as owner of the ModularCompliance
    try {
      console.log("Setting token as owner of ModularCompliance...");
      const compliance = await ethers.getContractAt("ModularCompliance", modularComplianceAddress);
      
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
      modularComplianceAddress,
      tokenDetails.name,
      tokenDetails.symbol,
      tokenDetails.decimals,
      deployerAddress
    );
    await initTx.wait();
    
    console.log("✅ Token initialized successfully");
    
    // Save deployment to deployments.json
    const tokenDeployment = {
      component: 'Token',
      address: tokenAddress,
      timestamp: new Date().toISOString(),
      tokenDetails: {
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
        decimals: tokenDetails.decimals,
        identityRegistry: identityRegistryAddress,
        modularCompliance: modularComplianceAddress,
        owner: deployerAddress
      }
    };
    
    // Add to advanced deployments
    deploymentsObj.advanced.push(tokenDeployment);
    fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentsObj, null, 2));
    
    console.log("\n✅ Token deployment completed successfully!");
    console.log("Token Address:", tokenAddress);
    console.log("Token Name:", tokenDetails.name);
    console.log("Token Symbol:", tokenDetails.symbol);
    console.log("Token Decimals:", tokenDetails.decimals);
    
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
    console.error("❌ Script failed:", error);
    process.exit(1);
  });