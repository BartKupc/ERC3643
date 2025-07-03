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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// In-memory storage for deployed addresses (in production, use a database)
let deployedAddresses = {};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'T-REX API Server is running' });
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
      const factories = deployments.map(d => ({
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
    res.json({ success: true, message: 'Addresses and deployments cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear deployments: ' + error.message });
  }
});

// Get token information
app.get('/api/token/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    
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
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
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