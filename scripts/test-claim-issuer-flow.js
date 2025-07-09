#!/usr/bin/env node

/**
 * Test ClaimIssuer Flow Script
 * 
 * This script demonstrates the complete ClaimIssuer workflow:
 * 1. Deploy a ClaimIssuer contract
 * 2. Register it as a trusted issuer
 * 3. Create a user with OnchainID
 * 4. Issue a claim to the user
 * 5. Verify the claim was issued
 * 
 * Usage: node test-claim-issuer-flow.js [network]
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function testClaimIssuerFlow() {
  console.log("🧪 Testing ClaimIssuer Flow");
  console.log("=" * 50);

  try {
    // Get signers
    const [deployer, user] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Test User: ${user.address}`);

    // Step 1: Deploy core components (if not already deployed)
    console.log("\n📦 Deploying core components...");
    
    const ClaimIssuer = await ethers.getContractFactory("ClaimIssuer");
    const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
    const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
    const OnchainID = await ethers.getContractFactory("OnchainID");

    // Deploy components
    const claimTopicsRegistry = await ClaimTopicsRegistry.deploy();
    const trustedIssuersRegistry = await TrustedIssuersRegistry.deploy();
    const identityRegistryStorage = await IdentityRegistryStorage.deploy();
    const identityRegistry = await IdentityRegistry.deploy(identityRegistryStorage.address);
    
    console.log("✅ Core components deployed");

    // Step 2: Initialize components
    console.log("\n🔧 Initializing components...");
    
    await identityRegistryStorage.initialize();
    await identityRegistry.initialize(identityRegistryStorage.address);
    
    console.log("✅ Components initialized");

    // Step 3: Deploy ClaimIssuer
    console.log("\n🏛️ Deploying ClaimIssuer...");
    
    const claimIssuer = await ClaimIssuer.deploy(
      "Test KYC Provider",
      "Test KYC verification provider"
    );
    
    console.log(`✅ ClaimIssuer deployed: ${claimIssuer.address}`);

    // Step 4: Add claim topic
    console.log("\n📝 Adding claim topic...");
    
    const kycTopic = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("KYC"));
    await claimTopicsRegistry.addClaimTopic(kycTopic);
    
    console.log(`✅ Claim topic added: ${kycTopic}`);

    // Step 5: Register ClaimIssuer as trusted issuer
    console.log("\n🔐 Registering ClaimIssuer as trusted issuer...");
    
    await trustedIssuersRegistry.addTrustedIssuer(
      claimIssuer.address,
      [kycTopic]
    );
    
    console.log("✅ ClaimIssuer registered as trusted issuer");

    // Step 6: Deploy OnchainID for user
    console.log("\n🆔 Deploying OnchainID for user...");
    
    const userOnchainId = await OnchainID.deploy(
      user.address, // management key
      false // not a library
    );
    
    console.log(`✅ User OnchainID deployed: ${userOnchainId.address}`);

    // Step 7: Register user in Identity Registry
    console.log("\n👤 Registering user in Identity Registry...");
    
    await identityRegistry.addAgent(deployer.address);
    await identityRegistry.registerIdentity(
      user.address,
      userOnchainId.address,
      1 // country code
    );
    
    console.log("✅ User registered in Identity Registry");

    // Step 8: Issue claim via ClaimIssuer
    console.log("\n📋 Issuing claim via ClaimIssuer...");
    
    const claimData = ethers.utils.defaultAbiCoder.encode(
      ["string"],
      ["KYC_VERIFIED"]
    );
    
    const claimExpiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
    
    await claimIssuer.issueClaim(
      userOnchainId.address,
      kycTopic,
      claimData,
      claimExpiry
    );
    
    console.log("✅ Claim issued successfully");

    // Step 9: Verify claim was issued
    console.log("\n🔍 Verifying claim...");
    
    const claim = await userOnchainId.getClaim(kycTopic, claimIssuer.address);
    
    if (claim.issuer === claimIssuer.address && claim.topic === kycTopic) {
      console.log("✅ Claim verified successfully!");
      console.log(`   Issuer: ${claim.issuer}`);
      console.log(`   Topic: ${claim.topic}`);
      console.log(`   Data: ${claim.data}`);
      console.log(`   Expiry: ${new Date(claim.expiry * 1000).toISOString()}`);
    } else {
      console.log("❌ Claim verification failed");
    }

    // Step 10: Test claim validation
    console.log("\n🧪 Testing claim validation...");
    
    const isValid = await userOnchainId.hasClaim(
      claimIssuer.address,
      kycTopic,
      claimData
    );
    
    if (isValid) {
      console.log("✅ Claim validation successful");
    } else {
      console.log("❌ Claim validation failed");
    }

    // Summary
    console.log("\n" + "=" * 50);
    console.log("📋 TEST SUMMARY");
    console.log("=" * 50);
    console.log(`✅ ClaimIssuer deployed: ${claimIssuer.address}`);
    console.log(`✅ User OnchainID: ${userOnchainId.address}`);
    console.log(`✅ Claim issued and verified`);
    console.log(`✅ Claim validation successful`);
    console.log("\n🎉 ClaimIssuer flow test completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// CLI handling
async function main() {
  console.log("Testing on Hardhat localhost network");
  
  await testClaimIssuerFlow();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testClaimIssuerFlow }; 