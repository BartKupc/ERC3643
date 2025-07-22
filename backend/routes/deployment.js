const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

// Import helpers from server.js (you may need to refactor these into a shared module)
const { createProvider, runDeploymentScript, getLatestDeployment } = require('../server');

// Deploy Factory
router.post('/factory', async (req, res) => {
  try {
    console.log('🚀 Starting factory deployment...');
    // Run the factory deployment script
    const output = await runDeploymentScript('deploy_factory_enhanced.js');
    console.log('✅ Factory deployment script completed');
    console.log('Output:', output);
    // Get the latest deployment
    const latestDeployment = getLatestDeployment();
    if (!latestDeployment || !latestDeployment.factory) {
      throw new Error('Factory deployment failed - no deployment data found');
    }
    console.log('📋 Factory deployed at:', latestDeployment.factory.address);
    res.json({
      success: true,
      message: 'Factory deployed successfully',
      deployment: latestDeployment,
      factoryAddress: latestDeployment.factory.address
    });
  } catch (error) {
    console.error('❌ Factory deployment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Factory deployment failed'
    });
  }
});

// Deploy Token
router.post('/token', async (req, res) => {
  try {
    const { factoryAddress, tokenDetails, claimDetails } = req.body;
    if (!factoryAddress) {
      return res.status(400).json({
        success: false,
        error: 'Factory address is required'
      });
    }
    if (!tokenDetails || !tokenDetails.name || !tokenDetails.symbol) {
      return res.status(400).json({
        success: false,
        error: 'Token details (name, symbol) are required'
      });
    }
    console.log('🎯 Starting token deployment...');
    console.log('Factory Address:', factoryAddress);
    console.log('Token Details:', tokenDetails);
    console.log('Claim Details:', claimDetails);
    // Get the deployer address (account 0)
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    // Automatically add deployer as agent for both Token and IR
    const enhancedTokenDetails = {
      ...tokenDetails,
      tokenAgents: [deployerAddress],
      irAgents: [deployerAddress]
    };
    console.log('🔑 Auto-configured agents for deployment:');
    console.log('Deployer Address:', deployerAddress);
    console.log('Token Agents:', enhancedTokenDetails.tokenAgents);
    console.log('IR Agents:', enhancedTokenDetails.irAgents);
    // Create temporary token config file
    const configPath = path.join(__dirname, '../temp_token_config.json');
    fs.writeFileSync(configPath, JSON.stringify(enhancedTokenDetails, null, 2));
    // Create temporary claim details file if provided
    let claimDetailsPath = null;
    if (claimDetails) {
      claimDetailsPath = path.join(__dirname, '../temp_claim_details.json');
      fs.writeFileSync(claimDetailsPath, JSON.stringify(claimDetails, null, 2));
      console.log('📋 Claim details saved to:', claimDetailsPath);
    }
    try {
      // Prepare environment variables for the deployment script
      const envVars = {
        TOKEN_CONFIG_PATH: configPath
      };
      if (claimDetailsPath) {
        envVars.CLAIM_DETAILS_PATH = claimDetailsPath;
      }
      // TODO: Run the token deployment script with envVars
      // await runDeploymentScript('deploy_token.js', envVars);
      // For now, just return a placeholder
      res.json({
        success: true,
        message: 'Token deployment endpoint (to be implemented)',
        tokenDetails: enhancedTokenDetails
      });
    } catch (deployError) {
      throw deployError;
    }
  } catch (error) {
    console.error('❌ Token deployment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Token deployment failed'
    });
  }
});

// Deploy ClaimIssuer
router.post('/claim-issuer', async (req, res) => {
  try {
    console.log('🎯 Starting ClaimIssuer deployment...');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    console.log('🔑 Deploying ClaimIssuer with deployer address:', deployerAddress);
    const claimIssuerArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/@onchain-id/solidity/contracts/ClaimIssuer.sol/ClaimIssuer.json');
    if (!fs.existsSync(claimIssuerArtifactsPath)) {
      throw new Error('ClaimIssuer artifacts not found. Please compile contracts first.');
    }
    const claimIssuerArtifacts = JSON.parse(fs.readFileSync(claimIssuerArtifactsPath, 'utf8'));
    const claimIssuerFactory = new ethers.ContractFactory(
      claimIssuerArtifacts.abi,
      claimIssuerArtifacts.bytecode,
      wallet
    );
    const claimIssuer = await claimIssuerFactory.deploy(deployerAddress);
    await claimIssuer.deployed();
    console.log('✅ ClaimIssuer deployed at:', claimIssuer.address);
    const signingKeyHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address'], [deployerAddress])
    );
    const addKeyTx = await claimIssuer.addKey(signingKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
    await addKeyTx.wait();
    console.log('✅ Signing key added to ClaimIssuer');
    const latestDeployment = getLatestDeployment();
    if (latestDeployment && latestDeployment.suite && latestDeployment.suite.trustedIssuersRegistry) {
      try {
        const tirAddress = latestDeployment.suite.trustedIssuersRegistry;
        const tirArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registries/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json');
        if (fs.existsSync(tirArtifactsPath)) {
          const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
          const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
          const exists = await tir.isTrustedIssuer(claimIssuer.address);
          if (!exists) {
            const defaultClaimTopics = [1, 2, 3];
            const addTrustedTx = await tir.addTrustedIssuer(claimIssuer.address, defaultClaimTopics);
            await addTrustedTx.wait();
            console.log('✅ ClaimIssuer added as trusted issuer with default claim topics [1, 2, 3]');
          } else {
            console.log('ℹ️ ClaimIssuer already exists as trusted issuer');
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not add ClaimIssuer to trusted issuers:', error.message);
      }
    }
    res.json({
      success: true,
      message: 'ClaimIssuer deployed successfully',
      claimIssuerAddress: claimIssuer.address,
      deployerAddress: deployerAddress
    });
  } catch (error) {
    console.error('❌ ClaimIssuer deployment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save deployment to deployments.json
router.post('/save', (req, res) => {
  try {
    const { deployment } = req.body;
    if (!deployment) {
      return res.status(400).json({ error: 'Deployment data is required' });
    }
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    deployments.push(deployment);
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`✅ Saved deployment: ${deployment.component} at ${deployment.address}`);
    res.json({ success: true, deployment });
  } catch (error) {
    console.error('❌ Failed to save deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 