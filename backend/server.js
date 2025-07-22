const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const { RPC_URL } = require('../config.json');

const execAsync = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Helper function to create provider
const createProvider = () => {
  return new ethers.providers.JsonRpcProvider(RPC_URL);
};

// Helper function to get contract artifacts (matching frontend approach)
const getContractArtifacts = (contractName) => {
  console.log(`🔍 Getting artifacts for contract: ${contractName}`);
  
  // Define the artifact paths based on the frontend structure
  const artifactPaths = {
    // T-REX Contracts
    'TREXFactory': '../trex-scaffold/packages/react-app/src/contracts/TREXFactory.json',
    'Token': '../trex-scaffold/packages/react-app/src/contracts/Token.json',
    'ModularCompliance': '../trex-scaffold/packages/react-app/src/contracts/ModularCompliance.json',
    'IdentityRegistry': '../trex-scaffold/packages/react-app/src/contracts/IdentityRegistry.json',
    'IdentityRegistryStorage': '../trex-scaffold/packages/react-app/src/contracts/IdentityRegistryStorage.json',
    'ClaimTopicsRegistry': '../trex-scaffold/packages/react-app/src/contracts/ClaimTopicsRegistry.json',
    'TrustedIssuersRegistry': '../trex-scaffold/packages/react-app/src/contracts/TrustedIssuersRegistry.json',
    'IAFactory': '../trex-scaffold/packages/react-app/src/contracts/IAFactory.json',
    'TokenProxy': '../trex-scaffold/packages/react-app/src/contracts/TokenProxy.json',
    'ModularComplianceProxy': '../trex-scaffold/packages/react-app/src/contracts/ModularComplianceProxy.json',
    'TREXImplementationAuthority': '../trex-scaffold/packages/react-app/src/contracts/TREXImplementationAuthority.json',
    
    // OnchainID Contracts
    'Identity': '../trex-scaffold/packages/react-app/src/contracts/Identity.json',
    'IImplementationAuthority': '../trex-scaffold/packages/react-app/src/contracts/IImplementationAuthority.json',
    'IIdFactory': '../trex-scaffold/packages/react-app/src/contracts/IIdFactory.json',
    'ClaimIssuer': '../trex-scaffold/packages/react-app/src/contracts/ClaimIssuer.json'
  };
  
  const artifactPath = artifactPaths[contractName];
  if (!artifactPath) {
    console.log(`❌ Contract ${contractName} not found in artifact paths`);
    console.log(`📋 Available contracts: ${Object.keys(artifactPaths).join(', ')}`);
    throw new Error(`Contract artifacts not found for: ${contractName}. Available contracts: ${Object.keys(artifactPaths).join(', ')}`);
  }
  
  const fullPath = path.join(__dirname, artifactPath);
  console.log(`🔍 Looking for artifact at: ${fullPath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Artifact file not found at: ${fullPath}`);
    throw new Error(`Contract artifact file not found: ${fullPath}. Please ensure contracts are compiled and copied to the frontend contracts directory.`);
  }
  
  try {
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`✅ Successfully loaded artifacts for ${contractName}`);
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      contractName: artifact.contractName
    };
  } catch (error) {
    console.log(`❌ Error reading artifact file: ${error.message}`);
    throw new Error(`Error reading contract artifact for ${contractName}: ${error.message}`);
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

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