const hre = require("hardhat");
const { ethers } = hre;
const OnchainID = require('@onchain-id/solidity');

async function main() {
  console.log("🏭 TREXFactory Deployment from Fixture Pattern");
  
  // Get MetaMask provider and signer
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []); // Request account access
  const signer = provider.getSigner();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    console.log("\n📋 Step 1: Deploying Implementation Contracts...");
    
    // Deploy all implementation contracts (following fixture pattern)
    const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', signer);
    console.log("✅ ClaimTopicsRegistry Implementation:", claimTopicsRegistryImplementation.address);

    const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', signer);
    console.log("✅ TrustedIssuersRegistry Implementation:", trustedIssuersRegistryImplementation.address);

    const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', signer);
    console.log("✅ IdentityRegistryStorage Implementation:", identityRegistryStorageImplementation.address);

    const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', signer);
    console.log("✅ IdentityRegistry Implementation:", identityRegistryImplementation.address);

    const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', signer);
    console.log("✅ ModularCompliance Implementation:", modularComplianceImplementation.address);

    const tokenImplementation = await ethers.deployContract('Token', signer);
    console.log("✅ Token Implementation:", tokenImplementation.address);

    console.log("\n📋 Step 2: Deploying Identity Implementation...");
    
    // Deploy identity implementation (following fixture pattern exactly)
    const identityImplementation = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      signer
    ).deploy(deployerAddress, true);
    console.log("✅ Identity Implementation:", identityImplementation.address);

    console.log("\n📋 Step 3: Deploying Identity Implementation Authority...");
    
    const identityImplementationAuthority = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      signer
    ).deploy(identityImplementation.address);
    console.log("✅ Identity Implementation Authority:", identityImplementationAuthority.address);

    console.log("\n📋 Step 4: Deploying Identity Factory...");
    
    const identityFactory = await new ethers.deployContract('Factory', [identityImplementationAuthority.address], signer);
    console.log("✅ Identity Factory:", identityFactory.address);

    console.log("\n📋 Step 5: Deploying TREX Implementation Authority...");
    
    const trexImplementationAuthority = await ethers.deployContract(
      'TREXImplementationAuthority',
      [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
      signer
    );
    console.log("✅ TREX Implementation Authority:", trexImplementationAuthority.address);

    console.log("\n📋 Step 6: Adding TREX Version...");
    
    const versionStruct = {
      major: 4,
      minor: 0,
      patch: 0,
    };
    
    const contractsStruct = {
      tokenImplementation: tokenImplementation.address,
      ctrImplementation: claimTopicsRegistryImplementation.address,
      irImplementation: identityRegistryImplementation.address,
      irsImplementation: identityRegistryStorageImplementation.address,
      tirImplementation: trustedIssuersRegistryImplementation.address,
      mcImplementation: modularComplianceImplementation.address,
    };
    
    const addVersionTx = await trexImplementationAuthority.connect(signer).addAndUseTREXVersion(versionStruct, contractsStruct);
    await addVersionTx.wait();
    console.log("✅ Added TREX version to Implementation Authority");

    console.log("\n📋 Step 7: Deploying TREXFactory...");
    
    const trexFactory = await ethers.deployContract('TREXFactory', [trexImplementationAuthority.address, identityFactory.address], signer);
    console.log("✅ TREXFactory:", trexFactory.address);

    console.log("\n📋 Step 8: Configuring Identity Factory...");
    
    const addTokenFactoryTx = await identityFactory.connect(signer).addTokenFactory(trexFactory.address);
    await addTokenFactoryTx.wait();
    console.log("✅ Added TREXFactory to Identity Factory");

    console.log("\n📋 Step 9: Verifying Setup...");
    
    // Verify the setup
    const implAuthFromFactory = await trexFactory.getImplementationAuthority();
    const idFactoryFromFactory = await trexFactory.getIdFactory();
    const owner = await trexFactory.owner();
    
    console.log("✅ TREXFactory Owner:", owner);
    console.log("✅ TREXFactory Implementation Authority:", implAuthFromFactory);
    console.log("✅ TREXFactory ID Factory:", idFactoryFromFactory);
    
    if (implAuthFromFactory !== trexImplementationAuthority.address) {
      throw new Error("Implementation Authority mismatch");
    }
    
    if (idFactoryFromFactory !== identityFactory.address) {
      throw new Error("ID Factory mismatch");
    }
    
    if (owner !== deployerAddress) {
      throw new Error("Owner mismatch");
    }

    console.log("\n🎉 TREXFactory deployed successfully!");
    console.log("\n📋 All Deployed Addresses:");
    console.log(JSON.stringify({
      // Implementations
      claimTopicsRegistryImplementation: claimTopicsRegistryImplementation.address,
      trustedIssuersRegistryImplementation: trustedIssuersRegistryImplementation.address,
      identityRegistryStorageImplementation: identityRegistryStorageImplementation.address,
      identityRegistryImplementation: identityRegistryImplementation.address,
      modularComplianceImplementation: modularComplianceImplementation.address,
      tokenImplementation: tokenImplementation.address,
      identityImplementation: identityImplementation.address,
      
      // Authorities
      identityImplementationAuthority: identityImplementationAuthority.address,
      trexImplementationAuthority: trexImplementationAuthority.address,
      
      // Factories
      identityFactory: identityFactory.address,
      trexFactory: trexFactory.address
    }, null, 2));

    console.log("\n🚀 Next steps:");
    console.log("1. Use the TREXFactory address to deploy tokens");
    console.log("2. Run the token deployment script with the new factory address");
    
  } catch (error) {
    console.error("❌ TREXFactory deployment failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
}); 