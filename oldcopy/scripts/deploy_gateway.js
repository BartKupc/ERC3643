const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚪 TREXGateway Deployment");
  
  // Get Hardhat signer (first account) - using local Hardhat accounts only
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  try {
    // Load existing deployments to get TREXFactory address
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      throw new Error("No deployments.json found. Please deploy a factory first.");
    }
    
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    if (deployments.length === 0) {
      throw new Error("No deployments found. Please deploy a factory first.");
    }
    
    // Get the latest factory deployment
    const latestFactory = deployments[deployments.length - 1];
    const TREX_FACTORY_ADDRESS = latestFactory.factory.address;
    
    console.log("📋 Using TREXFactory:", TREX_FACTORY_ADDRESS);
    
    // Verify factory exists
    const TREXFactory = await ethers.getContractAt("TREXFactory", TREX_FACTORY_ADDRESS);
    const factoryOwner = await TREXFactory.owner();
    
    if (factoryOwner !== deployerAddress) {
      console.log("❌ You are not the owner of the TREXFactory");
      console.log("💡 Only the owner can deploy TREXGateway");
      return;
    }
    
    console.log("✅ Verified factory ownership");
    
    console.log("\n📋 Step 1: Deploying TREXGateway...");
    
    // Deploy TREXGateway with public deployment enabled
    const TREXGateway = await ethers.getContractFactory("TREXGateway");
    const trexGateway = await TREXGateway.deploy(
      TREX_FACTORY_ADDRESS,  // factory address
      true                   // publicDeploymentStatus - allow public deployments
    );
    await trexGateway.deployed();
    console.log("✅ TREXGateway deployed:", trexGateway.address);
    
    console.log("\n📋 Step 2: Configuring TREXGateway...");
    
    // Disable deployment fees (don't set fees at all)
    const disableFeeTx = await trexGateway.connect(signer).enableDeploymentFee(false);
    await disableFeeTx.wait();
    console.log("✅ Deployment fee collection disabled");
    
    console.log("\n📋 Step 3: Adding deployer to approved list...");
    
    // Add the deployer as an approved deployer
    const addDeployerTx = await trexGateway.connect(signer).addDeployer(deployerAddress);
    await addDeployerTx.wait();
    console.log("✅ Added deployer to approved list");
    
    console.log("\n📋 Step 4: Verifying Gateway Configuration...");
    
    // Verify the configuration
    const factoryFromGateway = await trexGateway.getFactory();
    const publicDeploymentStatus = await trexGateway.getPublicDeploymentStatus();
    const isDeployer = await trexGateway.isDeployer(deployerAddress);
    const deploymentFee = await trexGateway.getDeploymentFee();
    const isFeeEnabled = await trexGateway.isDeploymentFeeEnabled();
    
    console.log("✅ Gateway Factory:", factoryFromGateway);
    console.log("✅ Public Deployment:", publicDeploymentStatus ? "Enabled" : "Disabled");
    console.log("✅ Deployer Approved:", isDeployer ? "Yes" : "No");
    console.log("✅ Fee Enabled:", isFeeEnabled ? "Yes" : "No");
    console.log("✅ Fee Structure:", {
      fee: deploymentFee.fee.toString(),
      feeToken: deploymentFee.feeToken,
      feeCollector: deploymentFee.feeCollector
    });
    
    if (factoryFromGateway !== TREX_FACTORY_ADDRESS) {
      throw new Error("Factory address mismatch");
    }
    
    if (!isDeployer) {
      throw new Error("Deployer not approved");
    }
    
    // Create gateway deployment data
    const gatewayDeploymentData = {
      deploymentId: `gateway-${Date.now()}`,
      timestamp: new Date().toISOString(),
      network: hre.network.name,
      deployer: deployerAddress,
      gateway: {
        address: trexGateway.address,
        owner: await trexGateway.owner(),
        factory: factoryFromGateway,
        publicDeploymentStatus: publicDeploymentStatus,
        deploymentFee: {
          fee: deploymentFee.fee.toString(),
          feeToken: deploymentFee.feeToken,
          feeCollector: deploymentFee.feeCollector
        },
        feeEnabled: isFeeEnabled
      },
      factoryDeploymentId: latestFactory.deploymentId
    };

    // Save gateway deployment data
    const gatewayDeploymentsPath = path.join(__dirname, '../gateway_deployments.json');
    let gatewayDeployments = [];
    
    if (fs.existsSync(gatewayDeploymentsPath)) {
      gatewayDeployments = JSON.parse(fs.readFileSync(gatewayDeploymentsPath, 'utf8'));
    }
    
    gatewayDeployments.push(gatewayDeploymentData);
    fs.writeFileSync(gatewayDeploymentsPath, JSON.stringify(gatewayDeployments, null, 2));

    // Update the main deployments.json to include gateway info
    latestFactory.gateway = {
      address: trexGateway.address,
      deploymentId: gatewayDeploymentData.deploymentId
    };
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

    console.log("\n🎉 TREXGateway deployed successfully!");
    console.log("\n📋 Gateway saved to gateway_deployments.json");
    console.log("📋 Gateway Address:", trexGateway.address);
    console.log("📋 Deployment ID:", gatewayDeploymentData.deploymentId);
    
    // Update addresses.js with the new gateway
    const addressesPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/addresses.js');
    if (fs.existsSync(addressesPath)) {
      const addressesContent = `// T-REX Contract Addresses
// Auto-updated from deployment
const addresses = {
  ceaErc20: "0xa6dF0C88916f3e2831A329CE46566dDfBe9E74b7",
  // T-REX Addresses
  TREXFactory: "${latestFactory.factory.address}",
  TREXGateway: "${trexGateway.address}",
  Token: "0x0000000000000000000000000000000000000000",
  ModularCompliance: "0x0000000000000000000000000000000000000000",
  IdentityRegistry: "0x0000000000000000000000000000000000000000",
  ClaimTopicsRegistry: "0x0000000000000000000000000000000000000000",
  TrustedIssuersRegistry: "0x0000000000000000000000000000000000000000",
};
export default addresses;
`;
      fs.writeFileSync(addressesPath, addressesContent);
      console.log("📋 Updated addresses.js");
    }

    console.log("\n📋 Next Steps:");
    console.log("1. Use TREXGateway.deployTREXSuite() for token deployments");
    console.log("2. Gateway provides access control and fee management");
    console.log("3. Public deployments are enabled by default");
    console.log("4. Only approved deployers can deploy on behalf of others");

  } catch (error) {
    console.error("❌ TREXGateway deployment failed:", error.message);
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