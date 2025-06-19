const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Step 1: Deploy TREXFactory with constructor args
  const implementationAuthorityAddress = "0x..."; // ← your deployed ITREXImplementationAuthority
  const      = "0x...";               // ← your deployed IIdFactory

  const TREXFactory = await ethers.getContractFactory("TREXFactory");
  const trexFactory = await TREXFactory.deploy(implementationAuthorityAddress, idFactoryAddress);
  await trexFactory.deployed();

  console.log("✅ TREXFactory deployed at:", trexFactory.address);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
