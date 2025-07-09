#!/usr/bin/env node

/**
 * T-REX Production dApp Setup Script
 * 
 * This script sets up a complete production-ready T-REX dApp with:
 * - All core components deployment
 * - ClaimIssuer contracts
 * - Trusted issuer registration
 * - User management
 * - Token deployment
 * 
 * Usage: node setup-production-dapp.js [network] [deployer-address]
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  networks: {
    localhost: {
      rpc: "http://localhost:8545",
      chainId: 31337
    },
    hardhat: {
      rpc: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  
  // Default token configuration
  defaultToken: {
    name: "T-REX Security Token",
    symbol: "TREX",
    decimals: 18,
    totalSupply: ethers.utils.parseEther("1000000") // 1M tokens
  },
  
  // Default claim topics
  defaultClaimTopics: [
    { topic: "KYC", description: "Know Your Customer verification" },
    { topic: "ACCREDITED", description: "Accredited investor status" },
    { topic: "COUNTRY", description: "Country of residence" },
    { topic: "ROLE", description: "User role in the system" }
  ],
  
  // Default ClaimIssuer configurations
  defaultClaimIssuers: [
    {
      name: "KYC Provider",
      description: "Official KYC verification provider",
      claimTopics: [1] // KYC topic
    },
    {
      name: "Accreditation Service",
      description: "Accredited investor verification service",
      claimTopics: [2] // ACCREDITED topic
    },
    {
      name: "Compliance Officer",
      description: "Internal compliance officer",
      claimTopics: [1, 2, 3, 4] // All topics
    }
  ]
};

class ProductionSetup {
  constructor(network, deployerAddress) {
    this.network = network;
    this.deployerAddress = deployerAddress;
    this.provider = new ethers.providers.JsonRpcProvider(CONFIG.networks[network].rpc);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", this.provider);
    
    this.deployedAddresses = {
      components: {},
      claimIssuers: [],
      users: [],
      tokens: []
    };
  }

  async setup() {
    console.log("🚀 Starting T-REX Production dApp Setup");
    console.log(`Network: ${this.network}`);
    console.log(`Deployer: ${this.deployerAddress}`);
    console.log("=" * 60);

    try {
      // Step 1: Deploy core components
      await this.deployCoreComponents();
      
      // Step 2: Initialize components
      await this.initializeComponents();
      
      // Step 3: Deploy ClaimIssuer contracts
      await this.deployClaimIssuers();
      
      // Step 4: Register ClaimIssuers as trusted issuers
      await this.registerTrustedIssuers();
      
      // Step 5: Add claim topics
      await this.addClaimTopics();
      
      // Step 6: Deploy token
      await this.deployToken();
      
      // Step 7: Save deployment data
      await this.saveDeploymentData();
      
      console.log("✅ Production setup completed successfully!");
      this.printSummary();
      
    } catch (error) {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    }
  }

  async deployCoreComponents() {
    console.log("\n📦 Deploying core components...");
    
    // Deploy implementation contracts
    const Token = await ethers.getContractFactory("Token");
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
    const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
    const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
    const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
    
    this.deployedAddresses.components.token = await Token.deploy();
    this.deployedAddresses.components.identityRegistry = await IdentityRegistry.deploy();
    this.deployedAddresses.components.identityRegistryStorage = await IdentityRegistryStorage.deploy();
    this.deployedAddresses.components.modularCompliance = await ModularCompliance.deploy();
    this.deployedAddresses.components.claimTopicsRegistry = await ClaimTopicsRegistry.deploy();
    this.deployedAddresses.components.trustedIssuersRegistry = await TrustedIssuersRegistry.deploy();
    
    // Deploy proxy contracts
    const TokenProxy = await ethers.getContractFactory("TokenProxy");
    const IdentityRegistryProxy = await ethers.getContractFactory("IdentityRegistryProxy");
    const IdentityRegistryStorageProxy = await ethers.getContractFactory("IdentityRegistryStorageProxy");
    const ModularComplianceProxy = await ethers.getContractFactory("ModularComplianceProxy");
    const ClaimTopicsRegistryProxy = await ethers.getContractFactory("ClaimTopicsRegistryProxy");
    const TrustedIssuersRegistryProxy = await ethers.getContractFactory("TrustedIssuersRegistryProxy");
    
    this.deployedAddresses.components.tokenProxy = await TokenProxy.deploy();
    this.deployedAddresses.components.identityRegistryProxy = await IdentityRegistryProxy.deploy();
    this.deployedAddresses.components.identityRegistryStorageProxy = await IdentityRegistryStorageProxy.deploy();
    this.deployedAddresses.components.modularComplianceProxy = await ModularComplianceProxy.deploy();
    this.deployedAddresses.components.claimTopicsRegistryProxy = await ClaimTopicsRegistryProxy.deploy();
    this.deployedAddresses.components.trustedIssuersRegistryProxy = await TrustedIssuersRegistryProxy.deploy();
    
    // Deploy factory
    const TREXFactory = await ethers.getContractFactory("TREXFactory");
    this.deployedAddresses.components.factory = await TREXFactory.deploy();
    
    console.log("✅ Core components deployed");
  }

  async initializeComponents() {
    console.log("\n🔧 Initializing components...");
    
    // Initialize Identity Registry Storage
    const identityRegistryStorage = await ethers.getContractAt(
      "IdentityRegistryStorage",
      this.deployedAddresses.components.identityRegistryStorageProxy.address
    );
    await identityRegistryStorage.initialize();
    
    // Initialize Identity Registry
    const identityRegistry = await ethers.getContractAt(
      "IdentityRegistry",
      this.deployedAddresses.components.identityRegistryProxy.address
    );
    await identityRegistry.initialize(
      this.deployedAddresses.components.identityRegistryStorageProxy.address
    );
    
    // Initialize Modular Compliance
    const modularCompliance = await ethers.getContractAt(
      "ModularCompliance",
      this.deployedAddresses.components.modularComplianceProxy.address
    );
    await modularCompliance.initialize();
    
    // Initialize Token
    const token = await ethers.getContractAt(
      "Token",
      this.deployedAddresses.components.tokenProxy.address
    );
    await token.initialize(
      CONFIG.defaultToken.name,
      CONFIG.defaultToken.symbol,
      CONFIG.defaultToken.decimals,
      this.deployedAddresses.components.identityRegistryProxy.address,
      this.deployedAddresses.components.modularComplianceProxy.address,
      CONFIG.defaultToken.totalSupply
    );
    
    console.log("✅ Components initialized");
  }

  async deployClaimIssuers() {
    console.log("\n🏛️ Deploying ClaimIssuer contracts...");
    
    const ClaimIssuer = await ethers.getContractFactory("ClaimIssuer");
    
    for (const issuerConfig of CONFIG.defaultClaimIssuers) {
      console.log(`Deploying ${issuerConfig.name}...`);
      
      const claimIssuer = await ClaimIssuer.deploy(
        issuerConfig.name,
        issuerConfig.description
      );
      
      this.deployedAddresses.claimIssuers.push({
        name: issuerConfig.name,
        description: issuerConfig.description,
        address: claimIssuer.address,
        claimTopics: issuerConfig.claimTopics,
        deployer: this.deployerAddress,
        deployedAt: new Date().toISOString()
      });
    }
    
    console.log("✅ ClaimIssuer contracts deployed");
  }

  async registerTrustedIssuers() {
    console.log("\n🔐 Registering ClaimIssuers as trusted issuers...");
    
    const trustedIssuersRegistry = await ethers.getContractAt(
      "TrustedIssuersRegistry",
      this.deployedAddresses.components.trustedIssuersRegistryProxy.address
    );
    
    for (const issuer of this.deployedAddresses.claimIssuers) {
      console.log(`Registering ${issuer.name}...`);
      
      await trustedIssuersRegistry.addTrustedIssuer(
        issuer.address,
        issuer.claimTopics
      );
    }
    
    console.log("✅ ClaimIssuers registered as trusted issuers");
  }

  async addClaimTopics() {
    console.log("\n📝 Adding claim topics...");
    
    const claimTopicsRegistry = await ethers.getContractAt(
      "ClaimTopicsRegistry",
      this.deployedAddresses.components.claimTopicsRegistryProxy.address
    );
    
    for (const topic of CONFIG.defaultClaimTopics) {
      console.log(`Adding topic: ${topic.topic}`);
      
      await claimTopicsRegistry.addClaimTopic(topic.topic);
    }
    
    console.log("✅ Claim topics added");
  }

  async deployToken() {
    console.log("\n🪙 Token already deployed during initialization");
    console.log(`Token Address: ${this.deployedAddresses.components.tokenProxy.address}`);
  }

  async saveDeploymentData() {
    console.log("\n💾 Saving deployment data...");
    
    const deploymentData = {
      network: this.network,
      deployer: this.deployerAddress,
      timestamp: new Date().toISOString(),
      addresses: this.deployedAddresses,
      config: CONFIG
    };
    
    const filename = `deployment-${this.network}-${Date.now()}.json`;
    const filepath = path.join(__dirname, "..", "deployments", filename);
    
    // Ensure deployments directory exists
    const deploymentsDir = path.dirname(filepath);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
    
    // Also save to a latest file
    const latestFile = path.join(__dirname, "..", "deployments", `latest-${this.network}.json`);
    fs.writeFileSync(latestFile, JSON.stringify(deploymentData, null, 2));
    
    console.log(`✅ Deployment data saved to ${filename}`);
  }

  printSummary() {
    console.log("\n" + "=" * 60);
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=" * 60);
    
    console.log(`\n🌐 Network: ${this.network}`);
    console.log(`👤 Deployer: ${this.deployerAddress}`);
    
    console.log("\n🏗️ Core Components:");
    Object.entries(this.deployedAddresses.components).forEach(([name, address]) => {
      console.log(`  ${name}: ${address}`);
    });
    
    console.log("\n🏛️ ClaimIssuers:");
    this.deployedAddresses.claimIssuers.forEach(issuer => {
      console.log(`  ${issuer.name}: ${issuer.address}`);
      console.log(`    Topics: ${issuer.claimTopics.join(", ")}`);
    });
    
    console.log("\n📝 Claim Topics:");
    CONFIG.defaultClaimTopics.forEach((topic, index) => {
      console.log(`  ${index + 1}. ${topic.topic} - ${topic.description}`);
    });
    
    console.log("\n🪙 Token:");
    console.log(`  Name: ${CONFIG.defaultToken.name}`);
    console.log(`  Symbol: ${CONFIG.defaultToken.symbol}`);
    console.log(`  Address: ${this.deployedAddresses.components.tokenProxy.address}`);
    console.log(`  Total Supply: ${ethers.utils.formatEther(CONFIG.defaultToken.totalSupply)} ${CONFIG.defaultToken.symbol}`);
    
    console.log("\n🚀 Next Steps:");
    console.log("1. Update your frontend configuration with the deployed addresses");
    console.log("2. Configure your dApp to use the ClaimIssuer contracts");
    console.log("3. Test the complete flow: user registration → claim issuance → token transfer");
    console.log("4. Start the frontend with: npm run dev:frontend");
    
    console.log("\n" + "=" * 60);
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const network = args[0] || "localhost";
  const deployerAddress = args[1] || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  if (!CONFIG.networks[network]) {
    console.error(`❌ Unknown network: ${network}`);
    console.log("Available networks:", Object.keys(CONFIG.networks).join(", "));
    process.exit(1);
  }
  
  console.log(`🚀 Setting up T-REX dApp on ${network} (Hardhat network)`);
  console.log(`📝 Note: This setup is for Hardhat development only`);
  const setup = new ProductionSetup(network, deployerAddress);
  await setup.setup();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { ProductionSetup, CONFIG }; 