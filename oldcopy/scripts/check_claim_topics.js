const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  // Get the ClaimTopicsRegistry address from deployments.json
  const fs = require('fs');
  const path = require('path');
  const deploymentsPath = path.join(__dirname, '../deployments.json');
  
  if (!fs.existsSync(deploymentsPath)) {
    console.error("❌ No deployments found");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const claimTopicsRegistry = deployments.find(d => d.component === 'ClaimTopicsRegistry');
  
  if (!claimTopicsRegistry) {
    console.error("❌ No ClaimTopicsRegistry found in deployments");
    process.exit(1);
  }

  const address = claimTopicsRegistry.address;
  console.log("🔍 Checking ClaimTopicsRegistry at:", address);

  try {
    const abi = [
      "function getClaimTopics() view returns (uint256[])"
    ];
    
    const contract = await ethers.getContractAt(abi, address);
    const topics = await contract.getClaimTopics();
    
    console.log("\n📋 Claim Topics found:", topics.length);
    
    if (topics.length === 0) {
      console.log("No claim topics have been added yet.");
    } else {
      console.log("Topic IDs:", topics.map(t => t.toString()));
      
      // Map to standard Tokeny claim topics
      const standardTopics = {
        1: "KYC (Know Your Customer)",
        2: "AML (Anti-Money Laundering)", 
        3: "Accredited Investor",
        4: "EU Nationality Confirmed",
        5: "US Nationality Confirmed",
        6: "Blacklist"
      };
      
      console.log("\n📝 Topic Details:");
      topics.forEach((topic, index) => {
        const topicId = topic.toNumber();
        const topicName = standardTopics[topicId] || `Custom Topic ${topicId}`;
        console.log(`${index + 1}. ID: ${topicId} - ${topicName}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error reading claim topics:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
}); 