const hre = require("hardhat");
const { ethers } = hre;
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🎯 Enhanced Token Deployment");
  console.log("Deployer:", deployer.address);

  // Load deployments to get the latest factory
  const deploymentsPath = path.join(__dirname, '../deployments.json');
  if (!fs.existsSync(deploymentsPath)) {
    console.error("❌ No deployments found. Please deploy factory first: npm run deploy:factory");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const latestFactory = deployments[deployments.length - 1];
  
  if (!latestFactory || !latestFactory.factory) {
    console.error("❌ No factory deployment found. Please deploy factory first: npm run deploy:factory");
    process.exit(1);
  }

  const TREX_FACTORY_ADDRESS = latestFactory.factory.address;
  console.log("\n📋 Using latest TREXFactory:", TREX_FACTORY_ADDRESS);

  try {
    // Get the TREXFactory contract instance
    const TREXFactory = await ethers.getContractAt("TREXFactory", TREX_FACTORY_ADDRESS);
    console.log("✅ Connected to TREXFactory");
    
    // Verify factory configuration
    console.log("\n📋 Factory Configuration:");
    const implementationAuthority = await TREXFactory.getImplementationAuthority();
    const idFactory = await TREXFactory.getIdFactory();
    const owner = await TREXFactory.owner();
    
    console.log("Owner:", owner);
    console.log("Implementation Authority:", implementationAuthority);
    console.log("ID Factory:", idFactory);
    
    if (owner !== deployer.address) {
      console.log("❌ You are not the owner of the TREXFactory");
      console.log("💡 Only the owner can call deployTREXSuite");
      return;
    }
    
    // Token metadata
    const tokenDetails = {
      owner: deployer.address,
      name: "MySecurityToken",
      symbol: "MST",
      decimals: 18,
      irs: ethers.constants.AddressZero,
      ONCHAINID: ethers.constants.AddressZero,
      irAgents: [],
      tokenAgents: [],
      complianceModules: [],
      complianceSettings: []
    };

    // Claim requirements
    const claimDetails = {
      claimTopics: [],
      issuers: [],
      issuerClaims: []
    };

    const salt = "token-" + Date.now();

    console.log("\n📋 Token Details:");
    console.log("Token Name:", tokenDetails.name);
    console.log("Token Symbol:", tokenDetails.symbol);
    console.log("Token Decimals:", tokenDetails.decimals);
    console.log("Salt:", salt);
    
    console.log("\n🚀 Deploying token suite...");
    
    const tx = await TREXFactory.connect(deployer).deployTREXSuite(
      salt,
      tokenDetails,
      claimDetails,
      {
        gasLimit: 15_000_000
      }
    );
    
    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for transaction confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Token suite deployed!");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Get deployed addresses
    const tokenAddress = await TREXFactory.getToken(salt);
    console.log("\n📦 Token Suite Components:");
    console.log("Token Address:", tokenAddress);
    
    if (tokenAddress === ethers.constants.AddressZero) {
      console.log("⚠️  Token address is zero - deployment may have failed");
      process.exit(1);
    }

    // Get the token contract instance
    const token = await ethers.getContractAt("Token", tokenAddress);
    
    // Get other contracts in the suite
    const identityRegistry = await token.identityRegistry();
    const compliance = await token.compliance();
    
    console.log("Identity Registry:", identityRegistry);
    console.log("Compliance:", compliance);
    
    // Verify token details
    const tokenName = await token.name();
    const tokenSymbol = await token.symbol();
    const tokenDecimals = await token.decimals();
    
    console.log("\n📋 Verified Token Details:");
    console.log("Name:", tokenName);
    console.log("Symbol:", tokenSymbol);
    console.log("Decimals:", tokenDecimals.toString());

    // Create token deployment data
    const tokenDeploymentData = {
      deploymentId: `token-${Date.now()}`,
      timestamp: new Date().toISOString(),
      network: hre.network.name,
      deployer: deployer.address,
      factoryAddress: TREX_FACTORY_ADDRESS,
      salt: salt,
      token: {
        address: tokenAddress,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: tokenDecimals.toString()
      },
      suite: {
        identityRegistry: identityRegistry,
        compliance: compliance
      },
      transaction: {
        hash: tx.hash,
        gasUsed: receipt.gasUsed.toString()
      }
    };

    // Update deployments.json with the new token
    latestFactory.tokens.push(tokenDeploymentData);
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));

    // Update addresses.js with the new token
    const addressesPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/addresses.js');
    const addressesContent = `// T-REX Contract Addresses
// Auto-updated from deployment
const addresses = {
  ceaErc20: "0xa6dF0C88916f3e2831A329CE46566dDfBe9E74b7",
  // T-REX Addresses
  TREXFactory: "${TREX_FACTORY_ADDRESS}",
  Token: "${tokenAddress}",
  ModularCompliance: "${compliance}",
  IdentityRegistry: "${identityRegistry}",
  ClaimTopicsRegistry: "0x0000000000000000000000000000000000000000",
  TrustedIssuersRegistry: "0x0000000000000000000000000000000000000000",
};
export default addresses;
`;
    
    fs.writeFileSync(addressesPath, addressesContent);
    
    console.log("\n🎉 ERC-3643 Token Suite deployed successfully!");
    console.log("\n📋 Deployment saved to deployments.json");
    console.log("📋 Token Address:", tokenAddress);
    console.log("📋 Deployment ID:", tokenDeploymentData.deploymentId);
    console.log("✅ Addresses.js updated with new token address");
    
    console.log("\n🚀 Next steps:");
    console.log("1. Configure compliance rules in the ModularCompliance contract");
    console.log("2. Add trusted issuers to the TrustedIssuersRegistry");
    console.log("3. Set up claim topics in the ClaimTopicsRegistry");
    console.log("4. Mint tokens using token.mint()");
    console.log("5. Check the dashboard for deployment details");
    
  } catch (error) {
    console.error("❌ Token deployment failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      console.log("\n💡 Try increasing the gas limit or check the transaction parameters");
    }
    
    if (error.message.includes("function selector was not recognized")) {
      console.log("\n💡 This suggests the contract at this address is not a TREXFactory");
      console.log("💡 Or there's an ABI version mismatch");
    }
    
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
}); 