const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

const { createProvider } = require('../server');

// Get claim topics from a token's ClaimTopicsRegistry
router.get('/claim-topics/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const identityRegistry = await token.identityRegistry();
    const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json');
    if (!fs.existsSync(irArtifactsPath)) throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
    const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
    const identityRegistryContract = new ethers.Contract(identityRegistry, irArtifacts.abi, wallet);
    const claimTopicsRegistry = await identityRegistryContract.topicsRegistry();
    const ctrArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json');
    if (!fs.existsSync(ctrArtifactsPath)) throw new Error('ClaimTopicsRegistry artifacts not found. Please compile contracts first.');
    const ctrArtifacts = JSON.parse(fs.readFileSync(ctrArtifactsPath, 'utf8'));
    const ctr = new ethers.Contract(claimTopicsRegistry, ctrArtifacts.abi, wallet);
    const topics = await ctr.getClaimTopics();
    const claimTopics = topics.map(topic => topic.toNumber());
    res.json({ success: true, claimTopics, claimTopicsRegistry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agents for a token
router.get('/agents/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const identityRegistry = await token.identityRegistry();
    const agents = { token: [], ir: [] };
    try {
      const isTokenAgent = await token.isAgent(deployerAddress);
      if (isTokenAgent) agents.token.push(deployerAddress);
    } catch (err) {}
    try {
      const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json');
      if (!fs.existsSync(irArtifactsPath)) throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
      const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
      const ir = new ethers.Contract(identityRegistry, irArtifacts.abi, wallet);
      const isIRAgent = await ir.isAgent(deployerAddress);
      if (isIRAgent) agents.ir.push(deployerAddress);
      const isTokenIRAgent = await ir.isAgent(tokenAddress);
      if (isTokenIRAgent) agents.ir.push(tokenAddress);
    } catch (err) {}
    res.json({ success: true, agents, deployerAddress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trusted issuers for a token
router.get('/trusted-issuers/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const identityRegistry = await token.identityRegistry();
    const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json');
    if (!fs.existsSync(irArtifactsPath)) throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
    const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
    const identityRegistryContract = new ethers.Contract(identityRegistry, irArtifacts.abi, wallet);
    const trustedIssuersRegistry = await identityRegistryContract.issuersRegistry();
    const tirArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json');
    if (!fs.existsSync(tirArtifactsPath)) throw new Error('TrustedIssuersRegistry artifacts not found. Please compile contracts first.');
    const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
    const tir = new ethers.Contract(trustedIssuersRegistry, tirArtifacts.abi, wallet);
    const trustedIssuers = await tir.getTrustedIssuers();
    const issuersWithDetails = [];
    for (const issuerAddress of trustedIssuers) {
      try {
        const claimTopics = await tir.getTrustedIssuerClaimTopics(issuerAddress);
        issuersWithDetails.push({
          address: issuerAddress,
          claimTopics: claimTopics.map(topic => topic.toNumber())
        });
      } catch (err) {
        issuersWithDetails.push({ address: issuerAddress, claimTopics: [] });
      }
    }
    res.json({ success: true, trustedIssuers: issuersWithDetails, trustedIssuersRegistry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 