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
app.use('/api/deployment', deploymentRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 T-REX Backend Server running on port ${PORT}`);
});

module.exports = app; 