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
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
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
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
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
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
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
    const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json');
    if (!fs.existsSync(irArtifactsPath)) {
      throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
    }
    const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
    const identityRegistryContract = new ethers.Contract(identityRegistry, irArtifacts.abi, wallet);
    
    // Get the ClaimTopicsRegistry from the Identity Registry
    const claimTopicsRegistry = await identityRegistryContract.topicsRegistry();
    console.log('ClaimTopicsRegistry:', claimTopicsRegistry);
    
    // Get claim topics from the ClaimTopicsRegistry
    const ctrArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json');
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

// Get agents for a token
app.get('/api/agents/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Getting agents for token: ${tokenAddress}`);
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    console.log(`🔍 Backend deployer address: ${deployerAddress}`);
    
    // Get the token contract to find the Identity Registry
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) {
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    
    // Get the Identity Registry from the token
    const identityRegistry = await token.identityRegistry();
    console.log('Identity Registry:', identityRegistry);
    
    const agents = { token: [], ir: [] };
    
    // Check Token agents
    try {
      console.log(`🔍 Checking if ${deployerAddress} is a token agent for ${tokenAddress}...`);
      const isTokenAgent = await token.isAgent(deployerAddress);
      console.log(`🔍 isAgent() result: ${isTokenAgent}`);
      if (isTokenAgent) {
        agents.token.push(deployerAddress);
        console.log(`✅ Deployer is Token Agent`);
      } else {
        console.log(`❌ Deployer is NOT Token Agent`);
      }
    } catch (err) {
      console.log(`Error checking token agents: ${err.message}`);
    }
    
    // Check Identity Registry agents
    try {
      const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json');
      if (!fs.existsSync(irArtifactsPath)) {
        throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
      }
      const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
      const ir = new ethers.Contract(identityRegistry, irArtifacts.abi, wallet);
      
      const isIRAgent = await ir.isAgent(deployerAddress);
      if (isIRAgent) {
        agents.ir.push(deployerAddress);
        console.log(`✅ Deployer is IR Agent`);
      } else {
        console.log(`❌ Deployer is NOT IR Agent`);
      }
      
      // Check if token contract is an IR agent
      const isTokenIRAgent = await ir.isAgent(tokenAddress);
      if (isTokenIRAgent) {
        agents.ir.push(tokenAddress);
        console.log(`✅ Token contract is IR Agent`);
      }
    } catch (err) {
      console.log(`Error checking IR agents: ${err.message}`);
    }
    
    console.log(`✅ Found agents - Token: ${agents.token.length}, IR: ${agents.ir.length}`);
    
    res.json({
      success: true,
      agents: agents,
      deployerAddress: deployerAddress
    });
  } catch (error) {
    console.error('❌ Error getting agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trusted issuers for a token
app.get('/api/trusted-issuers/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Getting trusted issuers for token: ${tokenAddress}`);
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    // Get the token contract to find the TrustedIssuersRegistry
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) {
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    
    // Get the Identity Registry from the token
    const identityRegistry = await token.identityRegistry();
    console.log('Identity Registry:', identityRegistry);
    
    // Get the Identity Registry contract to access TIR
    const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json');
    if (!fs.existsSync(irArtifactsPath)) {
      throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
    }
    const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
    const identityRegistryContract = new ethers.Contract(identityRegistry, irArtifacts.abi, wallet);
    
    // Get the TrustedIssuersRegistry from the Identity Registry
    const trustedIssuersRegistry = await identityRegistryContract.issuersRegistry();
    console.log('TrustedIssuersRegistry:', trustedIssuersRegistry);
    
    // Get trusted issuers from the TrustedIssuersRegistry
    const tirArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json');
    if (!fs.existsSync(tirArtifactsPath)) {
      throw new Error('TrustedIssuersRegistry artifacts not found. Please compile contracts first.');
    }
    const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
    const tir = new ethers.Contract(trustedIssuersRegistry, tirArtifacts.abi, wallet);
    
    // Get all trusted issuers
    const trustedIssuers = await tir.getTrustedIssuers();
    console.log(`Found ${trustedIssuers.length} trusted issuers`);
    
    // Get additional details for each trusted issuer
    const issuersWithDetails = [];
    for (const issuerAddress of trustedIssuers) {
      try {
        const claimTopics = await tir.getTrustedIssuerClaimTopics(issuerAddress);
        issuersWithDetails.push({
          address: issuerAddress,
          claimTopics: claimTopics.map(topic => topic.toNumber())
        });
        console.log(`Trusted issuer ${issuerAddress} has claim topics: ${claimTopics.map(t => t.toNumber()).join(', ')}`);
      } catch (err) {
        console.log(`Warning: Could not get claim topics for ${issuerAddress}: ${err.message}`);
        issuersWithDetails.push({
          address: issuerAddress,
          claimTopics: []
        });
      }
    }
    
    console.log(`✅ Found ${issuersWithDetails.length} trusted issuers with details`);
    
    res.json({
      success: true,
      trustedIssuers: issuersWithDetails,
      trustedIssuersRegistry: trustedIssuersRegistry
    });
  } catch (error) {
    console.error('❌ Error getting trusted issuers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get token information
app.get('/api/token-info/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Getting token info for: ${tokenAddress}`);
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    // Get the token contract
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) {
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    
    // Get token information
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check token status (paused/active)
app.get('/api/token-status/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Checking token status for: ${tokenAddress}`);
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    // Get the token contract
    const tokenArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/token/Token.sol/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) {
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Identity Registries with trusted issuers
app.get('/api/identity-registries', async (req, res) => {
  try {
    console.log(`🎯 Getting Identity Registries from all factories`);
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    // Load deployments to get all factories
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
          
          // Get the Identity Registry contract
          const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json');
          if (!fs.existsSync(irArtifactsPath)) {
            throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
          }
          const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
          const ir = new ethers.Contract(irAddress, irArtifacts.abi, wallet);
          
          // Get the TrustedIssuersRegistry for this IR
          const tirAddress = await ir.issuersRegistry();
          const tirArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/contracts/src/contracts/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json');
          if (!fs.existsSync(tirArtifactsPath)) {
            throw new Error('TrustedIssuersRegistry artifacts not found. Please compile contracts first.');
          }
          const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
          const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
          
          // Get trusted issuers for this IR
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
          
          console.log(`IR ${irAddress} (${token.token.name}): ${issuersWithTopics.length} trusted issuers`);
        } catch (error) {
          console.log(`Error loading IR ${token.suite?.identityRegistry}: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ Found ${irs.length} Identity Registries`);
    
    res.json({
      success: true,
      identityRegistries: irs
    });
  } catch (error) {
    console.error('❌ Error getting Identity Registries:', error);
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