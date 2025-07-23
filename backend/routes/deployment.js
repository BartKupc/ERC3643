const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

// Import helpers from server.js (you may need to refactor these into a shared module)
const { createProvider, runDeploymentScript, getLatestDeployment } = require('../utils/helpers');

// Deploy Factory
router.post('/factory', async (req, res) => {
  try {
    console.log('🚀 Starting factory deployment...');
    // Run the factory deployment script
    const output = await runDeploymentScript('deploy_factory_enhanced.js');
    console.log('✅ Factory deployment script completed');
    console.log('Output:', output);
    
    // Add a small delay to ensure deployments.json is written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
      
      // Run the token deployment script with timeout
      console.log('🚀 Running token deployment script...');
      const deploymentPromise = runDeploymentScript('deploy_token_enhanced.js', envVars);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Token deployment timed out after 5 minutes')), 5 * 60 * 1000);
      });
      
      const output = await Promise.race([deploymentPromise, timeoutPromise]);
      console.log('✅ Token deployment script completed');
      console.log('Output:', output);
      
      // Add a small delay to ensure deployments.json is written
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the latest deployment to find the newly deployed token
      console.log('🔍 Getting latest deployment...');
      const latestDeployment = getLatestDeployment();
      console.log('📋 Latest deployment:', latestDeployment ? 'found' : 'not found');
      
      if (!latestDeployment || !latestDeployment.tokens || latestDeployment.tokens.length === 0) {
        console.error('❌ No deployment data found after token deployment');
        console.log('Latest deployment data:', latestDeployment);
        throw new Error('Token deployment failed - no deployment data found');
      }
      
      const latestToken = latestDeployment.tokens[latestDeployment.tokens.length - 1];
      console.log('📋 Token deployed at:', latestToken.token.address);
      console.log('📤 Sending response to frontend...');
      
      res.json({
        success: true,
        message: 'Token deployed successfully',
        tokenAddress: latestToken.token.address,
        tokenDetails: latestToken.token,
        deployment: latestDeployment
      });
      
      console.log('✅ Response sent successfully');
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
    const claimIssuerArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/ClaimIssuer.json');
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
    await claimIssuer.waitForDeployment();
    console.log('✅ ClaimIssuer deployed at:', await claimIssuer.getAddress());
    const signingKeyHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['address'], [deployerAddress])
    );
    const addKeyTx = await claimIssuer.addKey(signingKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
    await addKeyTx.wait();
    console.log('✅ Signing key added to ClaimIssuer');
    const latestDeployment = getLatestDeployment();
    if (latestDeployment && latestDeployment.suite && latestDeployment.suite.trustedIssuersRegistry) {
      try {
        const tirAddress = latestDeployment.suite.trustedIssuersRegistry;
        const tirArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/TrustedIssuersRegistry.json');
        if (fs.existsSync(tirArtifactsPath)) {
          const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
          const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
          const claimIssuerAddress = await claimIssuer.getAddress();
          const exists = await tir.isTrustedIssuer(claimIssuerAddress);
          if (!exists) {
            const defaultClaimTopics = [1, 2, 3];
            const addTrustedTx = await tir.addTrustedIssuer(claimIssuerAddress, defaultClaimTopics);
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
      claimIssuerAddress: await claimIssuer.getAddress(),
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
const deploymentsPath = path.join(__dirname, '../../deployments.json');
function loadDeploymentsObj() {
  if (fs.existsSync(deploymentsPath)) {
    const raw = fs.readFileSync(deploymentsPath, 'utf8');
    if (raw.trim().startsWith('{')) {
      const obj = JSON.parse(raw);
      if (!obj.easydeploy) obj.easydeploy = [];
      if (!obj.advanced) obj.advanced = [];
      return obj;
    }
  }
  return { easydeploy: [], advanced: [] };
}
function saveDeploymentsObj(obj) {
  fs.writeFileSync(deploymentsPath, JSON.stringify(obj, null, 2));
}

router.post('/save', (req, res) => {
  try {
    const { deployment } = req.body;
    if (!deployment) {
      return res.status(400).json({ error: 'Deployment data is required' });
    }
    let deploymentsObj = loadDeploymentsObj();
    deploymentsObj.easydeploy.push(deployment);
    saveDeploymentsObj(deploymentsObj);
    console.log(`✅ Saved deployment: ${deployment.component} at ${deployment.address}`);
    res.json({ success: true, deployment });
  } catch (error) {
    console.error('❌ Failed to save deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 