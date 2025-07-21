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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-REX Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network test: http://localhost:${PORT}/api/test-network`);
  console.log(`🏭 Factory deployment: POST http://localhost:${PORT}/api/deploy/factory`);
  console.log(`🎯 Token deployment: POST http://localhost:${PORT}/api/deploy/token`);
});

module.exports = app; 