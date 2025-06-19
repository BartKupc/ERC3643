const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Deploy Implementation Contracts
  const Token = await ethers.getContractFactory("Token");
  const tokenImpl = await Token.deploy();
  await tokenImpl.deployed();
  console.log("Token Impl:", tokenImpl.address);

  const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
  const ctrImpl = await ClaimTopicsRegistry.deploy();
  await ctrImpl.deployed();
  console.log("ClaimTopicsRegistry Impl:", ctrImpl.address);

  const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
  const tirImpl = await TrustedIssuersRegistry.deploy();
  await tirImpl.deployed();
  console.log("TrustedIssuersRegistry Impl:", tirImpl.address);

  const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
  const irsImpl = await IdentityRegistryStorage.deploy();
  await irsImpl.deployed();
  console.log("IdentityRegistryStorage Impl:", irsImpl.address);

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const irImpl = await IdentityRegistry.deploy();
  await irImpl.deployed();
  console.log("IdentityRegistry Impl:", irImpl.address);

  const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
  const mcImpl = await ModularCompliance.deploy();
  await mcImpl.deployed();
  console.log("ModularCompliance Impl:", mcImpl.address);

  // 2. Deploy TREXImplementationAuthority with zero addresses (will be set later)
  const TREXImplementationAuthority = await ethers.getContractFactory("TREXImplementationAuthority");
  const implementationAuthority = await TREXImplementationAuthority.deploy(
    true, // referenceStatus
    ethers.constants.AddressZero, // trexFactory - will be set later
    ethers.constants.AddressZero  // iaFactory - will be set later
  );
  await implementationAuthority.deployed();
  console.log("TREXImplementationAuthority:", implementationAuthority.address);

  // 3. Add TREX version to the implementation authority
  const versionStruct = {
    major: 1,
    minor: 0,
    patch: 0
  };
  
  const contractsStruct = {
    tokenImplementation: tokenImpl.address,
    ctrImplementation: ctrImpl.address,
    irImplementation: irImpl.address,
    irsImplementation: irsImpl.address,
    tirImplementation: tirImpl.address,
    mcImplementation: mcImpl.address
  };

  const addVersionTx = await implementationAuthority.addAndUseTREXVersion(versionStruct, contractsStruct);
  await addVersionTx.wait();
  console.log("✅ Added TREX version to ImplementationAuthority");

  // 4. Deploy TREXFactory with the implementation authority
  const TREXFactory = await ethers.getContractFactory("TREXFactory");
  const trexFactory = await TREXFactory.deploy(
    implementationAuthority.address, // implementationAuthority
    deployer.address // idFactory - using deployer as placeholder, will be set later
  );
  await trexFactory.deployed();
  console.log("TREXFactory:", trexFactory.address);

  // 5. Deploy IAFactory with TREXFactory address
  const IAFactory = await ethers.getContractFactory("IAFactory");
  const iaFactory = await IAFactory.deploy(trexFactory.address);
  await iaFactory.deployed();
  console.log("IAFactory:", iaFactory.address);

  // 6. Set the TREXFactory and IAFactory addresses in the implementation authority
  const setTREXFactoryTx = await implementationAuthority.setTREXFactory(trexFactory.address);
  await setTREXFactoryTx.wait();
  console.log("✅ Set TREXFactory in ImplementationAuthority");

  const setIAFactoryTx = await implementationAuthority.setIAFactory(iaFactory.address);
  await setIAFactoryTx.wait();
  console.log("✅ Set IAFactory in ImplementationAuthority");

  // 7. Set the actual IAFactory in TREXFactory (replacing the placeholder)
  const setIdFactoryTx = await trexFactory.setIdFactory(iaFactory.address);
  await setIdFactoryTx.wait();
  console.log("✅ Set IAFactory in TREXFactory");

  console.log("\n🎉 TREX Factory Suite deployed successfully!");
  console.log("TREXFactory:", trexFactory.address);
  console.log("ImplementationAuthority:", implementationAuthority.address);
  console.log("IAFactory:", iaFactory.address);
  console.log("\nYou can now use TREXFactory.deployTREXSuite() to create ERC-3643 tokens!");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
