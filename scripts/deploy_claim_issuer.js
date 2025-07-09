#!/usr/bin/env node

/**
 * Deploy ClaimIssuer Script
 * 
 * This script deploys a ClaimIssuer contract and saves the deployed address.
 * Usage: node scripts/deploy_claim_issuer.js
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function deployClaimIssuer() {
  console.log("🏛️ Deploying ClaimIssuer contract");
  console.log("=".repeat(50));

  try {
    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    // Deploy ClaimIssuer contract (no name/description)
    const ClaimIssuer = await ethers.getContractFactory("ClaimIssuer");
    const claimIssuer = await ClaimIssuer.deploy(deployer.address);
    await claimIssuer.deployed();

    console.log(`✅ ClaimIssuer deployed successfully!`);
    console.log(`   Address: ${claimIssuer.address}`);
    console.log(`   Transaction Hash: ${claimIssuer.deployTransaction.hash}`);

    // Save deployment info
    const deploymentInfo = {
      address: claimIssuer.address,
      deployer: deployer.address,
      transactionHash: claimIssuer.deployTransaction.hash,
      deployedAt: new Date().toISOString()
    };
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
    fs.writeFileSync(
      path.join(deploymentsDir, "latest-claim-issuer.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    fs.writeFileSync(
      path.join(deploymentsDir, `claim-issuer-${Date.now()}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );
  } catch (error) {
    console.error("Error deploying ClaimIssuer:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  deployClaimIssuer();
} 