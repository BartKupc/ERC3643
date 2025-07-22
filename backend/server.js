const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Helper function to create provider
const createProvider = () => {
  return new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// In-memory storage for deployed addresses
let deployedAddresses = {};

// Helper to normalize Ethereum addresses
function normalizeAddress(address) {
  if (!address || typeof address !== 'string') {
    throw new Error(`Invalid address provided: ${address} (type: ${typeof address})`);
  }
  return ethers.utils.getAddress(address.toLowerCase());
}

// Helper to run deployment scripts using Hardhat
async function runDeploymentScript(scriptName, options = {}) {
  const scriptPath = path.join(__dirname, '../scripts', scriptName);
  
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Deployment script not found: ${scriptPath}`);
  }

  const env = { ...process.env, ...options };
  
  // Use hardhat run instead of node to properly handle TypeScript config
  const { stdout, stderr } = await execAsync(`npx hardhat run ${scriptPath} --network localhost`, { 
    env,
    cwd: path.join(__dirname, '..') // Run from project root where hardhat.config.ts is located
  });
  
  if (stderr) {
    console.error('Script stderr:', stderr);
  }
  
  return stdout;
}

// Helper to get latest deployment
function getLatestDeployment() {
  const deploymentsPath = path.join(__dirname, '../deployments.json');
  if (!fs.existsSync(deploymentsPath)) {
    return null;
  }
  
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  return deployments[deployments.length - 1];
}

// Routes
app.get('/api/health', (req, res) => {
  const provider = createProvider();
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', provider);
  res.json({ 
    status: 'OK', 
    message: 'T-REX API Server is running',
    backendWallet: wallet.address
  });
});

// Test network connection
app.get('/api/test-network', async (req, res) => {
  try {
    const provider = createProvider();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    res.json({ 
      success: true, 
      network: network.name, 
      chainId: network.chainId,
      blockNumber: blockNumber.toString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Network connection failed'
    });
  }
});

// Get deployed addresses
app.get('/api/addresses', (req, res) => {
  res.json(deployedAddresses);
});

// Update deployed addresses
app.post('/api/addresses', (req, res) => {
  const { addresses } = req.body;
  deployedAddresses = { ...deployedAddresses, ...addresses };
  res.json({ success: true, addresses: deployedAddresses });
});

// Get all deployments
app.get('/api/deployments', (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      res.json(deployments);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific deployment by ID
app.get('/api/deployments/:deploymentId', (req, res) => {
  try {
    const { deploymentId } = req.params;
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    
    if (!fs.existsSync(deploymentsPath)) {
      return res.status(404).json({ error: 'No deployments found' });
    }
    
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const deployment = deployments.find(d => d.deploymentId === deploymentId);
    
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    
    // If this is a factory deployment, include the latest token's suite information
    if (deployment.factory && deployment.tokens && deployment.tokens.length > 0) {
      const latestToken = deployment.tokens[deployment.tokens.length - 1];
      if (latestToken.suite) {
        deployment.suite = latestToken.suite;
      }
      // Also include the latest token information
      deployment.latestToken = latestToken;
    }
    
    res.json(deployment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get factories
app.get('/api/factories', (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      return res.json([]);
    }
    
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const factoryDeployments = deployments
      .filter(d => d.factory && d.factory.address)
      .map(d => ({
        deploymentId: d.deploymentId,
        address: d.factory.address,
        owner: d.factory.owner,
        timestamp: d.timestamp,
        network: d.network,
        deployer: d.deployer
      }));
    
    res.json(factoryDeployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy Factory
app.post('/api/deploy/factory', async (req, res) => {
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
app.post('/api/deploy/token', async (req, res) => {
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
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', provider);
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
      
      // Run the token deployment script with config
      const output = await runDeploymentScript('deploy_token_enhanced.js', envVars);
      
      console.log('✅ Token deployment script completed');
      console.log('Output:', output);
      
      // Get the latest deployment and find the newly added token
      const latestDeployment = getLatestDeployment();
      
      if (!latestDeployment || !latestDeployment.tokens || latestDeployment.tokens.length === 0) {
        throw new Error('Token deployment failed - no token data found');
      }
      
      // Get the most recently added token
      const latestToken = latestDeployment.tokens[latestDeployment.tokens.length - 1];
      
      console.log('📋 Token deployed at:', latestToken.token.address);
      console.log('🔑 Deployer automatically added as agent to Token and IR');
      if (claimDetails) {
        console.log('🔐 Claim details included in deployment');
      }
      
      res.json({
        success: true,
        message: 'Token deployed successfully',
        deployment: latestDeployment,
        tokenAddress: latestToken.token.address,
        tokenData: latestToken
      });
      
    } finally {
      // Clean up temporary files
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      if (claimDetailsPath && fs.existsSync(claimDetailsPath)) {
        fs.unlinkSync(claimDetailsPath);
      }
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
app.post('/api/deploy/claim-issuer', async (req, res) => {
  try {
    console.log('🎯 Starting ClaimIssuer deployment...');
    
    // Get the deployer address (account 0)
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', provider);
    const deployerAddress = await wallet.getAddress();
    
    console.log('🔑 Deploying ClaimIssuer with deployer address:', deployerAddress);
    
    // Get ClaimIssuer artifacts
    const claimIssuerArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/@onchain-id/solidity/contracts/ClaimIssuer.sol/ClaimIssuer.json');
    
    if (!fs.existsSync(claimIssuerArtifactsPath)) {
      throw new Error('ClaimIssuer artifacts not found. Please compile contracts first.');
    }
    
    const claimIssuerArtifacts = JSON.parse(fs.readFileSync(claimIssuerArtifactsPath, 'utf8'));
    
    // Deploy ClaimIssuer contract
    const claimIssuerFactory = new ethers.ContractFactory(
      claimIssuerArtifacts.abi,
      claimIssuerArtifacts.bytecode,
      wallet
    );
    
    const claimIssuer = await claimIssuerFactory.deploy(deployerAddress);
    await claimIssuer.deployed();
    
    console.log('✅ ClaimIssuer deployed at:', claimIssuer.address);
    
    // Add signing key to ClaimIssuer
    const signingKeyHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address'], [deployerAddress])
    );
    
    const addKeyTx = await claimIssuer.addKey(signingKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
    await addKeyTx.wait();
    
    console.log('✅ Signing key added to ClaimIssuer');
    
    // Add to trusted issuers if factory is available
    const latestDeployment = getLatestDeployment();
    if (latestDeployment && latestDeployment.suite && latestDeployment.suite.trustedIssuersRegistry) {
      try {
        const tirAddress = latestDeployment.suite.trustedIssuersRegistry;
        const tirArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registries/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json');
        
        if (fs.existsSync(tirArtifactsPath)) {
          const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
          const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
          
          // Check if issuer already exists
          const exists = await tir.isTrustedIssuer(claimIssuer.address);
          if (!exists) {
            // Add with default claim topics [1, 2, 3] (KYC, AML, Accredited)
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
app.post('/api/save-deployment', (req, res) => {
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
    console.error('Error saving deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all addresses
app.delete('/api/addresses', (req, res) => {
  try {
    deployedAddresses = {};
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (fs.existsSync(deploymentsPath)) {
      fs.unlinkSync(deploymentsPath);
    }
    res.json({ success: true, message: 'All addresses and deployments cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





// Get claim topics from a token's ClaimTopicsRegistry
app.get('/api/claim-topics/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Getting claim topics for token: ${tokenAddress}`);
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', provider);
    
    // Get the token contract to find the ClaimTopicsRegistry
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) {
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    
    // Get the Identity Registry from the token
    const identityRegistry = await token.identityRegistry();
    console.log('Identity Registry:', identityRegistry);
    
    // Get the Identity Registry contract to access CTR
    const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registries/IdentityRegistry.sol/IdentityRegistry.json');
    if (!fs.existsSync(irArtifactsPath)) {
      throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
    }
    const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
    const identityRegistryContract = new ethers.Contract(identityRegistry, irArtifacts.abi, wallet);
    
    // Get the ClaimTopicsRegistry from the Identity Registry
    const claimTopicsRegistry = await identityRegistryContract.topicsRegistry();
    console.log('ClaimTopicsRegistry:', claimTopicsRegistry);
    
    // Get claim topics from the ClaimTopicsRegistry
    const ctrArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registries/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json');
    if (!fs.existsSync(ctrArtifactsPath)) {
      throw new Error('ClaimTopicsRegistry artifacts not found. Please compile contracts first.');
    }
    const ctrArtifacts = JSON.parse(fs.readFileSync(ctrArtifactsPath, 'utf8'));
    const ctr = new ethers.Contract(claimTopicsRegistry, ctrArtifacts.abi, wallet);
    
    // Get all claim topics
    const topics = await ctr.getClaimTopics();
    const claimTopics = topics.map(topic => topic.toNumber());
    
    console.log(`✅ Found ${claimTopics.length} claim topics:`, claimTopics);
    
    res.json({
      success: true,
      claimTopics: claimTopics,
      claimTopicsRegistry: claimTopicsRegistry
    });
  } catch (error) {
    console.error('❌ Error getting claim topics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CORS Proxy for Hardhat node
app.post('/api/hardhat', async (req, res) => {
  try {
    const { method, params, id } = req.body;
    
    const response = await fetch('http://127.0.0.1:8545', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params || [],
        id: id || 1
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message
      },
      id: req.body.id || 1
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-REX Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network test: http://localhost:${PORT}/api/test-network`);
  console.log(`🏭 Factory deployment: POST http://localhost:${PORT}/api/deploy/factory`);
  console.log(`🎯 Token deployment: POST http://localhost:${PORT}/api/deploy/token`);
  console.log(`🔐 ClaimIssuer deployment: POST http://localhost:${PORT}/api/deploy/claim-issuer`);
  console.log(`🔗 Hardhat proxy: POST http://localhost:${PORT}/api/hardhat`);
});

module.exports = app; 