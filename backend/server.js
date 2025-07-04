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

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'T-REX API Server is running' });
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

// Deploy individual component
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
      'ModularCompliance': 'deploy_modular_compliance.js'
    };
    
    const scriptName = scriptMap[component];
    if (!scriptName) {
      throw new Error(`Unknown component: ${component}`);
    }
    
    // Run the specific component deployment script
    const { stdout, stderr } = await execAsync(`npx hardhat run scripts/${scriptName} --network localhost`, {
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
    
    // Map to standard Tokeny claim topics
    const standardTopics = {
      1: { name: "KYC (Know Your Customer)", description: "Most commonly required claim for identity verification" },
      2: { name: "AML (Anti-Money Laundering)", description: "Often combined with KYC for compliance" },
      3: { name: "Accredited Investor", description: "For investor qualification and Reg D exemptions" },
      4: { name: "EU Nationality Confirmed", description: "For local regulatory segmentation in EU" },
      5: { name: "US Nationality Confirmed", description: "Useful for Reg D exemptions in US" },
      6: { name: "Blacklist", description: "Used for compliance to restrict certain actors" }
    };
    
    const claimTopics = topicIds.map(id => ({
      id: id.toNumber(),
      name: standardTopics[id.toNumber()]?.name || `Custom Topic ${id.toNumber()}`,
      description: standardTopics[id.toNumber()]?.description || "User-defined claim topic"
    }));
    
    res.json(claimTopics);
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
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    const claimTopicsRegistryAbi = [
      'function getClaimTopics() view returns (uint256[])',
      'function addClaimTopic(uint256 _claimTopic)',
      'function removeClaimTopic(uint256 _claimTopic)',
      'function owner() view returns (address)'
    ];
    
    const claimTopicsRegistry = new ethers.Contract(registryAddress, claimTopicsRegistryAbi, wallet);
    
    // Check ownership first
    const contractOwner = await claimTopicsRegistry.owner();
    console.log('Contract owner:', contractOwner);
    console.log('Wallet address:', wallet.address);
    
    if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.log('⚠️ Ownership mismatch - contract owner:', contractOwner, 'wallet address:', wallet.address);
      // Continue anyway since we've initialized the contracts
    }
    
    const topicId = Number(topic);
    
    // Check if topic already exists
    const existingTopics = await claimTopicsRegistry.getClaimTopics();
    if (existingTopics.some(t => t.toNumber() === topicId)) {
      return res.status(400).json({ error: 'Claim topic already exists' });
    }
    
    // Add topic to contract
    const tx = await claimTopicsRegistry.addClaimTopic(topicId);
    await tx.wait();
    
    // Map to standard Tokeny claim topics
    const standardTopics = {
      1: { name: "KYC (Know Your Customer)", description: "Most commonly required claim for identity verification" },
      2: { name: "AML (Anti-Money Laundering)", description: "Often combined with KYC for compliance" },
      3: { name: "Accredited Investor", description: "For investor qualification and Reg D exemptions" },
      4: { name: "EU Nationality Confirmed", description: "For local regulatory segmentation in EU" },
      5: { name: "US Nationality Confirmed", description: "Useful for Reg D exemptions in US" },
      6: { name: "Blacklist", description: "Used for compliance to restrict certain actors" }
    };
    
    const newTopic = {
      id: topicId,
      name: standardTopics[topicId]?.name || `Custom Topic ${topic}`,
      description: standardTopics[topicId]?.description || "User-defined claim topic"
    };
    
    res.json({ success: true, topic: newTopic });
  } catch (error) {
    console.error('Error adding claim topic:', error);
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
    
    const claimTopicsRegistry = new ethers.Contract(registryAddress, claimTopicsRegistryAbi, wallet);
    
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
      trustedIssuers.push({
        address: address,
        name: `Issuer ${address.slice(0, 6)}...${address.slice(-4)}`,
        topics: topics.map(t => t.toNumber()),
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
    
    if (!registryAddress || !deployerAddress) {
      return res.status(400).json({ error: 'Registry address and deployer address are required' });
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
    
    const trustedIssuersRegistry = new ethers.Contract(registryAddress, trustedIssuersRegistryAbi, wallet);
    
    // Check ownership first
    const contractOwner = await trustedIssuersRegistry.owner();
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
    
    // Validate and normalize the address
    let normalizedAddress = address;
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }
    normalizedAddress = ethers.utils.getAddress(address); // Normalize to checksum address
    
    // Add issuer to contract
    const tx = await trustedIssuersRegistry.addTrustedIssuer(normalizedAddress, topics);
    await tx.wait();
    
    const newIssuer = {
      address: normalizedAddress,
      name: `Issuer ${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
      topics: topics,
      description: "User-defined trusted issuer"
    };
    
    res.json({ success: true, issuer: newIssuer });
  } catch (error) {
    console.error('Error adding trusted issuer:', error);
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
    
    const trustedIssuersRegistry = new ethers.Contract(registryAddress, trustedIssuersRegistryAbi, wallet);
    
    // Check ownership first
    const contractOwner = await trustedIssuersRegistry.owner();
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
    
    // Remove issuer from contract
    const tx = await trustedIssuersRegistry.removeTrustedIssuer(address);
    await tx.wait();
    
    res.json({ success: true, removed: address });
  } catch (error) {
    console.error('Error removing trusted issuer:', error);
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

module.exports = app; 