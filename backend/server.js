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