const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const { RPC_URL } = require('../config.json');

const { createProvider, getContractArtifacts, runDeploymentScript, getLatestDeployment } = require('./utils/helpers');

const execAsync = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Mount modular routers
const deploymentRoutes = require('./routes/deployment');
app.use('/api/deploy', deploymentRoutes);

const identityRoutes = require('./routes/identity');
app.use('/api/identity', identityRoutes);

const tokenRoutes = require('./routes/token');
app.use('/api/token', tokenRoutes);

const claimsRoutes = require('./routes/claims');
app.use('/api/claims', claimsRoutes);

const agentsRoutes = require('./routes/agents');
app.use('/api/agents', agentsRoutes);

const claimIssuersRoutes = require('./routes/claimIssuers');
app.use('/api/claim-issuers', claimIssuersRoutes);

const diagnosticsRoutes = require('./routes/diagnostics');
app.use('/api/diagnostics', diagnosticsRoutes);

const factoriesRoutes = require('./routes/factories');
app.use('/api/factories', factoriesRoutes);

const contractsRoutes = require('./routes/contracts');
app.use('/api/contracts', contractsRoutes);

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
      console.log(`🔍 Processing factory ${factoryDeployment.factory.address} with ${tokens.length} tokens`);
      
      for (const token of tokens) {
        try {
          const irAddress = token.suite?.identityRegistry;
          console.log(`🔍 Token ${token.token.name} (${token.token.address}) - IR: ${irAddress}`);
          if (!irAddress) {
            console.log(`❌ No Identity Registry found for token ${token.token.name}`);
            continue;
          }
          
          // Get the Identity Registry contract
          const irArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/react-app/src/contracts/IdentityRegistry.json');
          console.log(`🔍 Loading IR artifacts from: ${irArtifactsPath}`);
          if (!fs.existsSync(irArtifactsPath)) {
            throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
          }
          const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
          console.log(`✅ IR artifacts loaded successfully`);
          const ir = new ethers.Contract(irAddress, irArtifacts.abi, wallet);
          console.log(`✅ IR contract instance created for ${irAddress}`);
          
          // Get the TrustedIssuersRegistry for this IR
          console.log(`🔍 Getting TrustedIssuersRegistry address from IR...`);
          const tirAddress = await ir.issuersRegistry();
          console.log(`✅ TrustedIssuersRegistry address: ${tirAddress}`);
          const tirArtifactsPath = path.join(__dirname, '../trex-scaffold/packages/react-app/src/contracts/TrustedIssuersRegistry.json');
          console.log(`🔍 Loading TIR artifacts from: ${tirArtifactsPath}`);
          if (!fs.existsSync(tirArtifactsPath)) {
            throw new Error('TrustedIssuersRegistry artifacts not found. Please compile contracts first.');
          }
          const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
          console.log(`✅ TIR artifacts loaded successfully`);
          const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
          console.log(`✅ TIR contract instance created for ${tirAddress}`);
          
          // Get trusted issuers for this IR
          console.log(`🔍 Getting trusted issuers from TIR...`);
          const issuers = await tir.getTrustedIssuers();
          console.log(`✅ Found ${issuers.length} trusted issuers`);
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

// Clear all deployment data
app.delete('/api/addresses', (req, res) => {
  try {
    console.log('🧹 Clearing all deployment data...');
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    
    // Clear the deployments.json file by writing an empty array
    fs.writeFileSync(deploymentsPath, JSON.stringify([], null, 2));
    console.log('✅ Deployments file cleared (reset to empty array)');
    
    // Also clear any temporary files
    const tempFiles = [
      path.join(__dirname, 'temp_token_config.json'),
      path.join(__dirname, 'temp_claim_details.json')
    ];
    
    tempFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Temporary file deleted: ${path.basename(filePath)}`);
      }
    });
    
    res.json({ 
      success: true, 
      message: 'All deployment data cleared successfully' 
    });
  } catch (error) {
    console.error('❌ Error clearing deployment data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add deployments routes directly
app.get('/api/deployments/test', (req, res) => {
  console.log('🧪 Deployments test route called');
  res.json({ message: 'Deployments route is working' });
});

app.get('/api/deployments/:deploymentId', (req, res) => {
  console.log('🔍 Deployment details requested for:', req.params.deploymentId);
  try {
    const { deploymentId } = req.params;
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    console.log('📁 Looking for deployments at:', deploymentsPath);
    if (!fs.existsSync(deploymentsPath)) {
      console.log('❌ Deployments file not found');
      return res.status(404).json({ error: 'No deployments found' });
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    console.log('📋 Found', deployments.length, 'deployments');
    const deployment = deployments.find(d => d.deploymentId === deploymentId);
    if (!deployment) {
      console.log('❌ Deployment not found:', deploymentId);
      return res.status(404).json({ error: 'Deployment not found' });
    }
    console.log('✅ Found deployment:', deploymentId);
    if (deployment.factory && deployment.tokens && deployment.tokens.length > 0) {
      const latestToken = deployment.tokens[deployment.tokens.length - 1];
      if (latestToken.suite) {
        deployment.suite = latestToken.suite;
      }
      deployment.latestToken = latestToken;
    }
    res.json(deployment);
  } catch (error) {
    console.log('❌ Error in deployment route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-REX Backend Server running on port ${PORT}`);
});

module.exports = app; 