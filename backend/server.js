const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

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

// In-memory storage for deployed addresses (in production, use a database)
let deployedAddresses = {};

// In-memory storage for claim topics and trusted issuers
let claimTopics = [
  { id: 1, name: "KYC (Know Your Customer)", description: "Most commonly required claim for identity verification" },
  { id: 2, name: "AML (Anti-Money Laundering)", description: "Often combined with KYC for compliance" },
  { id: 3, name: "Accredited Investor", description: "For investor qualification and Reg D exemptions" },
  { id: 4, name: "EU Nationality Confirmed", description: "For local regulatory segmentation in EU" },
  { id: 5, name: "US Nationality Confirmed", description: "Useful for Reg D exemptions in US" },
  { id: 6, name: "Blacklist", description: "Used for compliance to restrict certain actors" }
];

let trustedIssuers = [
  { 
    address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", 
    name: "Tokeny Solutions",
    topics: [1, 2, 3, 4, 5, 6],
    description: "Primary KYC/AML and compliance verification provider"
  },
  { 
    address: "0x8ba1f109551bD432803012645Hac136c772c3c7c", 
    name: "EU Compliance Authority",
    topics: [1, 2, 4],
    description: "European regulatory compliance verification"
  },
  { 
    address: "0x1234567890123456789012345678901234567890", 
    name: "US Accredited Investor Verifier",
    topics: [1, 3, 5],
    description: "US-specific accredited investor verification"
  },
  { 
    address: "0xabcdef1234567890abcdef1234567890abcdef12", 
    name: "Security & Compliance Monitor",
    topics: [6],
    description: "Blacklist management and security monitoring"
  }
];

