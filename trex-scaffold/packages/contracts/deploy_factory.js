const hre = require("hardhat");
const { ethers } = hre;
const OnchainID = require('@onchain-id/solidity');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🏭 TREXFactory Deployment from Fixture Pattern");
  console.log("Deployer:", deployer.address);

  try {
    console.log("\n📋 Step 1: Deploying Implementation Contracts...");
    
    // Deploy all implementation contracts (following fixture pattern)
    const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
    console.log("✅ ClaimTopicsRegistry Implementation:", claimTopicsRegistryImplementation.address);

    const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
    console.log("✅ TrustedIssuersRegistry Implementation:", trustedIssuersRegistryImplementation.address);

    const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
    console.log("✅ IdentityRegistryStorage Implementation:", identityRegistryStorageImplementation.address);

    const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
    console.log("✅ IdentityRegistry Implementation:", identityRegistryImplementation.address);

    const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
    console.log("✅ ModularCompliance Implementation:", modularComplianceImplementation.address);

    const tokenImplementation = await ethers.deployContract('Token', deployer);
    console.log("✅ Token Implementation:", tokenImplementation.address);

    console.log("\n📋 Step 2: Deploying Identity Implementation...");
    
    // Deploy identity implementation (following fixture pattern exactly)
    const identityImplementation = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      deployer
    ).deploy(deployer.address, true);
    console.log("✅ Identity Implementation:", identityImplementation.address);

    console.log("\n📋 Step 3: Deploying Identity Implementation Authority...");
    
    const identityImplementationAuthority = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      deployer
    ).deploy(identityImplementation.address);
    console.log("✅ Identity Implementation Authority:", identityImplementationAuthority.address);

    console.log("\n📋 Step 4: Deploying Identity Factory...");
    
    const identityFactory = await new ethers.ContractFactory(
      OnchainID.contracts.Factory.abi,
      OnchainID.contracts.Factory.bytecode,
      deployer
    ).deploy(identityImplementationAuthority.address);
    console.log("✅ Identity Factory:", identityFactory.address);

    console.log("\n📋 Step 5: Deploying TREX Implementation Authority...");
    
    const trexImplementationAuthority = await ethers.deployContract(
      'TREXImplementationAuthority',
      [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
      deployer
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
    
    const addVersionTx = await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
    await addVersionTx.wait();
    console.log("✅ Added TREX version to Implementation Authority");

    console.log("\n📋 Step 7: Deploying TREXFactory...");
    
    const trexFactory = await ethers.deployContract('TREXFactory', [trexImplementationAuthority.address, identityFactory.address], deployer);
    console.log("✅ TREXFactory:", trexFactory.address);

    console.log("\n📋 Step 8: Configuring Identity Factory...");
    
    const addTokenFactoryTx = await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);
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
    
    if (owner !== deployer.address) {
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