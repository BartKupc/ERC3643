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
    'TREXFactory': '../../trex-scaffold/packages/react-app/src/contracts/TREXFactory.json',
    'Token': '../../trex-scaffold/packages/react-app/src/contracts/Token.json',
    'ModularCompliance': '../../trex-scaffold/packages/react-app/src/contracts/ModularCompliance.json',
    'IdentityRegistry': '../../trex-scaffold/packages/react-app/src/contracts/IdentityRegistry.json',
    'IdentityRegistryStorage': '../../trex-scaffold/packages/react-app/src/contracts/IdentityRegistryStorage.json',
    'ClaimTopicsRegistry': '../../trex-scaffold/packages/react-app/src/contracts/ClaimTopicsRegistry.json',
    'TrustedIssuersRegistry': '../../trex-scaffold/packages/react-app/src/contracts/TrustedIssuersRegistry.json',
    'IAFactory': '../../trex-scaffold/packages/react-app/src/contracts/IAFactory.json',
    'TokenProxy': '../../trex-scaffold/packages/react-app/src/contracts/TokenProxy.json',
    'ModularComplianceProxy': '../../trex-scaffold/packages/react-app/src/contracts/ModularComplianceProxy.json',
    'TREXImplementationAuthority': '../../trex-scaffold/packages/react-app/src/contracts/TREXImplementationAuthority.json',
    'Identity': '../../trex-scaffold/packages/react-app/src/contracts/Identity.json',
    'IImplementationAuthority': '../../trex-scaffold/packages/react-app/src/contracts/IImplementationAuthority.json',
    'IIdFactory': '../../trex-scaffold/packages/react-app/src/contracts/IIdFactory.json',
    'ClaimIssuer': '../../trex-scaffold/packages/react-app/src/contracts/ClaimIssuer.json'
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
  console.log(`🔧 Running script: ${scriptPath}`);
  console.log(`📁 Working directory: ${path.join(__dirname, '../../')}`);
  
  // Ensure we're using the correct environment and working directory
  const env = { 
    ...process.env, 
    ...options,
    NODE_ENV: 'development'
  };
  
  try {
    // Use absolute path for hardhat config to ensure it's found
    const hardhatConfigPath = path.join(__dirname, '../../hardhat.config.ts');
    console.log(`🔧 Hardhat config path: ${hardhatConfigPath}`);
    
    const { stdout, stderr } = await execAsync(`npx hardhat run ${scriptPath} --network localhost --config ${hardhatConfigPath}`, {
      env,
      cwd: path.join(__dirname, '../../'),
      timeout: 10 * 60 * 1000 // 10 minute timeout
    });
    
    if (stderr) {
      console.error('Script stderr:', stderr);
    }
    
    console.log(`✅ Script completed successfully`);
    return stdout;
  } catch (error) {
    console.error(`❌ Script execution failed:`, error.message);
    if (error.stdout) console.log('Script stdout:', error.stdout);
    if (error.stderr) console.log('Script stderr:', error.stderr);
    throw error;
  }
}

// Helper to get latest deployment
function getLatestDeployment() {
  const deploymentsPath = path.join(__dirname, '../../deployments.json');
  if (!fs.existsSync(deploymentsPath)) {
    return null;
  }
  const deploymentsData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  
  // Handle new structure with easydeploy and advanced sections
  let deployments = [];
  if (deploymentsData.easydeploy) {
    deployments = deployments.concat(deploymentsData.easydeploy);
  }
  if (deploymentsData.advanced) {
    deployments = deployments.concat(deploymentsData.advanced);
  }
  
  return deployments.length > 0 ? deployments[deployments.length - 1] : null;
}

module.exports = {
  createProvider,
  getContractArtifacts,
  runDeploymentScript,
  getLatestDeployment
}; 