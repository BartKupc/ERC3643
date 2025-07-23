const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

const { createProvider, getContractArtifacts } = require('../utils/helpers');

// Pause/Unpause token
router.post('/pause', async (req, res) => {
  try {
    const { tokenAddress, paused } = req.body;
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const tx = await token.setPaused(paused);
    await tx.wait();
    res.json({ success: true, tokenAddress, paused, transactionHash: tx.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token info
router.get('/token-info/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    res.json({ success: true, tokenAddress, name, symbol, decimals, totalSupply: totalSupply.toString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token status
router.get('/token-status/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    const paused = await token.paused();
    res.json({ success: true, tokenAddress, paused });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify user
router.get('/verify-user/:tokenAddress/:userAddress', async (req, res) => {
  try {
    const { tokenAddress, userAddress } = req.params;
    if (!tokenAddress || !userAddress) throw new Error('Token address and user address are required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    const isVerified = await token.isVerified(userAddress);
    res.json({ success: true, tokenAddress, userAddress, isVerified });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mint tokens
router.post('/mint', async (req, res) => {
  try {
    const { tokenAddress, toAddress, amount } = req.body;
    if (!tokenAddress || !toAddress || !amount) throw new Error('Token address, to address, and amount are required');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const decimals = await token.decimals();
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    const amountInWei = ethers.utils.parseUnits(amount, decimalsNumber);
    const tx = await token.mint(toAddress, amountInWei);
    await tx.wait();
    res.json({ success: true, tokenAddress, toAddress, amount, transactionHash: tx.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Burn tokens
router.post('/burn', async (req, res) => {
  try {
    const { tokenAddress, fromAddress, amount } = req.body;
    if (!tokenAddress || !fromAddress || !amount) throw new Error('Token address, from address, and amount are required');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const decimals = await token.decimals();
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    const amountInWei = ethers.utils.parseUnits(amount, decimalsNumber);
    const tx = await token.burn(fromAddress, amountInWei);
    await tx.wait();
    res.json({ success: true, tokenAddress, fromAddress, amount, transactionHash: tx.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transfer tokens
router.post('/transfer', async (req, res) => {
  try {
    const { tokenAddress, fromAddress, toAddress, amount } = req.body;
    if (!tokenAddress || !fromAddress || !toAddress || !amount) throw new Error('Token address, from address, to address, and amount are required');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const decimals = await token.decimals();
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    const amountInWei = ethers.utils.parseUnits(amount, decimalsNumber);
    const fromBalance = await token.balanceOf(fromAddress);
    if (fromBalance.lt(amountInWei)) throw new Error(`Insufficient balance. Need ${amount} tokens, but ${fromAddress} only has ${ethers.utils.formatUnits(fromBalance, decimalsNumber)}`);
    const tx = await token.forcedTransfer(fromAddress, toAddress, amountInWei);
    await tx.wait();
    res.json({ success: true, tokenAddress, fromAddress, toAddress, amount, transactionHash: tx.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transfer tokens from
router.post('/transfer-from', async (req, res) => {
  try {
    const { tokenAddress, fromAddress, toAddress, amount } = req.body;
    if (!tokenAddress || !fromAddress || !toAddress || !amount) throw new Error('Token address, from address, to address, and amount are required');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const decimals = await token.decimals();
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    const amountInWei = ethers.utils.parseUnits(amount, decimalsNumber);
    const fromBalance = await token.balanceOf(fromAddress);
    if (fromBalance.lt(amountInWei)) throw new Error(`Insufficient balance. Need ${amount} tokens, but ${fromAddress} only has ${ethers.utils.formatUnits(fromBalance, decimalsNumber)}`);
    // Step 1: Transfer tokens from source to agent (using forcedTransfer)
    const tx1 = await token.forcedTransfer(fromAddress, wallet.address, amountInWei);
    await tx1.wait();
    // Step 2: Transfer tokens from agent to destination (using regular transfer with compliance)
    const tx2 = await token.transfer(toAddress, amountInWei);
    await tx2.wait();
    res.json({ success: true, tokenAddress, amount, fromAddress, toAddress, transactionHash1: tx1.hash, transactionHash2: tx2.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 