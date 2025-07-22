import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractArtifacts } from '../../hooks/compiledContracts';
import UserManagementPhase from './UserManagementPhase';

const STORAGE_KEY = 'trex_deployment_state';

const DeploymentPhase = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [deployedContracts, setDeployedContracts] = useState({});
  const [deployedTokens, setDeployedTokens] = useState([]);
  const [selectedContracts, setSelectedContracts] = useState({});
  const [deploying, setDeploying] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [availableClaimTopics, setAvailableClaimTopics] = useState([]);
  const [loadingClaimTopics, setLoadingClaimTopics] = useState(false);
  const [contractInitStatus, setContractInitStatus] = useState({});
  const [checkingInitStatus, setCheckingInitStatus] = useState(false);
  const [tokenAgentInput, setTokenAgentInput] = useState("");
  const [initializingContract, setInitializingContract] = useState({});
  const [currentSubStep, setCurrentSubStep] = useState('deploy');
  const [tokenStatus, setTokenStatus] = useState('No token selected');
  const [clearing, setClearing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('Not checked');
  const [requiredClaimTopics, setRequiredClaimTopics] = useState([]);
  // const [userClaims, setUserClaims] = useState([]); // Unused - commented out to fix warning
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [selectedClaimTopicsRegistry, setSelectedClaimTopicsRegistry] = useState('');
  const [userAddressToCheck, setUserAddressToCheck] = useState('');
  const [verificationDetails, setVerificationDetails] = useState({
    hasOnchainID: false,
    onchainIDAddress: '',
    missingTopics: [],
    untrustedIssuers: [],
    invalidClaims: [],
    trustedIssuersForTopics: {}
  });

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  // Extract clean error message from verbose ethers.js errors
  const extractCleanError = (error) => {
    try {
      // Debug: Log the error structure to understand what we're working with
      console.log("Error structure:", JSON.stringify(error, null, 2));
      
      // First, check if this is a gas estimation error that might contain the real revert reason
      if (error.message && error.message.includes('cannot estimate gas')) {
        console.log("Detected gas estimation error, looking for revert reason...");
        
        // Check error.error.reason first (this is where the actual error is)
        if (error.error && error.error.reason) {
          console.log("Found error.error.reason:", error.error.reason);
          if (error.error.reason.includes('reverted with reason string')) {
            const match = error.error.reason.match(/reverted with reason string '([^']+)'/);
            if (match) {
              console.log("Found revert reason:", match[1]);
              return match[1]; // Return the clean error message
            }
          }
          return error.error.reason;
        }
        
        // Look for the encoded revert reason in error.error.error.data.data
        if (error.error && error.error.error && error.error.error.data && error.error.error.data.data) {
          try {
            // The revert reason is hex-encoded, starting with 0x08c379a0 (Error(string) selector)
            const hexData = error.error.error.data.data;
            console.log("Hex data:", hexData);
            
            // Remove the function selector (first 4 bytes = 8 hex chars)
            const revertData = hexData.slice(10); // Skip 0x08c379a0
            
            // Decode the string from the remaining hex data
            const decoded = ethers.utils.toUtf8String('0x' + revertData);
            console.log("Decoded revert reason:", decoded);
            
            if (decoded && decoded.length > 0) {
              return decoded;
            }
          } catch (e) {
            console.log("Failed to decode hex data:", e.message);
          }
        }
        
        // Also check the message field for revert reason in error.error.error.data.message
        if (error.error && error.error.error && error.error.error.data && error.error.error.data.message) {
          const dataMessage = error.error.error.data.message;
          console.log("Data message:", dataMessage);
          if (dataMessage.includes('reverted with reason string')) {
            const match = dataMessage.match(/reverted with reason string '([^']+)'/);
            if (match) {
              console.log("Found revert reason:", match[1]);
              return match[1]; // Return the clean error message
            }
          }
          // If no reason string found, return the data message
          return dataMessage;
        }
        
        // For gas estimation errors, provide a more helpful message
        return "Transaction would fail - check contract state and permissions";
      }
      
      // Try to extract the actual error message from the verbose error object
      if (error.error && error.error.data && error.error.data.message) {
        // Look for the actual revert reason in the data
        const dataMessage = error.error.data.message;
        if (dataMessage.includes('reverted with reason string')) {
          const match = dataMessage.match(/reverted with reason string '([^']+)'/);
          if (match) {
            return match[1]; // Return the clean error message
          }
        }
        return dataMessage;
      }
      
      // Fallback to error.reason if available
      if (error.reason) {
        return error.reason;
      }
      
      // Fallback to error.message
      if (error.message) {
        return error.message;
      }
      
      // Last resort: return the whole error as string
      return error.toString();
    } catch (e) {
      // If all else fails, return the original error message
      return error.message || error.toString();
    }
  };

  // Load deployment state from localStorage on component mount
  useEffect(() => {
    const loadDeploymentState = () => {
      try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          setDeployedContracts(parsedState.contracts || {});
          setDeployedTokens(parsedState.tokens || []);
          addLog("Loaded deployment state from storage", "info");
        }
      } catch (error) {
        console.error("Error loading deployment state:", error);
        addLog("Error loading deployment state", "error");
      }
    };
    
    loadDeploymentState();
  }, []);

  // Auto-select latest contracts when deployment state changes
  useEffect(() => {
    if (Object.keys(deployedContracts).length > 0) {
      autoSelectLatestContracts();
    }
  }, [deployedContracts]);

  const saveDeployedContract = (name, address) => {
    setDeployedContracts(prev => {
      const updated = {
        ...prev,
        [name]: Array.isArray(prev[name]) ? [address, ...prev[name]] : [address]
      };
      
      // Save to unified storage
      const unifiedState = {
        contracts: updated,
        tokens: deployedTokens
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unifiedState));
      
      return updated;
    });
  };

  const saveDeployedToken = (tokenDetails) => {
    setDeployedTokens(prev => {
      const updated = [...prev, tokenDetails];
      
      // Save to unified storage
      const unifiedState = {
        contracts: deployedContracts,
        tokens: updated
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unifiedState));
      
      return updated;
    });
  };

  // Clear all deployment state
  const clearDeploymentState = () => {
    setClearing(true);
    setDeployedContracts({});
    setDeployedTokens([]);
    setSelectedContracts({});
    localStorage.removeItem(STORAGE_KEY);
    setMessage("All deployment state cleared. You can start fresh!");
    addLog("Deployment state cleared", "info");
    setTimeout(() => {
      setClearing(false);
      setMessage(""); // Optionally clear the message after 2s
    }, 2000);
  };

  // Generic Hardhat interaction helper function
  const hardhatInteraction = async (action, options) => {
    const response = await fetch('/api/hardhat-interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...options })
    });
    
    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }
    
    return data;
  };

  // Keep getSigner for backward compatibility (but it's not used anymore)
  const getSigner = async () => {
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const provider = new ethers.providers.JsonRpcProvider('http://13.250.2.49:8545');
    return new ethers.Wallet(privateKey, provider);
  };

  // Helper to reload deployment state from storage
  const reloadDeploymentState = () => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setDeployedContracts(parsedState.contracts || {});
        setDeployedTokens(parsedState.tokens || []);
        addLog("Reloaded deployment state from storage", "info");
        
        // Auto-select latest contracts after reloading
        setTimeout(() => {
          autoSelectLatestContracts();
        }, 100);
      }
    } catch (error) {
      console.error("Error reloading deployment state:", error);
      addLog("Error reloading deployment state", "error");
    }
  };

  // Auto-select latest deployed contracts
  const autoSelectLatestContracts = () => {
    const newSelectedContracts = {};
    
    // For each contract type, select the latest deployed (first in array)
    Object.keys(deployedContracts).forEach(contractType => {
      if (deployedContracts[contractType] && deployedContracts[contractType].length > 0) {
        newSelectedContracts[contractType] = deployedContracts[contractType][0];
      }
    });
    
    setSelectedContracts(newSelectedContracts);
    addLog("Auto-selected latest deployed contracts", "info");
  };

  const deployContract = async (contractName) => {
    try {
      setDeploying(true);
      setMessage(`Deploying ${contractName}...`);
      addLog(`Starting deployment of ${contractName} via backend API`, "info");

      const result = await hardhatInteraction('deploy', { contractName });
      
      console.log(`${contractName} deployed at:`, result.contractAddress);
      addLog(`${contractName} deployed successfully at ${result.contractAddress}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
      saveDeployedContract(contractName, result.contractAddress);
      setMessage(`${contractName} deployed successfully at ${result.contractAddress}`);
      
      reloadDeploymentState(); // <-- reload after deploy
      
      return result.contractAddress;
    } catch (error) {
      console.error(`Error deploying ${contractName}:`, error);
      const cleanError = extractCleanError(error);
      setMessage(`Error deploying ${contractName}: ${cleanError}`);
      addLog(`Error deploying ${contractName}: ${cleanError}`, "error");
      throw error;
    } finally {
      setDeploying(false);
    }
  };



  const addClaimTopic = async (topicId) => {
    try {
      setDeploying(true);
      setMessage(`Adding claim topic ${topicId}...`);
      addLog(`Starting claim topic ${topicId} addition via backend API`, "info");

      // Get the address to use (selected if available, otherwise latest deployed)
      const address = selectedContracts.ClaimTopicsRegistry || (deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0]);
      
      if (!address) {
        throw new Error('No ClaimTopicsRegistry found. Please deploy one first.');
      }
      
      // Add claim topic using backend API
      const result = await hardhatInteraction('send', {
        contractName: 'ClaimTopicsRegistry',
        contractAddress: address,
        method: 'addClaimTopic',
        params: [topicId]
      });
      
      setMessage(`Claim topic ${topicId} added successfully`);
      addLog(`Claim topic ${topicId} added successfully`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
      // Reload claim topics to show the updated list
      await loadClaimTopics(address);
    } catch (error) {
      console.error(`Error adding claim topic ${topicId}:`, error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding claim topic ${topicId}: ${cleanError}`);
      addLog(`Error adding claim topic ${topicId}: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const removeClaimTopic = async (topicId) => {
    try {
      setDeploying(true);
      setMessage(`Removing claim topic ${topicId}...`);
      addLog(`Starting claim topic ${topicId} removal via backend API`, "info");

      // Get the address to use (selected if available, otherwise latest deployed)
      const address = selectedContracts.ClaimTopicsRegistry || (deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0]);
      
      if (!address) {
        throw new Error('No ClaimTopicsRegistry found. Please deploy one first.');
      }
      
      // Remove claim topic using backend API
      const result = await hardhatInteraction('send', {
        contractName: 'ClaimTopicsRegistry',
        contractAddress: address,
        method: 'removeClaimTopic',
        params: [topicId]
      });
      
      setMessage(`Claim topic ${topicId} removed successfully`);
      addLog(`Claim topic ${topicId} removed successfully`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
      // Reload claim topics to show the updated list
      await loadClaimTopics(address);
    } catch (error) {
      console.error(`Error removing claim topic ${topicId}:`, error);
      const cleanError = extractCleanError(error);
      setMessage(`Error removing claim topic ${topicId}: ${cleanError}`);
      addLog(`Error removing claim topic ${topicId}: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const checkContractInitStatus = async () => {
    try {
      setCheckingInitStatus(true);
      const status = {};
      
      const contractsToCheck = [
        'ClaimTopicsRegistry',
        'TrustedIssuersRegistry', 
        'IdentityRegistryStorage',
        'IdentityRegistry',
        'ModularCompliance'
      ];

      for (const contractName of contractsToCheck) {
        const address = selectedContracts[contractName] || (deployedContracts[contractName] && deployedContracts[contractName][0]);
        if (address) {
          try {
            const isInitialized = await isContractInitialized(contractName, address);
            status[contractName] = { address, isInitialized };
          } catch (error) {
            status[contractName] = { address, isInitialized: false, error: error.message };
          }
        }
      }
      
      setContractInitStatus(status);
      addLog('Contract initialization status checked', "info");
    } catch (error) {
      console.error('Error checking contract initialization status:', error);
      addLog(`Error checking initialization status: ${error.message}`, "error");
    } finally {
      setCheckingInitStatus(false);
    }
  };

  const loadClaimTopics = async (registryAddress) => {
    try {
      setLoadingClaimTopics(true);
      
      const result = await hardhatInteraction('call', {
        contractName: 'ClaimTopicsRegistry',
        contractAddress: registryAddress,
        method: 'getClaimTopics',
        params: []
      });
      
      const topicIds = result.result;
      
      // Map topic IDs to standard names
      const standardTopics = {
        1: "KYC (Know Your Customer)",
        2: "AML (Anti-Money Laundering)", 
        3: "Accredited Investor",
        4: "EU Nationality Confirmed",
        5: "US Nationality Confirmed",
        6: "Blacklist",
        7: "Employment",
        8: "Residency",
        9: "Nationality",
        10: "Accreditation"
      };
      
      const topics = topicIds.map(id => ({
        id: id.toNumber(),
        name: standardTopics[id.toNumber()] || `Custom Topic ${id.toNumber()}`,
        description: standardTopics[id.toNumber()] ? `Standard claim topic for ${standardTopics[id.toNumber()].split(' ')[0]}` : `Custom claim topic with ID ${id.toNumber()}`
      }));
      
      setAvailableClaimTopics(topics);
      addLog(`Loaded ${topics.length} claim topics from registry`, "info");
    } catch (error) {
      console.error('Error loading claim topics:', error);
      setAvailableClaimTopics([]);
      addLog(`Error loading claim topics: ${error.message}`, "error");
    } finally {
      setLoadingClaimTopics(false);
    }
  };

  const deployClaimIssuerAndAddAsTrusted = async (claimTopics) => {
    try {
      setDeploying(true);
      setMessage('Deploying ClaimIssuer and adding as trusted issuer...');
      addLog('Starting ClaimIssuer deployment and trusted issuer setup', "info");

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      
      // Step 1: Deploy ClaimIssuer contract
      addLog('Step 1: Deploying ClaimIssuer contract...', "info");
      const claimIssuerArtifacts = getContractArtifacts('ClaimIssuer');
      const claimIssuerFactory = new ethers.ContractFactory(claimIssuerArtifacts.abi, claimIssuerArtifacts.bytecode, signer);
      const claimIssuer = await claimIssuerFactory.deploy(signerAddress); // Pass the management key
      await claimIssuer.deployed();
      
      addLog(`ClaimIssuer deployed at: ${claimIssuer.address}`, "success");
      
      // Step 2: Add signing key to ClaimIssuer
      addLog('Step 2: Adding signing key to ClaimIssuer...', "info");
      const signingKeyHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [signerAddress]));
      const addKeyTx = await claimIssuer.addKey(signingKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
      await addKeyTx.wait();
      addLog('Signing key added to ClaimIssuer', "success");
      
      // Step 3: Add ClaimIssuer as trusted issuer
      addLog('Step 3: Adding ClaimIssuer as trusted issuer...', "info");
      const tirAddress = selectedContracts.TrustedIssuersRegistry || (deployedContracts.TrustedIssuersRegistry && deployedContracts.TrustedIssuersRegistry[0]);
      
      if (!tirAddress) {
        throw new Error('No TrustedIssuersRegistry found. Please deploy one first.');
      }
      
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
      
      // Check if issuer already exists
      try {
        const exists = await tir.isTrustedIssuer ? await tir.isTrustedIssuer(claimIssuer.address) : false;
        if (exists) {
          addLog('ClaimIssuer already exists as trusted issuer', "info");
        } else {
          const addTrustedTx = await tir.addTrustedIssuer(claimIssuer.address, claimTopics);
          await addTrustedTx.wait();
          addLog('ClaimIssuer added as trusted issuer', "success");
        }
      } catch (e) {
        addLog(`Error checking/adding trusted issuer: ${e.message}`, "error");
        throw e;
      }
      
      setMessage(`ClaimIssuer deployed at ${claimIssuer.address} and added as trusted issuer`);
      addLog('ClaimIssuer deployment and trusted issuer setup completed', "success");
      
      return claimIssuer.address;
    } catch (error) {
      console.error('Error deploying ClaimIssuer and adding as trusted issuer:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error: ${cleanError}`);
      addLog(`Error: ${cleanError}`, "error");
      throw error;
    } finally {
      setDeploying(false);
    }
  };

  /*
  const addTrustedIssuer = async (issuerAddress, claimTopics) => { // Unused - commented out to fix warning
    try {
      setDeploying(true);
      setMessage('Adding trusted issuer...');
      addLog('Starting trusted issuer addition', "info");

      // Get the address to use (selected if available, otherwise latest deployed)
      const address = selectedContracts.TrustedIssuersRegistry || (deployedContracts.TrustedIssuersRegistry && deployedContracts.TrustedIssuersRegistry[0]);
      
      if (!address) {
        throw new Error('No TrustedIssuersRegistry found. Please deploy one first.');
      }
      
      const signer = await getSigner();
      const artifacts = getContractArtifacts('TrustedIssuersRegistry');
      const contract = new ethers.Contract(address, artifacts.abi, signer);
      
      // Check if issuer already exists
      try {
        const exists = await contract.isTrustedIssuer ? await contract.isTrustedIssuer(issuerAddress) : false;
        if (exists) {
          setMessage('Trusted issuer already exists');
          addLog('Trusted issuer already exists', "info");
          return;
        }
      } catch (e) {
        // isTrustedIssuer function might not exist, continue with addition
      }
      
      const tx = await contract.addTrustedIssuer(issuerAddress, claimTopics);
      await tx.wait();
      
      setMessage('Trusted issuer added successfully');
      addLog('Trusted issuer added successfully', "success");
    } catch (error) {
      console.error('Error adding trusted issuer:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding trusted issuer: ${cleanError}`);
      addLog(`Error adding trusted issuer: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };
  */

  const deployToken = async (tokenDetails) => {
    try {
      setDeploying(true);
      setMessage('Deploying token...');
      addLog('Starting token deployment', "info");

      // Get the addresses to use (selected if available, otherwise latest deployed)
      const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
      const complianceAddress = selectedContracts.ModularCompliance || (deployedContracts.ModularCompliance && deployedContracts.ModularCompliance[0]);
      
      if (!identityRegistryAddress) {
        throw new Error('No Identity Registry found. Please deploy one first.');
      }
      
      if (!complianceAddress) {
        throw new Error('No ModularCompliance found. Please deploy one first.');
      }

      const signer = await getSigner();
      const artifacts = getContractArtifacts('Token');
      
      console.log('Deploying Token with artifacts:', artifacts);
      
      const contractFactory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, signer);
      const contract = await contractFactory.deploy();
      await contract.deployed();
      
      console.log('Token deployed at:', contract.address);
      addLog(`Token deployed successfully at ${contract.address}`, "success");
      
      // Initialize the token
      try {
        // Get signer address directly without ENS resolution
        const signerAddress = await signer.getAddress();
        // identityRegistryAddress and complianceAddress are already defined above
        
        addLog(`Initializing token with owner: ${signerAddress}`, "info");
        
        // First, try to set the token as owner of the ModularCompliance
        try {
          addLog('Setting token as owner of ModularCompliance...', "info");
          const complianceArtifacts = getContractArtifacts('ModularCompliance');
          const compliance = new ethers.Contract(complianceAddress, complianceArtifacts.abi, signer);
          
          const currentOwner = await compliance.owner();
          addLog(`Current ModularCompliance owner: ${currentOwner}`, "info");
          
          if (currentOwner.toLowerCase() !== contract.address.toLowerCase()) {
            addLog('Transferring ModularCompliance ownership to token...', "info");
            const transferTx = await compliance.transferOwnership(contract.address);
            await transferTx.wait();
            addLog('ModularCompliance ownership transferred to token', "success");
          } else {
            addLog('Token is already owner of ModularCompliance', "info");
          }
        } catch (ownershipError) {
          addLog(`Could not set token as ModularCompliance owner: ${ownershipError.message}`, "warning");
          addLog('Will try to initialize token anyway...', "info");
        }
        
        const initTx = await contract.init(
          identityRegistryAddress,
          complianceAddress,
          tokenDetails.name,
          tokenDetails.symbol,
          tokenDetails.decimals,
          signerAddress
        );
        await initTx.wait();
        
        addLog('Token initialized successfully', "success");
      } catch (initError) {
        // Check if it's an ENS error and handle gracefully
        if (initError.message.includes('ENS') || initError.message.includes('UNSUPPORTED_OPERATION')) {
          addLog('Token deployed successfully (ENS warning ignored)', "success");
        } else {
          console.error('Error initializing token:', initError);
          addLog(`Error initializing token: ${initError.message}`, "error");
        }
        // Continue anyway - token is deployed
      }
      
      const tokenInfo = {
        address: contract.address,
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
        decimals: tokenDetails.decimals,
        deployedAt: new Date().toISOString()
      };
      
      saveDeployedToken(tokenInfo);
      setMessage(`Token deployed successfully at ${contract.address}`);
      
      return contract.address;
    } catch (error) {
      console.error('Error deploying token:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error deploying token: ${cleanError}`);
      addLog(`Error deploying token: ${cleanError}`, "error");
      throw error;
    } finally {
      setDeploying(false);
    }
  };



  const configureIdentityRegistry = async () => {
    try {
      setDeploying(true);
      setMessage('Configuring Identity Registry...');
      addLog('Starting Identity Registry configuration', "info");

      // Get addresses to use (selected if available, otherwise latest deployed)
      const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
      const claimTopicsAddress = selectedContracts.ClaimTopicsRegistry || (deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0]);
      const trustedIssuersAddress = selectedContracts.TrustedIssuersRegistry || (deployedContracts.TrustedIssuersRegistry && deployedContracts.TrustedIssuersRegistry[0]);
      const storageAddress = selectedContracts.IdentityRegistryStorage || (deployedContracts.IdentityRegistryStorage && deployedContracts.IdentityRegistryStorage[0]);

      if (!identityRegistryAddress || !claimTopicsAddress || !trustedIssuersAddress || !storageAddress) {
        throw new Error('Missing required contracts. Please deploy all required contracts first.');
      }

      addLog(`Configuring Identity Registry at ${identityRegistryAddress}`, "info");
      // Backend API for setTrustedIssuersRegistry
      const tx1 = await hardhatInteraction('send', {
        contractName: 'IdentityRegistry',
        contractAddress: identityRegistryAddress,
        method: 'setTrustedIssuersRegistry',
        params: [trustedIssuersAddress]
      });
      addLog(`TrustedIssuersRegistry at ${trustedIssuersAddress} connected to IdentityRegistry`, "success");
      addLog(`Transaction hash: ${tx1.transactionHash}`, "info");

      // Backend API for setClaimTopicsRegistry
      const tx2 = await hardhatInteraction('send', {
        contractName: 'IdentityRegistry',
        contractAddress: identityRegistryAddress,
        method: 'setClaimTopicsRegistry',
        params: [claimTopicsAddress]
      });
      addLog(`ClaimTopicsRegistry at ${claimTopicsAddress} connected to IdentityRegistry`, "success");
      addLog(`Transaction hash: ${tx2.transactionHash}`, "info");

      // Backend API for setIdentityRegistryStorage
      const tx3 = await hardhatInteraction('send', {
        contractName: 'IdentityRegistry',
        contractAddress: identityRegistryAddress,
        method: 'setIdentityRegistryStorage',
        params: [storageAddress]
      });
      addLog(`IdentityRegistryStorage at ${storageAddress} connected to IdentityRegistry`, "success");
      addLog(`Transaction hash: ${tx3.transactionHash}`, "info");

      // BILATERAL BINDING: Bind IRS back to IR
      addLog(`Establishing bilateral binding between IR and IRS`, "info");
      const tx4 = await hardhatInteraction('send', {
        contractName: 'IdentityRegistryStorage',
        contractAddress: storageAddress,
        method: 'bindIdentityRegistry',
        params: [identityRegistryAddress]
      });
      addLog(`IdentityRegistryStorage at ${storageAddress} bound to IdentityRegistry`, "success");
      addLog(`Transaction hash: ${tx4.transactionHash}`, "info");

      setMessage('Identity Registry configured successfully with bilateral binding');
      addLog('Identity Registry configuration completed with bilateral binding', "success");
    } catch (error) {
      console.error('Error configuring Identity Registry:', error);
      setMessage(`Error configuring Identity Registry: ${error.message}`);
      addLog(`Error configuring Identity Registry: ${error.message}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  /*
  const connectContracts = async (sourceContract, targetContract, functionName, ...args) => {
    try {
      const signer = await getSigner();
      const sourceArtifacts = getContractArtifacts(sourceContract);
      const sourceAddress = deployedContracts[sourceContract][0];
      const sourceContractInstance = new ethers.Contract(sourceAddress, sourceArtifacts.abi, signer);
      
      const tx = await sourceContractInstance[functionName](...args);
      await tx.wait();
      
      addLog(`${sourceContract} connected to ${targetContract} via ${functionName}`, "success");
    } catch (error) {
      console.error(`Error connecting ${sourceContract} to ${targetContract}:`, error);
      addLog(`Error connecting ${sourceContract} to ${targetContract}: ${error.message}`, "error");
      throw error;
    }
  };
  */

  // Token Role Management Functions
  const addTokenAgent = async () => {
    try {
      setDeploying(true);
      setMessage('Adding token agent...');
      addLog('Starting token agent addition', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      addLog(`Selected token address: ${selectedContracts.Token}`, "info");

      // Get agent address from input or use signer address
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const agentAddressInput = tokenAgentInput.trim();
      const agentAddress = agentAddressInput || signerAddress;

      // Check if already an agent (still uses frontend call for now)
      try {
        const artifacts = getContractArtifacts('Token');
        const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
        const isAgent = await contract.isAgent(agentAddress);
        if (isAgent) {
          setMessage('Address is already a token agent');
          setTokenAgentInput(""); // clear input
          return;
        }
      } catch (e) {
        // isAgent function might not exist, continue with addition
      }

      // Add agent using backend API
      const result = await hardhatInteraction('send', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        method: 'addAgent',
        params: [agentAddress]
      });
      setMessage('Token agent added successfully');
      addLog('Token agent added successfully', "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      setTokenAgentInput(""); // clear input
    } catch (error) {
      console.error('Error adding token agent:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding token agent: ${cleanError}`);
      addLog(`Error adding token agent: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const setTokenPaused = async (paused) => {
    try {
      setDeploying(true);
      setMessage(`${paused ? 'Pausing' : 'Unpausing'} token...`);
      addLog(`Starting token ${paused ? 'pause' : 'unpause'}`, "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const signer = await getSigner();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      const tx = paused ? await contract.pause() : await contract.unpause();
      await tx.wait();
      
      setMessage(`Token ${paused ? 'paused' : 'unpaused'} successfully`);
      addLog(`Token ${paused ? 'paused' : 'unpaused'} successfully`, "success");
    } catch (error) {
      console.error(`Error ${paused ? 'pausing' : 'unpausing'} token:`, error);
      setMessage(`Error ${paused ? 'pausing' : 'unpausing'} token: ${error.message}`);
      addLog(`Error ${paused ? 'pausing' : 'unpausing'} token: ${error.message}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const mintTokens = async () => {
    try {
      setDeploying(true);
      setMessage('Minting tokens...');
      addLog('Starting token minting', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const recipient = document.getElementById('mintRecipient').value.trim();
      const amount = document.getElementById('mintAmount').value.trim();
      
      if (!recipient || !amount) {
        throw new Error('Please provide recipient address and amount');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      // Check if recipient is verified before minting
      try {
        const identityRegistryAddress = await contract.identityRegistry();
        const irArtifacts = getContractArtifacts('IdentityRegistry');
        const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
        const isRecipientVerified = await ir.isVerified(recipient);
        
        addLog(`Recipient ${recipient} verification status: ${isRecipientVerified}`, "info");
        
        if (!isRecipientVerified) {
          addLog(`⚠️ Warning: Recipient ${recipient} is not verified`, "warning");
          addLog(`You can still try to mint, but it may fail`, "info");
        }
        
        // Check ModularCompliance status
        const complianceAddress = await contract.compliance();
        addLog(`Token's ModularCompliance: ${complianceAddress}`, "info");
        
        const complianceArtifacts = getContractArtifacts('ModularCompliance');
        const compliance = new ethers.Contract(complianceAddress, complianceArtifacts.abi, signer);
        
        // Check if compliance is paused
        try {
          const isCompliancePaused = await compliance.paused();
          addLog(`ModularCompliance paused status: ${isCompliancePaused}`, "info");
          
          if (isCompliancePaused) {
            addLog(`❌ ModularCompliance is PAUSED - this will prevent minting`, "error");
          }
        } catch (pauseError) {
          addLog(`Could not check compliance pause status: ${pauseError.message}`, "warning");
        }
        
        // Check compliance owner
        try {
          const complianceOwner = await compliance.owner();
          addLog(`ModularCompliance owner: ${complianceOwner}`, "info");
          addLog(`Token address: ${contract.address}`, "info");
          
          if (complianceOwner.toLowerCase() !== contract.address.toLowerCase()) {
            addLog(`⚠️ Warning: Token is not owner of ModularCompliance`, "warning");
          }
        } catch (ownerError) {
          addLog(`Could not check compliance owner: ${ownerError.message}`, "warning");
        }
        
      } catch (verificationError) {
        addLog(`Could not check recipient verification: ${verificationError.message}`, "warning");
      }
      
      // Mint tokens using backend API
      const result = await hardhatInteraction('send', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        method: 'mint',
        params: [recipient, ethers.utils.parseEther(amount)]
      });
      
      setMessage(`Minted ${amount} tokens to ${recipient}`);
      addLog(`Minted ${amount} tokens to ${recipient}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
    } catch (error) {
      console.error('Error minting tokens:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error minting tokens: ${cleanError}`);
      addLog(`Error minting tokens: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const burnTokens = async () => {
    try {
      setDeploying(true);
      setMessage('Burning tokens...');
      addLog('Starting token burning', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const burnAddress = document.getElementById('burnAddress').value.trim();
      const amount = document.getElementById('burnAmount').value.trim();
      
      if (!burnAddress || !amount) {
        throw new Error('Please provide address and amount to burn');
      }

      const signer = await getSigner();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      // Burn tokens using backend API
      const result = await hardhatInteraction('send', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        method: 'burn',
        params: [burnAddress, ethers.utils.parseEther(amount)]
      });
      
      setMessage(`Burned ${amount} tokens from ${burnAddress}`);
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      addLog(`Burned ${amount} tokens from ${burnAddress}`, "success");
    } catch (error) {
      console.error('Error burning tokens:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error burning tokens: ${cleanError}`);
      addLog(`Error burning tokens: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const transferTokens = async () => {
    try {
      setDeploying(true);
      setMessage('Transferring tokens...');
      addLog('Starting token transfer', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const toAddress = document.getElementById('transferTo').value.trim();
      const amount = document.getElementById('transferAmount').value.trim();
      
      if (!toAddress || !amount) {
        throw new Error('Please provide to address and amount');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      // Always use transfer() - this transfers from the signer's address
      addLog(`Using transfer() - transferring from signer to ${toAddress}`, "info");
      
      // Transfer tokens using backend API
      const result = await hardhatInteraction('send', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        method: 'transfer',
        params: [toAddress, ethers.utils.parseEther(amount)]
      });
      
      setMessage(`Transferred ${amount} tokens to ${toAddress}`);
      addLog(`Transferred ${amount} tokens to ${toAddress}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
    } catch (error) {
      console.error('Error transferring tokens:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error transferring tokens: ${cleanError}`);
      addLog(`Error transferring tokens: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  // TransferFrom function with proper approval flow
  const transferFromTokens = async () => {
    try {
      setDeploying(true);
      setMessage('Executing transferFrom...');
      addLog('Starting transferFrom operation', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const fromAddress = document.getElementById('transferFromAdvanced').value.trim();
      const toAddress = document.getElementById('transferToAdvanced').value.trim();
      const amount = document.getElementById('transferAmountAdvanced').value.trim();
      
      if (!fromAddress || !toAddress || !amount) {
        throw new Error('Please provide from address, to address, and amount');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      const requiredAmount = ethers.utils.parseEther(amount);
      
      // Step 1: Check current allowance
      addLog(`Checking allowance for ${signerAddress} to spend ${fromAddress}'s tokens...`, "info");
      const currentAllowance = await contract.allowance(fromAddress, signerAddress);
      addLog(`Current allowance: ${ethers.utils.formatEther(currentAllowance)} tokens`, "info");
      
      // Step 2: Check if we need to approve
      if (currentAllowance.lt(requiredAmount)) {
        addLog(`❌ Insufficient allowance. Need ${amount} tokens, but only ${ethers.utils.formatEther(currentAllowance)} approved.`, "error");
        setMessage(`Insufficient allowance. The from address (${fromAddress}) needs to approve ${signerAddress} to spend ${amount} tokens.`);
        addLog(`To fix this, the owner of ${fromAddress} should call: token.approve(${signerAddress}, ${amount})`, "info");
        return;
      }
      
      // Step 3: Check if from address has sufficient balance
      const fromBalance = await contract.balanceOf(fromAddress);
      addLog(`From address balance: ${ethers.utils.formatEther(fromBalance)} tokens`, "info");
      
      if (fromBalance.lt(requiredAmount)) {
        addLog(`❌ Insufficient balance. Need ${amount} tokens, but ${fromAddress} only has ${ethers.utils.formatEther(fromBalance)}`, "error");
        setMessage(`Insufficient balance in ${fromAddress}.`);
        return;
      }
      
      // Step 4: Execute transferFrom
      addLog(`✅ All checks passed. Executing transferFrom...`, "success");
      const tx = await contract.transferFrom(fromAddress, toAddress, requiredAmount);
      await tx.wait();
      
      setMessage(`Successfully transferred ${amount} tokens from ${fromAddress} to ${toAddress}`);
      addLog(`Successfully transferred ${amount} tokens from ${fromAddress} to ${toAddress}`, "success");
      
      // Step 5: Show updated allowance
      const newAllowance = await contract.allowance(fromAddress, signerAddress);
      addLog(`Updated allowance: ${ethers.utils.formatEther(newAllowance)} tokens`, "info");
      
    } catch (error) {
      console.error('Error executing transferFrom:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error executing transferFrom: ${cleanError}`);
      addLog(`Error executing transferFrom: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };



  // Approve tokens for transferFrom (from signer's address)
  const approveTokens = async () => {
    try {
      setDeploying(true);
      setMessage('Approving tokens...');
      addLog('Starting token approval', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const spenderAddress = document.getElementById('approveSpender').value.trim();
      const amount = document.getElementById('approveAmount').value.trim();
      
      if (!spenderAddress || !amount) {
        throw new Error('Please provide spender address and amount');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      addLog(`Approving ${spenderAddress} to spend ${amount} tokens from ${signerAddress}`, "info");
      const tx = await contract.approve(spenderAddress, ethers.utils.parseEther(amount));
      await tx.wait();
      
      setMessage(`Approved ${amount} tokens for ${spenderAddress}`);
      addLog(`Approved ${amount} tokens for ${spenderAddress}`, "success");
    } catch (error) {
      console.error('Error approving tokens:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error approving tokens: ${cleanError}`);
      addLog(`Error approving tokens: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  // Test transferFrom with proper compliance (using agent as intermediary)
  const testTransferFromWithCompliance = async () => {
    try {
      setDeploying(true);
      setMessage('Testing transferFrom with compliance...');
      addLog('Starting transferFrom test with compliance', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const fromAddress = document.getElementById('transferFromAdvanced').value.trim();
      const toAddress = document.getElementById('transferToAdvanced').value.trim();
      const amount = document.getElementById('transferAmountAdvanced').value.trim();
      
      if (!fromAddress || !toAddress || !amount) {
        throw new Error('Please provide from address, to address, and amount');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      const requiredAmount = ethers.utils.parseEther(amount);
      
      // Check if signer is an agent
      addLog(`Checking if ${signerAddress} is a token agent...`, "info");
      const isAgent = await contract.isAgent(signerAddress);
      addLog(`Is agent: ${isAgent}`, isAgent ? "success" : "error");
      
      if (!isAgent) {
        addLog(`❌ ${signerAddress} is not a token agent. Cannot perform this operation.`, "error");
        setMessage(`Error: ${signerAddress} is not a token agent. Add yourself as an agent first.`);
        return;
      }
      
      // Check if from address has sufficient balance
      const fromBalance = await contract.balanceOf(fromAddress);
      addLog(`From address balance: ${ethers.utils.formatEther(fromBalance)} tokens`, "info");
      
      if (fromBalance.lt(requiredAmount)) {
        addLog(`❌ Insufficient balance. Need ${amount} tokens, but ${fromAddress} only has ${ethers.utils.formatEther(fromBalance)}`, "error");
        setMessage(`Insufficient balance in ${fromAddress}.`);
        return;
      }
      
      // For testing with compliance, we'll use a two-step process:
      // 1. Transfer tokens from source to agent (using forcedTransfer)
      // 2. Transfer tokens from agent to destination (using regular transfer with compliance)
      
      addLog(`Step 1: Transferring ${amount} tokens from ${fromAddress} to agent (${signerAddress})`, "info");
      const tx1 = await contract.forcedTransfer(fromAddress, signerAddress, requiredAmount);
      await tx1.wait();
      addLog(`✅ Step 1 complete: Tokens moved to agent`, "success");
      
      // Check agent's new balance
      const agentBalance = await contract.balanceOf(signerAddress);
      addLog(`Agent balance after step 1: ${ethers.utils.formatEther(agentBalance)} tokens`, "info");
      
      addLog(`Step 2: Transferring ${amount} tokens from agent to ${toAddress} (with compliance check)`, "info");
      const tx2 = await contract.transfer(toAddress, requiredAmount);
      await tx2.wait();
      addLog(`✅ Step 2 complete: Tokens transferred to destination with compliance`, "success");
      
      // Check final balances
      const finalFromBalance = await contract.balanceOf(fromAddress);
      const finalToBalance = await contract.balanceOf(toAddress);
      const finalAgentBalance = await contract.balanceOf(signerAddress);
      
      addLog(`Final balances:`, "info");
      addLog(`  ${fromAddress}: ${ethers.utils.formatEther(finalFromBalance)} tokens`, "info");
      addLog(`  ${toAddress}: ${ethers.utils.formatEther(finalToBalance)} tokens`, "info");
      addLog(`  Agent: ${ethers.utils.formatEther(finalAgentBalance)} tokens`, "info");
      
      setMessage(`Successfully transferred ${amount} tokens from ${fromAddress} to ${toAddress} with compliance checks`);
      addLog(`TransferFrom test completed successfully with compliance validation`, "success");
      
    } catch (error) {
      console.error('Error testing transferFrom with compliance:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error testing transferFrom with compliance: ${cleanError}`);
      addLog(`Error testing transferFrom with compliance: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  // Check what claim topics are required for a token
  const checkRequiredClaimTopics = async () => {
    try {
      if (!selectedContracts.Token) {
        setMessage('Please select a token first');
        return;
      }

      setCheckingVerification(true);
      setMessage('Checking required claim topics...');
      addLog('Checking required claim topics for token', "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      // Get the Identity Registry from the token
      const identityRegistryAddress = await token.identityRegistry();
      addLog(`Token's Identity Registry: ${identityRegistryAddress}`, "info");
      
      // Get the Claim Topics Registry from the Identity Registry
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      const claimTopicsRegistryAddress = await ir.topicsRegistry();
      addLog(`Claim Topics Registry: ${claimTopicsRegistryAddress}`, "info");
      
      // Get the required claim topics
      const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
      const ctr = new ethers.Contract(claimTopicsRegistryAddress, ctrArtifacts.abi, signer);
      const topics = await ctr.getClaimTopics();
      
      const topicNames = {
        1: "KYC (Know Your Customer)",
        2: "AML (Anti-Money Laundering)", 
        3: "Accredited Investor",
        4: "EU Nationality Confirmed",
        5: "US Nationality Confirmed",
        6: "Blacklist",
        7: "Employment",
        8: "Residency",
        9: "Nationality",
        10: "Accreditation"
      };
      
      const topicsWithNames = topics.map(topic => ({
        id: topic.toNumber(),
        name: topicNames[topic.toNumber()] || `Custom Topic ${topic.toNumber()}`
      }));
      
      setRequiredClaimTopics(topicsWithNames);
      setSelectedClaimTopicsRegistry(claimTopicsRegistryAddress);
      
      addLog(`Required claim topics: ${topicsWithNames.map(t => `${t.id} (${t.name})`).join(', ')}`, "success");
      setMessage(`Found ${topicsWithNames.length} required claim topics`);
      
    } catch (error) {
      console.error('Error checking required claim topics:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking required claim topics: ${cleanError}`);
      addLog(`Error checking required claim topics: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Check if a user is verified for a token
  const checkUserVerification = async () => {
    try {
      if (!selectedContracts.Token || !userAddressToCheck.trim()) {
        setMessage('Please select a token and enter a user address');
        return;
      }

      setCheckingVerification(true);
      setMessage('Checking user verification...');
      addLog(`Checking verification for user: ${userAddressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      // Get the Identity Registry from the token
      const identityRegistryAddress = await token.identityRegistry();
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      // Initialize verification details
      const details = {
        hasOnchainID: false,
        onchainIDAddress: '',
        missingTopics: [],
        untrustedIssuers: [],
        invalidClaims: [],
        trustedIssuersForTopics: {}
      };
      
      // Check if user is verified
      const isVerified = await ir.isVerified(userAddressToCheck);
      
      if (isVerified) {
        setVerificationStatus('✅ VERIFIED');
        setVerificationDetails(details);
        addLog(`User ${userAddressToCheck} is VERIFIED for token`, "success");
        setMessage(`User ${userAddressToCheck} is VERIFIED for this token`);
      } else {
        setVerificationStatus('❌ NOT VERIFIED');
        addLog(`User ${userAddressToCheck} is NOT VERIFIED for token`, "error");
        setMessage(`User ${userAddressToCheck} is NOT VERIFIED. See details below.`);
        
        // Get detailed verification information
        try {
          // Check if user has an OnchainID
          const onchainIdAddress = await ir.identity(userAddressToCheck);
          if (onchainIdAddress === '0x0000000000000000000000000000000000000000') {
            details.hasOnchainID = false;
            addLog(`User ${userAddressToCheck} has no OnchainID registered`, "error");
          } else {
            details.hasOnchainID = true;
            details.onchainIDAddress = onchainIdAddress;
            addLog(`User ${userAddressToCheck} has OnchainID: ${onchainIdAddress}`, "info");
            
            // Get the TrustedIssuersRegistry
            const tirAddress = await ir.issuersRegistry();
            const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
            const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
            
            // Check each required topic
            for (const topic of requiredClaimTopics) {
              const trustedIssuers = await tir.getTrustedIssuersForClaimTopic(topic.id);
              // Convert IClaimIssuer objects to addresses - they are contract addresses
              const trustedIssuerAddresses = trustedIssuers.map(issuer => issuer.toString());
              details.trustedIssuersForTopics[topic.id] = trustedIssuerAddresses;
              
              addLog(`Topic ${topic.id} (${topic.name}) has ${trustedIssuers.length} trusted issuers`, "info");
              
              if (trustedIssuers.length === 0) {
                details.missingTopics.push({
                  id: topic.id,
                  name: topic.name,
                  reason: 'No trusted issuers configured for this topic'
                });
                addLog(`⚠️ No trusted issuers for topic ${topic.id}`, "warning");
              } else {
                // Check if user has claims for this topic from trusted issuers
                try {
                  const onchainIdArtifacts = getContractArtifacts('Identity');
                  const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
                  
                  // Get all claims for this topic
                  const claims = await onchainId.getClaimIdsByTopic(topic.id);
                  
                  if (claims.length === 0) {
                    details.missingTopics.push({
                      id: topic.id,
                      name: topic.name,
                      reason: 'No claims found for this topic',
                      trustedIssuers: trustedIssuerAddresses
                    });
                    addLog(`❌ No claims found for topic ${topic.id} (${topic.name})`, "error");
                  } else {
                    // Check if any claims are from trusted issuers
                    let hasTrustedClaim = false;
                    for (const claimId of claims) {
                      try {
                        const claim = await onchainId.getClaim(claimId);
                        const issuer = claim.issuer;
                        
                        if (trustedIssuerAddresses.some(trustedIssuerAddress => trustedIssuerAddress.toLowerCase() === issuer.toLowerCase())) {
                          hasTrustedClaim = true;
                          addLog(`✅ Found trusted claim for topic ${topic.id} from issuer ${issuer}`, "success");
                          break;
                        } else {
                          details.untrustedIssuers.push({
                            topicId: topic.id,
                            topicName: topic.name,
                            issuer: issuer,
                            claimId: claimId.toString()
                          });
                          addLog(`⚠️ Claim for topic ${topic.id} from untrusted issuer ${issuer}`, "warning");
                        }
                      } catch (claimError) {
                        details.invalidClaims.push({
                          topicId: topic.id,
                          topicName: topic.name,
                          claimId: claimId.toString(),
                          error: claimError.message
                        });
                        addLog(`❌ Invalid claim ${claimId} for topic ${topic.id}: ${claimError.message}`, "error");
                      }
                    }
                    
                    if (!hasTrustedClaim) {
                      details.missingTopics.push({
                        id: topic.id,
                        name: topic.name,
                        reason: 'No claims from trusted issuers found',
                        trustedIssuers: trustedIssuerAddresses,
                        untrustedClaims: details.untrustedIssuers.filter(u => u.topicId === topic.id)
                      });
                    }
                  }
                } catch (onchainIdError) {
                  details.missingTopics.push({
                    id: topic.id,
                    name: topic.name,
                    reason: `Error checking claims: ${onchainIdError.message}`
                  });
                  addLog(`❌ Error checking claims for topic ${topic.id}: ${onchainIdError.message}`, "error");
                }
              }
            }
          }
        } catch (e) {
          addLog(`Could not get detailed verification info: ${e.message}`, "warning");
        }
        
        setVerificationDetails(details);
      }
      
    } catch (error) {
      console.error('Error checking user verification:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking user verification: ${cleanError}`);
      addLog(`Error checking user verification: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Check and fix ModularCompliance issues
  const checkAndFixModularCompliance = async () => {
    try {
      if (!selectedContracts.Token) {
        setMessage('Please select a token first');
        return;
      }

      setCheckingVerification(true);
      setMessage('Checking ModularCompliance...');
      addLog('Checking ModularCompliance configuration', "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      const complianceAddress = await token.compliance();
      addLog(`Token's ModularCompliance: ${complianceAddress}`, "info");
      
      const complianceArtifacts = getContractArtifacts('ModularCompliance');
      const compliance = new ethers.Contract(complianceAddress, complianceArtifacts.abi, signer);
      
      let issuesFound = false;
      
      // Check if compliance is paused
      try {
        const isPaused = await compliance.paused();
        addLog(`ModularCompliance paused: ${isPaused}`, "info");
        
        if (isPaused) {
          addLog(`❌ ModularCompliance is PAUSED - unpausing...`, "error");
          const unpauseTx = await compliance.unpause();
          await unpauseTx.wait();
          addLog(`✅ ModularCompliance unpaused`, "success");
          issuesFound = true;
        }
      } catch (pauseError) {
        addLog(`Could not check/unpause compliance: ${pauseError.message}`, "warning");
      }
      
      // Check compliance owner
      try {
        const complianceOwner = await compliance.owner();
        const tokenAddress = selectedContracts.Token;
        addLog(`ModularCompliance owner: ${complianceOwner}`, "info");
        addLog(`Token address: ${tokenAddress}`, "info");
        
        if (complianceOwner.toLowerCase() !== tokenAddress.toLowerCase()) {
          addLog(`⚠️ Token is not owner of ModularCompliance - transferring ownership...`, "warning");
          const transferTx = await compliance.transferOwnership(tokenAddress);
          await transferTx.wait();
          addLog(`✅ ModularCompliance ownership transferred to token`, "success");
          issuesFound = true;
        }
      } catch (ownerError) {
        addLog(`Could not check/transfer compliance ownership: ${ownerError.message}`, "warning");
      }
      
      if (!issuesFound) {
        setMessage('✅ ModularCompliance is properly configured');
        addLog('ModularCompliance configuration is correct', "success");
      } else {
        setMessage('✅ ModularCompliance issues fixed! Try minting again.');
        addLog('ModularCompliance issues resolved', "success");
      }
      
    } catch (error) {
      console.error('Error checking ModularCompliance:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking ModularCompliance: ${cleanError}`);
      addLog(`Error: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Detailed claim inspection function
  const inspectOnchainIDClaims = async () => {
    try {
      if (!selectedContracts.Token || !userAddressToCheck.trim()) {
        setMessage('Please select a token and enter a user address');
        return;
      }

      setCheckingVerification(true);
      setMessage('Inspecting OnchainID claims...');
      addLog(`Inspecting claims for user: ${userAddressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      // Get the Identity Registry from the token
      const identityRegistryAddress = await token.identityRegistry();
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      // Get user's OnchainID
      const onchainIdAddress = await ir.identity(userAddressToCheck);
      if (onchainIdAddress === '0x0000000000000000000000000000000000000000') {
        setMessage('User has no OnchainID registered');
        addLog('User has no OnchainID registered', "error");
        return;
      }
      
      addLog(`OnchainID address: ${onchainIdAddress}`, "info");
      
      // Get the TrustedIssuersRegistry
      const tirAddress = await ir.issuersRegistry();
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
      
      // Get the OnchainID contract
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // Get all claim topics
      const allTopics = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      let allClaims = [];
      
      // Check each topic for claims
      for (const topicId of allTopics) {
        try {
          const claims = await onchainId.getClaimIdsByTopic(topicId);
          addLog(`Topic ${topicId}: ${claims.length} claims found`, "info");
          
          for (const claimId of claims) {
            try {
              const claim = await onchainId.getClaim(claimId);
              const trustedIssuers = await tir.getTrustedIssuersForClaimTopic(topicId);
              const trustedIssuerAddresses = trustedIssuers.map(issuer => issuer.toString());
              
              const isFromTrustedIssuer = trustedIssuerAddresses.some(
                trustedIssuerAddress => trustedIssuerAddress.toLowerCase() === claim.issuer.toLowerCase()
              );
              
              allClaims.push({
                topicId,
                claimId: claimId.toString(),
                issuer: claim.issuer,
                scheme: claim.scheme,
                signature: claim.signature,
                data: claim.data,
                uri: claim.uri,
                trustedIssuers: trustedIssuerAddresses,
                isFromTrustedIssuer,
                isValid: true
              });
              
              addLog(`Claim ${claimId}: issuer=${claim.issuer}, trusted=${isFromTrustedIssuer}`, "info");
            } catch (claimError) {
              allClaims.push({
                topicId,
                claimId: claimId.toString(),
                error: claimError.message,
                isValid: false
              });
              addLog(`Invalid claim ${claimId}: ${claimError.message}`, "error");
            }
          }
        } catch (topicError) {
          addLog(`Error checking topic ${topicId}: ${topicError.message}`, "warning");
        }
      }
      
      // Display detailed results
      const topicNames = {
        1: "KYC (Know Your Customer)",
        2: "AML (Anti-Money Laundering)", 
        3: "Accredited Investor",
        4: "EU Nationality Confirmed",
        5: "US Nationality Confirmed",
        6: "Blacklist",
        7: "Employment",
        8: "Residency",
        9: "Nationality",
        10: "Accreditation"
      };
      
      let detailedMessage = `🔍 OnchainID Claims Inspection Results:\n\n`;
      detailedMessage += `OnchainID: ${onchainIdAddress}\n`;
      detailedMessage += `Total Claims Found: ${allClaims.length}\n\n`;
      
      // Group claims by topic
      const claimsByTopic = {};
      allClaims.forEach(claim => {
        if (!claimsByTopic[claim.topicId]) {
          claimsByTopic[claim.topicId] = [];
        }
        claimsByTopic[claim.topicId].push(claim);
      });
      
      Object.keys(claimsByTopic).forEach(topicId => {
        const topicName = topicNames[topicId] || `Custom Topic ${topicId}`;
        const claims = claimsByTopic[topicId];
        const validClaims = claims.filter(c => c.isValid);
        const trustedClaims = validClaims.filter(c => c.isFromTrustedIssuer);
        
        detailedMessage += `📋 Topic ${topicId} (${topicName}):\n`;
        detailedMessage += `   Claims: ${claims.length} total, ${validClaims.length} valid, ${trustedClaims.length} from trusted issuers\n`;
        
        claims.forEach(claim => {
          if (claim.isValid) {
            detailedMessage += `   ✅ Claim ${claim.claimId}: ${claim.issuer} ${claim.isFromTrustedIssuer ? '(TRUSTED)' : '(UNTRUSTED)'}\n`;
            if (claim.data) {
              try {
                const decodedData = ethers.utils.toUtf8String(claim.data);
                detailedMessage += `      Data: "${decodedData}"\n`;
              } catch (e) {
                detailedMessage += `      Data: ${claim.data} (hex)\n`;
              }
            }
          } else {
            detailedMessage += `   ❌ Claim ${claim.claimId}: ${claim.error}\n`;
          }
        });
        detailedMessage += `\n`;
      });
      
      // Check verification status
      const isVerified = await ir.isVerified(userAddressToCheck);
      detailedMessage += `🔍 Verification Status: ${isVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;
      
      setMessage(detailedMessage);
      addLog('OnchainID claims inspection completed', "success");
      
    } catch (error) {
      console.error('Error inspecting OnchainID claims:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error inspecting claims: ${cleanError}`);
      addLog(`Error inspecting claims: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Debug verification step by step
  const debugVerificationStepByStep = async () => {
    try {
      if (!selectedContracts.Token || !userAddressToCheck.trim()) {
        setMessage('Please select a token and enter a user address');
        return;
      }

      setCheckingVerification(true);
      setMessage('Debugging verification step by step...');
      addLog(`Debugging verification for user: ${userAddressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      // Get the Identity Registry from the token
      const identityRegistryAddress = await token.identityRegistry();
      addLog(`Identity Registry: ${identityRegistryAddress}`, "info");
      
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      // Step 1: Check if user has OnchainID
      const onchainIdAddress = await ir.identity(userAddressToCheck);
      addLog(`Step 1 - OnchainID lookup: ${onchainIdAddress}`, "info");
      
      if (onchainIdAddress === '0x0000000000000000000000000000000000000000') {
        setMessage('❌ User has no OnchainID registered');
        return;
      }
      
      // Step 2: Get TrustedIssuersRegistry
      const tirAddress = await ir.issuersRegistry();
      addLog(`Step 2 - TrustedIssuersRegistry: ${tirAddress}`, "info");
      
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
      
      // Step 3: Get ClaimTopicsRegistry
      const ctrAddress = await ir.topicsRegistry();
      addLog(`Step 3 - ClaimTopicsRegistry: ${ctrAddress}`, "info");
      
      const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
      const ctr = new ethers.Contract(ctrAddress, ctrArtifacts.abi, signer);
      
      // Step 4: Get required claim topics
      const requiredTopics = await ctr.getClaimTopics();
      addLog(`Step 4 - Required topics: ${requiredTopics.map(t => t.toNumber()).join(', ')}`, "info");
      
      // Step 5: Get OnchainID contract
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // Step 6: Check each required topic
      let verificationDetails = [];
      
      for (const topicId of requiredTopics) {
        const topicNum = topicId.toNumber();
        addLog(`Step 6 - Checking topic ${topicNum}...`, "info");
        
        // Get trusted issuers for this topic
        const trustedIssuers = await tir.getTrustedIssuersForClaimTopic(topicNum);
        const trustedIssuerAddresses = trustedIssuers.map(issuer => issuer.toString());
        addLog(`  Trusted issuers for topic ${topicNum}: ${trustedIssuerAddresses.join(', ')}`, "info");
        
        // Get claims for this topic
        const claims = await onchainId.getClaimIdsByTopic(topicNum);
        addLog(`  Claims for topic ${topicNum}: ${claims.length} found`, "info");
        
        let hasValidClaim = false;
        let claimDetails = [];
        
        for (const claimId of claims) {
          try {
            const claim = await onchainId.getClaim(claimId);
            const isFromTrustedIssuer = trustedIssuerAddresses.some(
              trustedIssuerAddress => trustedIssuerAddress.toLowerCase() === claim.issuer.toLowerCase()
            );
            
            claimDetails.push({
              claimId: claimId.toString(),
              issuer: claim.issuer,
              isFromTrustedIssuer,
              data: claim.data
            });
            
            if (isFromTrustedIssuer) {
              hasValidClaim = true;
              addLog(`  ✅ Valid claim found: ${claimId} from ${claim.issuer}`, "success");
            } else {
              addLog(`  ⚠️ Untrusted claim: ${claimId} from ${claim.issuer}`, "warning");
            }
          } catch (claimError) {
            addLog(`  ❌ Invalid claim ${claimId}: ${claimError.message}`, "error");
            claimDetails.push({
              claimId: claimId.toString(),
              error: claimError.message
            });
          }
        }
        
        verificationDetails.push({
          topicId: topicNum,
          hasValidClaim,
          trustedIssuers: trustedIssuerAddresses,
          claims: claimDetails
        });
        
        if (!hasValidClaim) {
          addLog(`  ❌ No valid claims for topic ${topicNum}`, "error");
        }
      }
      
      // Step 7: Check final verification status
      const isVerified = await ir.isVerified(userAddressToCheck);
      addLog(`Step 7 - Final verification: ${isVerified}`, "info");
      
      // Display detailed results
      let debugMessage = `🔍 Verification Debug Results:\n\n`;
      debugMessage += `User Address: ${userAddressToCheck}\n`;
      debugMessage += `OnchainID: ${onchainIdAddress}\n`;
      debugMessage += `Identity Registry: ${identityRegistryAddress}\n`;
      debugMessage += `TrustedIssuersRegistry: ${tirAddress}\n`;
      debugMessage += `ClaimTopicsRegistry: ${ctrAddress}\n\n`;
      
      debugMessage += `Required Topics: ${requiredTopics.map(t => t.toNumber()).join(', ')}\n\n`;
      
      verificationDetails.forEach(detail => {
        debugMessage += `📋 Topic ${detail.topicId}:\n`;
        debugMessage += `   Valid Claim: ${detail.hasValidClaim ? '✅ YES' : '❌ NO'}\n`;
        debugMessage += `   Trusted Issuers: ${detail.trustedIssuers.join(', ')}\n`;
        debugMessage += `   Claims (${detail.claims.length}):\n`;
        
        detail.claims.forEach(claim => {
          if (claim.error) {
            debugMessage += `     ❌ ${claim.claimId}: ${claim.error}\n`;
          } else {
            debugMessage += `     ${claim.isFromTrustedIssuer ? '✅' : '⚠️'} ${claim.claimId}: ${claim.issuer}\n`;
          }
        });
        debugMessage += `\n`;
      });
      
      debugMessage += `🔍 Final Verification Status: ${isVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;
      
      // Check if all topics have valid claims
      const allTopicsHaveValidClaims = verificationDetails.every(detail => detail.hasValidClaim);
      debugMessage += `All Topics Have Valid Claims: ${allTopicsHaveValidClaims ? '✅ YES' : '❌ NO'}\n`;
      
      if (!isVerified && allTopicsHaveValidClaims) {
        debugMessage += `\n⚠️ WARNING: All topics have valid claims but user is still not verified!\n`;
        debugMessage += `This might indicate an issue with the verification logic or claim data.\n`;
      }
      
      setMessage(debugMessage);
      addLog('Verification debugging completed', "success");
      
    } catch (error) {
      console.error('Error debugging verification:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error debugging verification: ${cleanError}`);
      addLog(`Error debugging verification: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Comprehensive verification diagnostics
  const runComprehensiveDiagnostics = async () => {
    try {
      if (!selectedContracts.Token) {
        setMessage('Please select a token');
        return;
      }

      // Use account 0 if no address is provided
      const addressToCheck = userAddressToCheck.trim() || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      setCheckingVerification(true);
      setMessage('Running comprehensive diagnostics...');
      addLog(`Running comprehensive diagnostics for user: ${addressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      let diagnosticResults = `🔍 COMPREHENSIVE VERIFICATION DIAGNOSTICS\n`;
      diagnosticResults += `==========================================\n\n`;
      diagnosticResults += `User Address: ${addressToCheck}\n`;
      diagnosticResults += `Token: ${selectedContracts.Token}\n\n`;

      // 1. Check Token's Identity Registry
      addLog('1. Checking Token\'s Identity Registry...', "info");
      const tokenIdentityRegistry = await token.identityRegistry();
      diagnosticResults += `1. TOKEN'S IDENTITY REGISTRY:\n`;
      diagnosticResults += `   Address: ${tokenIdentityRegistry}\n`;

      // 2. Check Identity Registry's TrustedIssuersRegistry
      addLog('2. Checking Identity Registry\'s TrustedIssuersRegistry...', "info");
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(tokenIdentityRegistry, irArtifacts.abi, signer);
      
      let irTrustedIssuersRegistry;
      try {
        irTrustedIssuersRegistry = await ir.issuersRegistry();
        diagnosticResults += `2. IDENTITY REGISTRY'S TRUSTED ISSUERS REGISTRY:\n`;
        diagnosticResults += `   Address: ${irTrustedIssuersRegistry}\n`;
      } catch (e) {
        diagnosticResults += `2. IDENTITY REGISTRY'S TRUSTED ISSUERS REGISTRY:\n`;
        diagnosticResults += `   ❌ ERROR: ${e.message}\n`;
      }

      // 3. Check Identity Registry's ClaimTopicsRegistry
      addLog('3. Checking Identity Registry\'s ClaimTopicsRegistry...', "info");
      let irClaimTopicsRegistry;
      try {
        irClaimTopicsRegistry = await ir.topicsRegistry();
        diagnosticResults += `3. IDENTITY REGISTRY'S CLAIM TOPICS REGISTRY:\n`;
        diagnosticResults += `   Address: ${irClaimTopicsRegistry}\n`;
      } catch (e) {
        diagnosticResults += `3. IDENTITY REGISTRY'S CLAIM TOPICS REGISTRY:\n`;
        diagnosticResults += `   ❌ ERROR: ${e.message}\n`;
      }

      // 4. Check if user has OnchainID
      addLog('4. Checking user\'s OnchainID...', "info");
      const onchainIdAddress = await ir.identity(addressToCheck);
      diagnosticResults += `4. USER'S ONCHAINID:\n`;
      diagnosticResults += `   Address: ${onchainIdAddress}\n`;
      diagnosticResults += `   Has OnchainID: ${onchainIdAddress !== '0x0000000000000000000000000000000000000000' ? '✅ YES' : '❌ NO'}\n`;

      if (onchainIdAddress === '0x0000000000000000000000000000000000000000') {
        diagnosticResults += `   ❌ USER HAS NO ONCHAINID - THIS IS THE PROBLEM!\n`;
        setMessage(diagnosticResults);
        return;
      }



      // 5. Check ClaimTopicsRegistry configuration
      addLog('5. Checking ClaimTopicsRegistry configuration...', "info");
      if (irClaimTopicsRegistry) {
        const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
        const ctr = new ethers.Contract(irClaimTopicsRegistry, ctrArtifacts.abi, signer);
        
        try {
          const requiredTopics = await ctr.getClaimTopics();
          diagnosticResults += `5. CLAIM TOPICS REGISTRY:\n`;
          diagnosticResults += `   Address: ${irClaimTopicsRegistry}\n`;
          diagnosticResults += `   Required topics: ${requiredTopics.map(t => t.toNumber()).join(', ')}\n`;
        } catch (e) {
          diagnosticResults += `5. CLAIM TOPICS REGISTRY:\n`;
          diagnosticResults += `   Address: ${irClaimTopicsRegistry}\n`;
          diagnosticResults += `   ❌ ERROR getting topics: ${e.message}\n`;
        }
      }

      // 6. Check OnchainID claims in detail
      addLog('6. Checking OnchainID claims in detail...', "info");
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      if (irClaimTopicsRegistry && irTrustedIssuersRegistry) {
        const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
        const ctr = new ethers.Contract(irClaimTopicsRegistry, ctrArtifacts.abi, signer);
        const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
        const tir = new ethers.Contract(irTrustedIssuersRegistry, tirArtifacts.abi, signer);
        
        const requiredTopics = await ctr.getClaimTopics();
        diagnosticResults += `6. ONCHAINID CLAIMS ANALYSIS:\n`;
        
        for (const topicId of requiredTopics) {
          const topicNum = topicId.toNumber();
          addLog(`   Checking topic ${topicNum}...`, "info");
          
          try {
            const claims = await onchainId.getClaimIdsByTopic(topicNum);
            const trustedIssuers = await tir.getTrustedIssuersForClaimTopic(topicNum);
            const trustedIssuerAddresses = trustedIssuers.map(issuer => issuer.toString());
            
            diagnosticResults += `   Topic ${topicNum}: ${claims.length} claims, ${trustedIssuerAddresses.length} trusted issuers\n`;
            
            if (claims.length === 0) {
              diagnosticResults += `   ❌ NO CLAIMS FOR TOPIC ${topicNum}\n`;
            } else {
              let hasValidClaim = false;
              for (const claimId of claims) {
                try {
                  const claim = await onchainId.getClaim(claimId);
                  const isFromTrustedIssuer = trustedIssuerAddresses.some(
                    trustedIssuerAddress => trustedIssuerAddress.toLowerCase() === claim.issuer.toLowerCase()
                  );
                  
                  if (isFromTrustedIssuer) {
                    hasValidClaim = true;
                    diagnosticResults += `   ✅ Valid claim ${claimId} from ${claim.issuer}\n`;
                  } else {
                    diagnosticResults += `   ⚠️ Untrusted claim ${claimId} from ${claim.issuer}\n`;
                  }
                } catch (claimError) {
                  diagnosticResults += `   ❌ Invalid claim ${claimId}: ${claimError.message}\n`;
                }
              }
              
              if (!hasValidClaim) {
                diagnosticResults += `   ❌ NO VALID CLAIMS FOR TOPIC ${topicNum}\n`;
              }
            }
          } catch (topicError) {
            diagnosticResults += `   ❌ ERROR checking topic ${topicNum}: ${topicError.message}\n`;
          }
        }
      }

      // 7. Check final verification status
      addLog('7. Checking final verification status...', "info");
      const isVerified = await ir.isVerified(addressToCheck);
      diagnosticResults += `7. FINAL VERIFICATION STATUS:\n`;
      diagnosticResults += `   Result: ${isVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;

      // 8. Check if there's a mismatch between expected and actual registries
      diagnosticResults += `8. REGISTRY CONFIGURATION CHECK:\n`;
      
      // Check if the token's IR matches the IR where claims were added
      const expectedIR = tokenIdentityRegistry;
      diagnosticResults += `   Token's IR: ${expectedIR}\n`;
      
      // Check if the IR's TIR matches the TIR where trusted issuers were added
      if (irTrustedIssuersRegistry) {
        diagnosticResults += `   IR's TIR: ${irTrustedIssuersRegistry}\n`;
        
        // Check if the IR's CTR matches the CTR where topics were added
        if (irClaimTopicsRegistry) {
          diagnosticResults += `   IR's CTR: ${irClaimTopicsRegistry}\n`;
        }
      }

      // 9. Recommendations
      diagnosticResults += `\n9. RECOMMENDATIONS:\n`;
      if (!isVerified) {
        diagnosticResults += `   ❌ User is not verified. Check the issues above.\n`;
        

        
        diagnosticResults += `   🔧 FIX: Ensure all required topics have valid claims from trusted issuers\n`;
        diagnosticResults += `   🔧 FIX: Check claim data format and signatures\n`;
        diagnosticResults += `   🔧 FIX: Verify registry addresses are correctly configured\n`;
      } else {
        diagnosticResults += `   ✅ User is verified - no issues found!\n`;
      }

      setMessage(diagnosticResults);
      addLog('Comprehensive diagnostics completed', "success");
      
    } catch (error) {
      console.error('Error running comprehensive diagnostics:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error running diagnostics: ${cleanError}`);
      addLog(`Error running diagnostics: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Check and fix IdentityRegistry initialization
  const checkAndFixIdentityRegistry = async () => {
    try {
      if (!selectedContracts.Token) {
        setMessage('Please select a token first');
        return;
      }

      setCheckingVerification(true);
      setMessage('Checking IdentityRegistry initialization...');
      addLog('Checking IdentityRegistry initialization', "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      // Get the Identity Registry from the token
      const identityRegistryAddress = await token.identityRegistry();
      addLog(`Token's Identity Registry: ${identityRegistryAddress}`, "info");
      
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      let fixMessage = `🔧 IDENTITY REGISTRY DIAGNOSTICS & FIX\n`;
      fixMessage += `=====================================\n\n`;
      fixMessage += `Identity Registry: ${identityRegistryAddress}\n\n`;
      
      // Check if IdentityRegistry has the required functions
      let hasTrustedIssuersRegistry = false;
      let hasTopicsRegistry = false;
      let hasIssuersRegistry = false;
      
      try {
        await ir.trustedIssuersRegistry();
        hasTrustedIssuersRegistry = true;
        addLog('✅ trustedIssuersRegistry() function exists', "success");
      } catch (e) {
        addLog('❌ trustedIssuersRegistry() function missing', "error");
      }
      
      try {
        await ir.topicsRegistry();
        hasTopicsRegistry = true;
        addLog('✅ topicsRegistry() function exists', "success");
      } catch (e) {
        addLog('❌ topicsRegistry() function missing', "error");
      }
      
      try {
        await ir.issuersRegistry();
        hasIssuersRegistry = true;
        addLog('✅ issuersRegistry() function exists', "success");
      } catch (e) {
        addLog('❌ issuersRegistry() function missing', "error");
      }
      
      fixMessage += `Function Check:\n`;
      fixMessage += `  trustedIssuersRegistry(): ${hasTrustedIssuersRegistry ? '✅' : '❌'}\n`;
      fixMessage += `  topicsRegistry(): ${hasTopicsRegistry ? '✅' : '❌'}\n`;
      fixMessage += `  issuersRegistry(): ${hasIssuersRegistry ? '✅' : '❌'}\n\n`;
      
      if (!hasTrustedIssuersRegistry && !hasIssuersRegistry) {
        fixMessage += `❌ CRITICAL ISSUE: IdentityRegistry is missing required functions!\n`;
        fixMessage += `This suggests the contract is not properly initialized.\n\n`;
        
        // Check if we can find the correct registries from deployed contracts
        const deployedTIR = deployedContracts.TrustedIssuersRegistry && deployedContracts.TrustedIssuersRegistry[0];
        const deployedCTR = deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0];
        const deployedIRS = deployedContracts.IdentityRegistryStorage && deployedContracts.IdentityRegistryStorage[0];
        
        fixMessage += `Available Registries:\n`;
        fixMessage += `  TrustedIssuersRegistry: ${deployedTIR || 'Not found'}\n`;
        fixMessage += `  ClaimTopicsRegistry: ${deployedCTR || 'Not found'}\n`;
        fixMessage += `  IdentityRegistryStorage: ${deployedIRS || 'Not found'}\n\n`;
        
        if (deployedTIR && deployedCTR && deployedIRS) {
          fixMessage += `🔧 SOLUTION: Re-initialize IdentityRegistry with correct addresses\n`;
          fixMessage += `This will connect the IdentityRegistry to the proper registries.\n\n`;
          
          // Add a button to re-initialize
          fixMessage += `Click "Re-initialize IdentityRegistry" to fix this issue.\n`;
        } else {
          fixMessage += `❌ Cannot fix: Missing required registry contracts.\n`;
          fixMessage += `Please deploy TrustedIssuersRegistry, ClaimTopicsRegistry, and IdentityRegistryStorage first.\n`;
        }
      } else {
        // Check current registry connections
        let currentTIR = 'Unknown';
        let currentCTR = 'Unknown';
        
        if (hasIssuersRegistry) {
          try {
            currentTIR = await ir.issuersRegistry();
            fixMessage += `Current TrustedIssuersRegistry: ${currentTIR}\n`;
          } catch (e) {
            fixMessage += `Error getting TrustedIssuersRegistry: ${e.message}\n`;
          }
        }
        
        if (hasTopicsRegistry) {
          try {
            currentCTR = await ir.topicsRegistry();
            fixMessage += `Current ClaimTopicsRegistry: ${currentCTR}\n`;
          } catch (e) {
            fixMessage += `Error getting ClaimTopicsRegistry: ${e.message}\n`;
          }
        }
        
        // Check if they match the expected registries
        const expectedTIR = deployedContracts.TrustedIssuersRegistry && deployedContracts.TrustedIssuersRegistry[0];
        const expectedCTR = deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0];
        
        if (expectedTIR && currentTIR !== expectedTIR) {
          fixMessage += `⚠️ MISMATCH: TrustedIssuersRegistry doesn't match expected address\n`;
          fixMessage += `  Expected: ${expectedTIR}\n`;
          fixMessage += `  Current: ${currentTIR}\n`;
        }
        
        if (expectedCTR && currentCTR !== expectedCTR) {
          fixMessage += `⚠️ MISMATCH: ClaimTopicsRegistry doesn't match expected address\n`;
          fixMessage += `  Expected: ${expectedCTR}\n`;
          fixMessage += `  Current: ${currentCTR}\n`;
        }
      }
      
      setMessage(fixMessage);
      addLog('IdentityRegistry diagnostics completed', "success");
      
    } catch (error) {
      console.error('Error checking IdentityRegistry:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking IdentityRegistry: ${cleanError}`);
      addLog(`Error checking IdentityRegistry: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Re-initialize IdentityRegistry with correct addresses
  const reinitializeIdentityRegistry = async () => {
    try {
      if (!selectedContracts.Token) {
        setMessage('Please select a token first');
        return;
      }

      setCheckingVerification(true);
      setMessage('Re-initializing IdentityRegistry...');
      addLog('Re-initializing IdentityRegistry with correct addresses', "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      // Get the Identity Registry from the token
      const identityRegistryAddress = await token.identityRegistry();
      addLog(`Identity Registry to fix: ${identityRegistryAddress}`, "info");
      
      // Get the correct registry addresses
      const trustedIssuersRegistry = deployedContracts.TrustedIssuersRegistry && deployedContracts.TrustedIssuersRegistry[0];
      const claimTopicsRegistry = deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0];
      const identityRegistryStorage = deployedContracts.IdentityRegistryStorage && deployedContracts.IdentityRegistryStorage[0];
      
      if (!trustedIssuersRegistry || !claimTopicsRegistry || !identityRegistryStorage) {
        setMessage('❌ Missing required registry contracts. Please deploy all registries first.');
        return;
      }
      
      addLog(`Using TrustedIssuersRegistry: ${trustedIssuersRegistry}`, "info");
      addLog(`Using ClaimTopicsRegistry: ${claimTopicsRegistry}`, "info");
      addLog(`Using IdentityRegistryStorage: ${identityRegistryStorage}`, "info");
      
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      // Re-initialize the IdentityRegistry
      addLog('Re-initializing IdentityRegistry...', "info");
      const initTx = await ir.init(trustedIssuersRegistry, claimTopicsRegistry, identityRegistryStorage);
      await initTx.wait();
      addLog('IdentityRegistry re-initialized successfully', "success");
      
      // Verify the fix
      try {
        const newTIR = await ir.issuersRegistry();
        const newCTR = await ir.topicsRegistry();
        addLog(`Verification - TrustedIssuersRegistry: ${newTIR}`, "info");
        addLog(`Verification - ClaimTopicsRegistry: ${newCTR}`, "info");
        
        if (newTIR.toLowerCase() === trustedIssuersRegistry.toLowerCase() && 
            newCTR.toLowerCase() === claimTopicsRegistry.toLowerCase()) {
          setMessage('✅ IdentityRegistry successfully re-initialized! Try verification again.');
          addLog('IdentityRegistry fix verified successfully', "success");
        } else {
          setMessage('⚠️ IdentityRegistry re-initialized but addresses don\'t match. Check manually.');
          addLog('IdentityRegistry fix may not have worked correctly', "warning");
        }
      } catch (verifyError) {
        setMessage('⚠️ IdentityRegistry re-initialized but verification failed. Check manually.');
        addLog(`Verification error: ${verifyError.message}`, "warning");
      }
      
    } catch (error) {
      console.error('Error re-initializing IdentityRegistry:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error re-initializing IdentityRegistry: ${cleanError}`);
      addLog(`Error re-initializing IdentityRegistry: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Test verification directly with the working registries
  const testVerificationDirectly = async () => {
    try {
      if (!selectedContracts.Token || !userAddressToCheck.trim()) {
        setMessage('Please select a token and enter a user address');
        return;
      }

      setCheckingVerification(true);
      setMessage('Testing verification directly...');
      addLog(`Testing verification directly for user: ${userAddressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      // Get the Identity Registry from the token
      const identityRegistryAddress = await token.identityRegistry();
      addLog(`Identity Registry: ${identityRegistryAddress}`, "info");
      
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      // Get the registries using the working functions
      const trustedIssuersRegistry = await ir.issuersRegistry();
      const claimTopicsRegistry = await ir.topicsRegistry();
      
      addLog(`TrustedIssuersRegistry: ${trustedIssuersRegistry}`, "info");
      addLog(`ClaimTopicsRegistry: ${claimTopicsRegistry}`, "info");
      
      // Get user's OnchainID
      const onchainIdAddress = await ir.identity(userAddressToCheck);
      addLog(`User's OnchainID: ${onchainIdAddress}`, "info");
      
      // Get the registries
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(trustedIssuersRegistry, tirArtifacts.abi, signer);
      
      const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
      const ctr = new ethers.Contract(claimTopicsRegistry, ctrArtifacts.abi, signer);
      
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // Get required topics
      const requiredTopics = await ctr.getClaimTopics();
      addLog(`Required topics: ${requiredTopics.map(t => t.toNumber()).join(', ')}`, "info");
      
      let testResults = `🔍 DIRECT VERIFICATION TEST\n`;
      testResults += `==========================\n\n`;
      testResults += `User: ${userAddressToCheck}\n`;
      testResults += `OnchainID: ${onchainIdAddress}\n`;
      testResults += `TrustedIssuersRegistry: ${trustedIssuersRegistry}\n`;
      testResults += `ClaimTopicsRegistry: ${claimTopicsRegistry}\n\n`;
      
      // Check each topic manually
      let allTopicsValid = true;
      
      for (const topicId of requiredTopics) {
        const topicNum = topicId.toNumber();
        addLog(`Checking topic ${topicNum}...`, "info");
        
        // Get trusted issuers for this topic
        const trustedIssuers = await tir.getTrustedIssuersForClaimTopic(topicNum);
        const trustedIssuerAddresses = trustedIssuers.map(issuer => issuer.toString());
        
        // Get claims for this topic
        const claims = await onchainId.getClaimIdsByTopic(topicNum);
        
        testResults += `Topic ${topicNum}:\n`;
        testResults += `  Trusted issuers: ${trustedIssuerAddresses.join(', ')}\n`;
        testResults += `  Claims found: ${claims.length}\n`;
        
        if (claims.length === 0) {
          testResults += `  ❌ NO CLAIMS\n`;
          allTopicsValid = false;
        } else {
          let hasValidClaim = false;
          for (const claimId of claims) {
            try {
              const claim = await onchainId.getClaim(claimId);
              const isFromTrustedIssuer = trustedIssuerAddresses.some(
                trustedIssuerAddress => trustedIssuerAddress.toLowerCase() === claim.issuer.toLowerCase()
              );
              
              if (isFromTrustedIssuer) {
                hasValidClaim = true;
                testResults += `  ✅ Valid claim ${claimId} from ${claim.issuer}\n`;
                break;
              } else {
                testResults += `  ⚠️ Untrusted claim ${claimId} from ${claim.issuer}\n`;
              }
            } catch (claimError) {
              testResults += `  ❌ Invalid claim ${claimId}: ${claimError.message}\n`;
            }
          }
          
          if (!hasValidClaim) {
            testResults += `  ❌ NO VALID CLAIMS\n`;
            allTopicsValid = false;
          }
        }
        testResults += `\n`;
      }
      
      // Test the actual verification
      const isVerified = await ir.isVerified(userAddressToCheck);
      testResults += `Final Verification Result: ${isVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;
      testResults += `All Topics Valid: ${allTopicsValid ? '✅ YES' : '❌ NO'}\n`;
      
      if (!isVerified && allTopicsValid) {
        testResults += `\n⚠️ WARNING: All topics have valid claims but verification still fails!\n`;
        testResults += `This suggests an issue with the verification logic itself.\n`;
      }
      
      setMessage(testResults);
      addLog('Direct verification test completed', "success");
      
    } catch (error) {
      console.error('Error testing verification directly:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error testing verification: ${cleanError}`);
      addLog(`Error testing verification: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Debug the isVerified function implementation
  const debugIsVerifiedImplementation = async () => {
    try {
      if (!selectedContracts.Token || !userAddressToCheck.trim()) {
        setMessage('Please select a token and enter a user address');
        return;
      }

      setCheckingVerification(true);
      setMessage('Debugging isVerified implementation...');
      addLog(`Debugging isVerified for user: ${userAddressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      const identityRegistryAddress = await token.identityRegistry();
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      let debugResults = `🔍 ISVERIFIED IMPLEMENTATION DEBUG\n`;
      debugResults += `==================================\n\n`;
      debugResults += `User: ${userAddressToCheck}\n`;
      debugResults += `Identity Registry: ${identityRegistryAddress}\n\n`;
      
      // Get user's OnchainID
      const onchainIdAddress = await ir.identity(userAddressToCheck);
      debugResults += `OnchainID: ${onchainIdAddress}\n\n`;
      
      // Check if user has an identity
      if (onchainIdAddress === '0x0000000000000000000000000000000000000000') {
        debugResults += `❌ User has no OnchainID - this would cause verification to fail\n`;
        setMessage(debugResults);
        return;
      }
      
      // Get the registries
      const trustedIssuersRegistry = await ir.issuersRegistry();
      const claimTopicsRegistry = await ir.topicsRegistry();
      
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(trustedIssuersRegistry, tirArtifacts.abi, signer);
      
      const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
      const ctr = new ethers.Contract(claimTopicsRegistry, ctrArtifacts.abi, signer);
      
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // Get required topics
      const requiredTopics = await ctr.getClaimTopics();
      debugResults += `Required Topics: ${requiredTopics.map(t => t.toNumber()).join(', ')}\n\n`;
      
      // Test each step of the verification process
      debugResults += `STEP-BY-STEP VERIFICATION PROCESS:\n`;
      debugResults += `==================================\n\n`;
      
      let verificationSteps = [];
      
      for (const topicId of requiredTopics) {
        const topicNum = topicId.toNumber();
        addLog(`Debugging topic ${topicNum}...`, "info");
        
        let stepResult = {
          topic: topicNum,
          hasClaims: false,
          hasValidClaim: false,
          claimDetails: [],
          trustedIssuers: []
        };
        
        // Get trusted issuers for this topic
        const trustedIssuers = await tir.getTrustedIssuersForClaimTopic(topicNum);
        stepResult.trustedIssuers = trustedIssuers.map(issuer => issuer.toString());
        
        // Check if user has claims for this topic
        const claims = await onchainId.getClaimIdsByTopic(topicNum);
        stepResult.hasClaims = claims.length > 0;
        
        if (claims.length > 0) {
          for (const claimId of claims) {
            try {
              const claim = await onchainId.getClaim(claimId);
              const isFromTrustedIssuer = stepResult.trustedIssuers.some(
                trustedIssuerAddress => trustedIssuerAddress.toLowerCase() === claim.issuer.toLowerCase()
              );
              
              stepResult.claimDetails.push({
                claimId: claimId.toString(),
                issuer: claim.issuer,
                isFromTrustedIssuer,
                data: claim.data
              });
              
              if (isFromTrustedIssuer) {
                stepResult.hasValidClaim = true;
              }
            } catch (claimError) {
              stepResult.claimDetails.push({
                claimId: claimId.toString(),
                error: claimError.message
              });
            }
          }
        }
        
        verificationSteps.push(stepResult);
        
        debugResults += `Topic ${topicNum}:\n`;
        debugResults += `  Has Claims: ${stepResult.hasClaims ? '✅ YES' : '❌ NO'}\n`;
        debugResults += `  Has Valid Claim: ${stepResult.hasValidClaim ? '✅ YES' : '❌ NO'}\n`;
        debugResults += `  Trusted Issuers: ${stepResult.trustedIssuers.join(', ')}\n`;
        
        if (stepResult.claimDetails.length > 0) {
          debugResults += `  Claims:\n`;
          stepResult.claimDetails.forEach(claim => {
            if (claim.error) {
              debugResults += `    ❌ ${claim.claimId}: ${claim.error}\n`;
            } else {
              debugResults += `    ${claim.isFromTrustedIssuer ? '✅' : '⚠️'} ${claim.claimId} from ${claim.issuer}\n`;
            }
          });
        }
        debugResults += `\n`;
      }
      
      // Check if all topics have valid claims
      const allTopicsValid = verificationSteps.every(step => step.hasValidClaim);
      debugResults += `SUMMARY:\n`;
      debugResults += `========\n`;
      debugResults += `All Topics Have Valid Claims: ${allTopicsValid ? '✅ YES' : '❌ NO'}\n`;
      
      // Test the actual isVerified call
      const isVerified = await ir.isVerified(userAddressToCheck);
      debugResults += `isVerified() Result: ${isVerified ? '✅ TRUE' : '❌ FALSE'}\n\n`;
      
      if (!isVerified && allTopicsValid) {
        debugResults += `🚨 CRITICAL ISSUE DETECTED!\n`;
        debugResults += `All topics have valid claims, but isVerified() returns false.\n`;
        debugResults += `This indicates a bug in the IdentityRegistry's isVerified() implementation.\n\n`;
        
        // Try to identify the specific issue
        debugResults += `POSSIBLE CAUSES:\n`;
        debugResults += `1. Claim signature verification failing\n`;
        debugResults += `2. Claim expiration/revocation check failing\n`;
        debugResults += `3. Claim data format validation failing\n`;
        debugResults += `4. Bug in the verification loop logic\n`;
        debugResults += `5. Incorrect topic ID comparison\n\n`;
        
        debugResults += `RECOMMENDED FIXES:\n`;
        debugResults += `1. Check claim signatures manually\n`;
        debugResults += `2. Verify claim data format\n`;
        debugResults += `3. Check if claims are expired/revoked\n`;
        debugResults += `4. Try minting to OnchainID address instead of main address\n`;
        debugResults += `5. Consider redeploying IdentityRegistry with a different version\n`;
      }
      
      setMessage(debugResults);
      addLog('isVerified implementation debug completed', "success");
      
    } catch (error) {
      console.error('Error debugging isVerified implementation:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error debugging isVerified: ${cleanError}`);
      addLog(`Error debugging isVerified: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Check for data type mismatches (string vs uint256)
  const checkDataTypeMismatches = async () => {
    try {
      if (!selectedContracts.Token || !userAddressToCheck.trim()) {
        setMessage('Please select a token and enter a user address');
        return;
      }

      setCheckingVerification(true);
      setMessage('Checking for data type mismatches...');
      addLog(`Checking data types for user: ${userAddressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      const identityRegistryAddress = await token.identityRegistry();
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      let typeResults = `🔍 DATA TYPE MISMATCH ANALYSIS\n`;
      typeResults += `================================\n\n`;
      typeResults += `User: ${userAddressToCheck}\n`;
      typeResults += `Identity Registry: ${identityRegistryAddress}\n\n`;
      
      // Get user's OnchainID
      const onchainIdAddress = await ir.identity(userAddressToCheck);
      typeResults += `OnchainID: ${onchainIdAddress}\n\n`;
      
      // Get the registries
      const trustedIssuersRegistry = await ir.issuersRegistry();
      const claimTopicsRegistry = await ir.topicsRegistry();
      
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(trustedIssuersRegistry, tirArtifacts.abi, signer);
      
      const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
      const ctr = new ethers.Contract(claimTopicsRegistry, ctrArtifacts.abi, signer);
      
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // Get required topics and check their types
      const requiredTopics = await ctr.getClaimTopics();
      typeResults += `REQUIRED TOPICS ANALYSIS:\n`;
      typeResults += `========================\n`;
      typeResults += `Raw topics from contract: ${JSON.stringify(requiredTopics)}\n`;
      typeResults += `Topics as numbers: ${requiredTopics.map(t => t.toNumber()).join(', ')}\n`;
      typeResults += `Topics as strings: ${requiredTopics.map(t => t.toString()).join(', ')}\n`;
      typeResults += `Topics as hex: ${requiredTopics.map(t => t.toHexString()).join(', ')}\n\n`;
      
      // Check each topic's data type in detail
      for (const topicId of requiredTopics) {
        const topicNum = topicId.toNumber();
        const topicString = topicId.toString();
        const topicHex = topicId.toHexString();
        
        typeResults += `Topic ${topicNum}:\n`;
        typeResults += `  As BigNumber: ${topicId.toString()}\n`;
        typeResults += `  As number: ${topicNum}\n`;
        typeResults += `  As string: "${topicString}"\n`;
        typeResults += `  As hex: ${topicHex}\n`;
        typeResults += `  Type: ${typeof topicNum}\n\n`;
      }
      
      // Check claims and their topic IDs
      typeResults += `CLAIMS ANALYSIS:\n`;
      typeResults += `================\n`;
      
      for (const topicId of requiredTopics) {
        const topicNum = topicId.toNumber();
        addLog(`Checking claims for topic ${topicNum}...`, "info");
        
        // Get claims for this topic
        const claims = await onchainId.getClaimIdsByTopic(topicNum);
        typeResults += `Topic ${topicNum} claims:\n`;
        typeResults += `  Claims found: ${claims.length}\n`;
        
        if (claims.length > 0) {
          for (const claimId of claims) {
            try {
              const claim = await onchainId.getClaim(claimId);
              typeResults += `  Claim ${claimId}:\n`;
              typeResults += `    Topic: ${claim.topic} (type: ${typeof claim.topic})\n`;
              typeResults += `    Topic as number: ${claim.topic.toNumber()}\n`;
              typeResults += `    Topic as string: "${claim.topic.toString()}"\n`;
              typeResults += `    Issuer: ${claim.issuer}\n`;
              typeResults += `    Data: ${claim.data}\n`;
              
              // Check if topic matches
              const topicMatches = claim.topic.toNumber() === topicNum;
              typeResults += `    Topic matches required: ${topicMatches ? '✅ YES' : '❌ NO'}\n`;
              
              if (!topicMatches) {
                typeResults += `    ⚠️ MISMATCH: Claim topic ${claim.topic.toNumber()} != Required topic ${topicNum}\n`;
              }
              
            } catch (claimError) {
              typeResults += `  ❌ Error reading claim ${claimId}: ${claimError.message}\n`;
            }
          }
        }
        typeResults += `\n`;
      }
      
      // Test different topic formats
      typeResults += `TOPIC FORMAT TESTING:\n`;
      typeResults += `====================\n`;
      
      for (const topicId of requiredTopics) {
        const topicNum = topicId.toNumber();
        
        // Test with number
        try {
          const claimsAsNumber = await onchainId.getClaimIdsByTopic(topicNum);
          typeResults += `Topic ${topicNum} (as number): ${claimsAsNumber.length} claims\n`;
        } catch (e) {
          typeResults += `Topic ${topicNum} (as number): ERROR - ${e.message}\n`;
        }
        
        // Test with string
        try {
          const claimsAsString = await onchainId.getClaimIdsByTopic(topicNum.toString());
          typeResults += `Topic ${topicNum} (as string): ${claimsAsString.length} claims\n`;
        } catch (e) {
          typeResults += `Topic ${topicNum} (as string): ERROR - ${e.message}\n`;
        }
        
        // Test with BigNumber
        try {
          const claimsAsBigNumber = await onchainId.getClaimIdsByTopic(topicId);
          typeResults += `Topic ${topicNum} (as BigNumber): ${claimsAsBigNumber.length} claims\n`;
        } catch (e) {
          typeResults += `Topic ${topicNum} (as BigNumber): ERROR - ${e.message}\n`;
        }
        
        typeResults += `\n`;
      }
      
      // Check if there's a mismatch between how topics are stored vs retrieved
      typeResults += `POTENTIAL ISSUES FOUND:\n`;
      typeResults += `======================\n`;
      
      let issuesFound = false;
      
      // Check if topics are stored as strings but compared as numbers
      for (const topicId of requiredTopics) {
        const topicNum = topicId.toNumber();
        const claimsAsNumber = await onchainId.getClaimIdsByTopic(topicNum);
        const claimsAsString = await onchainId.getClaimIdsByTopic(topicNum.toString());
        
        if (claimsAsNumber.length !== claimsAsString.length) {
          typeResults += `❌ MISMATCH: Topic ${topicNum} has ${claimsAsNumber.length} claims as number but ${claimsAsString.length} as string\n`;
          issuesFound = true;
        }
      }
      
      if (!issuesFound) {
        typeResults += `✅ No obvious data type mismatches found\n`;
      }
      
      // Test the actual verification with different topic formats
      typeResults += `\nVERIFICATION TEST WITH DIFFERENT FORMATS:\n`;
      typeResults += `========================================\n`;
      
      const isVerified = await ir.isVerified(userAddressToCheck);
      typeResults += `Standard isVerified(): ${isVerified ? '✅ TRUE' : '❌ FALSE'}\n`;
      
      setMessage(typeResults);
      addLog('Data type mismatch analysis completed', "success");
      
    } catch (error) {
      console.error('Error checking data type mismatches:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking data types: ${cleanError}`);
      addLog(`Error checking data types: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Test the most likely remaining issues
  const testRemainingIssues = async () => {
    try {
      if (!selectedContracts.Token || !userAddressToCheck.trim()) {
        setMessage('Please select a token and enter a user address');
        return;
      }

      setCheckingVerification(true);
      setMessage('Testing remaining potential issues...');
      addLog(`Testing remaining issues for user: ${userAddressToCheck}`, "info");

      const signer = await getSigner();
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(selectedContracts.Token, tokenArtifacts.abi, signer);
      
      const identityRegistryAddress = await token.identityRegistry();
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      let testResults = `🔍 REMAINING ISSUES TEST\n`;
      testResults += `========================\n\n`;
      testResults += `User: ${userAddressToCheck}\n`;
      testResults += `Identity Registry: ${identityRegistryAddress}\n\n`;
      
      // Get user's OnchainID
      const onchainIdAddress = await ir.identity(userAddressToCheck);
      testResults += `OnchainID: ${onchainIdAddress}\n\n`;
      
      // Get the registries
      const trustedIssuersRegistry = await ir.issuersRegistry();
      const claimTopicsRegistry = await ir.topicsRegistry();
      
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(trustedIssuersRegistry, tirArtifacts.abi, signer);
      
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // Test 1: Check if claims are expired/revoked
      testResults += `TEST 1: CLAIM EXPIRATION/REVOCATION\n`;
      testResults += `==================================\n`;
      
      const requiredTopics = [1, 2, 3, 4, 5];
      for (const topicNum of requiredTopics) {
        const claims = await onchainId.getClaimIdsByTopic(topicNum);
        if (claims.length > 0) {
          const claim = await onchainId.getClaim(claims[0]);
          testResults += `Topic ${topicNum}:\n`;
          testResults += `  Claim ID: ${claims[0]}\n`;
          testResults += `  Issuer: ${claim.issuer}\n`;
          testResults += `  Scheme: ${claim.scheme}\n`;
          testResults += `  Signature: ${claim.signature}\n`;
          testResults += `  Data: ${claim.data}\n`;
          testResults += `  URI: ${claim.uri}\n`;
          
          // Check if claim is revoked
          try {
            const isRevoked = await onchainId.isClaimRevoked(claims[0]);
            testResults += `  Is Revoked: ${isRevoked ? '❌ YES' : '✅ NO'}\n`;
          } catch (e) {
            testResults += `  Revocation Check: Not available\n`;
          }
          
          // Check claim expiration if available
          try {
            const expiration = await onchainId.getClaimExpiration(claims[0]);
            const now = Math.floor(Date.now() / 1000);
            const isExpired = expiration.toNumber() < now;
            testResults += `  Expiration: ${expiration.toNumber()} (${isExpired ? '❌ EXPIRED' : '✅ VALID'})\n`;
          } catch (e) {
            testResults += `  Expiration Check: Not available\n`;
          }
          
          testResults += `\n`;
        }
      }
      
      // Test 2: Check claim signature verification
      testResults += `TEST 2: CLAIM SIGNATURE VERIFICATION\n`;
      testResults += `====================================\n`;
      
      for (const topicNum of requiredTopics) {
        const claims = await onchainId.getClaimIdsByTopic(topicNum);
        if (claims.length > 0) {
          const claim = await onchainId.getClaim(claims[0]);
          
          // Try to verify the claim signature
          try {
            const isValid = await onchainId.isClaimValid(claims[0]);
            testResults += `Topic ${topicNum} Claim ${claims[0]}: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`;
          } catch (e) {
            testResults += `Topic ${topicNum} Claim ${claims[0]}: Signature verification not available\n`;
          }
        }
      }
      testResults += `\n`;
      
      // Test 3: Check if OnchainID has proper keys
      testResults += `TEST 3: ONCHAINID KEY VERIFICATION\n`;
      testResults += `==================================\n`;
      
      try {
        const keyCount = await onchainId.getKeyCount();
        testResults += `Key Count: ${keyCount.toNumber()}\n`;
        
        for (let i = 0; i < keyCount.toNumber(); i++) {
          try {
            const key = await onchainId.getKeyByIndex(i);
            testResults += `Key ${i}: ${key}\n`;
          } catch (e) {
            testResults += `Key ${i}: Error reading key\n`;
          }
        }
      } catch (e) {
        testResults += `Key verification not available\n`;
      }
      testResults += `\n`;
      
      // Test 4: Try minting to OnchainID address directly
      testResults += `TEST 4: DIRECT ONCHAINID VERIFICATION\n`;
      testResults += `======================================\n`;
      
      try {
        const isOnchainIdVerified = await ir.isVerified(onchainIdAddress);
        testResults += `OnchainID verification: ${isOnchainIdVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;
        
        if (isOnchainIdVerified) {
          testResults += `🎉 SUCCESS: OnchainID is verified! Try minting to OnchainID address.\n`;
        } else {
          testResults += `❌ OnchainID is also not verified - this confirms a deeper issue.\n`;
        }
      } catch (e) {
        testResults += `Error checking OnchainID verification: ${e.message}\n`;
      }
      testResults += `\n`;
      
      // Test 5: Check if there's a different verification function
      testResults += `TEST 5: ALTERNATIVE VERIFICATION FUNCTIONS\n`;
      testResults += `==========================================\n`;
      
      // Check if there are other verification functions
      const irFunctions = irArtifacts.abi.filter(item => 
        item.type === 'function' && 
        (item.name.toLowerCase().includes('verify') || item.name.toLowerCase().includes('check'))
      );
      
      testResults += `Available verification functions:\n`;
      irFunctions.forEach(func => {
        testResults += `  - ${func.name}\n`;
      });
      
      if (irFunctions.length === 0) {
        testResults += `  No alternative verification functions found\n`;
      }
      testResults += `\n`;
      
      // Final recommendation
      testResults += `RECOMMENDATIONS:\n`;
      testResults += `===============\n`;
      
      const isOnchainIdVerified = await ir.isVerified(onchainIdAddress);
      if (isOnchainIdVerified) {
        testResults += `✅ SOLUTION: Mint tokens to OnchainID address: ${onchainIdAddress}\n`;
        testResults += `   This bypasses the main address verification issue.\n`;
      } else {
        testResults += `❌ Both main address and OnchainID are not verified.\n`;
        testResults += `   This suggests a fundamental issue with the verification logic.\n`;
        testResults += `   Consider:\n`;
        testResults += `   1. Redeploying IdentityRegistry\n`;
        testResults += `   2. Using a different T-REX version\n`;
        testResults += `   3. Checking claim signature schemes\n`;
      }
      
      setMessage(testResults);
      addLog('Remaining issues test completed', "success");
      
    } catch (error) {
      console.error('Error testing remaining issues:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error testing remaining issues: ${cleanError}`);
      addLog(`Error testing remaining issues: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  const testComplianceBypass = async () => {
    try {
      setCheckingVerification(true);
      addLog('Testing compliance bypass to isolate verification issues...', "info");
      
      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      
      // Get token address
      const tokenAddress = selectedContracts.Token || deployedContracts.Token?.[0];
      if (!tokenAddress) {
        addLog('No token deployed', "error");
        return;
      }
      
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      // Test 1: Check IdentityRegistry.isVerified() directly (bypassing compliance)
      try {
        const irAddress = await token.identityRegistry();
        addLog(`IdentityRegistry address: ${irAddress}`, "info");
        
        const irArtifacts = getContractArtifacts('IdentityRegistry');
        const ir = new ethers.Contract(irAddress, irArtifacts.abi, signer);
        
        // Check what functions are available on IdentityRegistry
        addLog('Available IdentityRegistry functions:', "info");
        irArtifacts.abi.filter(item => item.type === 'function' && item.name.toLowerCase().includes('verify')).forEach(func => {
          addLog(`  - ${func.name}`, "info");
        });
        
        const isVerifiedIR = await ir.isVerified(userAddress);
        addLog(`IdentityRegistry.isVerified(${userAddress}): ${isVerifiedIR}`, isVerifiedIR ? "success" : "error");
        
        if (!isVerifiedIR) {
          addLog('❌ IdentityRegistry verification failed - this is the root cause', "error");
        } else {
          addLog('✅ IdentityRegistry verification passed', "success");
        }
      } catch (error) {
        addLog(`Error checking IdentityRegistry verification: ${error.message}`, "error");
      }
      
      // Test 2: Check ModularCompliance functions
      try {
        const complianceAddress = await token.compliance();
        addLog(`ModularCompliance address: ${complianceAddress}`, "info");
        
        const complianceArtifacts = getContractArtifacts('ModularCompliance');
        const compliance = new ethers.Contract(complianceAddress, complianceArtifacts.abi, signer);
        
        // Check what functions are available on ModularCompliance
        addLog('Available ModularCompliance functions:', "info");
        complianceArtifacts.abi.filter(item => item.type === 'function' && (item.name.toLowerCase().includes('transfer') || item.name.toLowerCase().includes('allow'))).forEach(func => {
          addLog(`  - ${func.name}`, "info");
        });
        
        // Try different possible function names
        try {
          const transfersAllowed = await compliance.transfersAllowed(userAddress, userAddress, 1000);
          addLog(`ModularCompliance.transfersAllowed(): ${transfersAllowed}`, transfersAllowed ? "success" : "error");
        } catch (e1) {
          try {
            const canTransfer = await compliance.canTransfer(userAddress, userAddress, 1000);
            addLog(`ModularCompliance.canTransfer(): ${canTransfer}`, canTransfer ? "success" : "error");
          } catch (e2) {
            addLog(`ModularCompliance transfer check functions not available: ${e2.message}`, "warning");
          }
        }
      } catch (error) {
        addLog(`Error checking ModularCompliance: ${error.message}`, "error");
      }
      
      // Test 3: Check token functions
      try {
        addLog('Available Token functions:', "info");
        tokenArtifacts.abi.filter(item => item.type === 'function' && item.name.toLowerCase().includes('verify')).forEach(func => {
          addLog(`  - ${func.name}`, "info");
        });
        
        // Try different possible function names
        try {
          const tokenVerified = await token.isVerified(userAddress);
          addLog(`Token.isVerified(): ${tokenVerified}`, tokenVerified ? "success" : "error");
        } catch (e1) {
          try {
            const tokenVerified = await token.verified(userAddress);
            addLog(`Token.verified(): ${tokenVerified}`, tokenVerified ? "success" : "error");
          } catch (e2) {
            addLog(`Token verification functions not available: ${e2.message}`, "warning");
          }
        }
      } catch (error) {
        addLog(`Error checking Token functions: ${error.message}`, "error");
      }
      
      addLog('Compliance bypass test completed', "success");
      
    } catch (error) {
      console.error('Error testing compliance bypass:', error);
      addLog(`Error testing compliance bypass: ${error.message}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  const testClaimSignatureIssues = async () => {
    try {
      setCheckingVerification(true);
      addLog('Testing claim signature and signer issues...', "info");
      
      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      
      // Get token address
      const tokenAddress = selectedContracts.Token || deployedContracts.Token?.[0];
      if (!tokenAddress) {
        addLog('No token deployed', "error");
        return;
      }
      
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      // Test 1: Check IdentityRegistry functions and get user's OnchainID
      try {
        const irAddress = await token.identityRegistry();
        addLog(`IdentityRegistry address: ${irAddress}`, "info");
        
        const irArtifacts = getContractArtifacts('IdentityRegistry');
        const ir = new ethers.Contract(irAddress, irArtifacts.abi, signer);
        
        // Check what functions are available on IdentityRegistry
        addLog('Available IdentityRegistry functions:', "info");
        irArtifacts.abi.filter(item => item.type === 'function' && (item.name.toLowerCase().includes('identity') || item.name.toLowerCase().includes('user'))).forEach(func => {
          addLog(`  - ${func.name}`, "info");
        });
        
        // Try different possible function names to get user's OnchainID
        let onchainIDAddress;
        try {
          onchainIDAddress = await ir.identity(userAddress);
          addLog(`Found OnchainID via ir.identity(): ${onchainIDAddress}`, "info");
        } catch (e1) {
          try {
            onchainIDAddress = await ir.getIdentity(userAddress);
            addLog(`Found OnchainID via ir.getIdentity(): ${onchainIDAddress}`, "info");
          } catch (e2) {
            try {
              onchainIDAddress = await ir.userIdentity(userAddress);
              addLog(`Found OnchainID via ir.userIdentity(): ${onchainIDAddress}`, "info");
            } catch (e3) {
              addLog(`Could not find user's OnchainID: ${e3.message}`, "error");
              return;
            }
          }
        }
        
        if (onchainIDAddress && onchainIDAddress !== '0x0000000000000000000000000000000000000000') {
          const onchainIDArtifacts = getContractArtifacts('Identity');
          const onchainID = new ethers.Contract(onchainIDAddress, onchainIDArtifacts.abi, signer);
          
          // Check what functions are available on OnchainID
          addLog('Available OnchainID functions:', "info");
          onchainIDArtifacts.abi.filter(item => item.type === 'function' && item.name.toLowerCase().includes('claim')).forEach(func => {
            addLog(`  - ${func.name}`, "info");
          });
          
          // Get all claims and check their issuers
          const claimTopics = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
          for (const topic of claimTopics) {
            try {
              const claim = await onchainID.getClaim(topic, 0);
              if (claim && claim.issuer !== '0x0000000000000000000000000000000000000000') {
                addLog(`Claim topic ${topic} issuer: ${claim.issuer}`, "info");
                
                // Check if this issuer is trusted
                try {
                  const tirAddress = await ir.issuersRegistry();
                  const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
                  const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
                  
                  const isTrusted = await tir.isTrustedIssuer(claim.issuer, topic);
                  addLog(`Issuer ${claim.issuer} trusted for topic ${topic}: ${isTrusted}`, isTrusted ? "success" : "error");
                  
                  if (!isTrusted) {
                    addLog(`❌ Issuer ${claim.issuer} is not trusted for topic ${topic}`, "error");
                  }
                } catch (error) {
                  addLog(`Error checking if issuer is trusted: ${error.message}`, "error");
                }
              }
            } catch (error) {
              // Claim doesn't exist or other error
            }
          }
          
          // Test 2: Check claim signature format
          for (const topic of claimTopics) {
            try {
              const claim = await onchainID.getClaim(topic, 0);
              if (claim && claim.issuer !== '0x0000000000000000000000000000000000000000' && claim.signature) {
                addLog(`Claim topic ${topic} signature length: ${claim.signature.length}`, "info");
                
                // Check if signature is 65 bytes (r + s + v format)
                if (claim.signature.length === 65) {
                  addLog(`✅ Claim topic ${topic} signature format appears correct (65 bytes)`, "success");
                } else {
                  addLog(`❌ Claim topic ${topic} signature has unexpected length: ${claim.signature.length}`, "error");
                }
                
                // Try to decode signature components
                try {
                  const r = claim.signature.slice(0, 32);
                  const s = claim.signature.slice(32, 64);
                  const v = claim.signature.slice(64, 65);
                  
                  addLog(`Claim topic ${topic} signature components:`, "info");
                  addLog(`  r: ${r}`, "info");
                  addLog(`  s: ${s}`, "info");
                  addLog(`  v: ${v}`, "info");
                  
                  // Check if v is valid (27 or 28)
                  const vValue = parseInt(v, 16);
                  if (vValue === 27 || vValue === 28) {
                    addLog(`✅ Claim topic ${topic} signature v value is valid: ${vValue}`, "success");
                } else {
                    addLog(`❌ Claim topic ${topic} signature v value is invalid: ${vValue}`, "error");
                  }
                } catch (error) {
                  addLog(`Error decoding signature components: ${error.message}`, "error");
                }
              }
            } catch (error) {
              // Claim doesn't exist or other error
            }
          }
          
          // Test 3: Check if claims were added by the same signer as the trusted issuer
          const claimIssuerAddress = selectedContracts.ClaimIssuer || deployedContracts.ClaimIssuer?.[0];
          if (claimIssuerAddress) {
            addLog(`ClaimIssuer address: ${claimIssuerAddress}`, "info");
            
            // Check if any claims were issued by ClaimIssuer
            for (const topic of claimTopics) {
              try {
                const claim = await onchainID.getClaim(topic, 0);
                if (claim && claim.issuer === claimIssuerAddress) {
                  addLog(`✅ Claim topic ${topic} was issued by ClaimIssuer contract`, "success");
                }
              } catch (error) {
                // Claim doesn't exist or other error
              }
            }
          }
        }
      } catch (error) {
        addLog(`Error checking claim issuers: ${error.message}`, "error");
      }
      
      addLog('Claim signature test completed', "success");
      
    } catch (error) {
      console.error('Error testing claim signatures:', error);
      addLog(`Error testing claim signatures: ${error.message}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  const analyzeTokenyFlow = async () => {
    try {
      setCheckingVerification(true);
      addLog('🔍 Analyzing Tokeny/ERC-3643 Standard Flow...', "info");
      
      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      
      // Get token address
      const tokenAddress = selectedContracts.Token || deployedContracts.Token?.[0];
      if (!tokenAddress) {
        addLog('No token deployed', "error");
        return;
      }
      
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      // Get IdentityRegistry contract - define this early so it's available throughout
      const irAddress = await token.identityRegistry();
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(irAddress, irArtifacts.abi, signer);
      
      let analysis = `🔍 TOKENY/ERC-3643 FLOW ANALYSIS\n`;
      analysis += `=====================================\n\n`;
      analysis += `User Address: ${userAddress}\n`;
      analysis += `Token Address: ${tokenAddress}\n\n`;
      
      // STEP 1: Check Trusted Issuer Identity (OnchainID)
      analysis += `STEP 1: TRUSTED ISSUER IDENTITY (ONCHAINID)\n`;
      analysis += `==========================================\n`;
      
      const claimIssuerAddress = selectedContracts.ClaimIssuer || deployedContracts.ClaimIssuer?.[0];
      if (claimIssuerAddress) {
        analysis += `✅ ClaimIssuer Contract: ${claimIssuerAddress}\n`;
        
        // Check if ClaimIssuer is an OnchainID with proper keys
        try {
          const claimIssuerArtifacts = getContractArtifacts('Identity');
          const claimIssuer = new ethers.Contract(claimIssuerAddress, claimIssuerArtifacts.abi, signer);
          
          try {
            const keyCount = await claimIssuer.getKeyCount();
            analysis += `   Key Count: ${keyCount.toNumber()}\n`;
            
            for (let i = 0; i < keyCount.toNumber(); i++) {
              try {
                const key = await claimIssuer.getKeyByIndex(i);
                const keyPurpose = await claimIssuer.getKeyPurpose(key);
                analysis += `   Key ${i}: ${key} (Purpose: ${keyPurpose.toNumber()})\n`;
              } catch (e) {
                analysis += `   Key ${i}: Error reading key\n`;
              }
            }
          } catch (e) {
            analysis += `   ❌ Not a valid OnchainID (no getKeyCount function)\n`;
          }
        } catch (e) {
          analysis += `   ❌ Not a valid OnchainID contract\n`;
        }
      } else {
        analysis += `❌ No ClaimIssuer contract found\n`;
      }
      analysis += `\n`;
      
      // STEP 2: Check TrustedIssuersRegistry
      analysis += `STEP 2: TRUSTED ISSUERS REGISTRY\n`;
      analysis += `===============================\n`;
      
      try {
        const tirAddress = await ir.issuersRegistry();
        analysis += `TrustedIssuersRegistry: ${tirAddress}\n`;
        
        const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
        const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
        
        if (claimIssuerAddress) {
          const requiredTopics = [1, 2, 3, 4, 5];
          for (const topic of requiredTopics) {
            try {
              const isTrusted = await tir.isTrustedIssuer(claimIssuerAddress, topic);
              analysis += `   Topic ${topic}: ${isTrusted ? '✅ TRUSTED' : '❌ NOT TRUSTED'}\n`;
            } catch (e) {
              analysis += `   Topic ${topic}: Error checking\n`;
            }
          }
        }
      } catch (e) {
        analysis += `Error checking TrustedIssuersRegistry: ${e.message}\n`;
      }
      analysis += `\n`;
      
      // STEP 3: Check Claims from Trusted OnchainID
      analysis += `STEP 3: CLAIMS FROM TRUSTED ONCHAINID\n`;
      analysis += `=====================================\n`;
      
      try {
        const onchainIDAddress = await ir.identity(userAddress);
        if (onchainIDAddress && onchainIDAddress !== '0x0000000000000000000000000000000000000000') {
          analysis += `User's OnchainID: ${onchainIDAddress}\n`;
          
          const onchainIDArtifacts = getContractArtifacts('Identity');
          const onchainID = new ethers.Contract(onchainIDAddress, onchainIDArtifacts.abi, signer);
          
          const requiredTopics = [1, 2, 3, 4, 5];
          for (const topic of requiredTopics) {
            try {
              const claim = await onchainID.getClaim(topic, 0);
              if (claim && claim.issuer !== '0x0000000000000000000000000000000000000000') {
                analysis += `   Topic ${topic}: ✅ Claim exists from ${claim.issuer}\n`;
                
                // Check if issuer matches ClaimIssuer
                if (claim.issuer === claimIssuerAddress) {
                  analysis += `      ✅ Issuer matches ClaimIssuer contract\n`;
                } else {
                  analysis += `      ❌ Issuer does NOT match ClaimIssuer contract\n`;
                  analysis += `      Expected: ${claimIssuerAddress}\n`;
                  analysis += `      Actual: ${claim.issuer}\n`;
                }
              } else {
                analysis += `   Topic ${topic}: ❌ No claim found\n`;
              }
            } catch (e) {
              analysis += `   Topic ${topic}: ❌ Error reading claim\n`;
            }
          }
        } else {
          analysis += `❌ User has no OnchainID registered\n`;
        }
      } catch (e) {
        analysis += `Error checking claims: ${e.message}\n`;
      }
      analysis += `\n`;
      
      // STEP 4: Check ClaimTopicsRegistry
      analysis += `STEP 4: CLAIM TOPICS REGISTRY\n`;
      analysis += `=============================\n`;
      
      try {
        const ctrAddress = await ir.topicsRegistry();
        analysis += `ClaimTopicsRegistry: ${ctrAddress}\n`;
        
        const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
        const ctr = new ethers.Contract(ctrAddress, ctrArtifacts.abi, signer);
        
        const requiredTopics = [1, 2, 3, 4, 5];
        for (const topic of requiredTopics) {
          try {
            const isRegistered = await ctr.getClaimTopics().then(topics => topics.includes(topic));
            analysis += `   Topic ${topic}: ${isRegistered ? '✅ REGISTERED' : '❌ NOT REGISTERED'}\n`;
          } catch (e) {
            analysis += `   Topic ${topic}: Error checking\n`;
          }
        }
      } catch (e) {
        analysis += `Error checking ClaimTopicsRegistry: ${e.message}\n`;
      }
      analysis += `\n`;
      
      // STEP 5: Check User's OnchainID Registration
      analysis += `STEP 5: USER'S ONCHAINID REGISTRATION\n`;
      analysis += `=====================================\n`;
      
      try {
        const onchainIDAddress = await ir.identity(userAddress);
        if (onchainIDAddress && onchainIDAddress !== '0x0000000000000000000000000000000000000000') {
          analysis += `✅ User's OnchainID registered: ${onchainIDAddress}\n`;
          
          // Check if OnchainID has proper keys
          const onchainIDArtifacts = getContractArtifacts('Identity');
          const onchainID = new ethers.Contract(onchainIDAddress, onchainIDArtifacts.abi, signer);
          
          try {
            const keyCount = await onchainID.getKeyCount();
            analysis += `   Key Count: ${keyCount.toNumber()}\n`;
            
            for (let i = 0; i < keyCount.toNumber(); i++) {
              try {
                const key = await onchainID.getKeyByIndex(i);
                const keyPurpose = await onchainID.getKeyPurpose(key);
                analysis += `   Key ${i}: ${key} (Purpose: ${keyPurpose.toNumber()})\n`;
              } catch (e) {
                analysis += `   Key ${i}: Error reading key\n`;
              }
            }
          } catch (e) {
            analysis += `   ❌ OnchainID has no keys\n`;
          }
        } else {
          analysis += `❌ User's OnchainID not registered in IdentityRegistry\n`;
        }
      } catch (e) {
        analysis += `Error checking user registration: ${e.message}\n`;
      }
      analysis += `\n`;
      
      // STEP 6: Final Verification Check
      analysis += `STEP 6: FINAL VERIFICATION CHECK\n`;
      analysis += `================================\n`;
      
      try {
        const isVerified = await ir.isVerified(userAddress);
        analysis += `IdentityRegistry.isVerified(${userAddress}): ${isVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;
        
        if (!isVerified) {
          analysis += `\n🔍 POSSIBLE ISSUES:\n`;
          analysis += `1. Claims missing for required topics\n`;
          analysis += `2. Claims from untrusted issuers\n`;
          analysis += `3. ClaimIssuer not properly configured as OnchainID\n`;
          analysis += `4. User's OnchainID not properly registered\n`;
          analysis += `5. Claim signature verification failed\n`;
        }
      } catch (e) {
        analysis += `Error checking verification: ${e.message}\n`;
      }
      
      setMessage(analysis);
      addLog('Tokeny flow analysis completed', "success");
      
    } catch (error) {
      console.error('Error analyzing Tokeny flow:', error);
      addLog(`Error analyzing Tokeny flow: ${error.message}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  const fixTokenyFlow = async () => {
    try {
      setCheckingVerification(true);
      addLog('🔧 Fixing Tokeny/ERC-3643 Flow...', "info");
      
      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      
      // Get token address
      const tokenAddress = selectedContracts.Token || deployedContracts.Token?.[0];
      if (!tokenAddress) {
        addLog('No token deployed', "error");
        return;
      }
      
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      let fixLog = `🔧 FIXING TOKENY/ERC-3643 FLOW\n`;
      fixLog += `================================\n\n`;
      fixLog += `User Address: ${userAddress}\n`;
      fixLog += `Token Address: ${tokenAddress}\n\n`;
      
      // STEP 1: Get or Deploy ClaimIssuer
      fixLog += `STEP 1: CLAIM ISSUER SETUP\n`;
      fixLog += `==========================\n`;
      
      let claimIssuerAddress = selectedContracts.ClaimIssuer || deployedContracts.ClaimIssuer?.[0];
      if (!claimIssuerAddress) {
        fixLog += `❌ No ClaimIssuer found. Deploying one...\n`;
        
        try {
          const claimIssuerArtifacts = getContractArtifacts('ClaimIssuer');
          const claimIssuerFactory = new ethers.ContractFactory(claimIssuerArtifacts.abi, claimIssuerArtifacts.bytecode, signer);
          
          const claimIssuer = await claimIssuerFactory.deploy();
          await claimIssuer.waitForDeployment();
          claimIssuerAddress = await claimIssuer.getAddress();
          
          saveDeployedContract('ClaimIssuer', claimIssuerAddress);
          fixLog += `✅ ClaimIssuer deployed: ${claimIssuerAddress}\n`;
        } catch (e) {
          fixLog += `❌ Failed to deploy ClaimIssuer: ${e.message}\n`;
          return;
        }
      } else {
        fixLog += `✅ ClaimIssuer exists: ${claimIssuerAddress}\n`;
      }
      
      // STEP 2: Add ClaimIssuer to TrustedIssuersRegistry
      fixLog += `\nSTEP 2: ADD TO TRUSTED ISSUERS REGISTRY\n`;
      fixLog += `=====================================\n`;
      
      // Get IdentityRegistry contract (needed for both STEP 2 and STEP 3)
      const irAddress = await token.identityRegistry();
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(irAddress, irArtifacts.abi, signer);
      
      try {
        const tirAddress = await ir.issuersRegistry();
        fixLog += `TrustedIssuersRegistry: ${tirAddress}\n`;
        
        const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
        const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
        
        const requiredTopics = [1, 2, 3, 4, 5];
        for (const topic of requiredTopics) {
          try {
            const isTrusted = await tir.isTrustedIssuer(claimIssuerAddress, topic);
            if (!isTrusted) {
              fixLog += `   Adding ClaimIssuer as trusted for topic ${topic}...\n`;
              
              const tx = await tir.addTrustedIssuer(claimIssuerAddress, [topic]);
              await tx.wait();
              
              fixLog += `   ✅ Added ClaimIssuer as trusted for topic ${topic}\n`;
            } else {
              fixLog += `   ✅ ClaimIssuer already trusted for topic ${topic}\n`;
            }
          } catch (e) {
            fixLog += `   ❌ Failed to add ClaimIssuer for topic ${topic}: ${e.message}\n`;
          }
        }
      } catch (e) {
        fixLog += `❌ Error with TrustedIssuersRegistry: ${e.message}\n`;
        return;
      }
      
      // STEP 3: Remove old claims and add new ones from ClaimIssuer
      fixLog += `\nSTEP 3: FIX CLAIMS\n`;
      fixLog += `==================\n`;
      
      try {
        const onchainIDAddress = await ir.identity(userAddress);
        if (onchainIDAddress && onchainIDAddress !== '0x0000000000000000000000000000000000000000') {
          fixLog += `User's OnchainID: ${onchainIDAddress}\n`;
          
          const onchainIDArtifacts = getContractArtifacts('Identity');
          const onchainID = new ethers.Contract(onchainIDAddress, onchainIDArtifacts.abi, signer);
          
          // Remove old claims (issued by user's OnchainID)
          fixLog += `Removing old claims issued by user's OnchainID...\n`;
          
          const requiredTopics = [1, 2, 3, 4, 5];
          for (const topic of requiredTopics) {
            try {
              const claim = await onchainID.getClaim(topic, 0);
              if (claim && claim.issuer === onchainIDAddress) {
                const tx = await onchainID.removeClaim(topic, 0);
                await tx.wait();
                fixLog += `   ✅ Removed old claim for topic ${topic}\n`;
              }
            } catch (e) {
              // Claim doesn't exist or other error
            }
          }
          
          // Add new claims from ClaimIssuer
          fixLog += `Adding new claims from ClaimIssuer...\n`;
          
          const claimIssuerArtifacts = getContractArtifacts('ClaimIssuer');
          const claimIssuer = new ethers.Contract(claimIssuerAddress, claimIssuerArtifacts.abi, signer);
          
          for (const topic of requiredTopics) {
            try {
              // Create claim data
              const claimValue = "YES";
              const claimData = ethers.utils.toUtf8Bytes(claimValue);
              const dataHash = ethers.utils.keccak256(claimData);
              
              // Sign the claim
              const signature = await signer.signMessage(ethers.utils.arrayify(dataHash));
              
              // Add claim using ClaimIssuer
              const tx = await claimIssuer.addClaim(
                onchainIDAddress,
                topic,
                1, // ECDSA scheme
                signature,
                claimData,
                ""
              );
              await tx.wait();
              
              fixLog += `   ✅ Added claim for topic ${topic} from ClaimIssuer\n`;
            } catch (e) {
              fixLog += `   ❌ Failed to add claim for topic ${topic}: ${e.message}\n`;
            }
          }
        } else {
          fixLog += `❌ User has no OnchainID registered\n`;
        }
      } catch (e) {
        fixLog += `❌ Error fixing claims: ${e.message}\n`;
      }
      
      // STEP 4: Final verification
      fixLog += `\nSTEP 4: FINAL VERIFICATION\n`;
      fixLog += `==========================\n`;
      
      try {
        const isVerified = await ir.isVerified(userAddress);
        fixLog += `IdentityRegistry.isVerified(${userAddress}): ${isVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}\n`;
        
        if (isVerified) {
          fixLog += `🎉 SUCCESS: Tokeny flow is now correct!\n`;
        } else {
          fixLog += `❌ Still not verified. Run "Analyze Tokeny Flow" for details.\n`;
        }
      } catch (e) {
        fixLog += `❌ Error checking verification: ${e.message}\n`;
      }
      
      setMessage(fixLog);
      addLog('Tokeny flow fix completed', "success");
      
    } catch (error) {
      console.error('Error fixing Tokeny flow:', error);
      addLog(`Error fixing Tokeny flow: ${error.message}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  const checkTokenStatus = async () => {
    try {
      if (!selectedContracts.Token) {
        setTokenStatus('No token selected');
        return;
      }

      setTokenStatus('Checking...');
      
      const signer = await getSigner();
      const artifacts = getContractArtifacts('Token');
      const contract = new ethers.Contract(selectedContracts.Token, artifacts.abi, signer);
      
      // First, let's verify the contract exists and is valid
      try {
        const code = await signer.provider.getCode(selectedContracts.Token);
        if (code === '0x') {
          setTokenStatus('❌ Invalid contract address');
          addLog('Token contract address is invalid or empty', "error");
          return;
        }
      } catch (error) {
        setTokenStatus('❌ Cannot verify contract');
        addLog(`Error verifying contract: ${error.message}`, "error");
        return;
      }
      
      // Check if the contract has the paused function
      const hasPausedFunction = artifacts.abi.some(item => 
        item.type === 'function' && item.name === 'paused'
      );
      
      if (!hasPausedFunction) {
        setTokenStatus('⚠️ No pause function found');
        addLog('Token contract does not have paused() function', "warning");
        return;
      }
      
      const isPaused = await contract.paused();
      
      if (isPaused) {
        setTokenStatus('⏸️ PAUSED');
        addLog('Token status checked: PAUSED', "info");
      } else {
        setTokenStatus('▶️ ACTIVE');
        addLog('Token status checked: ACTIVE', "info");
      }
    } catch (error) {
      console.error('Error checking token status:', error);
      const cleanError = extractCleanError(error);
      
      // Provide more specific error messages
      if (error.code === 'CALL_EXCEPTION') {
        setTokenStatus('❌ Contract call failed');
        addLog(`Token status check failed - contract may not be initialized or may not have pause functionality: ${cleanError}`, "error");
      } else {
        setTokenStatus('❌ Error checking status');
        addLog(`Error checking token status: ${cleanError}`, "error");
      }
    }
  };



  const isContractInitialized = async (contractName, address) => {
    try {
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts(contractName);
      const contract = new ethers.Contract(address, artifacts.abi, signer);
      
      // For all Ownable contracts, check owner is not zero and is the current signer
      switch (contractName) {
        case 'ClaimTopicsRegistry':
        case 'TrustedIssuersRegistry':
        case 'IdentityRegistryStorage':
        case 'IdentityRegistry':
        case 'ModularCompliance': {
          try {
            const owner = await contract.owner();
            const isInitialized = owner !== '0x0000000000000000000000000000000000000000' && owner.toLowerCase() === signerAddress.toLowerCase();
            console.log(`${contractName} owner: ${owner}, signer: ${signerAddress}, initialized: ${isInitialized}`);
            return isInitialized;
          } catch (e) {
            console.log(`${contractName} owner check failed:`, e.message);
            return false;
          }
        }
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking if ${contractName} is initialized:`, error);
      return false;
    }
  };

  const initializeContract = async (contractName) => {
    setInitializingContract(prev => ({ ...prev, [contractName]: true }));
    try {
      const address = selectedContracts[contractName] || (deployedContracts[contractName] && deployedContracts[contractName][0]);
      if (!address) {
        addLog(`No address found for ${contractName}, skipping initialization`, "warning");
        setInitializingContract(prev => ({ ...prev, [contractName]: false }));
        return;
      }
      const isInitialized = await isContractInitialized(contractName, address);
      if (isInitialized) {
        addLog(`${contractName} at ${address} is already initialized, skipping`, "info");
        setContractInitStatus(prev => ({
          ...prev,
          [contractName]: { address, isInitialized }
        }));
        setInitializingContract(prev => ({ ...prev, [contractName]: false }));
        return;
      }
      addLog(`Initializing ${contractName} at ${address}...`, "info");
      let result;
      switch (contractName) {
        case 'ClaimTopicsRegistry':
        case 'TrustedIssuersRegistry':
        case 'IdentityRegistryStorage':
        case 'ModularCompliance':
          // No params for these
          result = await hardhatInteraction('send', {
            contractName,
            contractAddress: address,
            method: 'init',
            params: []
          });
          addLog(`${contractName} initialized successfully`, "success");
          addLog(`Transaction hash: ${result.transactionHash}`, "info");
          break;
        case 'IdentityRegistry':
          result = await hardhatInteraction('send', {
            contractName,
            contractAddress: address,
            method: 'init',
            params: [
              deployedContracts.TrustedIssuersRegistry[0],
              deployedContracts.ClaimTopicsRegistry[0],
              deployedContracts.IdentityRegistryStorage[0]
            ]
          });
          addLog(`${contractName} initialized successfully`, "success");
          addLog(`Transaction hash: ${result.transactionHash}`, "info");
          break;
        default:
          throw new Error(`Unknown contract type: ${contractName}`);
      }
      reloadDeploymentState();
      // After initializing, check only this contract's status
      const newStatus = await isContractInitialized(contractName, address);
      setContractInitStatus(prev => ({
        ...prev,
        [contractName]: { address, isInitialized: newStatus }
      }));
    } catch (error) {
      console.error(`Error initializing ${contractName}:`, error);
      addLog(`Error initializing ${contractName}: ${error.message}`, "error");
      throw error;
    } finally {
      setInitializingContract(prev => ({ ...prev, [contractName]: false }));
    }
  };

  const initializeAllContracts = async () => {
    try {
      setInitializing(true);
      setMessage('Initializing contracts...');
      addLog('Starting contract initialization', "info");

      // Initialize all deployed contracts (use selected if available, otherwise use latest deployed)
      const contractsToInitialize = [
        'ClaimTopicsRegistry',
        'TrustedIssuersRegistry', 
        'IdentityRegistryStorage',
        'IdentityRegistry'
      ];

      for (const contractName of contractsToInitialize) {
        // Use selected contract if available, otherwise use the latest deployed
        const hasSelected = selectedContracts[contractName];
        const hasDeployed = deployedContracts[contractName] && deployedContracts[contractName].length > 0;
        
        if (hasSelected || hasDeployed) {
          await initializeContract(contractName);
        }
      }

      // Initialize ModularCompliance if it exists
      if (selectedContracts.ModularCompliance || (deployedContracts.ModularCompliance && deployedContracts.ModularCompliance.length > 0)) {
        await initializeContract('ModularCompliance');
      }

      setMessage('Contracts initialized successfully');
      addLog('Contract initialization completed', "success");
    } catch (error) {
      console.error('Error initializing contracts:', error);
      setMessage(`Error initializing contracts: ${error.message}`);
      addLog(`Error initializing contracts: ${error.message}`, "error");
    } finally {
      setInitializing(false);
    }
  };

  const steps = [
    {
      id: 1,
      title: "Deploy Core Contracts",
      description: "Deploy the essential T-REX contracts",
      content: (
        <div>
          <h3>Step 1: Deploy Core Contracts</h3>
          <p>Deploy the essential T-REX contracts in the correct order.</p>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Button
              onClick={() => deployContract('ClaimTopicsRegistry')}
              disabled={deploying}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Deploy ClaimTopicsRegistry
            </Button>
            <Button
              onClick={() => deployContract('TrustedIssuersRegistry')}
              disabled={deploying}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Deploy TrustedIssuersRegistry
            </Button>
            <Button
              onClick={() => deployContract('IdentityRegistryStorage')}
              disabled={deploying}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Deploy IdentityRegistryStorage
            </Button>
            <Button
              onClick={() => deployContract('IdentityRegistry')}
              disabled={deploying}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Deploy IdentityRegistry
            </Button>
            <Button
              onClick={() => deployContract('ModularCompliance')}
              disabled={deploying}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Deploy ModularCompliance
            </Button>
          </div>

          {/* Show deployed contracts */}
          {Object.keys(deployedContracts).length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <h4>Deployed Contracts:</h4>
              {Object.entries(deployedContracts).map(([name, addresses]) => (
                <div key={name} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <div><strong>{name}</strong> ({Array.isArray(addresses) ? addresses.length : 1})</div>
                  {Array.isArray(addresses) ? (
                    addresses.map((address, index) => (
                      <div key={index} style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.9rem',
                        padding: '0.25rem 0',
                        borderBottom: index < addresses.length - 1 ? '1px solid #eee' : 'none'
                      }}>
                        {index + 1}. {address} {index === 0 ? '(Latest)' : ''}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {addresses}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 2,
      title: "Initialize Contracts",
      description: "Initialize deployed contracts",
      content: (
        <div>
          <h3>Step 2: Initialize Contracts</h3>
          <p>Initialize the deployed contracts with their required setup.</p>
          
          {/* Refresh and Auto-Select Button */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>🔄 Auto-Select Latest Contracts</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976d2' }}>
                  Click to refresh deployment state and automatically select the latest deployed contracts
                </p>
              </div>
              <Button
                onClick={() => {
                  reloadDeploymentState();
                  addLog("Manually refreshed and auto-selected latest contracts", "info");
                }}
                style={{ backgroundColor: '#2196f3', color: 'white', padding: '0.5rem 1rem' }}
              >
                🔄 Refresh & Auto-Select
              </Button>
            </div>
          </div>
          
          <ContractSelector
            contractType="ClaimTopicsRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.ClaimTopicsRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, ClaimTopicsRegistry: address }))}
            title="Claim Topics Registry"
            description="Select the ClaimTopicsRegistry to initialize"
          />
          
          <ContractSelector
            contractType="TrustedIssuersRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.TrustedIssuersRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, TrustedIssuersRegistry: address }))}
            title="Trusted Issuers Registry"
            description="Select the TrustedIssuersRegistry to initialize"
          />
          
          <ContractSelector
            contractType="IdentityRegistryStorage"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistryStorage}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistryStorage: address }))}
            title="Identity Registry Storage"
            description="Select the IdentityRegistryStorage to initialize"
          />
          
          <ContractSelector
            contractType="IdentityRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
            title="Identity Registry"
            description="Select the IdentityRegistry to initialize"
          />
          {/* Debug log for ModularCompliance */}
          {console.log('🔍 Debug - deployedContracts structure:', JSON.stringify(deployedContracts, null, 2))}
          {console.log('🔍 Debug - deployedContracts.ModularCompliance:', deployedContracts.ModularCompliance)}
          
          <ContractSelector
            contractType="ModularCompliance"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.ModularCompliance}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, ModularCompliance: address }))}
            title="ModularCompliance"
            description="Select the ModularCompliance contract to initialize"
          />
          {/* Individual Contract Initialization */}
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: '#495057', margin: 0 }}>Initialize Individual Contracts:</h4>
              <Button
                onClick={checkContractInitStatus}
                disabled={checkingInitStatus}
                style={{ backgroundColor: '#17a2b8', color: 'white', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              >
                {checkingInitStatus ? 'Checking...' : 'Check Status'}
              </Button>
            </div>
            
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button
                  onClick={async () => {
                    await initializeContract('ClaimTopicsRegistry');
                  }}
                  disabled={initializingContract['ClaimTopicsRegistry'] || !selectedContracts.ClaimTopicsRegistry}
                  style={{ 
                    backgroundColor: contractInitStatus.ClaimTopicsRegistry?.isInitialized ? '#6c757d' : '#28a745', 
                    color: 'white', 
                    minWidth: '120px' 
                  }}
                >
                  {initializingContract['ClaimTopicsRegistry'] ? 'Initializing...' : contractInitStatus.ClaimTopicsRegistry?.isInitialized ? '✓ Initialized' : 'Initialize ClaimTopicsRegistry'}
                </Button>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                  {selectedContracts.ClaimTopicsRegistry ? `(${selectedContracts.ClaimTopicsRegistry.slice(0, 8)}...)` : 'Not selected'}
                </span>
                {contractInitStatus.ClaimTopicsRegistry && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: contractInitStatus.ClaimTopicsRegistry.isInitialized ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {contractInitStatus.ClaimTopicsRegistry.isInitialized ? '✓ Ready' : '⚠ Not initialized'}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button
                  onClick={async () => {
                    await initializeContract('TrustedIssuersRegistry');
                  }}
                  disabled={initializingContract['TrustedIssuersRegistry'] || !selectedContracts.TrustedIssuersRegistry}
                  style={{ 
                    backgroundColor: contractInitStatus.TrustedIssuersRegistry?.isInitialized ? '#6c757d' : '#28a745', 
                    color: 'white', 
                    minWidth: '120px' 
                  }}
                >
                  {initializingContract['TrustedIssuersRegistry'] ? 'Initializing...' : contractInitStatus.TrustedIssuersRegistry?.isInitialized ? '✓ Initialized' : 'Initialize TrustedIssuersRegistry'}
                </Button>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                  {selectedContracts.TrustedIssuersRegistry ? `(${selectedContracts.TrustedIssuersRegistry.slice(0, 8)}...)` : 'Not selected'}
                </span>
                {contractInitStatus.TrustedIssuersRegistry && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: contractInitStatus.TrustedIssuersRegistry.isInitialized ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {contractInitStatus.TrustedIssuersRegistry.isInitialized ? '✓ Ready' : '⚠ Not initialized'}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button
                  onClick={async () => {
                    await initializeContract('IdentityRegistryStorage');
                  }}
                  disabled={initializingContract['IdentityRegistryStorage'] || !selectedContracts.IdentityRegistryStorage}
                  style={{ 
                    backgroundColor: contractInitStatus.IdentityRegistryStorage?.isInitialized ? '#6c757d' : '#28a745', 
                    color: 'white', 
                    minWidth: '120px' 
                  }}
                >
                  {initializingContract['IdentityRegistryStorage'] ? 'Initializing...' : contractInitStatus.IdentityRegistryStorage?.isInitialized ? '✓ Initialized' : 'Initialize IdentityRegistryStorage'}
                </Button>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                  {selectedContracts.IdentityRegistryStorage ? `(${selectedContracts.IdentityRegistryStorage.slice(0, 8)}...)` : 'Not selected'}
                </span>
                {contractInitStatus.IdentityRegistryStorage && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: contractInitStatus.IdentityRegistryStorage.isInitialized ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {contractInitStatus.IdentityRegistryStorage.isInitialized ? '✓ Ready' : '⚠ Not initialized'}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button
                  onClick={async () => {
                    await initializeContract('IdentityRegistry');
                  }}
                  disabled={initializingContract['IdentityRegistry'] || !selectedContracts.IdentityRegistry || !selectedContracts.TrustedIssuersRegistry || !selectedContracts.ClaimTopicsRegistry || !selectedContracts.IdentityRegistryStorage}
                  style={{ 
                    backgroundColor: contractInitStatus.IdentityRegistry?.isInitialized ? '#6c757d' : '#28a745', 
                    color: 'white', 
                    minWidth: '120px' 
                  }}
                >
                  {initializingContract['IdentityRegistry'] ? 'Initializing...' : contractInitStatus.IdentityRegistry?.isInitialized ? '✓ Initialized' : 'Initialize IdentityRegistry'}
                </Button>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                  {selectedContracts.IdentityRegistry ? `(${selectedContracts.IdentityRegistry.slice(0, 8)}...)` : 'Not selected'}
                </span>
                {contractInitStatus.IdentityRegistry && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: contractInitStatus.IdentityRegistry.isInitialized ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {contractInitStatus.IdentityRegistry.isInitialized ? '✓ Ready' : '⚠ Not initialized'}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button
                  onClick={async () => {
                    await initializeContract('ModularCompliance');
                  }}
                  disabled={initializingContract['ModularCompliance'] || !selectedContracts.ModularCompliance}
                  style={{ 
                    backgroundColor: contractInitStatus.ModularCompliance?.isInitialized ? '#6c757d' : '#28a745', 
                    color: 'white', 
                    minWidth: '120px' 
                  }}
                >
                  {initializingContract['ModularCompliance'] ? 'Initializing...' : contractInitStatus.ModularCompliance?.isInitialized ? '✓ Initialized' : 'Initialize ModularCompliance'}
                </Button>
                <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                  {selectedContracts.ModularCompliance ? `(${selectedContracts.ModularCompliance.slice(0, 8)}...)` : 'Not selected'}
                </span>
                {contractInitStatus.ModularCompliance && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: contractInitStatus.ModularCompliance.isInitialized ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {contractInitStatus.ModularCompliance.isInitialized ? '✓ Ready' : '⚠ Not initialized'}
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '1rem', marginTop: '1rem' }}>
              <Button
                onClick={async () => {
                  await initializeAllContracts();
                  await checkContractInitStatus();
                }}
                disabled={initializing || !selectedContracts.ClaimTopicsRegistry || !selectedContracts.TrustedIssuersRegistry || !selectedContracts.IdentityRegistryStorage}
                style={{ backgroundColor: '#007bff', color: 'white' }}
              >
                {initializing ? 'Initializing...' : 'Initialize All Selected Contracts'}
              </Button>
              <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
                This will initialize all contracts in the correct order
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Configure Identity Registry",
      description: "Connect Identity Registry to other registries",
      content: (
        <div>
          <h3>Step 3: Configure Identity Registry</h3>
          <p>Connect the Identity Registry to the other registries to establish the T-REX ecosystem.</p>
          
          {/* Refresh and Auto-Select Button */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>🔄 Auto-Select Latest Contracts</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976d2' }}>
                  Click to refresh deployment state and automatically select the latest deployed contracts
                </p>
              </div>
              <Button
                onClick={() => {
                  reloadDeploymentState();
                  addLog("Manually refreshed and auto-selected latest contracts", "info");
                }}
                style={{ backgroundColor: '#2196f3', color: 'white', padding: '0.5rem 1rem' }}
              >
                🔄 Refresh & Auto-Select
              </Button>
            </div>
          </div>
          
          {/* Contract Selectors for Configuration */}
          <ContractSelector
            contractType="IdentityRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
            title="Identity Registry to Configure"
            description="Select which Identity Registry to configure"
          />
          
          <ContractSelector
            contractType="TrustedIssuersRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.TrustedIssuersRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, TrustedIssuersRegistry: address }))}
            title="Trusted Issuers Registry"
            description="Select which TrustedIssuersRegistry to connect"
          />
          
          <ContractSelector
            contractType="ClaimTopicsRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.ClaimTopicsRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, ClaimTopicsRegistry: address }))}
            title="Claim Topics Registry"
            description="Select which ClaimTopicsRegistry to connect"
          />
          
          <ContractSelector
            contractType="IdentityRegistryStorage"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistryStorage}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistryStorage: address }))}
            title="Identity Registry Storage"
            description="Select which IdentityRegistryStorage to connect"
          />
          
          {/* Show what connections will be made */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <h4>Connections to be established:</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2196f3', fontWeight: 'bold' }}>→</span>
                <span><strong>TrustedIssuersRegistry:</strong></span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedContracts.TrustedIssuersRegistry || 'Not selected'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2196f3', fontWeight: 'bold' }}>→</span>
                <span><strong>ClaimTopicsRegistry:</strong></span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedContracts.ClaimTopicsRegistry || 'Not selected'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2196f3', fontWeight: 'bold' }}>→</span>
                <span><strong>IdentityRegistryStorage:</strong></span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedContracts.IdentityRegistryStorage || 'Not selected'}
                </span>
              </div>
            </div>
          </div>
          
          <Button
            onClick={configureIdentityRegistry}
            disabled={deploying || !selectedContracts.IdentityRegistry || !selectedContracts.ClaimTopicsRegistry || !selectedContracts.TrustedIssuersRegistry || !selectedContracts.IdentityRegistryStorage}
            style={{ backgroundColor: '#007bff', color: 'white' }}
          >
            {deploying ? 'Configuring...' : 'Configure All Connections'}
          </Button>
          
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            <p><strong>What this does:</strong></p>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Calls <code>setTrustedIssuersRegistry()</code> to link Identity Registry to Trusted Issuers Registry</li>
              <li>Calls <code>setClaimTopicsRegistry()</code> to link Identity Registry to Claim Topics Registry</li>
              <li>Calls <code>setIdentityRegistryStorage()</code> to link Identity Registry to Identity Registry Storage</li>
              <li><strong>Calls <code>bindIdentityRegistry()</code> to establish bilateral binding between IR and IRS</strong></li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Add Agent",
      description: "Add your admin address as an agent to both Identity Registry and Identity Registry Storage.",
      content: (
        <div>
          <h3>Step 4: Add Agent</h3>
          <p>Add your admin address (0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266) as an agent to both the Identity Registry and Identity Registry Storage.</p>
          
          {/* Refresh and Auto-Select Button */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>🔄 Auto-Select Latest Contracts</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976d2' }}>
                  Click to refresh deployment state and automatically select the latest deployed contracts
                </p>
              </div>
              <Button
                onClick={() => {
                  reloadDeploymentState();
                  addLog("Manually refreshed and auto-selected latest contracts", "info");
                }}
                style={{ backgroundColor: '#2196f3', color: 'white', padding: '0.5rem 1rem' }}
              >
                🔄 Refresh & Auto-Select
              </Button>
            </div>
          </div>
          <ContractSelector
            contractType="IdentityRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
            title="Identity Registry"
            description="Select which Identity Registry to add agent to"
          />
          <ContractSelector
            contractType="IdentityRegistryStorage"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistryStorage}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistryStorage: address }))}
            title="Identity Registry Storage"
            description="Select which Identity Registry Storage to add agent to"
          />
          <Button
            onClick={async () => {
              setDeploying(true);
              setMessage('Adding agent to both contracts...');
              addLog('Starting agent addition to both IR and IRS', "info");
              const signer = await getSigner();
              const signerAddress = await signer.getAddress();
              let anyError = false;
              // Add to IR
              if (selectedContracts.IdentityRegistry) {
                try {
                  // Check if already an agent (still uses frontend call for now)
                  const irArtifacts = getContractArtifacts('IdentityRegistry');
                  const ir = new ethers.Contract(selectedContracts.IdentityRegistry, irArtifacts.abi, signer);
                  const isAgentIR = await ir.isAgent(signerAddress);
                  if (!isAgentIR) {
                    const result = await hardhatInteraction('send', {
                      contractName: 'IdentityRegistry',
                      contractAddress: selectedContracts.IdentityRegistry,
                      method: 'addAgent',
                      params: [signerAddress]
                    });
                    addLog('Agent added to Identity Registry', "success");
                    addLog(`Transaction hash: ${result.transactionHash}`, "info");
                  } else {
                    addLog('Address is already an agent in Identity Registry', "info");
                  }
                } catch (e) {
                  addLog('Error adding agent to Identity Registry: ' + e.message, "error");
                  anyError = true;
                }
              } else {
                addLog('No Identity Registry selected', "warning");
                setMessage('No Identity Registry selected');
                anyError = true;
              }
              // Add to IRS
              if (selectedContracts.IdentityRegistryStorage) {
                try {
                  // Check if already an agent (still uses frontend call for now)
                  const irsArtifacts = getContractArtifacts('IdentityRegistryStorage');
                  const irs = new ethers.Contract(selectedContracts.IdentityRegistryStorage, irsArtifacts.abi, signer);
                  const isAgentIRS = await irs.isAgent(signerAddress);
                  if (!isAgentIRS) {
                    const result = await hardhatInteraction('send', {
                      contractName: 'IdentityRegistryStorage',
                      contractAddress: selectedContracts.IdentityRegistryStorage,
                      method: 'addAgent',
                      params: [signerAddress]
                    });
                    addLog('Agent added to Identity Registry Storage', "success");
                    addLog(`Transaction hash: ${result.transactionHash}`, "info");
                  } else {
                    addLog('Address is already an agent in Identity Registry Storage', "info");
                  }
                } catch (e) {
                  addLog('Error adding agent to Identity Registry Storage: ' + e.message, "error");
                  anyError = true;
                }
              } else {
                addLog('No Identity Registry Storage selected', "warning");
                setMessage('No Identity Registry Storage selected');
                anyError = true;
              }
              if (!anyError) {
                setMessage('Agent added to both contracts successfully');
              }
              setDeploying(false);
            }}
            disabled={deploying || !selectedContracts.IdentityRegistry || !selectedContracts.IdentityRegistryStorage}
            style={{ backgroundColor: '#007bff', color: 'white' }}
          >
            {deploying ? 'Adding Agent...' : 'Add Agent to Both'}
          </Button>
        </div>
      )
    },
    {
      id: 5,
      title: "Add Claim Topics",
      description: "Add essential claim topics for compliance",
      content: (
        <div>
          <h3>Step 5: Add Claim Topics</h3>
          <p>Add essential claim topics for KYC/AML compliance.</p>
          
          {/* Refresh and Auto-Select Button */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>🔄 Auto-Select Latest Contracts</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976d2' }}>
                  Click to refresh deployment state and automatically select the latest deployed contracts
                </p>
              </div>
              <Button
                onClick={() => {
                  reloadDeploymentState();
                  addLog("Manually refreshed and auto-selected latest contracts", "info");
                }}
                style={{ backgroundColor: '#2196f3', color: 'white', padding: '0.5rem 1rem' }}
              >
                🔄 Refresh & Auto-Select
              </Button>
            </div>
          </div>
          
          <ContractSelector
            contractType="ClaimTopicsRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.ClaimTopicsRegistry}
            onSelect={(address) => {
              setSelectedContracts(prev => ({ ...prev, ClaimTopicsRegistry: address }));
              if (address) {
                loadClaimTopics(address);
              }
            }}
            title="Claim Topics Registry"
            description="Select which ClaimTopicsRegistry to add claim topics to"
          />
          
          <Button
            onClick={() => {
              if (selectedContracts.ClaimTopicsRegistry) {
                loadClaimTopics(selectedContracts.ClaimTopicsRegistry);
              }
            }}
            disabled={!selectedContracts.ClaimTopicsRegistry || loadingClaimTopics}
            style={{ backgroundColor: '#17a2b8', color: 'white', marginBottom: '1rem', marginLeft: '0.5rem' }}
          >
            {loadingClaimTopics ? 'Loading...' : 'Refresh Claim Topics'}
          </Button>
          
          {/* Display existing claim topics */}
          {selectedContracts.ClaimTopicsRegistry && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#495057' }}>Current Claim Topics:</h4>
              {loadingClaimTopics ? (
                <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Loading claim topics...</div>
              ) : availableClaimTopics.length === 0 ? (
                <div style={{ color: '#6c757d', fontStyle: 'italic' }}>No claim topics found in this registry.</div>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {availableClaimTopics.map((topic, index) => (
                    <div key={topic.id} style={{ 
                      padding: '0.5rem', 
                      backgroundColor: '#fff', 
                      border: '1px solid #ced4da', 
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: '#495057' }}>{topic.name}</strong>
                        <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>ID: {topic.id}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>{topic.description}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '3px', 
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          ✓ Added
                        </div>
                        <Button
                          onClick={() => removeClaimTopic(topic.id)}
                          disabled={deploying}
                          style={{ 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            padding: '0.25rem 0.5rem', 
                            fontSize: '0.8rem',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: deploying ? 'not-allowed' : 'pointer'
                          }}
                        >
                          🗑️ Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Button
              onClick={() => addClaimTopic(1)}
              disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 1)}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Add Topic 1 (KYC)
            </Button>
            <Button
              onClick={() => addClaimTopic(2)}
              disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 2)}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Add Topic 2 (AML)
            </Button>
            <Button
              onClick={() => addClaimTopic(3)}
              disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 3)}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Add Topic 3 (Accreditation)
            </Button>
            <Button
              onClick={() => addClaimTopic(4)}
              disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 4)}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Add Topic 4 (EU Nationality)
            </Button>
            <Button
              onClick={() => addClaimTopic(5)}
              disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 5)}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Add Topic 5 (US Nationality)
            </Button>
            <Button
              onClick={() => addClaimTopic(6)}
              disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 6)}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Add Topic 6 (Blacklist)
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Add Trusted Issuer",
      description: "Add a trusted issuer for claim verification",
      content: (
        <div>
          <h3>Step 6: Add Trusted Issuer</h3>
          <p>Create a ClaimIssuer contract and add it as a trusted issuer with specific claim topics.</p>
          
          {/* Refresh and Auto-Select Button */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>🔄 Auto-Select Latest Contracts</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976d2' }}>
                  Click to refresh deployment state and automatically select the latest deployed contracts
                </p>
              </div>
              <Button
                onClick={() => {
                  reloadDeploymentState();
                  addLog("Manually refreshed and auto-selected latest contracts", "info");
                }}
                style={{ backgroundColor: '#2196f3', color: 'white', padding: '0.5rem 1rem' }}
              >
                🔄 Refresh & Auto-Select
              </Button>
            </div>
          </div>
          
          <ContractSelector
            contractType="TrustedIssuersRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.TrustedIssuersRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, TrustedIssuersRegistry: address }))}
            title="Trusted Issuers Registry"
            description="Select which TrustedIssuersRegistry to add trusted issuer to"
          />
          
          {/* Claim Topics Selection */}
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '1rem', color: '#495057' }}>Select Claim Topics for Trusted Issuer</h4>
            <p style={{ marginBottom: '1rem', color: '#6c757d', fontSize: '0.9rem' }}>
              Choose which claim topics this trusted issuer can issue:
            </p>
            
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="topic1"
                  defaultChecked={true}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span><strong>Topic 1:</strong> KYC (Know Your Customer)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="topic2"
                  defaultChecked={true}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span><strong>Topic 2:</strong> AML (Anti-Money Laundering)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="topic3"
                  defaultChecked={true}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span><strong>Topic 3:</strong> Accredited Investor</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="topic4"
                  defaultChecked={false}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span><strong>Topic 4:</strong> EU Nationality Confirmed</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="topic5"
                  defaultChecked={false}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span><strong>Topic 5:</strong> US Nationality Confirmed</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="topic6"
                  defaultChecked={false}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span><strong>Topic 6:</strong> Blacklist</span>
              </label>
            </div>
            
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '1rem' }}>
              <strong>Note:</strong> The trusted issuer will only be able to issue claims for the selected topics.
            </div>
          </div>
          
          <Button
            onClick={() => {
              // Get selected claim topics
              const selectedTopics = [];
              for (let i = 1; i <= 6; i++) {
                const checkbox = document.getElementById(`topic${i}`);
                if (checkbox && checkbox.checked) {
                  selectedTopics.push(i);
                }
              }
              
              if (selectedTopics.length === 0) {
                setMessage('Please select at least one claim topic');
                return;
              }
              
              deployClaimIssuerAndAddAsTrusted(selectedTopics);
            }}
            disabled={deploying || !selectedContracts.TrustedIssuersRegistry}
            style={{ backgroundColor: '#007bff', color: 'white' }}
          >
            {deploying ? 'Deploying ClaimIssuer...' : 'Deploy ClaimIssuer & Add as Trusted'}
          </Button>
          
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            <p><strong>What this does:</strong></p>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Deploys a ClaimIssuer contract (specialized Identity for issuing claims)</li>
              <li>Adds your address as the management key to the ClaimIssuer</li>
              <li>Adds a signing key to the ClaimIssuer for signing claims</li>
              <li>Registers the ClaimIssuer as a trusted issuer in the TrustedIssuersRegistry</li>
              <li>Specifies which claim topics this issuer can issue</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "User Management",
      description: "Create and manage user identities (do this BEFORE deploying tokens)",
      content: (() => {
        console.log('🔍 Passing props to UserManagementPhase:', { deployedContracts, selectedContracts });
        return (
          <div>
            <UserManagementPhase 
              deployedContracts={deployedContracts}
              selectedContracts={selectedContracts}
              setSelectedContracts={setSelectedContracts}
            />
          </div>
        );
      })()
    },
    {
      id: 8,
      title: "Token Management",
      description: "Deploy and manage tokens with comprehensive controls",
      content: (
        <div>
          <h3>Step 8: Token Management</h3>
          <p>Deploy and manage ERC-3643 tokens with comprehensive role and function management.</p>
          
          {/* Sub-step Navigation */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <Button
                onClick={() => setCurrentSubStep('deploy')}
                style={{ 
                  backgroundColor: currentSubStep === 'deploy' ? '#007bff' : '#6c757d', 
                  color: 'white',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Deploy Token
              </Button>
              <Button
                onClick={() => setCurrentSubStep('roles')}
                style={{ 
                  backgroundColor: currentSubStep === 'roles' ? '#007bff' : '#6c757d', 
                  color: 'white',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Role Management
              </Button>
              <Button
                onClick={() => setCurrentSubStep('claims')}
                style={{ 
                  backgroundColor: currentSubStep === 'claims' ? '#007bff' : '#6c757d', 
                  color: 'white',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Claim/Token Management
              </Button>
              <Button
                onClick={() => setCurrentSubStep('functions')}
                style={{ 
                  backgroundColor: currentSubStep === 'functions' ? '#007bff' : '#6c757d', 
                  color: 'white',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Function Management
              </Button>
            </div>
          </div>

          {/* Sub-step 8a: Deploy Token */}
          {currentSubStep === 'deploy' && (
            <div>
              <h4>Deploy Token</h4>
              <p>Deploy the ERC-3643 token with compliance integration.</p>
              
              {/* Contract Selectors */}
              <div style={{ marginBottom: '1rem' }}>
                {/* Identity Registry Selector */}
                {deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry.length > 0 && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h4>Select Identity Registry:</h4>
                    <ContractSelector
                      contractType="IdentityRegistry"
                      contracts={deployedContracts.IdentityRegistry}
                      selectedAddress={selectedContracts.IdentityRegistry}
                      onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
                      title="IdentityRegistry"
                      description="Choose which Identity Registry to attach to this token"
                    />
                  </div>
                )}
                
                {/* ModularCompliance Contract Selector */}
                {deployedContracts.ModularCompliance && deployedContracts.ModularCompliance.length > 0 && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <h4>Select ModularCompliance Contract:</h4>
                    <ContractSelector
                      contractType="ModularCompliance"
                      contracts={deployedContracts.ModularCompliance}
                      selectedAddress={selectedContracts.ModularCompliance}
                      onSelect={(address) => setSelectedContracts(prev => ({ ...prev, ModularCompliance: address }))}
                      title="ModularCompliance"
                      description="Choose which ModularCompliance contract to attach to this token"
                    />
                  </div>
                )}
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Token Name"
                  defaultValue="My Security Token"
                  id="tokenName"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                />
                <input
                  type="text"
                  placeholder="Token Symbol"
                  defaultValue="MST"
                  id="tokenSymbol"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                />
                <input
                  type="number"
                  placeholder="Decimals"
                  defaultValue="18"
                  id="tokenDecimals"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                />
              </div>
              <Button
                onClick={() => {
                  const name = document.getElementById('tokenName').value;
                  const symbol = document.getElementById('tokenSymbol').value;
                  const decimals = parseInt(document.getElementById('tokenDecimals').value);
                  deployToken({ name, symbol, decimals });
                }}
                disabled={deploying || !deployedContracts.ModularCompliance}
                style={{ backgroundColor: '#007bff', color: 'white' }}
              >
                {deploying ? 'Deploying Token...' : 'Deploy Token'}
              </Button>
              
              {/* Show which contracts will be used */}
              {(deployedContracts.IdentityRegistry || deployedContracts.ModularCompliance) && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                  <div>Will use Identity Registry: {selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0])}</div>
                  <div>Will use ModularCompliance: {selectedContracts.ModularCompliance || (deployedContracts.ModularCompliance && deployedContracts.ModularCompliance[0])}</div>
                </div>
              )}
              
              {/* Show deployed tokens */}
              {deployedTokens.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <h4>Deployed Tokens ({deployedTokens.length}):</h4>
                  {deployedTokens.map((token, index) => (
                    <div key={index} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                      <div><strong>{token.name} ({token.symbol})</strong></div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>Address: {token.address}</div>
                      <div>Decimals: {token.decimals}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>Deployed: {new Date(token.deployedAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-step 8b: Role Management */}
          {currentSubStep === 'roles' && (
            <div>
              <h4>Role Management</h4>
              <p>Set up token roles and permissions for minting, burning, and pausing.</p>
              
              {/* Token Selector */}
              {deployedTokens.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <h4>Select Token:</h4>
                  <select
                    id="selectedToken"
                    value={selectedContracts.Token || ""}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    onChange={(e) => {
                      const tokenAddress = e.target.value;
                      if (tokenAddress) {
                        setSelectedContracts(prev => ({ ...prev, Token: tokenAddress }));
                        setTokenStatus('Checking...');
                        setTimeout(() => checkTokenStatus(), 100);
                      } else {
                        setTokenStatus('No token selected');
                      }
                    }}
                  >
                    <option value="">-- Select a token --</option>
                    {deployedTokens.map((token, index) => (
                      <option key={index} value={token.address}>
                        {token.name} ({token.symbol}) - {token.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Agent Management */}
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h4>Add Token Agent:</h4>
                <p>Add an agent to the selected token. Agents can mint, burn, and pause tokens.</p>
                <input
                  type="text"
                  placeholder="Agent Address (leave empty to use your address)"
                  id="tokenAgentAddress"
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                  value={tokenAgentInput}
                  onChange={e => setTokenAgentInput(e.target.value)}
                />
                <Button
                  onClick={addTokenAgent}
                  disabled={deploying || !selectedContracts.Token}
                  style={{ backgroundColor: '#007bff', color: 'white' }}
                >
                  {deploying ? 'Adding Agent...' : 'Add Token Agent'}
                </Button>
              </div>
            </div>
          )}

          {/* Sub-step 8c: Claim/Token Management */}
          {currentSubStep === 'claims' && (
            <div>
              <h4>Claim/Token Check</h4>
              <p>Check required claims and user verification status for token operations.</p>
              {/* Token Selector */}
              {deployedTokens.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <h4>Select Token:</h4>
                  <select
                    id="selectedTokenClaims"
                    value={selectedContracts.Token || ""}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    onChange={(e) => {
                      const tokenAddress = e.target.value;
                      if (tokenAddress) {
                        setSelectedContracts(prev => ({ ...prev, Token: tokenAddress }));
                        setRequiredClaimTopics([]);
                        setVerificationStatus('Not checked');
                      } else {
                        setRequiredClaimTopics([]);
                        setVerificationStatus('Not checked');
                      }
                    }}
                  >
                    <option value="">-- Select a token --</option>
                    {deployedTokens.map((token, index) => (
                      <option key={index} value={token.address}>
                        {token.name} ({token.symbol}) - {token.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* User Address to Check */}
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h4>User Verification Check:</h4>
                <p>Check if a user is verified for this token (has all required claims from trusted issuers).</p>
                                  <div style={{ marginBottom: '1rem' }}>
                    <label>User Address to Check:</label>
                    <input
                      type="text"
                      value={userAddressToCheck}
                      onChange={(e) => setUserAddressToCheck(e.target.value)}
                      placeholder="0x... (leave empty to use account 0)"
                      style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
                    />
                  </div>
                {/* Only one comprehensive check button */}
                                  <Button
                    onClick={runComprehensiveDiagnostics}
                    disabled={checkingVerification || !selectedContracts.Token}
                    style={{ backgroundColor: '#007bff', color: 'white', marginBottom: '1rem', marginRight: '0.5rem' }}
                  >
                    {checkingVerification ? 'Checking...' : 'Run Comprehensive Check'}
                  </Button>
                {/* Show result area as before */}
                {message && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7', color: '#856404' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '1rem', margin: 0 }}>{message}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-step 8d: Function Management */}
          {currentSubStep === 'functions' && (
            <div>
              <h4>Function Management</h4>
              <p>Perform token operations and management functions.</p>
              
              {/* Token Selector */}
              {deployedTokens.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <h4>Select Token:</h4>
                  <select
                    id="selectedTokenFunctions"
                    value={selectedContracts.Token || ""}
                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    onChange={(e) => {
                      const tokenAddress = e.target.value;
                      if (tokenAddress) {
                        setSelectedContracts(prev => ({ ...prev, Token: tokenAddress }));
                        setTokenStatus('Checking...');
                        setTimeout(() => checkTokenStatus(), 100);
                      } else {
                        setTokenStatus('No token selected');
                      }
                    }}
                  >
                    <option value="">-- Select a token --</option>
                    {deployedTokens.map((token, index) => (
                      <option key={index} value={token.address}>
                        {token.name} ({token.symbol}) - {token.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Token Operations */}
              {selectedContracts.Token && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                  <h4>Token Operations:</h4>
                  <p>Perform token operations (requires agent role).</p>
                  
                  {/* Token Status */}
                  <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                    <strong>Token Status:</strong> 
                    <span style={{ 
                      marginLeft: '0.5rem',
                      color: tokenStatus.includes('PAUSED') ? '#dc3545' : 
                             tokenStatus.includes('ACTIVE') ? '#28a745' : 
                             tokenStatus.includes('❌') ? '#dc3545' : 
                             tokenStatus.includes('⚠️') ? '#ffc107' : '#6c757d'
                    }}>
                      {tokenStatus}
                    </span>
                    <Button
                      onClick={checkTokenStatus}
                      disabled={deploying || !selectedContracts.Token}
                      style={{ marginLeft: '0.5rem', backgroundColor: '#6c757d', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                      Refresh Status
                    </Button>
                  </div>
                  
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <Button
                  onClick={() => setTokenPaused(true)}
                  disabled={deploying}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  Pause Token
                </Button>
                <Button
                  onClick={() => setTokenPaused(false)}
                  disabled={deploying}
                  style={{ backgroundColor: '#28a745', color: 'white' }}
                >
                  Unpause Token
                </Button>
                <Button
                  onClick={checkAndFixModularCompliance}
                  disabled={checkingVerification}
                  style={{ backgroundColor: '#17a2b8', color: 'white' }}
                >
                  {checkingVerification ? 'Checking...' : 'Check ModularCompliance'}
                </Button>
              </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <h5>Mint Tokens:</h5>
                    <input
                      type="text"
                      placeholder="Recipient Address"
                      id="mintRecipient"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <input
                      type="number"
                      placeholder="Amount to Mint"
                      id="mintAmount"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <Button
                      onClick={mintTokens}
                      disabled={deploying}
                      style={{ backgroundColor: '#007bff', color: 'white' }}
                    >
                      {deploying ? 'Minting...' : 'Mint Tokens'}
                    </Button>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <h5>Burn Tokens:</h5>
                    <input
                      type="text"
                      placeholder="Address to Burn From"
                      id="burnAddress"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <input
                      type="number"
                      placeholder="Amount to Burn"
                      id="burnAmount"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <Button
                      onClick={burnTokens}
                      disabled={deploying}
                      style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                      {deploying ? 'Burning...' : 'Burn Tokens'}
                    </Button>
                  </div>

                  <div>
                    <h5>Transfer Tokens (Option 1 - Simple):</h5>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                      Transfer tokens from your wallet (signer/agent) to another address. This uses <code>transfer()</code> with full compliance checks.
                    </p>
                    
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                      <h6>✅ Standard Transfer:</h6>
                      <p style={{ fontSize: '0.9rem', color: '#155724', marginBottom: '0.5rem' }}>
                        • <strong>From:</strong> Your wallet (signer/agent)</p>
                      <p style={{ fontSize: '0.9rem', color: '#155724', marginBottom: '0.5rem' }}>
                        • <strong>To:</strong> Any verified address</p>
                      <p style={{ fontSize: '0.9rem', color: '#155724', margin: '0' }}>
                        • <strong>Compliance:</strong> Full validation (identity, compliance rules)</p>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="To Address (recipient)"
                      id="transferTo"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <input
                      type="number"
                      placeholder="Amount to Transfer"
                      id="transferAmount"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <Button
                      onClick={transferTokens}
                      disabled={deploying}
                      style={{ backgroundColor: '#28a745', color: 'white' }}
                    >
                      {deploying ? 'Transferring...' : 'Transfer Tokens'}
                    </Button>
                  </div>

                  <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '2px solid #dee2e6' }}>
                    <h5>Transfer Between Other Accounts (Option 2 - Advanced):</h5>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                      <strong>Optional:</strong> Test transfers between different accounts using agent privileges. This simulates real-world scenarios.
                    </p>
                    
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                      <h6>⚠️ Two-Step Process:</h6>
                      <p style={{ fontSize: '0.9rem', color: '#856404', marginBottom: '0.5rem' }}>
                        <strong>Step 1:</strong> Agent uses <code>forcedTransfer()</code> to move tokens from Account A to Agent</p>
                      <p style={{ fontSize: '0.9rem', color: '#856404', marginBottom: '0.5rem' }}>
                        <strong>Step 2:</strong> Agent uses <code>transfer()</code> to move tokens from Agent to Account B (with compliance)</p>
                      <p style={{ fontSize: '0.9rem', color: '#856404', marginBottom: '0.5rem' }}>
                        <strong>Why this works:</strong> Bypasses approval complexity while still testing compliance rules</p>
                      <p style={{ fontSize: '0.9rem', color: '#856404', margin: '0' }}>
                        <strong>Use case:</strong> Testing transfers between different user accounts in your Hardhat environment</p>
                    </div>
                    
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d1ecf1', borderRadius: '4px', border: '1px solid #bee5eb' }}>
                      <h6>ℹ️ Example Scenario:</h6>
                      <p style={{ fontSize: '0.9rem', color: '#0c5460', marginBottom: '0.5rem' }}>
                        • <strong>Account 2:</strong> Has 15 tokens (minted earlier)</p>
                      <p style={{ fontSize: '0.9rem', color: '#0c5460', marginBottom: '0.5rem' }}>
                        • <strong>Account 3:</strong> Verified address (wants to receive tokens)</p>
                      <p style={{ fontSize: '0.9rem', color: '#0c5460', margin: '0' }}>
                        • <strong>Result:</strong> 5 tokens moved from Account 2 → Agent → Account 3 (with compliance check)</p>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="From Address (e.g., Account 2)"
                      id="transferFromAdvanced"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <input
                      type="text"
                      placeholder="To Address (e.g., Account 3)"
                      id="transferToAdvanced"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <input
                      type="number"
                      placeholder="Amount to Transfer"
                      id="transferAmountAdvanced"
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
                    />
                    <Button
                      onClick={testTransferFromWithCompliance}
                      disabled={deploying}
                      style={{ backgroundColor: '#17a2b8', color: 'white' }}
                    >
                      {deploying ? 'Testing...' : 'Test Transfer Between Accounts'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
  ];



  return (
    <div style={{ backgroundColor: 'white', color: 'black' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: 'black' }}>T-REX Deployment</h2>
        <Button
          onClick={clearDeploymentState}
          disabled={clearing}
          style={{ backgroundColor: clearing ? '#ffc107' : '#dc3545', color: 'white' }}
        >
          {clearing ? 'Clearing...' : 'Clear All Data'}
        </Button>
      </div>

      {/* Progress indicator */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: currentStep === step.id ? '#007bff' : '#f8f9fa',
                color: currentStep === step.id ? 'white' : 'black',
                marginRight: index < steps.length - 1 ? '0.5rem' : 0,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => setCurrentStep(step.id)}
            >
              <div style={{ fontWeight: 'bold' }}>Step {step.id}</div>
              <div style={{ fontSize: '0.9rem' }}>{step.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current step content */}
      <div style={{ marginBottom: '2rem' }}>
        {steps.find(step => step.id === currentStep)?.content}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          style={{ backgroundColor: '#6c757d', color: 'white' }}
        >
          Previous
        </Button>
        <Button
          onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
          disabled={currentStep === steps.length}
          style={{ backgroundColor: '#28a745', color: 'white' }}
        >
          Next
        </Button>
      </div>

      {/* Status message */}
      {message && (
        <div style={{ 
          padding: '1.25rem', 
          backgroundColor: '#fff3cd', 
          border: '2px solid #ffeeba', 
          borderRadius: '6px',
          marginBottom: '1.5rem',
          color: '#856404',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(255, 193, 7, 0.1)'
        }}>
          {message}
        </div>
      )}

      {/* Logs */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '1rem', 
        borderRadius: '4px',
        maxHeight: '300px',
        overflow: 'auto'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'black' }}>Deployment Logs</h4>
        {logs.map((log, index) => (
          <div key={index} style={{ 
            marginBottom: '0.5rem', 
            padding: '0.5rem', 
            backgroundColor: 'white', 
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            <span style={{ color: '#666' }}>[{log.timestamp}]</span>
            <span style={{ 
              color: log.type === 'error' ? '#dc3545' : 
                     log.type === 'success' ? '#28a745' : '#007bff',
              marginLeft: '0.5rem'
            }}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Button component
const Button = ({ children, onClick, disabled, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      ...style
    }}
  >
    {children}
  </button>
);

// Contract Selector Component
const ContractSelector = ({ contractType, contracts, selectedAddress, onSelect, title, description }) => {
  // Handle both formats: contracts as array or contracts as object with contractType key
  let contractAddresses;
  if (Array.isArray(contracts)) {
    // Direct array format (used in token deployment)
    contractAddresses = contracts;
  } else {
    // Object format with contractType key (used in other phases)
    contractAddresses = contracts[contractType] || [];
  }
  
  if (!Array.isArray(contractAddresses)) {
    // Single contract case
    return (
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '15px', 
        marginTop: '15px',
        backgroundColor: '#f9f9f9'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📋 {title}</h4>
        <p style={{ margin: '0 0 10px 0', color: '#666' }}>{description}</p>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <strong>Selected:</strong> {contracts[contractType] || 'None found'}
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      padding: '15px', 
      marginTop: '15px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📋 {title}</h4>
      <p style={{ margin: '0 0 10px 0', color: '#666' }}>{description}</p>
      
      {contractAddresses.length === 0 ? (
        <div style={{ color: '#666', fontStyle: 'italic' }}>
          No {contractType} contracts found
        </div>
      ) : (
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select {contractType}:
          </label>
          <select
            value={selectedAddress || ''}
            onChange={(e) => onSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: 'white'
            }}
          >
            <option value="">-- Select a contract --</option>
            {contractAddresses.map((address, index) => (
              <option key={index} value={address}>
                {address} {index === 0 ? '(Latest)' : ''}
              </option>
            ))}
          </select>
          
          {selectedAddress && (
            <div style={{ 
              marginTop: '10px',
              backgroundColor: 'white', 
              padding: '10px', 
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              <strong>Selected:</strong> {selectedAddress}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeploymentPhase; 