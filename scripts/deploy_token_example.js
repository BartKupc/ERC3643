const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Replace these with your actual deployed contract addresses
  const TREX_FACTORY_ADDRESS = "0x..."; // ← Replace with your TREXFactory address
  
  const trexFactory = await ethers.getContractAt("TREXFactory", TREX_FACTORY_ADDRESS);

  // Token details for your ERC-3643 token
  const tokenDetails = {
    name: "My ERC-3643 Token",
    symbol: "MTK",
    decimals: 18,
    onchainID: ethers.constants.AddressZero, // Will be auto-generated if zero
    tokenURI: "https://api.example.com/token/1"
  };

  // Claim details for identity verification
  const claimDetails = {
    claimTopics: [1, 2, 3], // Claim topic IDs for identity verification
    issuers: [deployer.address], // Trusted issuers who can verify identities
    issuerClaims: [1, 2, 3] // Claim types that each issuer can verify
  };

  // Deploy the TREX suite with a unique salt
  const salt = "my-unique-token-salt-" + Date.now();
  
  console.log("Deploying ERC-3643 token suite...");
  console.log("Token Name:", tokenDetails.name);
  console.log("Token Symbol:", tokenDetails.symbol);
  console.log("Salt:", salt);

  const deployTx = await trexFactory.deployTREXSuite(
    salt,
    tokenDetails,
    claimDetails,
    { gasLimit: 10_000_000 }
  );

  const receipt = await deployTx.wait();
  console.log("✅ Token suite deployed!");

  // Get the deployed token address
  const tokenAddress = await trexFactory.getToken(salt);
  console.log("Token Address:", tokenAddress);

  // Get the token contract instance
  const token = await ethers.getContractAt("Token", tokenAddress);
  
  // Get other contracts in the suite
  const identityRegistry = await ethers.getContractAt("IdentityRegistry", await token.identityRegistry());
  const compliance = await ethers.getContractAt("ModularCompliance", await token.compliance());

  console.log("\n🎉 ERC-3643 Token Suite deployed successfully!");
  console.log("Token:", tokenAddress);
  console.log("Identity Registry:", await token.identityRegistry());
  console.log("Compliance:", await token.compliance());
  
  console.log("\nNext steps:");
  console.log("1. Configure compliance rules in the ModularCompliance contract");
  console.log("2. Add trusted issuers to the TrustedIssuersRegistry");
  console.log("3. Set up claim topics in the ClaimTopicsRegistry");
  console.log("4. Mint tokens using token.mint()");
}

main().catch((err) => {
  console.error("❌ Token deployment failed:", err);
  process.exit(1);
}); 