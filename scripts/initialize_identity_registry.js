const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔧 IdentityRegistry Initialization");
  
  // Get MetaMask provider and signer
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []); // Request account access
  const signer = provider.getSigner();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    // Load deployments to get contract addresses
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      console.error("❌ No deployments found. Please deploy contracts first.");
      process.exit(1);
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    
    // Find the latest Identity Registry deployment
    const identityRegistryDeployments = deployments.filter(d => 
      d.component === 'IdentityRegistry' || d.component.startsWith('IdentityRegistry_')
    );
    
    if (identityRegistryDeployments.length === 0) {
      console.error("❌ No Identity Registry found. Please deploy one first.");
      process.exit(1);
    }
    
    // Find other required contracts
    const trustedIssuersRegistryDeployments = deployments.filter(d => 
      d.component === 'TrustedIssuersRegistry' || d.component.startsWith('TrustedIssuersRegistry_')
    );
    const claimTopicsRegistryDeployments = deployments.filter(d => 
      d.component === 'ClaimTopicsRegistry' || d.component.startsWith('ClaimTopicsRegistry_')
    );
    const identityRegistryStorageDeployments = deployments.filter(d => 
      d.component === 'IdentityRegistryStorage' || d.component.startsWith('IdentityRegistryStorage_')
    );
    
    if (trustedIssuersRegistryDeployments.length === 0) {
      console.error("❌ No TrustedIssuersRegistry found. Please deploy one first.");
      process.exit(1);
    }
    
    if (claimTopicsRegistryDeployments.length === 0) {
      console.error("❌ No ClaimTopicsRegistry found. Please deploy one first.");
      process.exit(1);
    }
    
    if (identityRegistryStorageDeployments.length === 0) {
      console.error("❌ No IdentityRegistryStorage found. Please deploy one first.");
      process.exit(1);
    }
    
    const trustedIssuersRegistryAddress = trustedIssuersRegistryDeployments[trustedIssuersRegistryDeployments.length - 1].address;
    const claimTopicsRegistryAddress = claimTopicsRegistryDeployments[claimTopicsRegistryDeployments.length - 1].address;
    const identityRegistryStorageAddress = identityRegistryStorageDeployments[identityRegistryStorageDeployments.length - 1].address;
    
    console.log("📋 Using TrustedIssuersRegistry:", trustedIssuersRegistryAddress);
    console.log("📋 Using ClaimTopicsRegistry:", claimTopicsRegistryAddress);
    console.log("📋 Using IdentityRegistryStorage:", identityRegistryStorageAddress);
    
    // Initialize all Identity Registries that haven't been initialized yet
    console.log(`📋 Found ${identityRegistryDeployments.length} Identity Registry deployment(s)`);
    
    for (const deployment of identityRegistryDeployments) {
      const identityRegistryAddress = deployment.address;
      console.log(`\n🔧 Processing Identity Registry: ${identityRegistryAddress}`);
      
      // Get the Identity Registry contract
      const IdentityRegistry = await ethers.getContractFactory('IdentityRegistry', signer);
      const identityRegistry = IdentityRegistry.attach(identityRegistryAddress);
      
      // Check if it's already initialized by checking the owner
      try {
        const owner = await identityRegistry.owner();
        if (owner !== ethers.constants.AddressZero) {
          console.log(`✅ Already initialized with owner: ${owner}`);
          continue;
        }
      } catch (error) {
        console.log(`⚠️  Could not check owner, assuming uninitialized`);
      }
      
      // Initialize the contract
      console.log("🔧 Initializing IdentityRegistry...");
      const initTx = await identityRegistry.init(
        trustedIssuersRegistryAddress,
        claimTopicsRegistryAddress,
        identityRegistryStorageAddress
      );
      await initTx.wait();
      console.log("✅ IdentityRegistry initialized successfully!");
      
      // Verify initialization
      const owner = await identityRegistry.owner();
      console.log("✅ IdentityRegistry owner:", owner);
      
      if (owner === deployerAddress) {
        console.log("🎉 IdentityRegistry is now properly initialized and owned by deployer!");
      } else {
        console.log("⚠️  Warning: IdentityRegistry owner is not the deployer");
      }
      
      // Bind Identity Registry to Identity Registry Storage as agent
      console.log("🔧 Binding Identity Registry to Identity Registry Storage...");
      const IdentityRegistryStorage = await ethers.getContractFactory('IdentityRegistryStorage', signer);
      const identityRegistryStorage = IdentityRegistryStorage.attach(identityRegistryStorageAddress);
      
      // Check if already bound
      const linkedRegistries = await identityRegistryStorage.linkedIdentityRegistries();
      const isAlreadyBound = linkedRegistries.includes(identityRegistryAddress);
      
      if (!isAlreadyBound) {
        const bindTx = await identityRegistryStorage.bindIdentityRegistry(identityRegistryAddress);
        await bindTx.wait();
        console.log("✅ Identity Registry bound to Identity Registry Storage as agent!");
      } else {
        console.log("✅ Identity Registry already bound to Identity Registry Storage");
      }
    }
    
  } catch (error) {
    console.error("❌ IdentityRegistry initialization failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
}); 