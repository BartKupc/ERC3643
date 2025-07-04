const { ethers } = require("ethers");

// Test script to demonstrate multiple registry functionality
async function testMultipleRegistries() {
  console.log("🧪 Testing Multiple Registry Functionality");
  
  // Connect to Hardhat node
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  const [deployer] = await ethers.getSigners();
  
  console.log("✅ Connected to Hardhat node");
  console.log("Deployer:", deployer.address);
  
  try {
    // Deploy multiple ClaimTopicsRegistries
    console.log("\n📋 Deploying multiple ClaimTopicsRegistries...");
    
    const ClaimTopicsRegistry = await ethers.getContractFactory('ClaimTopicsRegistry');
    
    const registry1 = await ClaimTopicsRegistry.deploy();
    await registry1.deployed();
    console.log("✅ ClaimTopicsRegistry 1 deployed at:", registry1.address);
    
    const registry2 = await ClaimTopicsRegistry.deploy();
    await registry2.deployed();
    console.log("✅ ClaimTopicsRegistry 2 deployed at:", registry2.address);
    
    // Add different topics to each registry
    console.log("\n📋 Adding topics to Registry 1...");
    await registry1.addClaimTopic(1);
    await registry1.addClaimTopic(2);
    console.log("✅ Added topics 1, 2 to Registry 1");
    
    console.log("📋 Adding topics to Registry 2...");
    await registry2.addClaimTopic(3);
    await registry2.addClaimTopic(4);
    console.log("✅ Added topics 3, 4 to Registry 2");
    
    // Verify different content in each registry
    console.log("\n📋 Verifying registry contents...");
    const topics1 = await registry1.getClaimTopics();
    const topics2 = await registry2.getClaimTopics();
    
    console.log("Registry 1 topics:", topics1.map(t => t.toNumber()));
    console.log("Registry 2 topics:", topics2.map(t => t.toNumber()));
    
    // Deploy multiple TrustedIssuersRegistries
    console.log("\n📋 Deploying multiple TrustedIssuersRegistries...");
    
    const TrustedIssuersRegistry = await ethers.getContractFactory('TrustedIssuersRegistry');
    
    const tir1 = await TrustedIssuersRegistry.deploy();
    await tir1.deployed();
    console.log("✅ TrustedIssuersRegistry 1 deployed at:", tir1.address);
    
    const tir2 = await TrustedIssuersRegistry.deploy();
    await tir2.deployed();
    console.log("✅ TrustedIssuersRegistry 2 deployed at:", tir2.address);
    
    // Add different issuers to each registry
    const issuer1 = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
    const issuer2 = "0x8ba1f109551bD432803012645Hac136c772c3c7c";
    
    console.log("\n📋 Adding issuers to TIR 1...");
    await tir1.addTrustedIssuer(issuer1, [1, 2]);
    console.log("✅ Added issuer 1 to TIR 1");
    
    console.log("📋 Adding issuers to TIR 2...");
    await tir2.addTrustedIssuer(issuer2, [3, 4]);
    console.log("✅ Added issuer 2 to TIR 2");
    
    // Verify different content in each registry
    console.log("\n📋 Verifying TIR contents...");
    const issuers1 = await tir1.getTrustedIssuers();
    const issuers2 = await tir2.getTrustedIssuers();
    
    console.log("TIR 1 issuers:", issuers1);
    console.log("TIR 2 issuers:", issuers2);
    
    console.log("\n🎉 Multiple registry test completed successfully!");
    console.log("\n📋 Summary:");
    console.log("- ClaimTopicsRegistry 1:", registry1.address, "Topics:", topics1.map(t => t.toNumber()));
    console.log("- ClaimTopicsRegistry 2:", registry2.address, "Topics:", topics2.map(t => t.toNumber()));
    console.log("- TrustedIssuersRegistry 1:", tir1.address, "Issuers:", issuers1.length);
    console.log("- TrustedIssuersRegistry 2:", tir2.address, "Issuers:", issuers2.length);
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testMultipleRegistries().catch(console.error); 