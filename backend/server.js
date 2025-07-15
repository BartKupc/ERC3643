const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-REX Backend Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network test: http://localhost:${PORT}/api/test-network`);
});

module.exports = app; 