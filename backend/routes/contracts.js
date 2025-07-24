const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

// Import helpers
const { createProvider, runDeploymentScript, getLatestDeployment } = require('../utils/helpers');

// General contract interaction endpoint (replaces hardhat-interaction)
router.post('/interaction', async (req, res) => {
  try {
    const { action, contractName, contractAddress, method, params, ...options } = req.body;
    
    console.log('🔧 Contract interaction request:', { action, contractName, contractAddress, method, params });
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    switch (action) {
      case 'deploy':
        return await handleDeploy(contractName, res, options.tokenDetails);
      
      case 'send':
        return await handleContractCall(contractName, contractAddress, method, params, wallet, res);
      
      case 'call':
      case 'view':
        return await handleContractView(contractName, contractAddress, method, params, wallet, res);
      
      case 'initialize':
        return await handleInitialize(contractName, contractAddress, wallet, res);
      
      case 'rpc':
        return await handleRpcCall(method, params, res);
      
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`
        });
    }
  } catch (error) {
    console.error('❌ Contract interaction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handle contract deployment
async function handleDeploy(contractName, res, tokenDetails = null) {
  try {
    console.log(`🚀 Deploying ${contractName}...`);
    
    // Map contract names to deployment scripts
    const deploymentScripts = {
      'ClaimTopicsRegistry': 'deploy_claim_topics_registry.js',
      'TrustedIssuersRegistry': 'deploy_trusted_issuers_registry.js',
      'IdentityRegistryStorage': 'deploy_identity_registry_storage.js',
      'IdentityRegistry': 'deploy_identity_registry.js',
      'ModularCompliance': 'deploy_modular_compliance.js',
      'Compliance': 'deploy_modular_compliance.js', // Alias for ModularCompliance
      'Token': 'deploy_token_enhanced.js',
      'Factory': 'deploy_factory_enhanced.js'
    };
    
    // Special handling for ClaimIssuer (deployed directly, not via script)
    if (contractName === 'ClaimIssuer') {
      return await handleClaimIssuerDeploy(res);
    }
    
    const scriptName = deploymentScripts[contractName];
    if (!scriptName) {
      throw new Error(`No deployment script found for contract: ${contractName}`);
    }
    
    // Special handling for Token deployment with custom details
    if (contractName === 'Token' && tokenDetails) {
      console.log('🎯 Token deployment with custom details:', tokenDetails);
      
      // Create temporary config file for token details
      const configPath = path.join(__dirname, '../../temp_token_config.json');
      fs.writeFileSync(configPath, JSON.stringify(tokenDetails, null, 2));
      
      // Set environment variables for the deployment script
      const envVars = {
        ...process.env,
        TOKEN_CONFIG_PATH: configPath
      };
      
      // Use the individual token deployment script
      const individualScriptName = 'deploy_token_individual.js';
      const output = await runDeploymentScript(individualScriptName, envVars);
      console.log('✅ Individual token deployment script completed');
      console.log('Output:', output);
      
      // Clean up temporary config file
      try {
        fs.unlinkSync(configPath);
      } catch (e) {
        console.log('Could not remove temp config file:', e.message);
      }
    } else {
      // Run the deployment script normally
      const output = await runDeploymentScript(scriptName);
      console.log('✅ Deployment script completed');
      console.log('Output:', output);
    }
    
    // Add delay to ensure deployments.json is written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get all deployments to find the most recent one for this contract
    const deploymentsPath = path.join(__dirname, '../../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      throw new Error('Deployment failed - no deployment data found');
    }
    
    const raw = fs.readFileSync(deploymentsPath, 'utf8');
    let deploymentsObj = { easydeploy: [], advanced: [] };
    let allDeployments = [];
    
    if (raw.trim().startsWith('{')) {
      deploymentsObj = JSON.parse(raw);
      if (!deploymentsObj.easydeploy) deploymentsObj.easydeploy = [];
      if (!deploymentsObj.advanced) deploymentsObj.advanced = [];
      allDeployments = [...deploymentsObj.easydeploy, ...deploymentsObj.advanced];
    } else {
      allDeployments = JSON.parse(raw);
    }
    
    let contractAddress = null;
    
    // First, check if the latest deployment is a factory deployment with suite
    if (allDeployments.length > 0) {
      const latestDeployment = allDeployments[allDeployments.length - 1];
      if (latestDeployment.suite && latestDeployment.suite[contractName.toLowerCase()]) {
        contractAddress = latestDeployment.suite[contractName.toLowerCase()];
      } else if (contractName === 'Factory' && latestDeployment.factory) {
        contractAddress = latestDeployment.factory.address;
      } else if (contractName === 'Token' && latestDeployment.tokens && latestDeployment.tokens.length > 0) {
        contractAddress = latestDeployment.tokens[latestDeployment.tokens.length - 1].token.address;
      }
    }
    
    // If not found in latest, search for individual component deployments
    if (!contractAddress) {
      const componentDeployments = allDeployments
        .filter(d => d.component === contractName)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      if (componentDeployments.length > 0) {
        contractAddress = componentDeployments[0].address;
      }
    }
    
    if (!contractAddress) {
      console.log(`❌ Could not find deployed address for ${contractName}`);
      console.log('Available deployments:', allDeployments.map(d => ({ 
        type: d.component ? 'component' : (d.factory ? 'factory' : 'other'), 
        component: d.component, 
        hasSuite: !!d.suite,
        timestamp: d.timestamp 
      })));
      throw new Error(`Could not find deployed address for ${contractName}`);
    }
    
    console.log(`📋 ${contractName} deployed at:`, contractAddress);
    
    // After contractAddress is determined and before sending the response:
    // Only save to advanced if this is a single contract deployment (not Factory, Token, or ClaimIssuer)
    if (!['Factory', 'Token', 'ClaimIssuer'].includes(contractName) && contractAddress) {
      let deploymentsObj = loadDeploymentsObj();
      deploymentsObj.advanced.push({ component: contractName, address: contractAddress, timestamp: new Date().toISOString() });
      saveDeploymentsObj(deploymentsObj);
      console.log(`✅ Saved advanced deployment: ${contractName} at ${contractAddress}`);
    }
    
    res.json({
      success: true,
      contractAddress: contractAddress,
      transactionHash: 'deployment_script_completed', // Scripts don't return individual tx hashes
      message: `${contractName} deployed successfully`
    });
  } catch (error) {
    throw error;
  }
}

// Handle contract method calls (transactions)
async function handleContractCall(contractName, contractAddress, method, params, wallet, res) {
  try {
    console.log(`📤 Calling ${method} on ${contractName} at ${contractAddress}`);
    
    // Load contract artifacts
    const artifactsPath = path.join(__dirname, `../../trex-scaffold/packages/react-app/src/contracts/${contractName}.json`);
    if (!fs.existsSync(artifactsPath)) {
      throw new Error(`${contractName} artifacts not found`);
    }
    
    const artifacts = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    const contract = new ethers.Contract(contractAddress, artifacts.abi, wallet);
    
    // Call the method
    const tx = await contract[method](...(params || []));
    const receipt = await tx.wait();
    
    console.log(`✅ ${method} called successfully`);
    console.log('Transaction hash:', receipt.transactionHash);
    
    res.json({
      success: true,
      transactionHash: receipt.transactionHash,
      gasUsed: receipt.gasUsed.toString(),
      message: `${method} called successfully`
    });
  } catch (error) {
    throw error;
  }
}

// Handle contract view calls (read-only)
async function handleContractView(contractName, contractAddress, method, params, wallet, res) {
  try {
    console.log(`📖 Reading ${method} from ${contractName} at ${contractAddress}`);
    
    // Load contract artifacts
    const artifactsPath = path.join(__dirname, `../../trex-scaffold/packages/react-app/src/contracts/${contractName}.json`);
    if (!fs.existsSync(artifactsPath)) {
      throw new Error(`${contractName} artifacts not found`);
    }
    
    const artifacts = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    const contract = new ethers.Contract(contractAddress, artifacts.abi, wallet);
    
    // Call the view method
    const result = await contract[method](...(params || []));
    
    console.log(`✅ ${method} result:`, result);
    
    res.json({
      success: true,
      result: result,
      message: `${method} read successfully`
    });
  } catch (error) {
    throw error;
  }
}

// Handle ClaimIssuer deployment (direct deployment, not via script)
async function handleClaimIssuerDeploy(res) {
  try {
    console.log('🎯 Starting ClaimIssuer deployment...');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    console.log('🔑 Deploying ClaimIssuer with deployer address:', deployerAddress);
    
    const claimIssuerArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/ClaimIssuer.json');
    if (!fs.existsSync(claimIssuerArtifactsPath)) {
      throw new Error('ClaimIssuer artifacts not found. Please compile contracts first.');
    }
    
    const claimIssuerArtifacts = JSON.parse(fs.readFileSync(claimIssuerArtifactsPath, 'utf8'));
    const claimIssuerFactory = new ethers.ContractFactory(
      claimIssuerArtifacts.abi,
      claimIssuerArtifacts.bytecode,
      wallet
    );
    
    const claimIssuer = await claimIssuerFactory.deploy(deployerAddress);
    await claimIssuer.deployed();
    console.log('✅ ClaimIssuer deployed at:', claimIssuer.address);
    
    // Add signing key to ClaimIssuer
    const signingKeyHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['address'], [deployerAddress])
    );
    const addKeyTx = await claimIssuer.addKey(signingKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
    await addKeyTx.wait();
    console.log('✅ Signing key added to ClaimIssuer');
    
    // Try to add to TrustedIssuersRegistry if available
    const latestDeployment = getLatestDeployment();
    if (latestDeployment && latestDeployment.suite && latestDeployment.suite.trustedIssuersRegistry) {
      try {
        const tirAddress = latestDeployment.suite.trustedIssuersRegistry;
        const tirArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/TrustedIssuersRegistry.json');
        if (fs.existsSync(tirArtifactsPath)) {
          const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
          const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
          const claimIssuerAddress = await claimIssuer.getAddress();
          const exists = await tir.isTrustedIssuer(claimIssuerAddress);
          if (!exists) {
            const defaultClaimTopics = [1, 2, 3];
            const addTrustedTx = await tir.addTrustedIssuer(claimIssuerAddress, defaultClaimTopics);
            await addTrustedTx.wait();
            console.log('✅ ClaimIssuer added as trusted issuer with default claim topics [1, 2, 3]');
          } else {
            console.log('ℹ️ ClaimIssuer already exists as trusted issuer');
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not add ClaimIssuer to trusted issuers:', error.message);
      }
    }
    
    res.json({
      success: true,
      contractAddress: await claimIssuer.getAddress(),
      transactionHash: 'claim_issuer_deployed',
      message: 'ClaimIssuer deployed successfully',
      claimIssuerAddress: claimIssuer.address,
      deployerAddress: deployerAddress
    });
  } catch (error) {
    throw error;
  }
}

// Handle contract initialization
async function handleInitialize(contractName, contractAddress, wallet, res) {
  try {
    console.log(`🔧 Initializing ${contractName} at ${contractAddress}`);
    
    // Load contract artifacts
    const artifactsPath = path.join(__dirname, `../../trex-scaffold/packages/react-app/src/contracts/${contractName}.json`);
    if (!fs.existsSync(artifactsPath)) {
      throw new Error(`${contractName} artifacts not found`);
    }
    
    const artifacts = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    const contract = new ethers.Contract(contractAddress, artifacts.abi, wallet);
    
    // Check if contract has init method in ABI (T-REX contracts use 'init' not 'initialize')
    const hasInit = artifacts.abi.some(method => method.name === 'init');
    if (!hasInit) {
      throw new Error(`${contractName} does not have an init method`);
    }
    
    // Check if contract is already initialized by checking owner
    try {
      const owner = await contract.owner();
      const isInitialized = owner !== '0x0000000000000000000000000000000000000000';
      if (isInitialized) {
        console.log(`ℹ️ ${contractName} is already initialized, skipping`);
        res.json({
          success: true,
          message: `${contractName} is already initialized`,
          alreadyInitialized: true
        });
        return;
      }
    } catch (error) {
      console.log(`⚠️ Could not check initialization status for ${contractName}:`, error.message);
      // Continue with initialization attempt
    }
    
    // Call init with parameters based on the contract
    let tx;
    if (contractName === 'IdentityRegistry') {
      // IdentityRegistry needs parameters: TrustedIssuersRegistry, ClaimTopicsRegistry, IdentityRegistryStorage
      const deploymentsPath = path.join(__dirname, '../../deployments.json');
      const raw = fs.readFileSync(deploymentsPath, 'utf8');
      let deploymentsObj = { easydeploy: [], advanced: [] };
      
      if (raw.trim().startsWith('{')) {
        deploymentsObj = JSON.parse(raw);
        if (!deploymentsObj.easydeploy) deploymentsObj.easydeploy = [];
        if (!deploymentsObj.advanced) deploymentsObj.advanced = [];
      }
      
      const allDeployments = [...deploymentsObj.easydeploy, ...deploymentsObj.advanced];
      
      // Find the latest addresses for the required contracts
      let trustedIssuersAddress, claimTopicsAddress, storageAddress;
      
      // Find TrustedIssuersRegistry
      const trustedIssuersDeployments = allDeployments
        .filter(d => d.component === 'TrustedIssuersRegistry' || (d.implementations && d.implementations.trustedIssuersRegistry))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (trustedIssuersDeployments.length > 0) {
        const latest = trustedIssuersDeployments[0];
        trustedIssuersAddress = latest.component ? latest.address : latest.implementations.trustedIssuersRegistry;
      }
      
      // Find ClaimTopicsRegistry
      const claimTopicsDeployments = allDeployments
        .filter(d => d.component === 'ClaimTopicsRegistry' || (d.implementations && d.implementations.claimTopicsRegistry))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (claimTopicsDeployments.length > 0) {
        const latest = claimTopicsDeployments[0];
        claimTopicsAddress = latest.component ? latest.address : latest.implementations.claimTopicsRegistry;
      }
      
      // Find IdentityRegistryStorage
      const storageDeployments = allDeployments
        .filter(d => d.component === 'IdentityRegistryStorage' || (d.implementations && d.implementations.identityRegistryStorage))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (storageDeployments.length > 0) {
        const latest = storageDeployments[0];
        storageAddress = latest.component ? latest.address : latest.implementations.identityRegistryStorage;
      }
      
      if (!trustedIssuersAddress || !claimTopicsAddress || !storageAddress) {
        throw new Error('Missing required contract addresses for IdentityRegistry initialization');
      }
      
      console.log(`Initializing IdentityRegistry with params: ${trustedIssuersAddress}, ${claimTopicsAddress}, ${storageAddress}`);
      tx = await contract.init(trustedIssuersAddress, claimTopicsAddress, storageAddress);
    } else {
      // Other contracts don't need parameters
      tx = await contract.init();
    }
    const receipt = await tx.wait();
    
    console.log(`✅ ${contractName} initialized successfully`);
    console.log('Transaction hash:', receipt.transactionHash);
    
    res.json({
      success: true,
      transactionHash: receipt.transactionHash,
      message: `${contractName} initialized successfully`
    });
  } catch (error) {
    throw error;
  }
}

// Handle RPC calls
async function handleRpcCall(method, params, res) {
  try {
    console.log(`🔧 RPC call: ${method}`, params);
    
    const provider = createProvider();
    const result = await provider.send(method, params);
    
    console.log(`✅ RPC result:`, result);
    
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error(`❌ RPC call failed:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Helper function to aggregate deployments
function aggregateDeployments(deployments) {
  const result = {};
  deployments.forEach(entry => {
    // Individual component deployments
    if (entry.component && entry.address) {
      if (!result[entry.component]) result[entry.component] = [];
      if (!result[entry.component].includes(entry.address)) {
        result[entry.component].push(entry.address);
      }
    }
    // Factory/suite deployments
    if (entry.suite) {
      Object.entries(entry.suite).forEach(([key, address]) => {
        const name =
          key === 'claimTopicsRegistry' ? 'ClaimTopicsRegistry' :
          key === 'trustedIssuersRegistry' ? 'TrustedIssuersRegistry' :
          key === 'identityRegistryStorage' ? 'IdentityRegistryStorage' :
          key === 'identityRegistry' ? 'IdentityRegistry' :
          key === 'modularCompliance' ? 'ModularCompliance' :
          key === 'compliance' ? 'ModularCompliance' :
          key.charAt(0).toUpperCase() + key.slice(1);
        if (!result[name]) result[name] = [];
        if (address && !result[name].includes(address)) {
          result[name].push(address);
        }
      });
    }
    if (entry.implementations) {
      Object.entries(entry.implementations).forEach(([key, address]) => {
        const name =
          key === 'claimTopicsRegistry' ? 'ClaimTopicsRegistry' :
          key === 'trustedIssuersRegistry' ? 'TrustedIssuersRegistry' :
          key === 'identityRegistryStorage' ? 'IdentityRegistryStorage' :
          key === 'identityRegistry' ? 'IdentityRegistry' :
          key === 'modularCompliance' ? 'ModularCompliance' :
          key === 'compliance' ? 'ModularCompliance' :
          key.charAt(0).toUpperCase() + key.slice(1);
        if (!result[name]) result[name] = [];
        if (address && !result[name].includes(address)) {
          result[name].push(address);
        }
      });
    }
    if (entry.factory && entry.factory.address) {
      if (!result.Factory) result.Factory = [];
      if (!result.Factory.includes(entry.factory.address)) {
        result.Factory.push(entry.factory.address);
      }
    }
  });
  return result;
}

// Replace the /state route with an aggregation of all deployments
router.get('/state', async (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      return res.json({ success: true, deployment: {} });
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const result = aggregateDeployments(deployments);
    console.log('Aggregated contracts:', result); // DEBUG LOG
    res.json({
      success: true,
      deployment: result
    });
  } catch (error) {
    console.error('❌ Failed to get deployment state:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add /api/deployments endpoint to return the full deployments.json array
router.get('/deployments', async (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../../deployments.json');
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

// Get available contracts
router.get('/available', async (req, res) => {
  try {
    const contractsDir = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts');
    const files = fs.readdirSync(contractsDir);
    const contracts = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    res.json({
      success: true,
      contracts: contracts
    });
  } catch (error) {
    console.error('❌ Failed to get available contracts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const deploymentsPath = path.join(__dirname, '../../deployments.json');
function loadDeploymentsObj() {
  if (fs.existsSync(deploymentsPath)) {
    const raw = fs.readFileSync(deploymentsPath, 'utf8');
    if (raw.trim().startsWith('{')) {
      const obj = JSON.parse(raw);
      if (!obj.easydeploy) obj.easydeploy = [];
      if (!obj.advanced) obj.advanced = [];
      return obj;
    }
  }
  return { easydeploy: [], advanced: [] };
}
function saveDeploymentsObj(obj) {
  fs.writeFileSync(deploymentsPath, JSON.stringify(obj, null, 2));
}

module.exports = router; 