// Helper to normalize Ethereum addresses
function normalizeAddress(address) {
  const { ethers } = require('ethers');
  
  // Check if address is valid before calling toLowerCase
  if (!address || typeof address !== 'string') {
    throw new Error(`Invalid address provided: ${address} (type: ${typeof address})`);
  }
  
  return ethers.utils.getAddress(address.toLowerCase());
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

// Get deployed registries grouped by type
app.get('/api/registries', (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      
      const registries = {
        claimTopicsRegistries: [],
        trustedIssuersRegistries: []
      };
      
      // Create maps to deduplicate by address (keep the most recent)
      const claimTopicsMap = new Map();
      const trustedIssuersMap = new Map();
      
      deployments.forEach(deployment => {
        if (deployment.component.startsWith('ClaimTopicsRegistry')) {
          // If we already have this address, only keep the most recent
          if (!claimTopicsMap.has(deployment.address) || 
              new Date(deployment.timestamp) > new Date(claimTopicsMap.get(deployment.address).timestamp)) {
            claimTopicsMap.set(deployment.address, {
              name: deployment.component,
              address: deployment.address,
              deploymentId: deployment.deploymentId,
              timestamp: deployment.timestamp
            });
          }
        } else if (deployment.component.startsWith('TrustedIssuersRegistry')) {
          // If we already have this address, only keep the most recent
          if (!trustedIssuersMap.has(deployment.address) || 
              new Date(deployment.timestamp) > new Date(trustedIssuersMap.get(deployment.address).timestamp)) {
            trustedIssuersMap.set(deployment.address, {
              name: deployment.component,
              address: deployment.address,
              deploymentId: deployment.deploymentId,
              timestamp: deployment.timestamp
            });
          }
        }
      });
      
      // Convert maps to arrays
      registries.claimTopicsRegistries = Array.from(claimTopicsMap.values());
      registries.trustedIssuersRegistries = Array.from(trustedIssuersMap.values());
      
      res.json(registries);
    } else {
      res.json({ claimTopicsRegistries: [], trustedIssuersRegistries: [] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific deployment
app.get('/api/deployments/:deploymentId', (req, res) => {
  try {
    const { deploymentId } = req.params;
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      const deployment = deployments.find(d => d.deploymentId === deploymentId);
      
      if (deployment) {
        res.json(deployment);
      } else {
        res.status(404).json({ error: 'Deployment not found' });
      }
    } else {
      res.status(404).json({ error: 'No deployments found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get factories for dropdown
app.get('/api/factories', (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      // Only include deployments with a valid factory.address
      const factories = deployments
        .filter(d => d.factory && d.factory.address)
        .map(d => ({
          deploymentId: d.deploymentId,
          address: d.factory.address,
          timestamp: d.timestamp,
          network: d.network,
          tokenCount: d.tokens ? d.tokens.length : 0
        }));
      res.json(factories);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy factory
app.post('/api/deploy/factory', async (req, res) => {
  try {
    const execAsync = promisify(exec);
    
    console.log('🚀 Starting factory deployment...');
    
    // Run the factory deployment script
    const { stdout, stderr } = await execAsync('npm run deploy:factory', {
      cwd: '/mnt/ethnode/T-REX',
      timeout: 300000 // 5 minutes timeout
    });
    
    console.log('Factory deployment output:', stdout);
    if (stderr) console.error('Factory deployment stderr:', stderr);
    
    res.json({ success: true, message: 'Factory deployed successfully', output: stdout });
  } catch (error) {
    console.error('Factory deployment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deploy token
app.post('/api/deploy/token', async (req, res) => {
  try {
    const { factoryAddress, tokenDetails } = req.body;
    const execAsync = promisify(exec);
    
    // Write tokenDetails to a temp file
    const tokenConfigPath = path.join(os.tmpdir(), 'trex_token_config.json');
    fs.writeFileSync(tokenConfigPath, JSON.stringify(tokenDetails));
    
    console.log('🚀 Starting token deployment...');
    console.log('Factory address:', factoryAddress);
    console.log('Token details:', tokenDetails);
    
    // Run the token deployment script with TOKEN_CONFIG_PATH env
    const { stdout, stderr } = await execAsync('TOKEN_CONFIG_PATH="' + tokenConfigPath + '" npm run deploy:token', {
      cwd: '/mnt/ethnode/T-REX',
      timeout: 300000 // 5 minutes timeout
    });
    
    console.log('Token deployment output:', stdout);
    if (stderr) console.error('Token deployment stderr:', stderr);
    
    res.json({ success: true, message: 'Token deployed successfully', output: stdout });
  } catch (error) {
    console.error('Token deployment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear deployed addresses
app.delete('/api/addresses', (req, res) => {
  deployedAddresses = {};
  // Clear deployments.json as well
  const deploymentsPath = path.join(__dirname, '../deployments.json');
  try {
    fs.writeFileSync(deploymentsPath, '[]');
    res.json({ success: true, message: 'Addresses, deployments, and components cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear deployments: ' + error.message });
  }
});

// Get token information
app.get('/api/token/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const provider = createProvider();
    
    // Basic ERC20 ABI for token info
    const tokenAbi = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)'
    ];
    
    const tokenContract = new ethers.Contract(address, tokenAbi, provider);
    
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply()
    ]);
    
    res.json({
      address,
      name,
      symbol,
      decimals: decimals.toString(),
      totalSupply: totalSupply.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contract deployment status
app.get('/api/deployment-status', (req, res) => {
  res.json({
    factory: !!deployedAddresses.TREXFactory,
    token: !!deployedAddresses.Token,
    addresses: deployedAddresses
  });
});

// Deploy factory (placeholder - would integrate with actual deployment scripts)
app.post('/api/deploy/factory', async (req, res) => {
  try {
    // This would integrate with your actual deployment script
    res.json({ 
      success: true, 
      message: 'Factory deployment initiated. Check deployment scripts for actual deployment.',
      note: 'Use npm run deploy:factory for actual deployment'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prepare component deployment transaction for MetaMask signing
app.post('/api/prepare-deploy/component', async (req, res) => {
  try {
    const { component, deployerAddress } = req.body;
    
    if (!component || !deployerAddress) {
      return res.status(400).json({ error: 'Component name and deployer address are required' });
    }
    
    console.log(`🚀 Preparing ${component} deployment transaction...`);
    console.log('Deployer:', deployerAddress);
    
    const provider = createProvider();
    
    // Map component names to contract factories and deployment data
    const componentConfig = {
      'IdentityRegistry': {
        factory: 'IdentityRegistry',
        constructorArgs: [],
        gasEstimate: 2000000
      },
      'IdentityRegistryStorage': {
        factory: 'IdentityRegistryStorage',
        constructorArgs: [],
        gasEstimate: 2000000
      },
      'ClaimTopicsRegistry': {
        factory: 'ClaimTopicsRegistry',
        constructorArgs: [],
        gasEstimate: 2000000
      },
      'TrustedIssuersRegistry': {
        factory: 'TrustedIssuersRegistry',
        constructorArgs: [],
        gasEstimate: 2000000
      },
      'ModularCompliance': {
        factory: 'ModularCompliance',
        constructorArgs: [],
        gasEstimate: 3000000
      },
      'OnchainID': {
        factory: 'OnchainID',
        constructorArgs: [deployerAddress, true],
        gasEstimate: 4000000,
        isOnchainID: true
      }
    };
    
    const config = componentConfig[component];
    if (!config) {
      throw new Error(`Unknown component: ${component}`);
    }
    
          // Get contract bytecode and ABI for transaction preparation
      let contractBytecode, contractAbi, constructorArgs;
      
      if (config.isOnchainID) {
        const OnchainID = require('@onchain-id/solidity');
        contractAbi = OnchainID.contracts.Identity.abi;
        contractBytecode = OnchainID.contracts.Identity.bytecode;
        constructorArgs = config.constructorArgs;
      } else {
        // For regular contracts, get the bytecode and ABI from artifacts
        // Handle different contract paths
        let contractPath;
        if (config.factory === 'ModularCompliance') {
          contractPath = `../artifacts/contracts/compliance/modular/${config.factory}.sol/${config.factory}.json`;
        } else {
          contractPath = `../artifacts/contracts/registry/implementation/${config.factory}.sol/${config.factory}.json`;
        }
        
        try {
          const contractArtifacts = require(contractPath);
          contractAbi = contractArtifacts.abi;
          contractBytecode = contractArtifacts.bytecode;
          constructorArgs = config.constructorArgs;
        } catch (error) {
          console.error(`Error loading contract artifacts for ${config.factory}:`, error);
          throw new Error(`Contract artifacts not found for ${config.factory}. Please ensure contracts are compiled.`);
        }
      }
    
    // Encode the constructor data
    const iface = new ethers.utils.Interface(contractAbi);
    const deploymentData = {
      data: contractBytecode + (constructorArgs.length > 0 ? iface.encodeDeploy(constructorArgs).slice(2) : '')
    };
    
    // Prepare transaction data
    const transactionData = {
      to: null, // Contract creation
      data: deploymentData.data,
      from: deployerAddress,
      gas: `0x${config.gasEstimate.toString(16)}`,
      gasPrice: '0x59682F00' // 1.5 gwei
    };
    
    console.log(`✅ ${component} deployment transaction prepared`);
    
    res.json({ 
      success: true, 
      message: `${component} deployment transaction prepared`,
      transactionData: transactionData,
      component: component,
      deployerAddress: deployerAddress
    });
    
  } catch (error) {
    console.error(`Component deployment preparation error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deploy individual component (legacy - using backend private key)
app.post('/api/deploy/component', async (req, res) => {
  try {
    const { component, deployer } = req.body;
    const execAsync = promisify(exec);
    
    console.log(`🚀 Starting ${component} deployment...`);
    console.log('Deployer:', deployer);
    
    // Map component names to script names
    const scriptMap = {
      'IdentityRegistry': 'deploy_identity_registry.js',
      'IdentityRegistryStorage': 'deploy_identity_registry_storage.js',
      'ClaimTopicsRegistry': 'deploy_claim_topics_registry.js',
      'TrustedIssuersRegistry': 'deploy_trusted_issuers_registry.js',
      'ModularCompliance': 'deploy_modular_compliance.js',
      'OnchainID': 'deploy_onchainid.js'
    };
    
    const scriptName = scriptMap[component];
    if (!scriptName) {
      throw new Error(`Unknown component: ${component}`);
    }
    
    // Run the specific component deployment script with deployer address
    const { stdout, stderr } = await execAsync(`npx hardhat run scripts/${scriptName} --network localhost ${deployer}`, {
      cwd: '/mnt/ethnode/T-REX',
      timeout: 300000 // 5 minutes timeout
    });
    
    console.log(`${component} deployment output:`, stdout);
    if (stderr) console.error(`${component} deployment stderr:`, stderr);
    
    // Extract the deployed address from output
    const addressMatch = stdout.match(/DEPLOYED_ADDRESS:(0x[a-fA-F0-9]{40})/);
    if (addressMatch) {
      const deployedAddress = addressMatch[1];
      
      // Check if this component type already exists and append a number if needed
      const deploymentsPath = path.join(__dirname, '../deployments.json');
      let deployments = [];
      if (fs.existsSync(deploymentsPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      }
      
      // Check if base component already exists
      const baseComponentExists = deployments.some(d => d.component === component);
      
      let componentName;
      if (baseComponentExists) {
        // Find the next available number for numbered versions
        const numberedDeployments = deployments.filter(d => 
          d.component && d.component.match(new RegExp(`^${component}_\\d+$`))
        );
        
        // Extract numbers from existing numbered deployments
        const existingNumbers = numberedDeployments.map(d => {
          const match = d.component && d.component.match(new RegExp(`^${component}_(\\d+)$`));
          return match ? parseInt(match[1]) : 0;
        });
        
        // Find the next available number
        let nextNumber = 1;
        while (existingNumbers.includes(nextNumber)) {
          nextNumber++;
        }
        
        componentName = `${component}_${nextNumber}`;
      } else {
        componentName = component;
      }
      
      // Add new deployment
      const deploymentId = `${componentName.toLowerCase()}_${Date.now()}`;
      deployments.push({
        deploymentId,
        component: componentName,
        address: deployedAddress,
        deployer: deployer,
        timestamp: new Date().toISOString(),
        network: 'localhost'
      });
      
      // Save updated deployments
      fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
      
      res.json({ 
        success: true, 
        message: `${component} deployed successfully`,
        address: deployedAddress,
        componentName: componentName
      });
    } else {
      throw new Error('Could not extract deployed address from output');
    }
    
  } catch (error) {
    console.error(`Component deployment error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify component deployment
app.get('/api/verify/component', async (req, res) => {
  try {
    const { component, address } = req.query;
    const provider = createProvider();
    
    // Basic verification - check if the address has code
    const code = await provider.getCode(address);
    
    if (code === '0x') {
      res.json({ verified: false, error: 'No contract code found at address' });
    } else {
      res.json({ verified: true, message: `${component} contract verified at ${address}` });
    }
  } catch (error) {
    res.status(500).json({ verified: false, error: error.message });
  }
});

// Deploy token (placeholder - would integrate with actual deployment scripts)
app.post('/api/deploy/token', async (req, res) => {
  try {
    const { name, symbol, decimals, totalSupply } = req.body;
    
    if (!deployedAddresses.TREXFactory) {
      return res.status(400).json({ error: 'Factory must be deployed first' });
    }
    
    // This would integrate with your actual deployment script
    res.json({ 
      success: true, 
      message: 'Token deployment initiated. Check deployment scripts for actual deployment.',
      note: 'Use npm run deploy:token for actual deployment',
      tokenDetails: { name, symbol, decimals, totalSupply }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get network information
app.get('/api/network', async (req, res) => {
  try {
    const provider = createProvider();
    const [network, blockNumber, gasPrice] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getGasPrice()
    ]);
    
    res.json({
      chainId: network.chainId,
      name: network.name,
      blockNumber: blockNumber.toString(),
      gasPrice: gasPrice.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Claim Topics API ---
app.get('/api/claim-topics', async (req, res) => {
  try {
    const { registryAddress } = req.query;
    
    if (!registryAddress) {
      return res.status(400).json({ error: 'Registry address is required' });
    }
    
    const provider = createProvider();
    
    // ClaimTopicsRegistry ABI (basic functions)
    const claimTopicsRegistryAbi = [
      'function getClaimTopics() view returns (uint256[])',
      'function addClaimTopic(uint256 _claimTopic)',
      'function removeClaimTopic(uint256 _claimTopic)'
    ];
    
    const claimTopicsRegistry = new ethers.Contract(registryAddress, claimTopicsRegistryAbi, provider);
    
    // Get existing claim topics from contract
    const topicIds = await claimTopicsRegistry.getClaimTopics();
    const contractTopicIds = topicIds.map(id => id.toNumber());
    
    console.log(`Contract has topics: ${contractTopicIds.join(', ')}`);
    console.log(`All available topics: ${claimTopics.map(t => t.id).join(', ')}`);
    
    // Return all available topics, marking which ones are in the contract
    const claimTopicsResult = claimTopics.map(topic => ({
      id: topic.id,
      name: topic.name,
      description: topic.description,
      inContract: contractTopicIds.includes(topic.id)
    }));
    
    res.json(claimTopicsResult);
  } catch (error) {
    console.error('Error reading claim topics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/claim-topics', async (req, res) => {
  try {
    const { topic, registryAddress, deployerAddress } = req.body;
    
    if (!registryAddress || !deployerAddress) {
      return res.status(400).json({ error: 'Registry address and deployer address are required' });
    }
    
    const provider = createProvider();
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const normalizedDeployerAddress = normalizeAddress(deployerAddress);
    
    const claimTopicsRegistryAbi = [
      'function getClaimTopics() view returns (uint256[])',
      'function addClaimTopic(uint256 _claimTopic)',
      'function owner() view returns (address)'
    ];
    
    const claimTopicsRegistry = new ethers.Contract(normalizedRegistryAddress, claimTopicsRegistryAbi, provider);
    
    // Check ownership first
    const contractOwner = await claimTopicsRegistry.owner();
    if (contractOwner.toLowerCase() !== normalizedDeployerAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Ownership mismatch', 
        details: {
          contractOwner: contractOwner,
          deployerAddress: normalizedDeployerAddress,
          message: 'The deployer address is not the owner of this Claim Topics Registry contract.'
        }
      });
    }
    
    const topicId = Number(topic);
    
    // Check if topic already exists
    const existingTopics = await claimTopicsRegistry.getClaimTopics();
    const existingTopicIds = existingTopics.map(t => t.toNumber());
    console.log(`Checking if topic ${topicId} already exists in: ${existingTopicIds.join(', ')}`);
    
    if (existingTopicIds.includes(topicId)) {
      return res.status(400).json({ 
        error: 'Claim topic already exists',
        details: {
          topicId: topicId,
          existingTopics: existingTopicIds,
          message: `Topic ${topicId} is already registered in the ClaimTopicsRegistry`
        }
      });
    }
    
    // Prepare transaction data for frontend to sign
    const addClaimTopicInterface = new ethers.utils.Interface(claimTopicsRegistryAbi);
    const transactionData = addClaimTopicInterface.encodeFunctionData('addClaimTopic', [topicId]);
    
    const standardTopic = claimTopics.find(t => t.id === topicId);
    const newTopic = {
      id: topicId,
      name: standardTopic?.name || `Custom Topic ${topic}`,
      description: standardTopic?.description || "User-defined claim topic"
    };
    
    res.json({ 
      success: true, 
      message: 'Please sign this transaction to add the claim topic',
      transactionData: {
        to: normalizedRegistryAddress,
        data: transactionData,
        from: normalizedDeployerAddress,
        gas: '0x186A0', // 100,000 gas
        gasPrice: '0x59682F00' // 1.5 gwei
      },
      topic: newTopic
    });
  } catch (error) {
    console.error('Error preparing claim topic addition:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/claim-topics/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const { registryAddress } = req.query;
    
    if (!registryAddress) {
      return res.status(400).json({ error: 'Registry address is required' });
    }
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    const claimTopicsRegistryAbi = [
      'function getClaimTopics() view returns (uint256[])',
      'function addClaimTopic(uint256 _claimTopic)',
      'function removeClaimTopic(uint256 _claimTopic)',
      'function owner() view returns (address)'
    ];
    
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const claimTopicsRegistry = new ethers.Contract(normalizedRegistryAddress, claimTopicsRegistryAbi, wallet);
    
    // Check ownership first
    const contractOwner = await claimTopicsRegistry.owner();
    console.log('Contract owner:', contractOwner);
    console.log('Wallet address:', wallet.address);
    
    if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Ownership mismatch', 
        details: {
          contractOwner: contractOwner,
          walletAddress: wallet.address,
          message: 'The wallet does not own this contract'
        }
      });
    }
    
    const topicId = Number(topic);
    
    // Remove topic from contract
    const tx = await claimTopicsRegistry.removeClaimTopic(topicId);
    await tx.wait();
    
    res.json({ success: true, removed: topicId });
  } catch (error) {
    console.error('Error removing claim topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// Note: ClaimIssuer is not a contract - it's just an address registered in TrustedIssuersRegistry
// The ClaimIssuer deployment API has been removed as it's not needed in ERC-3643

// --- Contract Address Extraction API ---
app.get('/api/contract-address/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    
    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }
    
    const provider = createProvider();
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // For contract creation, the contract address should be in receipt.contractAddress
    const contractAddress = receipt.contractAddress;
    
    res.json({
      success: true,
      contractAddress: contractAddress,
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.length
    });
  } catch (error) {
    console.error('Error extracting contract address:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Trusted Issuers API ---
app.get('/api/trusted-issuers', async (req, res) => {
  try {
    const { registryAddress } = req.query;
    
    if (!registryAddress) {
      return res.status(400).json({ error: 'Registry address is required' });
    }
    
    const provider = createProvider();
    
    // TrustedIssuersRegistry ABI (basic functions)
    const trustedIssuersRegistryAbi = [
      'function getTrustedIssuers() view returns (address[])',
      'function getTrustedIssuerClaimTopics(address _trustedIssuer) view returns (uint256[])',
      'function addTrustedIssuer(address _trustedIssuer, uint256[] _claimTopics)',
      'function removeTrustedIssuer(address _trustedIssuer)'
    ];
    
    const trustedIssuersRegistry = new ethers.Contract(registryAddress, trustedIssuersRegistryAbi, provider);
    
    // Get existing trusted issuers from contract
    const issuerAddresses = await trustedIssuersRegistry.getTrustedIssuers();
    
    const trustedIssuers = [];
    for (const address of issuerAddresses) {
      const topics = await trustedIssuersRegistry.getTrustedIssuerClaimTopics(address);
      const topicNumbers = topics.map(t => t.toNumber());
      
      // Map topic IDs to readable names
      const topicNames = topicNumbers.map(topicId => {
        console.log(`Looking for topic ${topicId} (type: ${typeof topicId})`);
        console.log(`Available topics:`, claimTopics.map(t => ({ id: t.id, type: typeof t.id, name: t.name })));
        const topic = claimTopics.find(t => Number(t.id) === Number(topicId)); // Convert both to numbers for comparison
        console.log(`Found topic:`, topic);
        return topic ? topic.name : `Topic ${topicId}`;
      });
      
      trustedIssuers.push({
        address: address,
        name: `Issuer ${address.slice(0, 6)}...${address.slice(-4)}`,
        topics: topicNumbers,
        topicNames: topicNames,
        description: "Trusted issuer from contract"
      });
    }
    
    res.json(trustedIssuers);
  } catch (error) {
    console.error('Error reading trusted issuers:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trusted-issuers', async (req, res) => {
  try {
    const { address, topics, registryAddress, deployerAddress } = req.body;
    
    console.log('Received trusted issuer request:', { address, topics, registryAddress, deployerAddress });
    
    if (!registryAddress || !deployerAddress) {
      return res.status(400).json({ error: 'Registry address and deployer address are required' });
    }
    
    const provider = createProvider();
    
    // Add more detailed logging before normalizeAddress calls
    console.log('About to normalize addresses:', { registryAddress, deployerAddress });
    
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const normalizedDeployerAddress = normalizeAddress(deployerAddress);
    
    console.log('Normalized addresses:', { normalizedRegistryAddress, normalizedDeployerAddress });
    
    const trustedIssuersRegistryAbi = [
      'function getTrustedIssuers() view returns (address[])',
      'function getTrustedIssuerClaimTopics(address _trustedIssuer) view returns (uint256[])',
      'function addTrustedIssuer(address _trustedIssuer, uint256[] _claimTopics)',
      'function owner() view returns (address)'
    ];
    
    const trustedIssuersRegistry = new ethers.Contract(normalizedRegistryAddress, trustedIssuersRegistryAbi, provider);
    
    // Check ownership first
    let contractOwner;
    try {
      contractOwner = await trustedIssuersRegistry.owner();
      console.log("TrustedIssuersRegistry owner() returned:", contractOwner, typeof contractOwner);
    } catch (error) {
      console.error("Error calling trustedIssuersRegistry.owner():", error);
      return res.status(500).json({ 
        error: 'Failed to get contract owner', 
        details: {
          message: 'Could not call owner() function on the TrustedIssuersRegistry contract.',
          registryAddress: normalizedRegistryAddress,
          error: error.message
        }
      });
    }

    if (!contractOwner || typeof contractOwner !== "string") {
      console.error("Invalid contract owner returned:", contractOwner, typeof contractOwner);
      return res.status(500).json({ 
        error: 'Invalid contract owner', 
        details: {
          message: 'The owner() function returned an invalid value. Check if the registry address is correct.',
          registryAddress: normalizedRegistryAddress,
          returnedValue: contractOwner,
          returnedType: typeof contractOwner
        }
      });
    }

    // Additional safety check before toLowerCase calls
    console.log('About to compare addresses:', { contractOwner, normalizedDeployerAddress });
    
    if (typeof contractOwner !== 'string' || typeof normalizedDeployerAddress !== 'string') {
      console.error('Invalid address types for comparison:', { 
        contractOwner, 
        contractOwnerType: typeof contractOwner, 
        normalizedDeployerAddress, 
        normalizedDeployerAddressType: typeof normalizedDeployerAddress 
      });
      return res.status(500).json({ 
        error: 'Invalid address types for comparison', 
        details: {
          contractOwner: contractOwner,
          contractOwnerType: typeof contractOwner,
          deployerAddress: normalizedDeployerAddress,
          deployerAddressType: typeof normalizedDeployerAddress
        }
      });
    }
    
    if (contractOwner.toLowerCase() !== normalizedDeployerAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Ownership mismatch', 
        details: {
          contractOwner: contractOwner,
          deployerAddress: normalizedDeployerAddress,
          message: 'The deployer address is not the owner of this Trusted Issuers Registry contract.'
        }
      });
    }
    
    // Validate and normalize the address
    let normalizedAddress = address;
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }
    normalizedAddress = normalizeAddress(address); // Normalize to checksum address
    
    // Prepare transaction data for frontend to sign
    const addTrustedIssuerInterface = new ethers.utils.Interface(trustedIssuersRegistryAbi);
    const transactionData = addTrustedIssuerInterface.encodeFunctionData('addTrustedIssuer', [normalizedAddress, topics]);
    
    // Map topic IDs to readable names
    const topicNames = topics.map(topicId => {
      const topic = claimTopics.find(t => Number(t.id) === Number(topicId)); // Convert both to numbers for comparison
      return topic ? topic.name : `Topic ${topicId}`;
    });
    
    const newIssuer = {
      address: normalizedAddress,
      name: `Issuer ${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
      topics: topics,
      topicNames: topicNames,
      description: "User-defined trusted issuer"
    };
    
    res.json({ 
      success: true, 
      message: 'Please sign this transaction to add the trusted issuer',
      transactionData: {
        to: normalizedRegistryAddress,
        data: transactionData,
        from: normalizedDeployerAddress,
        gas: '0x2DC6C0', // 300,000 gas (increased from 100,000)
        gasPrice: '0x59682F00' // 1.5 gwei
      },
      issuer: newIssuer
    });
  } catch (error) {
    console.error('Error preparing trusted issuer addition:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/trusted-issuers/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { registryAddress } = req.query;
    
    if (!registryAddress) {
      return res.status(400).json({ error: 'Registry address is required' });
    }
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    const trustedIssuersRegistryAbi = [
      'function getTrustedIssuers() view returns (address[])',
      'function getTrustedIssuerClaimTopics(address _trustedIssuer) view returns (uint256[])',
      'function addTrustedIssuer(address _trustedIssuer, uint256[] _claimTopics)',
      'function removeTrustedIssuer(address _trustedIssuer)',
      'function owner() view returns (address)'
    ];
    
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const trustedIssuersRegistry = new ethers.Contract(normalizedRegistryAddress, trustedIssuersRegistryAbi, wallet);
    
    // Check ownership first
    let contractOwner;
    try {
      contractOwner = await trustedIssuersRegistry.owner();
      console.log('Contract owner:', contractOwner, typeof contractOwner);
      console.log('Wallet address:', wallet.address);
    } catch (error) {
      console.error("Error calling trustedIssuersRegistry.owner():", error);
      return res.status(500).json({ 
        error: 'Failed to get contract owner', 
        details: {
          message: 'Could not call owner() function on the TrustedIssuersRegistry contract.',
          registryAddress: normalizedRegistryAddress,
          error: error.message
        }
      });
    }

    if (!contractOwner || typeof contractOwner !== "string") {
      console.error("Invalid contract owner returned:", contractOwner, typeof contractOwner);
      return res.status(500).json({ 
        error: 'Invalid contract owner', 
        details: {
          message: 'The owner() function returned an invalid value. Check if the registry address is correct.',
          registryAddress: normalizedRegistryAddress,
          returnedValue: contractOwner,
          returnedType: typeof contractOwner
        }
      });
    }
    
    if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Ownership mismatch', 
        details: {
          contractOwner: contractOwner,
          walletAddress: wallet.address,
          message: 'The wallet does not own this contract'
        }
      });
    }
    
    // Remove issuer from contract
    const normalizedAddress = normalizeAddress(address);
    const tx = await trustedIssuersRegistry.removeTrustedIssuer(normalizedAddress);
    await tx.wait();
    
    res.json({ success: true, removed: address });
  } catch (error) {
    console.error('Error removing trusted issuer:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- User Management API ---
app.get('/api/users', async (req, res) => {
  try {
    const { identityRegistryAddress } = req.query;
    
    if (!identityRegistryAddress) {
      return res.status(400).json({ error: 'Identity Registry address is required' });
    }
    
    const provider = createProvider();
    
    // IdentityRegistry ABI for user management
    const identityRegistryAbi = [
      'function identity(address _userAddress) view returns (address)',
      'function contains(address _userAddress) view returns (bool)',
      'function registerIdentity(address _userAddress, address _identity, uint16 _country)',
      'function updateIdentity(address _userAddress, address _identity)',
      'function deleteIdentity(address _userAddress)',
      'function isVerified(address _userAddress) view returns (bool)',
      'function investorCountry(address _userAddress) view returns (uint16)',
      'function updateCountry(address _userAddress, uint16 _country)'
    ];
    
    const identityRegistry = new ethers.Contract(identityRegistryAddress, identityRegistryAbi, provider);
    
    // Get users from blockchain by scanning events (production approach)
    try {
      // ABI for event scanning
      const identityRegistryAbi = [
        'event IdentityRegistered(address indexed _userAddress, address indexed _identity)',
        'event IdentityRemoved(address indexed _userAddress, address indexed _identity)',
        'function identity(address _userAddress) view returns (address)',
        'function contains(address _userAddress) view returns (bool)',
        'function investorCountry(address _userAddress) view returns (uint16)',
        'function isVerified(address _userAddress) view returns (bool)'
      ];
      
      const identityRegistry = new ethers.Contract(identityRegistryAddress, identityRegistryAbi, provider);
      
      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      
      // Try to find the contract deployment block from deployments.json
      let fromBlock = 0;
      try {
        const deploymentsPath = path.join(__dirname, '../deployments.json');
        if (fs.existsSync(deploymentsPath)) {
          const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
          const registryDeployment = deployments.find(d => 
            d.address.toLowerCase() === identityRegistryAddress.toLowerCase() && 
            d.component.includes('IdentityRegistry')
          );
          if (registryDeployment && registryDeployment.blockNumber) {
            fromBlock = registryDeployment.blockNumber;
            console.log(`📋 Found deployment block: ${fromBlock}`);
          }
        }
      } catch (deploymentError) {
        console.log('Could not find deployment block, scanning from block 0');
      }
      
      // If we couldn't find deployment block, scan from a reasonable starting point
      if (fromBlock === 0) {
        fromBlock = Math.max(0, currentBlock - 10000);
        console.log(`⚠️  Using fallback: scanning last 10,000 blocks`);
      }
      
      console.log(`🔍 Scanning for user events from block ${fromBlock} to ${currentBlock}`);
      
      // Get all IdentityRegistered events
      const userRegisteredEvents = await identityRegistry.queryFilter(identityRegistry.filters.IdentityRegistered(), fromBlock, currentBlock);
      console.log(`📝 Found ${userRegisteredEvents.length} IdentityRegistered events`);
      
      // Get all IdentityRemoved events
      const userRemovedEvents = await identityRegistry.queryFilter(identityRegistry.filters.IdentityRemoved(), fromBlock, currentBlock);
      console.log(`📝 Found ${userRemovedEvents.length} IdentityRemoved events`);
      
      // Reconstruct user list
      const userSet = new Set();
      
      // Add all users from IdentityRegistered events
      for (const event of userRegisteredEvents) {
        userSet.add(event.args._userAddress.toLowerCase());
      }
      
      // Remove users from IdentityRemoved events
      for (const event of userRemovedEvents) {
        userSet.delete(event.args._userAddress.toLowerCase());
      }
      
      const userAddresses = Array.from(userSet);
      console.log(`✅ Found ${userAddresses.length} current users on-chain:`, userAddresses);
      
      // Get detailed user information
      const users = [];
      for (const userAddress of userAddresses) {
        try {
          const identity = await identityRegistry.identity(userAddress);
          const country = await identityRegistry.investorCountry(userAddress);
          const isVerified = await identityRegistry.isVerified(userAddress);
          
          users.push({
            address: userAddress,
            identity: identity,
            country: typeof country === 'object' ? country.toNumber() : country,
            isVerified: isVerified,
            registeredAt: new Date().toISOString() // We don't have this on-chain, so use current time
          });
        } catch (userError) {
          console.log(`Error getting details for user ${userAddress}:`, userError.message);
        }
      }
      
      res.json(users);
      return;
      
    } catch (blockchainError) {
      console.error('❌ Error scanning blockchain for users:', blockchainError.message);
      
      // Fallback to checking common addresses
      const commonAddresses = [
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account #0
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account #2
        '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Account #3
        '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Account #4
        '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', // Account #5
      ];
      
      const users = [];
      
      // Check each common address
      for (const address of commonAddresses) {
        try {
          const isRegistered = await identityRegistry.contains(address);
          if (isRegistered) {
                      const identity = await identityRegistry.identity(address);
          const country = await identityRegistry.investorCountry(address);
          const isVerified = await identityRegistry.isVerified(address);
            
            users.push({
              address: address,
              identity: identity,
              country: typeof country === 'object' ? country.toNumber() : country,
              isVerified: isVerified,
              registeredAt: new Date().toISOString() // We don't have this on-chain, so use current time
            });
          }
        } catch (checkError) {
          // Skip this address if there's an error
          console.log(`Error checking if ${address} is registered:`, checkError.message);
        }
      }
      
      res.json(users);
      return;
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error reading users:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    console.log('📋 Received user creation request:', req.body);
    const { userAddress, identityRegistryAddress, country, agentAddress, existingOnchainIdAddress } = req.body;
    
    if (!userAddress || !identityRegistryAddress || !agentAddress) {
      return res.status(400).json({ error: 'User address, identity registry address, and agent address are required' });
    }
    
    const provider = createProvider();
    
    // Only validate - no backend private keys!
    const identityRegistryAbi = [
      'function registerIdentity(address _userAddress, address _identity, uint16 _country)',
      'function contains(address _userAddress) view returns (bool)',
      'function owner() view returns (address)',
      'function isAgent(address) view returns (bool)'
    ];
    
    console.log('🪪 Identity Registry Address:', identityRegistryAddress);
    const normalizedRegistryAddress = normalizeAddress(identityRegistryAddress);
    const identityRegistry = new ethers.Contract(normalizedRegistryAddress, identityRegistryAbi, provider);
    
    // Normalize addresses
    const normalizedUserAddress = normalizeAddress(userAddress);
    const normalizedAgentAddress = normalizeAddress(agentAddress);
    
    // Check if the provided agent address is actually an agent
    const isAgent = await identityRegistry.isAgent(normalizedAgentAddress);
    if (!isAgent) {
      return res.status(403).json({ 
        error: 'Agent not authorized', 
        details: `Address ${normalizedAgentAddress} is not an agent on this Identity Registry. Please add this address as an agent first.`
      });
    }
    
    // Check if user already exists
    const userExists = await identityRegistry.contains(normalizedUserAddress);
    if (userExists) {
      return res.status(400).json({ error: 'User already registered' });
    }
    
    // Prepare transaction data for frontend to sign
    const countryCode = country || 0;
    
    // Handle OnchainID for this user
    let onchainIdAddress = ethers.constants.AddressZero;
    
    // If an existing OnchainID address was provided, use it
    if (existingOnchainIdAddress) {
      const normalizedExistingOnchainId = normalizeAddress(existingOnchainIdAddress);
      console.log(`✅ Using provided OnchainID address: ${normalizedExistingOnchainId}`);
      onchainIdAddress = normalizedExistingOnchainId;
    } else {
      // Check if user already has an OnchainID in the registry
      try {
        const userIdentity = await identityRegistry.identity(normalizedUserAddress);
        if (userIdentity && userIdentity !== ethers.constants.AddressZero) {
          onchainIdAddress = userIdentity;
          console.log(`✅ User ${normalizedUserAddress} already has OnchainID: ${onchainIdAddress}`);
        } else {
          console.log(`❌ User ${normalizedUserAddress} does not have an OnchainID, need to create one`);
          
          // Check deployments.json for existing OnchainID
          const deploymentsPath = path.join(__dirname, '../deployments.json');
          if (fs.existsSync(deploymentsPath)) {
            const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
            
            // First, try to find an existing OnchainID for this user
            const existingOnchainId = deployments.find(d => 
              (d.component === 'OnchainID' || d.component === 'UserOnchainID') && d.userAddress === normalizedUserAddress
            );
            
            if (existingOnchainId) {
              onchainIdAddress = existingOnchainId.address;
              console.log(`📋 Found existing OnchainID for user ${normalizedUserAddress}: ${onchainIdAddress}`);
            } else {
              // Create a new OnchainID contract for this user
              try {
                // Use the same pattern as the working "Deploy Components" phase
                const OnchainID = require('@onchain-id/solidity');
                
                // Get contract bytecode and ABI
                const contractAbi = OnchainID.contracts.Identity.abi;
                const contractBytecode = OnchainID.contracts.Identity.bytecode;
                const constructorArgs = [normalizedAgentAddress, false]; // Use agent address as management key for testing
                
                // Encode the constructor data using the same pattern as working deployment
                const iface = new ethers.utils.Interface(contractAbi);
                const deploymentData = {
                  data: contractBytecode + (constructorArgs.length > 0 ? iface.encodeDeploy(constructorArgs).slice(2) : '')
                };
                
                const onchainIdData = {
                  data: deploymentData.data
                };
                
                console.log(`🔧 Creating new OnchainID for user ${normalizedUserAddress}`);
                console.log(`📋 OnchainID deployment data:`, onchainIdData.data);
                
                // Return the OnchainID deployment transaction for frontend to sign
                // The manager will deploy the OnchainID for the user
                return res.json({ 
                  success: true, 
                  message: 'Please deploy OnchainID contract first, then register user',
                  onchainIdDeployment: {
                    transactionData: onchainIdData.data,
                    from: normalizedAgentAddress, // MANAGER deploys OnchainID for the user
                    gas: '0x3D0900', // 4,000,000 gas limit (same as working OnchainID deployment)
                    gasPrice: '0x59682F00' // 1.5 gwei (same as working deployment)
                  },
                  userRegistration: {
                    userAddress: normalizedUserAddress,
                    countryCode: countryCode,
                    agentAddress: normalizedAgentAddress,
                    registryAddress: normalizedRegistryAddress
                  }
                });
                
              } catch (onchainIdError) {
                console.error('Error preparing OnchainID deployment:', onchainIdError);
                return res.status(500).json({ 
                  error: 'Failed to prepare OnchainID deployment',
                  details: onchainIdError.message
                });
              }
            }
          } else {
            // No deployments.json file, need to create new OnchainID
            try {
              // Use the same pattern as the working "Deploy Components" phase
              const OnchainID = require('@onchain-id/solidity');
              
              // Get contract bytecode and ABI
              const contractAbi = OnchainID.contracts.Identity.abi;
              const contractBytecode = OnchainID.contracts.Identity.bytecode;
              const constructorArgs = [normalizedAgentAddress, false]; // Use agent address as management key for testing
              
              // Encode the constructor data using the same pattern as working deployment
              const iface = new ethers.utils.Interface(contractAbi);
              const deploymentData = {
                data: contractBytecode + (constructorArgs.length > 0 ? iface.encodeDeploy(constructorArgs).slice(2) : '')
              };
              
              const onchainIdData = {
                data: deploymentData.data
              };
              
              console.log(`🔧 Creating new OnchainID for user ${normalizedUserAddress}`);
              console.log(`📋 OnchainID deployment data:`, onchainIdData.data);
              
              // Return the OnchainID deployment transaction for frontend to sign
              return res.json({ 
                success: true, 
                message: 'Please deploy OnchainID contract first, then register user',
                onchainIdDeployment: {
                  transactionData: onchainIdData.data,
                  from: normalizedAgentAddress, // MANAGER deploys OnchainID for the user
                  gas: '0x3D0900', // 4,000,000 gas limit (same as working OnchainID deployment)
                  gasPrice: '0x59682F00' // 1.5 gwei (same as working deployment)
                },
                userRegistration: {
                  userAddress: normalizedUserAddress,
                  countryCode: countryCode,
                  agentAddress: normalizedAgentAddress,
                  registryAddress: normalizedRegistryAddress
                }
              });
              
            } catch (onchainIdError) {
              console.error('Error preparing OnchainID deployment:', onchainIdError);
              return res.status(500).json({ 
                error: 'Failed to prepare OnchainID deployment',
                details: onchainIdError.message
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking user OnchainID:', error);
        // If we can't check the registry, we need to create a new OnchainID
        try {
          // Use the same pattern as the working "Deploy Components" phase
          const OnchainID = require('@onchain-id/solidity');
          
          // Get contract bytecode and ABI
          const contractAbi = OnchainID.contracts.Identity.abi;
          const contractBytecode = OnchainID.contracts.Identity.bytecode;
          const constructorArgs = [normalizedAgentAddress, false]; // Use agent address as management key for testing
          
          // Encode the constructor data using the same pattern as working deployment
          const iface = new ethers.utils.Interface(contractAbi);
          const deploymentData = {
            data: contractBytecode + (constructorArgs.length > 0 ? iface.encodeDeploy(constructorArgs).slice(2) : '')
          };
          
          const onchainIdData = {
            data: deploymentData.data
          };
          
          console.log(`🔧 Creating new OnchainID for user ${normalizedUserAddress} (fallback)`);
          console.log(`📋 OnchainID deployment data:`, onchainIdData.data);
          
          // Return the OnchainID deployment transaction for frontend to sign
          return res.json({ 
            success: true, 
            message: 'Please deploy OnchainID contract first, then register user',
            onchainIdDeployment: {
              transactionData: onchainIdData.data,
              from: normalizedAgentAddress, // MANAGER deploys OnchainID for the user
              gas: '0x3D0900', // 4,000,000 gas limit (same as working OnchainID deployment)
              gasPrice: '0x59682F00' // 1.5 gwei (same as working deployment)
            },
            userRegistration: {
              userAddress: normalizedUserAddress,
              countryCode: countryCode,
              agentAddress: normalizedAgentAddress,
              registryAddress: normalizedRegistryAddress
            }
          });
          
        } catch (onchainIdError) {
          console.error('Error preparing OnchainID deployment:', onchainIdError);
          return res.status(500).json({ 
            error: 'Failed to prepare OnchainID deployment',
            details: onchainIdError.message
          });
        }
      }
    }
    
    // Create the transaction data that the frontend will sign
    const registerIdentityInterface = new ethers.utils.Interface(identityRegistryAbi);
    const transactionData = registerIdentityInterface.encodeFunctionData('registerIdentity', [
      normalizedUserAddress,
      onchainIdAddress,
      countryCode
    ]);
    
    console.log('🔧 Transaction preparation:');
    console.log('  User address:', normalizedUserAddress);
    console.log('  OnchainID address:', onchainIdAddress);
    console.log('  Country code:', countryCode);
    console.log('  Agent address:', normalizedAgentAddress);
    console.log('  Registry address:', normalizedRegistryAddress);
    console.log('  Transaction data:', transactionData);
    
    const newUser = {
      address: normalizedUserAddress,
      identity: onchainIdAddress,
      country: countryCode,
      isVerified: false,
      claims: [],
      registeredAt: new Date().toISOString()
    };
    
    // Return transaction data for frontend to sign
    res.json({ 
      success: true, 
      user: newUser,
      transactionData: transactionData,
      to: normalizedRegistryAddress,
      from: normalizedAgentAddress,
      message: 'Please sign this transaction with your MetaMask wallet to register the user'
    });
  } catch (error) {
    console.error('Error preparing user registration:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userAddress/claims', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { claimTopic, identityRegistryAddress, deployerAddress, data, uri, claimIssuerAddress } = req.body;

    if (!claimTopic || !identityRegistryAddress || !deployerAddress) {
      return res.status(400).json({ error: 'Claim topic, identity registry address, and deployer address are required' });
    }

    const provider = createProvider();

    // 1. Get the user's ONCHAINID address from the Identity Registry
    const identityRegistryAbi = [
      'function identity(address _userAddress) view returns (address)',
      'function issuersRegistry() view returns (address)'
    ];
    const normalizedRegistryAddress = normalizeAddress(identityRegistryAddress);
    const identityRegistry = new ethers.Contract(normalizedRegistryAddress, identityRegistryAbi, provider);
    const normalizedUserAddress = normalizeAddress(userAddress);
    const userIdentityAddress = await identityRegistry.identity(normalizedUserAddress);

    if (!userIdentityAddress || userIdentityAddress === ethers.constants.AddressZero) {
      return res.status(400).json({ error: 'User does not have an ONCHAINID/Identity contract' });
    }

    // 2. Check if we have a ClaimIssuer address, if not, we need to deploy one
    console.log('🔍 Debug - Received claimIssuerAddress:', claimIssuerAddress);
    console.log('🔍 Debug - Type of claimIssuerAddress:', typeof claimIssuerAddress);
    
    let claimIssuerAddr = claimIssuerAddress;
    if (!claimIssuerAddr || claimIssuerAddr === ethers.constants.AddressZero) {
      return res.status(400).json({ 
        error: 'ClaimIssuer address is required',
        details: 'You need to deploy a ClaimIssuer contract first and register it as a trusted issuer.',
        solution: 'Deploy a ClaimIssuer contract and register it in the TrustedIssuersRegistry for the claim topic.'
      });
    }
    
    console.log('🔍 Debug - Using claimIssuerAddr:', claimIssuerAddr);

    // 3. Verify that the ClaimIssuer is registered as a trusted issuer for this claim topic
    const trustedIssuersRegistryAbi = [
      'function hasClaimTopic(address _issuer, uint256 _claimTopic) view returns (bool)',
      'function isTrustedIssuer(address _issuer) view returns (bool)'
    ];
    
    // Get the TrustedIssuersRegistry address from the Identity Registry
    const trustedIssuersRegistryAddress = await identityRegistry.issuersRegistry();
    
    const trustedIssuersRegistry = new ethers.Contract(trustedIssuersRegistryAddress, trustedIssuersRegistryAbi, provider);
    
    const isTrusted = await trustedIssuersRegistry.isTrustedIssuer(claimIssuerAddr);
    const hasTopic = await trustedIssuersRegistry.hasClaimTopic(claimIssuerAddr, claimTopic);
    
    if (!isTrusted) {
      return res.status(400).json({ 
        error: 'ClaimIssuer is not registered as a trusted issuer',
        details: 'The ClaimIssuer contract must be registered in the TrustedIssuersRegistry.',
        solution: 'Register the ClaimIssuer in the TrustedIssuersRegistry using the addTrustedIssuer function.'
      });
    }
    
    if (!hasTopic) {
      return res.status(400).json({ 
        error: 'ClaimIssuer is not authorized for this claim topic',
        details: `The ClaimIssuer is not authorized to issue claims for topic ${claimTopic}.`,
        solution: 'Update the ClaimIssuer registration to include this claim topic.'
      });
    }

    // 4. Prepare claim data
    const topic = Number(claimTopic);
    const scheme = 1; // ECDSA
    const issuer = claimIssuerAddr; // Use the ClaimIssuer address as the issuer
    const claimData = data || "0x";
    const claimUri = uri || "";
    
    // 5. Create a proper signature for the claim
    // In production, this would be signed by the ClaimIssuer's signing key
    const claimHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes'],
        [normalizedUserAddress, topic, claimData]
      )
    );
    
    // For demo purposes, we'll use a simple signature
    // In production, this would be signed by the ClaimIssuer's private key
    const signature = "0x" + "00".repeat(65);

    // 6. First, we need to check who has management permissions on the OnchainID
    // This is required because addKey has the onlyManager modifier
    const identityAbi = require('../trex-scaffold/packages/contracts/src/@onchain-id/solidity/contracts/Identity.sol/Identity.json').abi;
    const identityInterface = new ethers.utils.Interface(identityAbi);
    
    // Check if the deployer (current MetaMask account) has management key
    const deployerKeyHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [deployerAddress]));
    const hasManagementKey = await provider.call({
      to: userIdentityAddress,
      data: identityInterface.encodeFunctionData('keyHasPurpose', [deployerKeyHash, 1]) // 1 = MANAGEMENT key
    });
    
    console.log('🔍 Checking management permissions:');
    console.log('  Deployer address:', deployerAddress);
    console.log('  Deployer key hash:', deployerKeyHash);
    console.log('  Has management key:', hasManagementKey);
    
    // Let's also check what keys this OnchainID actually has
    console.log('🔍 Checking all keys on this OnchainID:');
    try {
      const managementKeys = await provider.call({
        to: userIdentityAddress,
        data: identityInterface.encodeFunctionData('getKeysByPurpose', [1]) // 1 = MANAGEMENT
      });
      console.log('  Management keys result:', managementKeys);
      
      const actionKeys = await provider.call({
        to: userIdentityAddress,
        data: identityInterface.encodeFunctionData('getKeysByPurpose', [2]) // 2 = ACTION
      });
      console.log('  Action keys result:', actionKeys);
      
      const claimKeys = await provider.call({
        to: userIdentityAddress,
        data: identityInterface.encodeFunctionData('getKeysByPurpose', [3]) // 3 = CLAIM
      });
      console.log('  Claim keys result:', claimKeys);
      
    } catch (error) {
      console.log('  Error checking keys:', error.message);
    }
    
    // Check if the trusted issuer already has a claim signer key
    console.log('🔍 Debug - Creating claim signer key hash for address:', claimIssuerAddr);
    const claimSignerKeyHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [claimIssuerAddr]));
    console.log('🔍 Debug - Claim signer key hash:', claimSignerKeyHash);
    
    const hasClaimKey = await provider.call({
      to: userIdentityAddress,
      data: identityInterface.encodeFunctionData('keyHasPurpose', [claimSignerKeyHash, 3]) // 3 = CLAIM signer key
    });
    
    console.log('  Trusted issuer address:', claimIssuerAddr);
    console.log('  Trusted issuer key hash:', claimSignerKeyHash);
    console.log('  Has claim signer key:', hasClaimKey);
    
    let needsClaimKey = false;
    if (hasClaimKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      needsClaimKey = true;
    }
    
    // If deployer doesn't have management key, we'll try alternative approaches
    if (hasManagementKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('❌ Deployer does not have management key on OnchainID');
      
      // Let's find out who the management keys are
      console.log('🔍 Finding management keys...');
      try {
        const managementKeys = await provider.call({
          to: userIdentityAddress,
          data: identityInterface.encodeFunctionData('getKeysByPurpose', [1]) // 1 = MANAGEMENT
        });
        
        console.log('  Management keys result:', managementKeys);
        
        // Try to decode the result
        const decodedKeys = identityInterface.decodeFunctionResult('getKeysByPurpose', managementKeys);
        console.log('  Decoded management keys:', decodedKeys);
        
        // For now, let's try a different approach - use the trusted issuer directly
        console.log('🔄 Trying alternative approach: using trusted issuer directly...');
        
        // Instead of adding a claim signer key, let's try to add the claim directly
        // but first check if the trusted issuer has any keys at all
        const trustedIssuerHasAnyKey = await provider.call({
          to: userIdentityAddress,
          data: identityInterface.encodeFunctionData('keyHasPurpose', [claimSignerKeyHash, 1]) // Check for MANAGEMENT
        });
        
        console.log('  Trusted issuer has management key:', trustedIssuerHasAnyKey);
        
        if (trustedIssuerHasAnyKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          // Try ACTION key
          const trustedIssuerHasActionKey = await provider.call({
            to: userIdentityAddress,
            data: identityInterface.encodeFunctionData('keyHasPurpose', [claimSignerKeyHash, 2]) // Check for ACTION
          });
          console.log('  Trusted issuer has action key:', trustedIssuerHasActionKey);
        }
        
      } catch (error) {
        console.log('  Error finding management keys:', error.message);
      }
      
      console.log('⚠️  Continuing with alternative approaches despite lack of management permissions...');
      console.log('💡 TIP: The management key belongs to account: 0x90F79bf6EB2c4f870365E785982E1f101E93b906');
      console.log('💡 TIP: Switch to this account in MetaMask to have proper permissions');
      console.log('💡 TIP: Or create a new user with the updated backend logic');
    }
    
    if (needsClaimKey) {
      console.log('🔑 Trying alternative approach: using execute function...');
      
      // Instead of adding a claim signer key, let's try to use the execute function
      // to call addClaim internally. This might work if the caller has ACTION permissions
      
      // First, let's check if the deployer has ACTION key
      const hasActionKey = await provider.call({
        to: userIdentityAddress,
        data: identityInterface.encodeFunctionData('keyHasPurpose', [deployerKeyHash, 2]) // 2 = ACTION key
      });
      
      console.log('  Deployer has action key:', hasActionKey);
      
      if (hasActionKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        // No ACTION key either, let's try a different approach
        console.log('🔄 Trying to add the claim directly without permissions (demo mode)...');
        
        // For demo purposes, let's try to add the claim directly
        // This will likely fail, but let's see what error we get
        const addClaimData = identityInterface.encodeFunctionData('addClaim', [
          topic, scheme, claimIssuerAddr, signature, claimData, claimUri
        ]);
        
        console.log('📋 Trying direct addClaim (will likely fail):', addClaimData);
        
        return res.json({ 
          success: true, 
          message: 'Trying to add claim directly (demo mode - may fail due to permissions)',
          step: 'directAddClaim',
          transactionData: addClaimData,
          to: userIdentityAddress, // Send to user's OnchainID contract
          from: deployerAddress, // Use the current MetaMask account
          claimIssuer: claimIssuerAddr,
          isTrustedIssuer: isTrusted,
          hasClaimTopic: hasTopic,
          warning: 'This may fail due to permission requirements. You may need to switch to the account that has management permissions on this OnchainID.'
        });
      } else {
        // Has ACTION key, but let's try direct addClaim since we also have MANAGEMENT key
        console.log('✅ Deployer has both MANAGEMENT and ACTION keys, trying direct addClaim...');
        
        const addClaimData = identityInterface.encodeFunctionData('addClaim', [
          topic, scheme, claimIssuerAddr, signature, claimData, claimUri
        ]);
        
        console.log('📋 Using direct addClaim (MANAGEMENT key approach):', addClaimData);
        
        return res.json({ 
          success: true, 
          message: 'Using direct addClaim (MANAGEMENT key approach)',
          step: 'directAddClaim',
          transactionData: addClaimData,
          to: userIdentityAddress, // Send to user's OnchainID contract
          from: deployerAddress, // Use the current MetaMask account
          claimIssuer: claimIssuerAddr,
          isTrustedIssuer: isTrusted,
          hasClaimTopic: hasTopic
        });
      }
    }
    
    // 7. Now we can add the claim since the trusted issuer has a claim signer key
    const transactionData = identityInterface.encodeFunctionData('addClaim', [
      topic, scheme, claimIssuerAddr, signature, claimData, claimUri
    ]);

    console.log('📋 Trusted issuer adding claim to user OnchainID:', transactionData);
    console.log('  Topic:', topic);
    console.log('  Scheme:', scheme);
    console.log('  ClaimIssuer (trusted issuer):', claimIssuerAddr);
    console.log('  User OnchainID address:', userIdentityAddress);
    console.log('  Caller (must be trusted issuer):', deployerAddress);
    console.log('  User address:', normalizedUserAddress);
    console.log('  Is Trusted Issuer:', isTrusted);
    console.log('  Has Claim Topic:', hasTopic);
    console.log('  AddClaim data:', transactionData);

    // Return transaction data for frontend to sign
    // Note: In production, the trusted issuer would sign this transaction
    // For demo purposes, we're allowing the current MetaMask account to sign
    // but the transaction will be sent to the OnchainID contract
    res.json({ 
      success: true, 
      message: 'Please sign this transaction to add a claim to the user OnchainID',
      transactionData: transactionData,
      to: userIdentityAddress, // Send to user's OnchainID contract
      from: deployerAddress, // Use the current MetaMask account
      claim: { topic, scheme, issuer: claimIssuerAddr, signature, data: claimData, uri: claimUri, claimHash },
      claimIssuer: claimIssuerAddr,
      isTrustedIssuer: isTrusted,
      hasClaimTopic: hasTopic
    });
  } catch (error) {
    console.error('Error preparing claim transaction:', error);
    
    // Check if this is a library contract error
    if (error.message && error.message.includes('library contract is forbidden')) {
      res.status(400).json({ 
        error: 'Cannot add claim to library contract',
        details: 'This OnchainID is a library contract and cannot be interacted with directly. You need to deploy a new OnchainID for this user with the correct parameters.',
        solution: 'Use the "Link Identity" feature to update the user with a new OnchainID, or create a new user with a new OnchainID.',
        userAddress: req.params.userAddress,
        onchainIdAddress: 'Unknown - library contract'
      });
    } else if (error.message && error.message.includes('execution reverted')) {
      res.status(400).json({ 
        error: 'Transaction would revert',
        details: 'The transaction would fail on the blockchain. This could be due to insufficient permissions or invalid parameters.',
        solution: 'Check that the ClaimIssuer is authorized for this claim topic and that all parameters are valid.',
        userAddress: req.params.userAddress
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to prepare claim transaction',
        details: error.message,
        userAddress: req.params.userAddress
      });
    }
  }
});

app.get('/api/users/:userAddress/claims', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { identityRegistryAddress } = req.query;
    
    if (!identityRegistryAddress) {
      return res.status(400).json({ error: 'Identity Registry address is required' });
    }
    
    const provider = createProvider();
    
    // 1. Get the user's OnchainID address from the Identity Registry
    const identityRegistryAbi = [
      'function identity(address _userAddress) view returns (address)'
    ];
    const normalizedRegistryAddress = normalizeAddress(identityRegistryAddress);
    const identityRegistry = new ethers.Contract(normalizedRegistryAddress, identityRegistryAbi, provider);
    const normalizedUserAddress = normalizeAddress(userAddress);
    const userIdentityAddress = await identityRegistry.identity(normalizedUserAddress);
    
    if (!userIdentityAddress || userIdentityAddress === ethers.constants.AddressZero) {
      return res.status(400).json({ error: 'User does not have an OnchainID' });
    }
    
    // 2. Get claims from the OnchainID contract
    const identityAbi = require('../trex-scaffold/packages/contracts/src/@onchain-id/solidity/contracts/Identity.sol/Identity.json').abi;
    const onchainIdContract = new ethers.Contract(userIdentityAddress, identityAbi, provider);
    
    // Test basic contract functionality
    try {
      console.log('Testing OnchainID contract...');
      // The managementKey function doesn't exist, let's check what functions are available
      console.log('Available functions:', Object.keys(onchainIdContract.functions));
    } catch (error) {
      console.log('Error testing OnchainID contract:', error.message);
    }
    
    // Get all claim topics from the OnchainID
    const claimTopics = [];
    try {
      // Try to get claims by checking each topic from 1 to 50
      console.log('Checking for claims by topic...');
      console.log('OnchainID contract address:', userIdentityAddress);
      console.log('OnchainID contract methods:', Object.keys(onchainIdContract.functions));
      
      for (let topic = 1; topic <= 50; topic++) {
        try {
          console.log(`Checking topic ${topic}...`);
          const claimIds = await onchainIdContract.getClaimIdsByTopic(topic);
          console.log(`Topic ${topic} returned:`, claimIds);
          if (claimIds && claimIds.length > 0) {
            console.log(`Found ${claimIds.length} claims for topic ${topic}`);
            claimTopics.push(topic);
          }
        } catch (error) {
          console.log(`Error checking topic ${topic}:`, error.message);
          // Topic might not exist or have no claims, continue
          continue;
        }
      }
      
      // If no topics found, try looking at recent events
      if (claimTopics.length === 0) {
        console.log('No claims found via topics, trying event logs...');
        try {
          // Look for ClaimAdded events in the last 1000 blocks
          const currentBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 1000);
          
          const filter = {
            address: userIdentityAddress,
            topics: [
              ethers.utils.id("ClaimAdded(bytes32,uint256,uint256,address,bytes,bytes,string)")
            ],
            fromBlock: fromBlock,
            toBlock: currentBlock
          };
          
          const logs = await provider.getLogs(filter);
          console.log(`Found ${logs.length} ClaimAdded events`);
          
          for (const log of logs) {
            try {
              const parsedLog = onchainIdContract.interface.parseLog(log);
              const topic = parsedLog.args.topic.toNumber();
              if (!claimTopics.includes(topic)) {
                claimTopics.push(topic);
                console.log(`Found claim topic ${topic} from event log`);
              }
            } catch (parseError) {
              console.log('Error parsing event log:', parseError.message);
            }
          }
        } catch (eventError) {
          console.log('Error getting event logs:', eventError.message);
        }
      }
      
      console.log(`Final claim topics found: ${claimTopics.join(', ')}`);
    } catch (error) {
      console.log('Could not get claim topics:', error.message);
    }
    
    // 3. Get claims for each topic
    const claims = [];
    for (const topic of claimTopics) {
      try {
        const claimIds = await onchainIdContract.getClaimIdsByTopic(topic);
        console.log(`Getting claims for topic ${topic}, found ${claimIds.length} claim IDs`);
        
        for (const claimId of claimIds) {
          try {
            console.log(`Fetching claim ${claimId} for topic ${topic}`);
            const claim = await onchainIdContract.getClaim(claimId);
            console.log(`Claim data for ${claimId}:`, {
              topic: claim.topic.toString(),
              issuer: claim.issuer,
              data: claim.data,
              signature: claim.signature,
              uri: claim.uri
            });
            
            // Get claim topic name from our standard topics
            console.log(`Looking for user claim topic ${topic} (type: ${typeof topic})`);
            console.log(`Available topics:`, claimTopics.map(t => ({ id: t.id, type: typeof t.id, name: t.name })));
            const standardTopic = claimTopics.find(t => Number(t.id) === Number(topic)); // Convert both to numbers for comparison
            console.log(`Found topic:`, standardTopic);
            const topicName = standardTopic ? standardTopic.name : `Topic ${topic}`;
            
            claims.push({
              topic: topic,
              issuer: claim.issuer,
              data: claim.data,
              signature: claim.signature,
              uri: claim.uri,
              issuedAt: new Date().toISOString(), // We don't have timestamp, use current time
              name: topicName
            });
            console.log(`Added claim to results: Topic ${topic}, Issuer: ${claim.issuer}`);
          } catch (error) {
            console.log(`Error getting claim ${claimId}:`, error.message);
          }
        }
      } catch (error) {
        console.log(`Error getting claims for topic ${topic}:`, error.message);
      }
    }
    
    console.log(`📋 Fetched ${claims.length} claims for user ${normalizedUserAddress} from OnchainID ${userIdentityAddress}`);
    
    res.json(claims);
  } catch (error) {
    console.error('Error fetching user claims:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userAddress/identity', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { onchainIdAddress, identityRegistryAddress, agentAddress } = req.body;
    
    if (!onchainIdAddress || !identityRegistryAddress || !agentAddress) {
      return res.status(400).json({ error: 'ONCHAINID address, identity registry address, and agent address are required' });
    }
    
    const provider = createProvider();
    
    // Load Identity Registry ABI
    const identityRegistryAbi = require('../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json').abi;
    
    const normalizedRegistryAddress = normalizeAddress(identityRegistryAddress);
    const identityRegistry = new ethers.Contract(normalizedRegistryAddress, identityRegistryAbi, provider);
    const normalizedUserAddress = normalizeAddress(userAddress);
    const normalizedOnchainIdAddress = normalizeAddress(onchainIdAddress);
    const normalizedAgentAddress = normalizeAddress(agentAddress);
    
    // Check if user exists and has an identity
    const existingIdentity = await identityRegistry.identity(normalizedUserAddress);
    if (existingIdentity === ethers.constants.AddressZero) {
      return res.status(400).json({ error: 'User is not registered in the Identity Registry' });
    }
    
    console.log('🔄 Identity Update:');
    console.log('  User address:', normalizedUserAddress);
    console.log('  Current OnchainID:', existingIdentity);
    console.log('  New OnchainID:', normalizedOnchainIdAddress);
    console.log('  Agent address:', normalizedAgentAddress);
    
    // Prepare transaction data for updating user identity
    const transactionData = identityRegistry.interface.encodeFunctionData('updateIdentity', [
      normalizedUserAddress,
      normalizedOnchainIdAddress
    ]);
    
    console.log('📋 Identity update transaction data:', transactionData);
    
    // Return transaction data for frontend to sign
    res.json({ 
      success: true, 
      message: 'Please sign this transaction with your MetaMask wallet to update the user identity',
      transactionData: transactionData,
      to: normalizedRegistryAddress,
      from: normalizedAgentAddress,
      userAddress: normalizedUserAddress,
      oldOnchainIdAddress: existingIdentity,
      newOnchainIdAddress: normalizedOnchainIdAddress
    });
  } catch (error) {
    console.error('Error preparing identity update:', error);
    res.status(500).json({ error: 'Failed to prepare identity update: ' + error.message });
  }
});

// Register user with existing OnchainID
app.post('/api/users/register-with-onchainid', async (req, res) => {
  console.log('📋 Received user registration request:', req.body);
  const { userAddress, identityRegistryAddress, country, agentAddress, onchainIdAddress } = req.body;
  
  if (!userAddress || !identityRegistryAddress || country === undefined || country === null || !agentAddress || !onchainIdAddress) {
    console.log('❌ Missing required fields:', { userAddress, identityRegistryAddress, country, agentAddress, onchainIdAddress });
    return res.status(400).json({ error: 'All fields are required: userAddress, identityRegistryAddress, country, agentAddress, onchainIdAddress' });
  }
  
  try {
    const provider = createProvider();
    
    // Load Identity Registry ABI
    const identityRegistryAbi = require('../trex-scaffold/packages/contracts/src/contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json').abi;
    
    const identityRegistry = new ethers.Contract(identityRegistryAddress, identityRegistryAbi, provider);
    
    // Normalize addresses
    const normalizedUserAddress = normalizeAddress(userAddress);
    const normalizedRegistryAddress = normalizeAddress(identityRegistryAddress);
    const normalizedAgentAddress = normalizeAddress(agentAddress);
    const normalizedOnchainIdAddress = normalizeAddress(onchainIdAddress);
    
    // Check if user is already registered
    const existingIdentity = await identityRegistry.identity(normalizedUserAddress);
    if (existingIdentity !== ethers.constants.AddressZero) {
      return res.status(400).json({ error: 'User is already registered' });
    }
    
    // Prepare transaction data for registering user with OnchainID
    const transactionData = identityRegistry.interface.encodeFunctionData('registerIdentity', [
      normalizedUserAddress,
      normalizedOnchainIdAddress,
      country
    ]);
    
    console.log('📋 User registration with OnchainID transaction data:', transactionData);
    console.log('  User address:', normalizedUserAddress);
    console.log('  OnchainID address:', normalizedOnchainIdAddress);
    console.log('  Country code:', country);
    console.log('  Agent address:', normalizedAgentAddress);
    
    // Save the OnchainID deployment to deployments.json
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    // Add the OnchainID deployment record
    const deploymentId = `user_onchainid_${Date.now()}`;
    deployments.push({
      deploymentId,
      component: 'UserOnchainID',
      address: normalizedOnchainIdAddress,
      userAddress: normalizedUserAddress,
      deployer: normalizedAgentAddress,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log('📝 OnchainID deployment saved to deployments.json');
    
    res.json({ 
      success: true, 
      message: 'User registration transaction prepared',
      transactionData: transactionData,
      to: normalizedRegistryAddress,
      from: normalizedAgentAddress
    });
  } catch (error) {
    console.error('Error preparing user registration with OnchainID:', error);
    res.status(500).json({ error: 'Failed to prepare user registration: ' + error.message });
  }
});

// Get OnchainID details
app.get('/api/onchainid/:address', async (req, res) => {
  const { address } = req.params;
  
  if (!address) {
    return res.status(400).json({ error: 'OnchainID address is required' });
  }
  
  try {
    const provider = createProvider();
    
    // Use the correct ABI from the compiled contracts
    const identityAbi = require('../trex-scaffold/packages/contracts/src/@onchain-id/solidity/contracts/Identity.sol/Identity.json').abi;
    
    const normalizedAddress = normalizeAddress(address);
    const onchainIdContract = new ethers.Contract(normalizedAddress, identityAbi, provider);
    
    // Get basic OnchainID information
    let isLibrary = false;
    let managementKey = false;
    try {
      // Try to call a function that only works on non-library contracts
      // Use a simpler function to check if it's a library contract
      await onchainIdContract.keyHasPurpose(ethers.constants.AddressZero, 1);
      // If we get here, it's not a library contract
      managementKey = true;
    } catch (error) {
      if (error.message.includes('library contract is forbidden')) {
        isLibrary = true;
        console.log('OnchainID is a library contract - cannot interact directly');
      } else if (error.message.includes('incorrect data length') || error.message.includes('execution reverted')) {
        // This might be an ABI issue or the contract doesn't exist, but let's not treat it as library
        // Just log the error and continue
        console.log('OnchainID check failed:', error.message);
        // Don't set isLibrary = true for ABI issues, let the transaction try
      } else {
        console.error('Error checking OnchainID type:', error);
      }
    }
    
    // Get claims
    const claims = [];
    if (!isLibrary) {
      try {
        // Try to get claims using the correct function names
        // For now, return empty claims since the ABI might not have the right functions
        console.log('OnchainID is not a library contract, but ABI functions may not be available');
      } catch (error) {
        console.error('Error fetching claims:', error);
      }
    }
    
    // Get keys
    const keys = [];
    if (!isLibrary) {
      try {
        // Try to get keys using the correct function names
        // For now, return empty keys since the ABI might not have the right functions
        console.log('OnchainID is not a library contract, but ABI functions may not be available');
      } catch (keyError) {
        console.error('Error fetching keys:', keyError);
      }
    }
    
    res.json({
      address: normalizedAddress,
      isLibrary,
      managementKey,
      claims,
      keys,
      totalClaims: claims.length,
      totalKeys: keys.length,
      warning: isLibrary ? "This OnchainID is a library contract and cannot be interacted with directly. You need to deploy a new OnchainID for this user." : null
    });
  } catch (error) {
    console.error('Error fetching OnchainID details:', error);
    res.status(500).json({ error: 'Failed to fetch OnchainID details: ' + error.message });
  }
});

// Prepare bind Identity Registry transaction for MetaMask signing
app.post('/api/prepare-bind-identity-registry', async (req, res) => {
  try {
    const { identityRegistryAddress, identityRegistryStorageAddress, deployerAddress } = req.body;
    
    if (!identityRegistryAddress || !identityRegistryStorageAddress || !deployerAddress) {
      return res.status(400).json({ error: 'Identity Registry address, Identity Registry Storage address, and deployer address are required' });
    }
    
    const normalizedStorageAddress = normalizeAddress(identityRegistryStorageAddress);
    const normalizedRegistryAddress = normalizeAddress(identityRegistryAddress);
    
    // Prepare bind transaction data
    const identityRegistryStorageAbi = [
      'function bindIdentityRegistry(address _identityRegistry)'
    ];
    
    const iface = new ethers.utils.Interface(identityRegistryStorageAbi);
    const bindData = iface.encodeFunctionData('bindIdentityRegistry', [normalizedRegistryAddress]);
    
    const transactionData = {
      to: normalizedStorageAddress,
      data: bindData,
      from: deployerAddress,
      gas: '0x186A0', // 100,000 gas
      gasPrice: '0x59682F00' // 1.5 gwei
    };
    
    res.json({ 
      success: true, 
      message: 'Bind Identity Registry transaction prepared',
      transactionData: transactionData,
      identityRegistryAddress: normalizedRegistryAddress,
      identityRegistryStorageAddress: normalizedStorageAddress
    });
  } catch (error) {
    console.error('Error preparing bind identity registry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Prepare initialization transactions for MetaMask signing
app.post('/api/prepare-initialize-components', async (req, res) => {
  try {
    const { initializationOrder, deployerAddress } = req.body;
    
    if (!initializationOrder || !Array.isArray(initializationOrder) || initializationOrder.length === 0) {
      return res.status(400).json({ error: 'Initialization order array is required' });
    }
    
    if (!deployerAddress) {
      return res.status(400).json({ error: 'Deployer address is required' });
    }
    
    // Load deployments to get contract addresses
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      return res.status(400).json({ error: 'No deployments found. Please deploy contracts first.' });
    }
    
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    
    // Get latest addresses for each component type
    const getLatestAddress = (componentName) => {
      const componentDeployments = deployments.filter(d => 
        d.component === componentName || d.component.startsWith(componentName + '_')
      );
      return componentDeployments.length > 0 ? componentDeployments[componentDeployments.length - 1].address : null;
    };
    
    const initializationTransactions = [];
    
    for (const step of initializationOrder) {
      const { component, action, dependencies } = step;
      
      console.log(`🔧 Preparing initialization for: ${component} - ${action}`);
      
      try {
        switch (component) {
          case 'IdentityRegistry':
            const identityRegistryAddress = getLatestAddress('IdentityRegistry');
            if (!identityRegistryAddress) {
              initializationTransactions.push({ component, action, status: 'skipped', reason: 'No IdentityRegistry found' });
              continue;
            }
            
            // Get dependency addresses
            const trustedIssuersRegistryAddress = getLatestAddress('TrustedIssuersRegistry');
            const claimTopicsRegistryAddress = getLatestAddress('ClaimTopicsRegistry');
            const identityRegistryStorageAddress = getLatestAddress('IdentityRegistryStorage');
            
            if (!trustedIssuersRegistryAddress || !claimTopicsRegistryAddress || !identityRegistryStorageAddress) {
              initializationTransactions.push({ component, action, status: 'failed', reason: 'Missing dependencies' });
              continue;
            }
            
            // Prepare init transaction data
            const identityRegistryAbi = [
              'function init(address _trustedIssuersRegistry, address _claimTopicsRegistry, address _identityStorage)'
            ];
            const iface = new ethers.utils.Interface(identityRegistryAbi);
            const initData = iface.encodeFunctionData('init', [
              trustedIssuersRegistryAddress,
              claimTopicsRegistryAddress,
              identityRegistryStorageAddress
            ]);
            
            initializationTransactions.push({
              component,
              action,
              status: 'ready',
              address: identityRegistryAddress,
              transactionData: {
                to: identityRegistryAddress,
                data: initData,
                from: deployerAddress,
                gas: '0x61A80', // 400,000 gas
                gasPrice: '0x59682F00' // 1.5 gwei
              }
            });
            break;
            
          case 'IdentityRegistryStorage':
            const irsAddress = getLatestAddress('IdentityRegistryStorage');
            if (!irsAddress) {
              initializationTransactions.push({ component, action, status: 'skipped', reason: 'No IdentityRegistryStorage found' });
              continue;
            }
            
            // Prepare init transaction data
            const irsAbi = ['function init()'];
            const irsIface = new ethers.utils.Interface(irsAbi);
            const irsInitData = irsIface.encodeFunctionData('init', []);
            
            initializationTransactions.push({
              component,
              action,
              status: 'ready',
              address: irsAddress,
              transactionData: {
                to: irsAddress,
                data: irsInitData,
                from: deployerAddress,
                gas: '0x61A80', // 400,000 gas
                gasPrice: '0x59682F00' // 1.5 gwei
              }
            });
            break;
            
          case 'ClaimTopicsRegistry':
            const ctrAddress = getLatestAddress('ClaimTopicsRegistry');
            if (!ctrAddress) {
              initializationTransactions.push({ component, action, status: 'skipped', reason: 'No ClaimTopicsRegistry found' });
              continue;
            }
            
            // Prepare init transaction data
            const ctrAbi = ['function init()'];
            const ctrIface = new ethers.utils.Interface(ctrAbi);
            const ctrInitData = ctrIface.encodeFunctionData('init', []);
            
            initializationTransactions.push({
              component,
              action,
              status: 'ready',
              address: ctrAddress,
              transactionData: {
                to: ctrAddress,
                data: ctrInitData,
                from: deployerAddress,
                gas: '0x61A80', // 400,000 gas
                gasPrice: '0x59682F00' // 1.5 gwei
              }
            });
            break;
            
          case 'TrustedIssuersRegistry':
            const tirAddress = getLatestAddress('TrustedIssuersRegistry');
            if (!tirAddress) {
              initializationTransactions.push({ component, action, status: 'skipped', reason: 'No TrustedIssuersRegistry found' });
              continue;
            }
            
            // Prepare init transaction data
            const tirAbi = ['function init()'];
            const tirIface = new ethers.utils.Interface(tirAbi);
            const tirInitData = tirIface.encodeFunctionData('init', []);
            
            initializationTransactions.push({
              component,
              action,
              status: 'ready',
              address: tirAddress,
              transactionData: {
                to: tirAddress,
                data: tirInitData,
                from: deployerAddress,
                gas: '0xA1880', // 650,000 gas
                gasPrice: '0x59682F00' // 1.5 gwei  
              }
            });
            break;
            
          default:
            initializationTransactions.push({ component, action, status: 'failed', reason: 'Unknown component' });
        }
      } catch (error) {
        console.error(`Error preparing initialization for ${component}:`, error.message);
        initializationTransactions.push({ component, action, status: 'failed', reason: error.message });
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Initialization transactions prepared',
      initializationTransactions 
    });
    
  } catch (error) {
    console.error('Error initializing components:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-memory storage for tracking agents (in production, use a database)
const agentRegistry = new Map();

// --- Identity Registry Agent Management API ---
app.get('/api/identity-registry/agents', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'Identity Registry address is required' });
    }
    
    const normalizedAddress = normalizeAddress(address);
    
    // Get agents from blockchain by scanning events (production approach)
    try {
      const provider = createProvider();
      
      // ABI for event scanning
      const agentAbi = [
        'event AgentAdded(address indexed _agent)',
        'event AgentRemoved(address indexed _agent)',
        'function isAgent(address) view returns (bool)'
      ];
      
      const ir = new ethers.Contract(normalizedAddress, agentAbi, provider);
      
      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      
      // Try to find the contract deployment block from deployments.json
      let fromBlock = 0;
      try {
        const deploymentsPath = path.join(__dirname, '../deployments.json');
        if (fs.existsSync(deploymentsPath)) {
          const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
          const registryDeployment = deployments.find(d => 
            d.address.toLowerCase() === normalizedAddress.toLowerCase() && 
            d.component.includes('IdentityRegistry')
          );
          if (registryDeployment && registryDeployment.blockNumber) {
            fromBlock = registryDeployment.blockNumber;
            console.log(`📋 Found deployment block: ${fromBlock}`);
          }
        }
      } catch (deploymentError) {
        console.log('Could not find deployment block, scanning from block 0');
      }
      
      // If we couldn't find deployment block, scan from a reasonable starting point
      if (fromBlock === 0) {
        fromBlock = Math.max(0, currentBlock - 10000);
        console.log(`⚠️  Using fallback: scanning last 10,000 blocks`);
      }
      
      console.log(`🔍 Scanning for agent events from block ${fromBlock} to ${currentBlock}`);
      
      // Get all AgentAdded events
      const agentAddedEvents = await ir.queryFilter(ir.filters.AgentAdded(), fromBlock, currentBlock);
      console.log(`📝 Found ${agentAddedEvents.length} AgentAdded events`);
      
      // Get all AgentRemoved events  
      const agentRemovedEvents = await ir.queryFilter(ir.filters.AgentRemoved(), fromBlock, currentBlock);
      console.log(`📝 Found ${agentRemovedEvents.length} AgentRemoved events`);
      
      // Reconstruct agent list
      const agentSet = new Set();
      
      // Add all agents from AgentAdded events
      for (const event of agentAddedEvents) {
        agentSet.add(event.args._agent.toLowerCase());
      }
      
      // Remove agents from AgentRemoved events
      for (const event of agentRemovedEvents) {
        agentSet.delete(event.args._agent.toLowerCase());
      }
      
      const agents = Array.from(agentSet);
      console.log(`✅ Found ${agents.length} current agents on-chain:`, agents);
      
      // Update our local tracking
      agentRegistry.set(normalizedAddress, agents);
      
      res.json({ success: true, agents });
      return;
      
    } catch (blockchainError) {
      console.error('❌ Error scanning blockchain for agents:', blockchainError.message);
      
      // Fallback to local tracking if blockchain scanning fails
      let agents = agentRegistry.get(normalizedAddress) || [];
      
      // Also try checking common addresses as fallback
      try {
        const provider = createProvider();
        const agentAbi = ['function isAgent(address) view returns (bool)'];
        const ir = new ethers.Contract(normalizedAddress, agentAbi, provider);
        
        const commonAddresses = [
          '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account #0
          '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1
          '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account #2
          '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Account #3
          '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Account #4
          '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', // Account #5
        ];
        
        for (const addr of commonAddresses) {
          try {
            const isAgent = await ir.isAgent(addr);
            if (isAgent && !agents.includes(addr)) {
              agents.push(addr);
            }
          } catch (checkError) {
            console.log(`Error checking if ${addr} is agent:`, checkError.message);
          }
        }
      } catch (fallbackError) {
        console.log('Fallback agent checking also failed:', fallbackError.message);
      }
      
      res.json({ success: true, agents, warning: 'Using fallback method - blockchain scanning failed' });
      return;
    }
    
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/identity-registry/agents', async (req, res) => {
  try {
    const { registryAddress, agentAddress } = req.body;
    if (!registryAddress || !agentAddress) {
      return res.status(400).json({ error: 'Registry address and agent address are required' });
    }
    
    const provider = createProvider();
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const normalizedAgentAddress = normalizeAddress(agentAddress);
    
    // Minimal ABI for agent management
    const agentAbi = [
      'function addAgent(address)',
      'function isAgent(address) view returns (bool)',
      'function owner() view returns (address)'
    ];
    const ir = new ethers.Contract(normalizedRegistryAddress, agentAbi, provider);
    
    // Check if already agent
    const alreadyAgent = await ir.isAgent(normalizedAgentAddress);
    if (alreadyAgent) {
      // Add to our local tracking if not already there
      if (!agentRegistry.has(normalizedRegistryAddress)) {
        agentRegistry.set(normalizedRegistryAddress, []);
      }
      if (!agentRegistry.get(normalizedRegistryAddress).includes(normalizedAgentAddress)) {
        agentRegistry.get(normalizedRegistryAddress).push(normalizedAgentAddress);
      }
      
      // Return success with updated agents list
      const currentAgents = agentRegistry.get(normalizedRegistryAddress);
      return res.json({ 
        success: true, 
        message: 'Address is already an agent',
        agents: currentAgents,
        alreadyAgent: true
      });
    }
    
    // Create transaction data for frontend to sign
    const addAgentInterface = new ethers.utils.Interface(agentAbi);
    const transactionData = addAgentInterface.encodeFunctionData('addAgent', [normalizedAgentAddress]);
    
    // Get contract owner to determine who should sign
    const contractOwner = await ir.owner();
    
    res.json({ 
      success: true, 
      message: 'Please sign this transaction to add the agent',
      transactionData: transactionData,
      to: normalizedRegistryAddress,
      from: contractOwner,
      agentAddress: normalizedAgentAddress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/identity-registry/check-agent', async (req, res) => {
  try {
    const { registryAddress, agentAddress } = req.query;
    if (!registryAddress || !agentAddress) {
      return res.status(400).json({ error: 'Registry address and agent address are required' });
    }
    const provider = createProvider();
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const normalizedAgentAddress = normalizeAddress(agentAddress);
    // Minimal ABI for agent management
    const agentAbi = [
      'function isAgent(address) view returns (bool)'
    ];
    const ir = new ethers.Contract(normalizedRegistryAddress, agentAbi, provider);
    const isAgent = await ir.isAgent(normalizedAgentAddress);
    res.json({ success: true, isAgent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/identity-registry/agents', async (req, res) => {
  try {
    const { registryAddress, agentAddress, deployerAddress } = req.body;
    if (!registryAddress || !agentAddress || !deployerAddress) {
      return res.status(400).json({ error: 'Registry address, agent address, and deployer address are required' });
    }
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const normalizedAgentAddress = normalizeAddress(agentAddress);
    // Minimal ABI for agent management
    const agentAbi = [
      'function removeAgent(address)',
      'function isAgent(address) view returns (bool)'
    ];
    const ir = new ethers.Contract(normalizedRegistryAddress, agentAbi, wallet);
    // Check if already not agent
    const alreadyAgent = await ir.isAgent(normalizedAgentAddress);
    if (!alreadyAgent) {
      return res.status(400).json({ error: 'Address is not an agent' });
    }
    const tx = await ir.removeAgent(normalizedAgentAddress);
    await tx.wait();
    
    // Remove the agent from our registry
    if (agentRegistry.has(normalizedRegistryAddress)) {
      const agents = agentRegistry.get(normalizedRegistryAddress);
      const index = agents.indexOf(normalizedAgentAddress);
      if (index > -1) {
        agents.splice(index, 1);
      }
    }
    
    res.json({ success: true, message: 'Agent removed', txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notify backend that an agent was successfully added via MetaMask
app.post('/api/identity-registry/agents/notify-added', async (req, res) => {
  try {
    const { registryAddress, agentAddress } = req.body;
    if (!registryAddress || !agentAddress) {
      return res.status(400).json({ error: 'Registry address and agent address are required' });
    }
    
    const normalizedRegistryAddress = normalizeAddress(registryAddress);
    const normalizedAgentAddress = normalizeAddress(agentAddress);
    
    // Verify the agent was actually added on-chain
    const provider = createProvider();
    const agentAbi = ['function isAgent(address) view returns (bool)'];
    const ir = new ethers.Contract(normalizedRegistryAddress, agentAbi, provider);
    
    const isAgent = await ir.isAgent(normalizedAgentAddress);
    if (!isAgent) {
      return res.status(400).json({ error: 'Address is not an agent on-chain' });
    }
    
    // Add to our local tracking
    if (!agentRegistry.has(normalizedRegistryAddress)) {
      agentRegistry.set(normalizedRegistryAddress, []);
    }
    if (!agentRegistry.get(normalizedRegistryAddress).includes(normalizedAgentAddress)) {
      agentRegistry.get(normalizedRegistryAddress).push(normalizedAgentAddress);
    }
    
    console.log(`✅ Agent ${normalizedAgentAddress} added to local tracking for registry ${normalizedRegistryAddress}`);
    res.json({ success: true, message: 'Agent added to local tracking' });
  } catch (error) {
    console.error('Error notifying agent addition:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notify backend that a user was successfully registered via MetaMask
app.post('/api/users/notify-registered', async (req, res) => {
  try {
    const { userAddress, identityRegistryAddress } = req.body;
    if (!userAddress || !identityRegistryAddress) {
      return res.status(400).json({ error: 'User address and identity registry address are required' });
    }
    
    const normalizedRegistryAddress = normalizeAddress(identityRegistryAddress);
    const normalizedUserAddress = normalizeAddress(userAddress);
    
    // Verify the user was actually registered on-chain
    const provider = createProvider();
    const identityRegistryAbi = [
      'function contains(address _userAddress) view returns (bool)',
      'function identity(address _userAddress) view returns (address)',
      'function getInvestorCountry(address _userAddress) view returns (uint16)',
      'function isVerified(address _userAddress) view returns (bool)'
    ];
    const ir = new ethers.Contract(normalizedRegistryAddress, identityRegistryAbi, provider);
    
    const isRegistered = await ir.contains(normalizedUserAddress);
    if (!isRegistered) {
      return res.status(400).json({ error: 'User is not registered on-chain' });
    }
    
    console.log(`✅ User ${normalizedUserAddress} registered on-chain in registry ${normalizedRegistryAddress}`);
    res.json({ success: true, message: 'User registration confirmed' });
  } catch (error) {
    console.error('Error notifying user registration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add or update a deployment entry
app.post('/api/deployments', async (req, res) => {
  try {
    const { component, address, deployer, network } = req.body;
    if (!component || !address || !deployer || !network) {
      return res.status(400).json({ error: 'component, address, deployer, and network are required' });
    }
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    // Remove any previous entry for this component/address
    deployments = deployments.filter(d => !(d.component === component && d.address === address));
    // Add new entry
    deployments.push({
      deploymentId: `${component.toLowerCase()}_${Date.now()}`,
      component,
      address,
      deployer,
      timestamp: new Date().toISOString(),
      network
    });
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    res.json({ success: true, message: 'Deployment saved', deployments });
  } catch (error) {
    console.error('Error saving deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-REX API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
});

// Create main wallet OnchainID (for management purposes)
app.post('/api/main-wallet/onchainid', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const normalizedWalletAddress = normalizeAddress(walletAddress);
    
    // Check if main wallet OnchainID already exists
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    // Check if main wallet OnchainID already exists
    const existingMainOnchainId = deployments.find(d => 
      d.component === 'MainWalletOnchainID' && d.walletAddress === normalizedWalletAddress
    );
    
    if (existingMainOnchainId) {
      return res.json({ 
        success: true, 
        message: 'Main wallet OnchainID already exists',
        onchainIdAddress: existingMainOnchainId.address,
        alreadyExists: true
      });
    }
    
    // Create transaction data for deploying main wallet OnchainID
    // Use the exact same pattern as the working "Deploy Components" phase
    const OnchainID = require('@onchain-id/solidity');
    
    // Get contract bytecode and ABI
    const contractAbi = OnchainID.contracts.Identity.abi;
    const contractBytecode = OnchainID.contracts.Identity.bytecode;
    const constructorArgs = [normalizedWalletAddress, true]; // Use 'true' like the working version
    
    // Encode the constructor data using the same pattern as working deployment
    const iface = new ethers.utils.Interface(contractAbi);
    const deploymentData = {
      data: contractBytecode + (constructorArgs.length > 0 ? iface.encodeDeploy(constructorArgs).slice(2) : '')
    };
    
    // Prepare transaction data using the same structure as working deployment
    const transactionData = {
      to: null, // Contract creation
      data: deploymentData.data,
      from: normalizedWalletAddress,
      gas: '0x3D0900', // 4,000,000 gas (same as working OnchainID deployment)
      gasPrice: '0x59682F00' // 1.5 gwei (same as working deployment)
    };
    
    console.log(`🔧 Creating main wallet OnchainID for ${normalizedWalletAddress}`);
    console.log(`📋 Main wallet OnchainID deployment data:`, deploymentData.data);
    console.log(`📋 Constructor parameters:`, constructorArgs);
    
    res.json({ 
      success: true, 
      message: 'Please deploy main wallet OnchainID contract',
      onchainIdDeployment: {
        transactionData: transactionData.data,
        from: normalizedWalletAddress,
        gas: transactionData.gas,
        gasPrice: transactionData.gasPrice
      },
      walletAddress: normalizedWalletAddress
    });
    
  } catch (error) {
    console.error('Error preparing main wallet OnchainID deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notify backend that main wallet OnchainID was successfully deployed
app.post('/api/main-wallet/onchainid/notify-deployed', async (req, res) => {
  try {
    const { walletAddress, onchainIdAddress } = req.body;
    
    if (!walletAddress || !onchainIdAddress) {
      return res.status(400).json({ error: 'Wallet address and OnchainID address are required' });
    }
    
    const normalizedWalletAddress = normalizeAddress(walletAddress);
    const normalizedOnchainIdAddress = normalizeAddress(onchainIdAddress);
    
    // Save the main wallet OnchainID deployment to deployments.json
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    
    // Add the main wallet OnchainID deployment record
    const deploymentId = `main_wallet_onchainid_${Date.now()}`;
    deployments.push({
      deploymentId,
      component: 'MainWalletOnchainID',
      address: normalizedOnchainIdAddress,
      walletAddress: normalizedWalletAddress,
      deployer: normalizedWalletAddress,
      timestamp: new Date().toISOString(),
      network: 'localhost'
    });
    
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log('📝 Main wallet OnchainID deployment saved to deployments.json');
    
    res.json({ 
      success: true, 
      message: 'Main wallet OnchainID deployment confirmed',
      onchainIdAddress: normalizedOnchainIdAddress
    });
  } catch (error) {
    console.error('Error notifying main wallet OnchainID deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get main wallet OnchainID
app.get('/api/main-wallet/onchainid', async (req, res) => {
  try {
    const { walletAddress } = req.query;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const normalizedWalletAddress = normalizeAddress(walletAddress);
    
    // Check if main wallet OnchainID exists
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      
      const mainOnchainId = deployments.find(d => 
        d.component === 'MainWalletOnchainID' && d.walletAddress === normalizedWalletAddress
      );
      
      if (mainOnchainId) {
        res.json({ 
          success: true, 
          exists: true,
          onchainIdAddress: mainOnchainId.address
        });
      } else {
        res.json({ 
          success: true, 
          exists: false
        });
      }
    } else {
      res.json({ 
        success: true, 
        exists: false
      });
    }
  } catch (error) {
    console.error('Error checking main wallet OnchainID:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app; 