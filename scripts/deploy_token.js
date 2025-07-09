const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("🎯 Token Deployment Using Test Pattern");
  
  // Get MetaMask provider and signer
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []); // Request account access
  const signer = provider.getSigner();
  const deployerAddress = await signer.getAddress();
  
  console.log("Deployer:", deployerAddress);

  // Use the TREXFactory address from your latest deployment
  const TREX_FACTORY_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
  
  console.log("\n📋 Connecting to TREXFactory:", TREX_FACTORY_ADDRESS);

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
    
    if (owner !== deployerAddress) {
      console.log("❌ You are not the owner of the TREXFactory");
      console.log("💡 Only the owner can call deployTREXSuite");
      return;
    }
    
    // Token metadata - following the exact pattern from the test
    const tokenDetails = {
      owner: deployerAddress,                    // address of the owner of all contracts
      name: "TestPatternToken",                   // name of the token
      symbol: "TPT",                              // symbol / ticker of the token
      decimals: 18,                               // decimals of the token (can be between 0 and 18)
      irs: ethers.constants.AddressZero,          // identity registry storage address (set to ZERO for new storage)
      ONCHAINID: ethers.constants.AddressZero,    // ONCHAINID of the token (set to ZERO for auto-generation)
      irAgents: [],                               // list of agents of the identity registry
      tokenAgents: [],                            // list of agents of the token
      complianceModules: [],                      // modules to bind to the compliance
      complianceSettings: []                      // settings calls for compliance modules
    };

    // Claim requirements - following the exact pattern from the test
    const claimDetails = {
      claimTopics: [],                            // claim topics required (empty for basic setup)
      issuers: [],                                // trusted issuers addresses (empty for basic setup)
      issuerClaims: []                            // claims that issuers are allowed to emit (empty for basic setup)
    };

    const salt = "test-pattern-" + Date.now();

    console.log("\n📋 Token Details:");
    console.log("Token Owner:", tokenDetails.owner);
    console.log("Token Name:", tokenDetails.name);
    console.log("Token Symbol:", tokenDetails.symbol);
    console.log("Token Decimals:", tokenDetails.decimals);
    console.log("IRS Address:", tokenDetails.irs);
    console.log("ONCHAINID:", tokenDetails.ONCHAINID);
    console.log("IR Agents:", tokenDetails.irAgents);
    console.log("Token Agents:", tokenDetails.tokenAgents);
    console.log("Compliance Modules:", tokenDetails.complianceModules);
    console.log("Compliance Settings:", tokenDetails.complianceSettings);
    
    console.log("\n📋 Claim Details:");
    console.log("Claim Topics:", claimDetails.claimTopics);
    console.log("Issuers:", claimDetails.issuers);
    console.log("Issuer Claims:", claimDetails.issuerClaims);
    
    console.log("\n🚀 Deploying token suite using test pattern...");
    console.log("Salt:", salt);
    
    // Use the exact pattern from the test: trexFactory.connect(signer).deployTREXSuite()
    const tx = await TREXFactory.connect(signer).deployTREXSuite(
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

    // Check for the TREXSuiteDeployed event (as shown in the test)
    const suiteDeployedEvent = receipt.events.find(event => event.event === 'TREXSuiteDeployed');
    if (suiteDeployedEvent) {
      console.log("🎉 TREXSuiteDeployed event found!");
      console.log("Token Address from event:", suiteDeployedEvent.args[0]);
    }

    // Retrieve deployed token address using getToken method
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
    
    console.log("\n🎉 ERC-3643 Token Suite deployed successfully using test pattern!");
    console.log("\nNext steps:");
    console.log("1. Configure compliance rules in the ModularCompliance contract");
    console.log("2. Add trusted issuers to the TrustedIssuersRegistry");
    console.log("3. Set up claim topics in the ClaimTopicsRegistry");
    console.log("4. Mint tokens using token.mint()");
    
  } catch (error) {
    console.error("❌ Token deployment failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    // Check if it's a gas estimation error
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      console.log("\n💡 Try increasing the gas limit or check the transaction parameters");
    }
    
    // Check if it's a function not found issue
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