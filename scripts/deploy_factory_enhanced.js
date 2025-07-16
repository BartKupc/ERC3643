const hre = require("hardhat");
const { ethers } = hre;
const OnchainID = require('@onchain-id/solidity');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🏭 Enhanced TREXFactory Deployment");
  
  // Get Hardhat signer (first account) - using local Hardhat accounts only
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    console.log("\n📋 Step 1: Deploying Implementation Contracts...");
    
    // Deploy all implementation contracts
    const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', signer);
    await claimTopicsRegistryImplementation.waitForDeployment();
    console.log("✅ ClaimTopicsRegistry Implementation:", await claimTopicsRegistryImplementation.getAddress());

    const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', signer);
    await trustedIssuersRegistryImplementation.waitForDeployment();
    console.log("✅ TrustedIssuersRegistry Implementation:", await trustedIssuersRegistryImplementation.getAddress());

    const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', signer);
    await identityRegistryStorageImplementation.waitForDeployment();
    console.log("✅ IdentityRegistryStorage Implementation:", await identityRegistryStorageImplementation.getAddress());

    const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', signer);
    await identityRegistryImplementation.waitForDeployment();
    console.log("✅ IdentityRegistry Implementation:", await identityRegistryImplementation.getAddress());

    const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', signer);
    await modularComplianceImplementation.waitForDeployment();
    console.log("✅ ModularCompliance Implementation:", await modularComplianceImplementation.getAddress());

    const tokenImplementation = await ethers.deployContract('Token', signer);
    await tokenImplementation.waitForDeployment();
    console.log("✅ Token Implementation:", await tokenImplementation.getAddress());

    console.log("\n📋 Step 2: Deploying Identity Implementation...");
    
    const identityImplementation = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      signer
    ).deploy(deployerAddress, true);
    await identityImplementation.waitForDeployment();
    console.log("✅ Identity Implementation:", await identityImplementation.getAddress());

    console.log("\n📋 Step 3: Deploying Identity Implementation Authority...");
    
    const identityImplementationAuthority = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      signer
    ).deploy(await identityImplementation.getAddress());
    await identityImplementationAuthority.waitForDeployment();
    console.log("✅ Identity Implementation Authority:", await identityImplementationAuthority.getAddress());

    console.log("\n📋 Step 4: Deploying Identity Factory...");
    
    const identityFactory = await new ethers.deployContract('Factory', [await identityImplementationAuthority.getAddress()], signer);
    await identityFactory.waitForDeployment();
    console.log("✅ Identity Factory:", await identityFactory.getAddress());

    console.log("\n📋 Step 5: Deploying TREX Implementation Authority...");
    
    const trexImplementationAuthority = await ethers.deployContract(
      'TREXImplementationAuthority',
      [true, ethers.ZeroAddress, ethers.ZeroAddress],
      signer
    );
    await trexImplementationAuthority.waitForDeployment();
    console.log("✅ TREX Implementation Authority:", await trexImplementationAuthority.getAddress());

    console.log("\n📋 Step 6: Adding TREX Version...");
    
    const versionStruct = {
      major: 4,
      minor: 0,
      patch: 0,
    };
    
    const contractsStruct = {
      tokenImplementation: await tokenImplementation.getAddress(),
      ctrImplementation: await claimTopicsRegistryImplementation.getAddress(),
      irImplementation: await identityRegistryImplementation.getAddress(),
      irsImplementation: await identityRegistryStorageImplementation.getAddress(),
      tirImplementation: await trustedIssuersRegistryImplementation.getAddress(),
      mcImplementation: await modularComplianceImplementation.getAddress(),
    };
    
    const addVersionTx = await trexImplementationAuthority.connect(signer).addAndUseTREXVersion(versionStruct, contractsStruct);
    await addVersionTx.wait();
    console.log("✅ Added TREX version to Implementation Authority");

    console.log("\n📋 Step 7: Deploying TREXFactory...");
    
    const trexFactory = await ethers.deployContract('TREXFactory', [await trexImplementationAuthority.getAddress(), await identityFactory.getAddress()], signer);
    await trexFactory.waitForDeployment();
    console.log("✅ TREXFactory:", await trexFactory.getAddress());

    console.log("\n📋 Step 8: Configuring Identity Factory...");
    
    const addTokenFactoryTx = await identityFactory.connect(signer).addTokenFactory(await trexFactory.getAddress());
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
    
    if (implAuthFromFactory !== await trexImplementationAuthority.getAddress()) {
      throw new Error("Implementation Authority mismatch");
    }
    
    if (idFactoryFromFactory !== await identityFactory.getAddress()) {
      throw new Error("ID Factory mismatch");
    }
    
    if (owner !== deployerAddress) {
      throw new Error("Owner mismatch");
    }

    // Create deployment data
    const deploymentData = {
      deploymentId: `factory-${Date.now()}`,
      timestamp: new Date().toISOString(),
      network: hre.network.name,
      deployer: deployerAddress,
      factory: {
        address: await trexFactory.getAddress(),
        owner: owner,
        implementationAuthority: implAuthFromFactory,
        idFactory: idFactoryFromFactory
      },
      implementations: {
        claimTopicsRegistry: await claimTopicsRegistryImplementation.getAddress(),
        trustedIssuersRegistry: await trustedIssuersRegistryImplementation.getAddress(),
        identityRegistryStorage: await identityRegistryStorageImplementation.getAddress(),
        identityRegistry: await identityRegistryImplementation.getAddress(),
        modularCompliance: await modularComplianceImplementation.getAddress(),
        token: await tokenImplementation.getAddress(),
        identity: await identityImplementation.getAddress()
      },
      authorities: {
        identityImplementationAuthority: await identityImplementationAuthority.getAddress(),
        trexImplementationAuthority: await trexImplementationAuthority.getAddress()
      },
      factories: {
        identityFactory: await identityFactory.getAddress(),
        trexFactory: await trexFactory.getAddress()
      },
      tokens: [] // Will be populated when tokens are deployed
    };

    // Save deployment data
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deployments = [];
    
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    deployments.push(deploymentData);
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

    console.log("\n🎉 TREXFactory deployed successfully!");
    console.log("\n📋 Deployment saved to deployments.json");
    console.log("📋 Factory Address:", await trexFactory.getAddress());
    console.log("📋 Deployment ID:", deploymentData.deploymentId);
    
    // Update addresses.js with the new factory
    const addressesPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/addresses.js');
    const addressesContent = `// T-REX Contract Addresses
// Auto-updated from deployment
const addresses = {
  ceaErc20: "0xa6dF0C88916f3e2831A329CE46566dDfBe9E74b7",
  // T-REX Addresses
  TREXFactory: "${await trexFactory.getAddress()}",
  Token: "0x0000000000000000000000000000000000000000",
  ModularCompliance: "0x0000000000000000000000000000000000000000",
  IdentityRegistry: "0x0000000000000000000000000000000000000000",
  ClaimTopicsRegistry: "0x0000000000000000000000000000000000000000",
  TrustedIssuersRegistry: "0x0000000000000000000000000000000000000000",
};
export default addresses;
`;
    
    fs.writeFileSync(addressesPath, addressesContent);
    console.log("✅ Addresses.js updated with new factory address");
    
    console.log("\n🚀 Next steps:");
    console.log("1. Use the TREXFactory address to deploy tokens");
    console.log("2. Run: npm run deploy:token");
    console.log("3. Check the dashboard for deployment details");
    
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