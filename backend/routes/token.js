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
    console.log(`🎯 Pause/Unpause request for token: ${tokenAddress}, paused: ${paused}`);
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    console.log(`✅ Token contract instance created for ${tokenAddress}`);
    const tx = await token.setPaused(paused);
    console.log(`✅ Pause/Unpause transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Pause/Unpause transaction confirmed`);
    res.json({ success: true, tokenAddress, paused, transactionHash: tx.hash });
  } catch (error) {
    console.error('❌ Error in pause/unpause:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token info
router.get('/token-info/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Getting token info for: ${tokenAddress}`);
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.owner()
    ]);
    
    // Handle BigNumber conversion properly
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    
    const tokenInfo = {
      name,
      symbol,
      decimals: decimalsNumber,
      totalSupply: ethers.utils.formatUnits(totalSupply, decimalsNumber),
      owner,
      address: tokenAddress
    };
    
    console.log(`✅ Token info loaded: ${name} (${symbol})`);
    
    res.json({
      success: true,
      tokenInfo: tokenInfo
    });
  } catch (error) {
    console.error('❌ Error getting token info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token status
router.get('/token-status/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Checking token status for: ${tokenAddress}`);
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    
    // Check if the contract has the paused function
    const hasPausedFunction = tokenArtifacts.abi.some(item => 
      item.type === 'function' && item.name === 'paused'
    );
    
    if (!hasPausedFunction) {
      res.json({
        success: true,
        status: '⚠️ No pause function found',
        hasPauseFunction: false
      });
      return;
    }
    
    const isPaused = await token.paused();
    const status = isPaused ? '⏸️ PAUSED' : '▶️ ACTIVE';
    
    console.log(`✅ Token status: ${status}`);
    
    res.json({
      success: true,
      status: status,
      isPaused: isPaused,
      hasPauseFunction: true
    });
  } catch (error) {
    console.error('❌ Error checking token status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify user
router.get('/verify-user/:tokenAddress/:userAddress', async (req, res) => {
  try {
    const { tokenAddress, userAddress } = req.params;
    console.log(`🎯 Verify user request for token: ${tokenAddress}, user: ${userAddress}`);
    if (!tokenAddress || !userAddress) throw new Error('Token address and user address are required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    console.log(`✅ Token contract instance created for ${tokenAddress}`);
    const isVerified = await token.isVerified(userAddress);
    console.log(`✅ User verification result: ${isVerified}`);
    res.json({ success: true, tokenAddress, userAddress, isVerified });
  } catch (error) {
    console.error('❌ Error in verify user:', error);
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
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const decimals = await token.decimals();
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    const amountInWei = ethers.utils.parseUnits(amount, decimalsNumber);
    const tx = await token.mint(toAddress, amountInWei);
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
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const decimals = await token.decimals();
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    const amountInWei = ethers.utils.parseUnits(amount, decimalsNumber);
    const tx = await token.burn(fromAddress, amountInWei);
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
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    const decimals = await token.decimals();
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    const amountInWei = ethers.utils.parseUnits(amount, decimalsNumber);
    const fromBalance = await token.balanceOf(fromAddress);
    if (fromBalance.lt(amountInWei)) throw new Error(`Insufficient balance. Need ${amount} tokens, but ${fromAddress} only has ${ethers.utils.formatUnits(fromBalance, decimalsNumber)}`);
    const tx = await token.forcedTransfer(fromAddress, toAddress, amountInWei);
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
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
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
    // Step 2: Transfer tokens from agent to destination (using regular transfer with compliance)
    const tx2 = await token.transfer(toAddress, amountInWei);
    res.json({ success: true, tokenAddress, amount, fromAddress, toAddress, transactionHash1: tx1.hash, transactionHash2: tx2.hash });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 