const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const { createProvider, getContractArtifacts } = require('../utils/helpers');

// Add claim issuer (placeholder)
router.post('/add', (req, res) => {
  res.json({ message: 'Add claim issuer endpoint (to be implemented)' });
});

// Get Identity Registries with trusted issuers
router.get('/identity-registries', async (req, res) => {
  try {
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      throw new Error('No deployments found. Please deploy factory first.');
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const factoryDeployments = deployments.filter(d => d.factory && d.factory.address);
    const irs = [];
    for (const factoryDeployment of factoryDeployments) {
      const tokens = factoryDeployment.tokens || [];
      for (const token of tokens) {
        try {
          const irAddress = token.suite?.identityRegistry;
          if (!irAddress) continue;
          const irArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/IdentityRegistry.json');
          if (!fs.existsSync(irArtifactsPath)) throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
          const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
          const ir = new ethers.Contract(irAddress, irArtifacts.abi, wallet);
          const tirAddress = await ir.issuersRegistry();
          const tirArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/TrustedIssuersRegistry.json');
          if (!fs.existsSync(tirArtifactsPath)) throw new Error('TrustedIssuersRegistry artifacts not found. Please compile contracts first.');
          const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
          const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
          const issuers = await tir.getTrustedIssuers();
          const issuersWithTopics = await Promise.all(
            issuers.map(async (issuer) => {
              const topics = await tir.getTrustedIssuerClaimTopics(issuer);
              return {
                address: issuer,
                topics: topics.map(t => t.toNumber())
              };
            })
          );
          irs.push({
            address: irAddress,
            trustedIssuers: issuersWithTopics,
            tirAddress: tirAddress,
            timestamp: token.timestamp,
            tokenName: token.token.name,
            tokenSymbol: token.token.symbol,
            deploymentId: token.deploymentId
          });
        } catch (error) {
          console.log(`Error loading IR ${token.suite?.identityRegistry}: ${error.message}`);
        }
      }
    }
    res.json({ success: true, identityRegistries: irs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 