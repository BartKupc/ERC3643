#!/usr/bin/env node

/**
 * Check Deployment Status Script
 * 
 * This script checks the current deployment status of all T-REX contracts
 * and displays their addresses and status.
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function checkDeployment() {
  console.log("🔍 Checking T-REX Deployment Status");
  console.log("=" * 50);

  try {
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    // Check if deployment files exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const latestFile = path.join(deploymentsDir, "latest-localhost.json");
    
    if (fs.existsSync(latestFile)) {
      console.log("\n📁 Found deployment file:", latestFile);
      const deploymentData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
      
      console.log("\n🏗️ Deployed Components:");
      Object.entries(deploymentData.addresses.components).forEach(([name, address]) => {
        console.log(`  ${name}: ${address}`);
      });
      
      if (deploymentData.addresses.claimIssuers && deploymentData.addresses.claimIssuers.length > 0) {
        console.log("\n🏛️ Deployed ClaimIssuers:");
        deploymentData.addresses.claimIssuers.forEach(issuer => {
          console.log(`  ${issuer.name}: ${issuer.address}`);
        });
      }
      
      console.log(`\n📅 Deployed at: ${deploymentData.timestamp}`);
    } else {
      console.log("\n❌ No deployment file found");
    }

    // Check localStorage for ClaimIssuers (frontend storage)
    console.log("\n💾 Frontend ClaimIssuer Storage:");
    console.log("   (This would be in browser localStorage)");
    console.log("   Check the ClaimIssuers tab in the frontend");

    // Try to verify contracts on chain
    console.log("\n🔗 On-chain Verification:");
    
    try {
      // Check if we can connect to the network
      const provider = ethers.provider;
      const network = await provider.getNetwork();
      console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
      
      // Check if we can get the latest block
      const latestBlock = await provider.getBlockNumber();
      console.log(`   Latest Block: ${latestBlock}`);
      
    } catch (error) {
      console.log(`   ❌ Network connection failed: ${error.message}`);
    }

    // Check for common deployment issues
    console.log("\n🚨 Common Issues Check:");
    
    // Check if Hardhat node is running
    try {
      const provider = ethers.provider;
      await provider.getBlockNumber();
      console.log("   ✅ Hardhat node is running");
    } catch (error) {
      console.log("   ❌ Hardhat node is not running");
      console.log("   💡 Start with: npx hardhat node");
    }

    // Check if contracts are compiled
    const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
    if (fs.existsSync(artifactsDir)) {
      console.log("   ✅ Contracts are compiled");
    } else {
      console.log("   ❌ Contracts are not compiled");
      console.log("   💡 Compile with: npx hardhat compile");
    }

    console.log("\n" + "=" * 50);
    console.log("📋 Next Steps:");
    console.log("1. If no deployment found, run: npm run setup:production");
    console.log("2. If Hardhat node not running, start with: npx hardhat node");
    console.log("3. If contracts not compiled, run: npx hardhat compile");
    console.log("4. Check frontend for ClaimIssuer addresses in localStorage");

  } catch (error) {
    console.error("❌ Error checking deployment:", error);
  }
}

// CLI handling
async function main() {
  await checkDeployment();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkDeployment }; 