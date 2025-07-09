const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔧 Initializing Deployed Contracts");
  
  // Get MetaMask provider and signer
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []); // Request account access
  const signer = provider.getSigner();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    // Load deployments
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      console.error("❌ No deployments found");
      process.exit(1);
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    
    // Find the latest deployed contracts
    const claimTopicsRegistry = deployments.find(d => d.component === 'ClaimTopicsRegistry');
    const trustedIssuersRegistry = deployments.find(d => d.component === 'TrustedIssuersRegistry');
    const identityRegistryStorage = deployments.find(d => d.component === 'IdentityRegistryStorage');
    const identityRegistry = deployments.find(d => d.component === 'IdentityRegistry');
    
    if (!claimTopicsRegistry) {
      console.error("❌ No ClaimTopicsRegistry found in deployments");
      process.exit(1);
    }

    console.log("\n📋 Found deployed contracts:");
    console.log("ClaimTopicsRegistry:", claimTopicsRegistry.address);
    if (trustedIssuersRegistry) console.log("TrustedIssuersRegistry:", trustedIssuersRegistry.address);
    if (identityRegistryStorage) console.log("IdentityRegistryStorage:", identityRegistryStorage.address);
    if (identityRegistry) console.log("IdentityRegistry:", identityRegistry.address);

    // Initialize ClaimTopicsRegistry
    console.log("\n🔧 Initializing ClaimTopicsRegistry...");
    const claimTopicsRegistryContract = await ethers.getContractAt('ClaimTopicsRegistry', claimTopicsRegistry.address, signer);
    
    try {
      const owner = await claimTopicsRegistryContract.owner();
      if (owner === ethers.constants.AddressZero) {
        console.log("Initializing ClaimTopicsRegistry...");
        const initTx = await claimTopicsRegistryContract.init();
        await initTx.wait();
        console.log("✅ ClaimTopicsRegistry initialized");
      } else {
        console.log("✅ ClaimTopicsRegistry already initialized, owner:", owner);
      }
    } catch (error) {
      if (error.message.includes("Initializable: contract is already initialized")) {
        console.log("✅ ClaimTopicsRegistry already initialized");
      } else {
        throw error;
      }
    }

    // Initialize TrustedIssuersRegistry
    if (trustedIssuersRegistry) {
      console.log("\n🔧 Initializing TrustedIssuersRegistry...");
      const trustedIssuersRegistryContract = await ethers.getContractAt('TrustedIssuersRegistry', trustedIssuersRegistry.address, signer);
      
      try {
        const owner = await trustedIssuersRegistryContract.owner();
        if (owner === ethers.constants.AddressZero) {
          console.log("Initializing TrustedIssuersRegistry...");
          const initTx = await trustedIssuersRegistryContract.init();
          await initTx.wait();
          console.log("✅ TrustedIssuersRegistry initialized");
        } else {
          console.log("✅ TrustedIssuersRegistry already initialized, owner:", owner);
        }
      } catch (error) {
        if (error.message.includes("Initializable: contract is already initialized")) {
          console.log("✅ TrustedIssuersRegistry already initialized");
        } else {
          throw error;
        }
      }
    }

    // Initialize IdentityRegistryStorage
    if (identityRegistryStorage) {
      console.log("\n🔧 Initializing IdentityRegistryStorage...");
      const identityRegistryStorageContract = await ethers.getContractAt('IdentityRegistryStorage', identityRegistryStorage.address, signer);
      
      try {
        const owner = await identityRegistryStorageContract.owner();
        if (owner === ethers.constants.AddressZero) {
          console.log("Initializing IdentityRegistryStorage...");
          const initTx = await identityRegistryStorageContract.init();
          await initTx.wait();
          console.log("✅ IdentityRegistryStorage initialized");
        } else {
          console.log("✅ IdentityRegistryStorage already initialized, owner:", owner);
        }
      } catch (error) {
        if (error.message.includes("Initializable: contract is already initialized")) {
          console.log("✅ IdentityRegistryStorage already initialized");
        } else {
          throw error;
        }
      }
    }

    // Initialize IdentityRegistry (requires other contracts)
    if (identityRegistry && trustedIssuersRegistry && claimTopicsRegistry && identityRegistryStorage) {
      console.log("\n🔧 Initializing IdentityRegistry...");
      const identityRegistryContract = await ethers.getContractAt('IdentityRegistry', identityRegistry.address, signer);
      
      try {
        const owner = await identityRegistryContract.owner();
        if (owner === ethers.constants.AddressZero) {
          console.log("Initializing IdentityRegistry...");
          const initTx = await identityRegistryContract.init(
            trustedIssuersRegistry.address,
            claimTopicsRegistry.address,
            identityRegistryStorage.address
          );
          await initTx.wait();
          console.log("✅ IdentityRegistry initialized");
        } else {
          console.log("✅ IdentityRegistry already initialized, owner:", owner);
        }
      } catch (error) {
        if (error.message.includes("Initializable: contract is already initialized")) {
          console.log("✅ IdentityRegistry already initialized");
        } else {
          throw error;
        }
      }
    }

    console.log("\n🎉 All contracts initialized successfully!");
    
  } catch (error) {
    console.error("❌ Contract initialization failed:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
}); 