// Usage: node scripts/test_deploy_claim_topics_registry.js <PRIVATE_KEY>
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load artifact
const artifactPath = path.join(__dirname, "../trex-scaffold/packages/react-app/src/contracts/ClaimTopicsRegistry.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"); // or your node URL

async function main() {
  const privateKey = process.argv[2];
  if (!privateKey) {
    console.error("Usage: node scripts/test_deploy_claim_topics_registry.js <PRIVATE_KEY>");
    process.exit(1);
  }
  const wallet = new ethers.Wallet(privateKey, provider);

  // Deploy contract
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying ClaimTopicsRegistry...");
  const contract = await factory.deploy();
  await contract.deployed();
  console.log("Deployed at:", contract.address);

  // Call init()
  console.log("Calling init()...");
  const tx = await contract.init();
  await tx.wait();
  console.log("Initialized!");

  // Check owner
  const owner = await contract.owner();
  console.log("Owner is:", owner);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});