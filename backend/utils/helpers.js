const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { RPC_URL } = require('../../config.json');
const exec = require('child_process').exec;
const execAsync = util.promisify(exec);

// Helper function to create provider
const createProvider = () => {
  return new ethers.providers.JsonRpcProvider(RPC_URL);
};

// Helper function to get contract artifacts (matching frontend approach)
const getContractArtifacts = (contractName) => {
  // ... (same as in server.js)
  const artifactPaths = {
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
    'Identity': '../trex-scaffold/packages/react-app/src/contracts/Identity.json',
    'IImplementationAuthority': '../trex-scaffold/packages/react-app/src/contracts/IImplementationAuthority.json',
    'IIdFactory': '../trex-scaffold/packages/react-app/src/contracts/IIdFactory.json',
    'ClaimIssuer': '../trex-scaffold/packages/react-app/src/contracts/ClaimIssuer.json'
  };
  const artifactPath = artifactPaths[contractName];
  if (!artifactPath) {
    throw new Error(`Contract artifacts not found for: ${contractName}. Available contracts: ${Object.keys(artifactPaths).join(', ')}`);
  }
  const fullPath = path.join(__dirname, artifactPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Contract artifact file not found: ${fullPath}. Please ensure contracts are compiled and copied to the frontend contracts directory.`);
  }
  try {
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      contractName: artifact.contractName
    };
  } catch (error) {
    throw new Error(`Error reading contract artifact for ${contractName}: ${error.message}`);
  }
};

// Helper to run deployment scripts using Hardhat
async function runDeploymentScript(scriptName, options = {}) {
  const scriptPath = path.join(__dirname, '../../scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Deployment script not found: ${scriptPath}`);
  }
  const env = { ...process.env, ...options };
  const { stdout, stderr } = await execAsync(`npx hardhat run ${scriptPath} --network localhost`, {
    env,
    cwd: path.join(__dirname, '../../')
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

module.exports = {
  createProvider,
  getContractArtifacts,
  runDeploymentScript,
  getLatestDeployment
}; 