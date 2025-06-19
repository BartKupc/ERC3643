const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy Registries
  const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
  const claimTopicsRegistry = await ClaimTopicsRegistry.deploy();
  await claimTopicsRegistry.deployed();

  const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
  const trustedIssuersRegistry = await TrustedIssuersRegistry.deploy();
  await trustedIssuersRegistry.deployed();

  const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
  const identityRegistryStorage = await IdentityRegistryStorage.deploy();
  await identityRegistryStorage.deployed();

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.deployed();

  const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
  const modularCompliance = await ModularCompliance.deploy();
  await modularCompliance.deployed();

  // 2. Deploy Logic Contract (Token Implementation)
  const LogicToken = await ethers.getContractFactory("Token");
  const logicToken = await LogicToken.deploy();
  await logicToken.deployed();
  console.log("Logic Token deployed at:", logicToken.address);

  // 3. Deploy Implementation Authority
  const ImplementationAuthority = await ethers.getContractFactory("ImplementationAuthority");
  const implementationAuthority = await ImplementationAuthority.deploy(logicToken.address);
  await implementationAuthority.deployed();
  console.log("Implementation Authority deployed at:", implementationAuthority.address);

  // 4. Deploy TokenProxy
  const TokenProxy = await ethers.getContractFactory("TokenProxy");
  const tokenProxy = await TokenProxy.deploy(
    implementationAuthority.address, // NOT logicToken directly!
    identityRegistry.address,
    modularCompliance.address,
    "Smart SRWA",
    "SRWA",
    9,
    deployer.address // Onchain ID (can be dummy for now)
  );
  await tokenProxy.deployed();
  console.log("TokenProxy deployed at:", tokenProxy.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
