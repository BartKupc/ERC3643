import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DeployCoreContractsTab from './advanced/steps/DeployCoreContractsTab';
import InitializeContractsTab from './advanced/steps/InitializeContractsTab';
import ConfigureIdentityRegistryTab from './advanced/steps/ConfigureIdentityRegistryTab';
import AddClaimTopicsTab from './advanced/steps/AddClaimTopicsTab';
import AddTrustedIssuerTab from './advanced/steps/AddTrustedIssuerTab';
import UserManagementTab from './advanced/steps/UserManagementTab';
import TokenManagementTab from './advanced/steps/TokenManagementTab';
import AgentManagementTab from './advanced/steps/AgentManagementTab';
import { ethers } from 'ethers';

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
  const [initializingContract, setInitializingContract] = useState({});
  const [tokenStatus, setTokenStatus] = useState('Not checked');
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  // Logging function
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    setLogs(prev => [...prev, logEntry]);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  };

  // Error extraction helper
  const extractCleanError = (error) => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return error.toString();
  };



  // Load deployment state from storage
  const loadDeploymentState = () => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setDeployedContracts(parsedState.contracts || {});
        setDeployedTokens(parsedState.tokens || []);
        // Do NOT log here
      }
    } catch (error) {
      console.error("Error loading deployment state:", error);
      addLog("Error loading deployment state", "error");
    }
  };

  // Save deployed contract to storage
  const saveDeployedContract = (name, address) => {
    setDeployedContracts(prev => {
      const updated = {
        ...prev,
        [name]: [...(prev[name] || []), address]
      };
      
      // Save to localStorage
      const savedState = localStorage.getItem(STORAGE_KEY);
      const parsedState = savedState ? JSON.parse(savedState) : {};
      const newState = {
        ...parsedState,
        contracts: updated
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      
      return updated;
    });
  };

  // Clear deployment state
  const clearDeploymentState = async () => {
    try {
      // Clear backend deployments.json
      await axios.delete('/api/deployments');
      
      // Clear frontend state
      setDeployedContracts({});
      setDeployedTokens([]);
      setSelectedContracts({});
      localStorage.removeItem(STORAGE_KEY);
      // Also clear user management and claim issuer history
      localStorage.removeItem('trex_user_identities');
      localStorage.removeItem('trex_available_claim_issuers');
      addLog("Cleared deployment state from both frontend and backend", "info");
      setMessage("Cleared deployment state from both frontend and backend");
    } catch (error) {
      console.error('Error clearing deployment state:', error);
      addLog("Error clearing deployment state: " + error.message, "error");
    }
  };

  // New contract interaction function using updated API
  const contractInteraction = async (action, options) => {
    const response = await axios.post('/api/contracts/interaction', {
      action,
      ...options
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Unknown error');
    }
    
    return response.data;
  };

  // Helper to parse deployments array into { ContractName: [addresses...] }
  const parseDeploymentsArray = (deployments) => {
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
  };

  // Replace reloadDeploymentState to use /api/deployments as the source of truth
  const reloadDeploymentState = async () => {
    try {
      const response = await axios.get('/api/deployments');
      const deployments = response.data.advanced || [];
      console.log('Backend deployments array:', deployments); // DEBUG LOG
      if (Array.isArray(deployments)) {
        const parsed = parseDeploymentsArray(deployments);
        setDeployedContracts(parsed);
        addLog('Reloaded deployment state from backend', 'info');
      }
    } catch (error) {
      console.error('Error reloading deployment state:', error);
      addLog('Error reloading deployment state from backend', 'error');
    }
  };

  // Auto-select latest deployed contracts
  const autoSelectLatestContracts = () => {
    const newSelectedContracts = {};
    
    Object.keys(deployedContracts).forEach(contractType => {
      if (deployedContracts[contractType] && deployedContracts[contractType].length > 0) {
        newSelectedContracts[contractType] = deployedContracts[contractType][0];
      }
    });
    
    setSelectedContracts(newSelectedContracts);
    // Only update if changed
    setSelectedContracts(prev => {
      const changed = Object.keys(newSelectedContracts).some(
        key => prev[key] !== newSelectedContracts[key]
      );
      if (changed) {
        addLog("Auto-selected latest deployed contracts", "info");
        return newSelectedContracts;
      }
      return prev;
    });
  };

  // Deploy contract using new API
  const deployContract = async (contractName) => {
    try {
      setDeploying(true);
      setMessage(`Deploying ${contractName}...`);
      addLog(`Starting deployment of ${contractName} via backend API`, "info");

      const result = await contractInteraction('deploy', { contractName });
      
      console.log(`${contractName} deployed at:`, result.contractAddress);
      addLog(`${contractName} deployed successfully at ${result.contractAddress}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
      saveDeployedContract(contractName, result.contractAddress);
      setMessage(`${contractName} deployed successfully at ${result.contractAddress}`);
      
      await reloadDeploymentState(); // Reload from backend
      
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

  // Add claim topic using new API
  const addClaimTopic = async (topicId) => {
    try {
      setDeploying(true);
      setMessage(`Adding claim topic ${topicId}...`);
      addLog(`Starting claim topic ${topicId} addition via backend API`, "info");

      const address = selectedContracts.ClaimTopicsRegistry || (deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0]);
      
      if (!address) {
        throw new Error('No ClaimTopicsRegistry found. Please deploy one first.');
      }
      
      const result = await contractInteraction('send', {
        contractName: 'ClaimTopicsRegistry',
        contractAddress: address,
        method: 'addClaimTopic',
        params: [topicId]
      });
      
      setMessage(`Claim topic ${topicId} added successfully`);
      addLog(`Claim topic ${topicId} added successfully`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
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

  // Remove claim topic using new API
  const removeClaimTopic = async (topicId) => {
    try {
      setDeploying(true);
      setMessage(`Removing claim topic ${topicId}...`);
      addLog(`Starting claim topic ${topicId} removal via backend API`, "info");

      const address = selectedContracts.ClaimTopicsRegistry || (deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0]);
      
      if (!address) {
        throw new Error('No ClaimTopicsRegistry found. Please deploy one first.');
      }
      
      const result = await contractInteraction('send', {
        contractName: 'ClaimTopicsRegistry',
        contractAddress: address,
        method: 'removeClaimTopic',
        params: [topicId]
      });
      
      setMessage(`Claim topic ${topicId} removed successfully`);
      addLog(`Claim topic ${topicId} removed successfully`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
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

  // Check if contract is initialized (like the old copy)
  const isContractInitialized = async (contractName, address) => {
    try {
      const result = await contractInteraction('view', {
        contractName,
        contractAddress: address,
        method: 'owner',
        params: []
      });
      
      // Check if owner is not zero address and is the current deployer
      const isInitialized = result.result && result.result !== '0x0000000000000000000000000000000000000000';
      console.log(`${contractName} owner: ${result.result}, initialized: ${isInitialized}`);
      return isInitialized;
    } catch (error) {
      console.log(`${contractName} owner check failed:`, error.message);
      return false;
    }
  };

  // Check contract initialization status
  const checkContractInitStatus = async () => {
    try {
      setCheckingInitStatus(true);
      setMessage("Checking contract initialization status...");
      addLog("Checking contract initialization status via backend API", "info");

      const status = {};
      
      for (const [contractType, addresses] of Object.entries(deployedContracts)) {
        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          addLog(`Checking ${contractType} at ${address}...`, "info");
          try {
            const isInitialized = await isContractInitialized(contractType, address);
            addLog(`${contractType} check result: ${isInitialized}`, "info");
            status[contractType] = { address, isInitialized };
          } catch (error) {
            addLog(`Error checking ${contractType} initialization: ${error.message}`, "error");
            status[contractType] = { address, isInitialized: false };
          }
        }
      }
      
      setContractInitStatus(status);
      setMessage("Contract initialization status checked");
      addLog("Contract initialization status checked", "success");
    } catch (error) {
      console.error("Error checking contract init status:", error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking contract init status: ${cleanError}`);
      addLog(`Error checking contract init status: ${cleanError}`, "error");
    } finally {
      setCheckingInitStatus(false);
    }
  };

  // Load claim topics using new API
  const loadClaimTopics = async (registryAddress) => {
    try {
      setLoadingClaimTopics(true);
      addLog("Loading claim topics via backend API", "info");
      console.log("🔍 Starting loadClaimTopics with address:", registryAddress);

      const result = await contractInteraction('call', {
        contractName: 'ClaimTopicsRegistry',
        contractAddress: registryAddress,
        method: 'getClaimTopics',
        params: []
      });
      
      console.log("🔍 Raw result from getClaimTopics:", result);
      console.log("🔍 Result type:", typeof result);
      console.log("🔍 Result keys:", Object.keys(result));
      
      const topicIds = result.result;
      console.log("🔍 Topic IDs from result:", topicIds);
      console.log("🔍 Topic IDs type:", typeof topicIds);
      console.log("🔍 Topic IDs is array:", Array.isArray(topicIds));
      console.log("🔍 Topic IDs length:", topicIds ? topicIds.length : 'undefined');
      
      // Map topic IDs to standard names (like the old copy)
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
      
      console.log("🔍 About to process topicIds:", topicIds);
      console.log("🔍 topicIds is array:", Array.isArray(topicIds));
      
      if (!Array.isArray(topicIds)) {
        console.log("🔍 ERROR: topicIds is not an array!");
        setAvailableClaimTopics([]);
        addLog("Error: Expected array of topic IDs but got: " + typeof topicIds, "error");
        return;
      }
      
      const topics = topicIds
        .filter(id => {
          console.log("🔍 Processing topic ID:", id);
          console.log("🔍 Topic ID type:", typeof id);
          console.log("🔍 Topic ID properties:", id ? Object.keys(id) : 'null/undefined');
          
          // Handle BigNumber objects and other formats
          let num;
          if (id && typeof id === 'object' && id.type === 'BigNumber' && id.hex) {
            // BigNumber object with type and hex properties
            num = parseInt(id.hex, 16);
            console.log("🔍 Parsed from BigNumber hex:", num);
          } else if (id && typeof id === 'object' && id._hex) {
            // BigNumber object with _hex property
            num = parseInt(id._hex, 16);
            console.log("🔍 Parsed from _hex:", num);
          } else if (id && typeof id === 'object' && id.toNumber) {
            // BigNumber object with toNumber method
            num = id.toNumber();
            console.log("🔍 Parsed from toNumber():", num);
          } else {
            // Regular number or string
            num = Number(id);
            console.log("🔍 Parsed as regular number:", num);
          }
          
          const isValid = !isNaN(num) && num > 0;
          console.log(`🔍 Filtering topic ID ${id} (type: ${typeof id}, converted: ${num}): ${isValid}`);
          return isValid;
        })
        .map(id => {
          console.log("🔍 Mapping topic ID:", id);
          
          // Handle BigNumber objects and other formats
          let num;
          if (id && typeof id === 'object' && id.type === 'BigNumber' && id.hex) {
            // BigNumber object with type and hex properties
            num = parseInt(id.hex, 16);
          } else if (id && typeof id === 'object' && id._hex) {
            // BigNumber object with _hex property
            num = parseInt(id._hex, 16);
          } else if (id && typeof id === 'object' && id.toNumber) {
            // BigNumber object with toNumber method
            num = id.toNumber();
          } else {
            // Regular number or string
            num = Number(id);
          }
          
          console.log(`🔍 Converting topic ID ${id} to number: ${num}`);
          const topic = {
            id: num,
            name: standardTopics[num] || `Custom Topic ${num}`,
            description: standardTopics[num] ? `Standard claim topic for ${standardTopics[num].split(' ')[0]}` : `Custom claim topic with ID ${num}`
          };
          console.log("🔍 Created topic object:", topic);
          return topic;
        });
      
      console.log("🔍 Final processed topics:", topics);
      setAvailableClaimTopics(topics);
      addLog(`Loaded ${topics.length} claim topics from registry`, "info");
    } catch (error) {
      console.error("Error loading claim topics:", error);
      setAvailableClaimTopics([]);
      addLog(`Error loading claim topics: ${error.message}`, "error");
    } finally {
      setLoadingClaimTopics(false);
    }
  };

  // Initialize contract (like the old copy)
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
      
      const result = await contractInteraction('initialize', {
        contractName,
        contractAddress: address
      });
      
      if (result.alreadyInitialized) {
        addLog(`${contractName} is already initialized, skipping`, "info");
      } else {
        addLog(`${contractName} initialized successfully`, "success");
        addLog(`Transaction hash: ${result.transactionHash}`, "info");
      }
      
      await reloadDeploymentState();
      
      // Update status based on the result
      if (result.alreadyInitialized) {
        // Contract was already initialized
        setContractInitStatus(prev => ({
          ...prev,
          [contractName]: { address, isInitialized: true }
        }));
      } else {
        // Contract was just initialized, verify the status
        addLog(`Verifying initialization status for ${contractName}...`, "info");
        // Add small delay to ensure blockchain state is updated
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newStatus = await isContractInitialized(contractName, address);
        addLog(`${contractName} verification result: ${newStatus}`, "info");
        setContractInitStatus(prev => ({
          ...prev,
          [contractName]: { address, isInitialized: newStatus }
        }));
      }
    } catch (error) {
      console.error(`Error initializing ${contractName}:`, error);
      addLog(`Error initializing ${contractName}: ${error.message}`, "error");
      throw error;
    } finally {
      setInitializingContract(prev => ({ ...prev, [contractName]: false }));
    }
  };

  // Initialize all contracts (like the old copy)
  const initializeAllContracts = async () => {
    try {
      setInitializing(true);
      setMessage('Initializing contracts...');
      addLog('Starting contract initialization', "info");

      // Initialize only contracts that have been explicitly selected in the dropdown
      const contractsToInitialize = [
        'ClaimTopicsRegistry',
        'TrustedIssuersRegistry', 
        'IdentityRegistryStorage',
        'IdentityRegistry',
        'ModularCompliance'
      ];

      let initializedCount = 0;
      for (const contractName of contractsToInitialize) {
        // Only initialize if the contract has been explicitly selected in the dropdown
        if (selectedContracts[contractName]) {
          addLog(`Initializing selected ${contractName} at ${selectedContracts[contractName]}`, "info");
          await initializeContract(contractName);
          initializedCount++;
        } else {
          addLog(`Skipping ${contractName} - not selected in dropdown`, "info");
        }
      }

      if (initializedCount === 0) {
        setMessage('No contracts selected for initialization. Please select contracts in the dropdowns first.');
        addLog('No contracts selected for initialization. Please select contracts in the dropdowns first.', "warning");
      } else {
        setMessage(`Contract initialization completed. ${initializedCount} contracts initialized.`);
        addLog(`Contract initialization completed. ${initializedCount} contracts initialized.`, "success");
      }
    } catch (error) {
      console.error('Error during contract initialization:', error);
      setMessage(`Error during contract initialization: ${error.message}`);
      addLog(`Error during contract initialization: ${error.message}`, "error");
    } finally {
      setInitializing(false);
    }
  };

  // Configure Identity Registry (like the old copy)
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
      const tx1 = await contractInteraction('send', {
        contractName: 'IdentityRegistry',
        contractAddress: identityRegistryAddress,
        method: 'setTrustedIssuersRegistry',
        params: [trustedIssuersAddress]
      });
      addLog(`TrustedIssuersRegistry at ${trustedIssuersAddress} connected to IdentityRegistry`, "success");
      addLog(`Transaction hash: ${tx1.transactionHash}`, "info");

      // Backend API for setClaimTopicsRegistry
      const tx2 = await contractInteraction('send', {
        contractName: 'IdentityRegistry',
        contractAddress: identityRegistryAddress,
        method: 'setClaimTopicsRegistry',
        params: [claimTopicsAddress]
      });
      addLog(`ClaimTopicsRegistry at ${claimTopicsAddress} connected to IdentityRegistry`, "success");
      addLog(`Transaction hash: ${tx2.transactionHash}`, "info");

      // Backend API for setIdentityRegistryStorage
      const tx3 = await contractInteraction('send', {
        contractName: 'IdentityRegistry',
        contractAddress: identityRegistryAddress,
        method: 'setIdentityRegistryStorage',
        params: [storageAddress]
      });
      addLog(`IdentityRegistryStorage at ${storageAddress} connected to IdentityRegistry`, "success");
      addLog(`Transaction hash: ${tx3.transactionHash}`, "info");

      // BILATERAL BINDING: Bind IRS back to IR
      addLog(`Establishing bilateral binding between IR and IRS`, "info");
      const tx4 = await contractInteraction('send', {
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

  // Load state on component mount
  useEffect(() => {
    loadDeploymentState();
    addLog("Loaded deployment state from storage", "info");
    reloadDeploymentState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add useEffect to auto-select contracts when deployedContracts changes
  useEffect(() => {
    if (Object.keys(deployedContracts).length > 0) {
      autoSelectLatestContracts();
    }
    // eslint-disable-next-line
  }, [deployedContracts]);

  // Clear message when step changes
  useEffect(() => {
    setMessage('');
  }, [currentStep]);

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Token Management Functions
  const deployToken = async (tokenDetails) => {
    try {
      setDeploying(true);
      setMessage('Deploying token...');
      addLog('Starting token deployment via backend API', "info");

      // Get the addresses to use (selected if available, otherwise latest deployed)
      const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
      const complianceAddress = selectedContracts.ModularCompliance || (deployedContracts.ModularCompliance && deployedContracts.ModularCompliance[0]);
      
      if (!identityRegistryAddress) {
        throw new Error('No Identity Registry found. Please deploy one first.');
      }
      
      if (!complianceAddress) {
        throw new Error('No ModularCompliance found. Please deploy one first.');
      }

      addLog(`Using Identity Registry: ${identityRegistryAddress}`, "info");
      addLog(`Using ModularCompliance: ${complianceAddress}`, "info");

      // Deploy token using backend API with contract addresses
      const result = await contractInteraction('deploy', {
        contractName: 'Token',
        tokenDetails: {
          ...tokenDetails,
          identityRegistryAddress,
          complianceAddress
        }
      });
      
      const tokenInfo = {
        address: result.contractAddress,
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
        decimals: tokenDetails.decimals,
        deployedAt: new Date().toISOString()
      };
      
      // Save to deployed tokens
      setDeployedTokens(prev => [...prev, tokenInfo]);
      
      setMessage(`Token deployed successfully at ${result.contractAddress}`);
      addLog(`Token deployed successfully at ${result.contractAddress}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
      await reloadDeploymentState();
      
      return result.contractAddress;
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

  const addTokenAgent = async (agentAddress) => {
    try {
      setDeploying(true);
      setMessage('Adding token agent...');
      addLog('Starting token agent addition via backend API', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      addLog(`Selected token address: ${selectedContracts.Token}`, "info");
      addLog(`Agent address: ${agentAddress}`, "info");

      // Add agent using backend API
      const result = await contractInteraction('send', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        method: 'addAgent',
        params: [agentAddress]
      });
      
      setMessage('Token agent added successfully');
      addLog('Token agent added successfully', "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
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
      addLog(`Starting token ${paused ? 'pause' : 'unpause'} via backend API`, "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      const method = paused ? 'pause' : 'unpause';
      const result = await contractInteraction('send', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        method: method,
        params: []
      });
      
      setMessage(`Token ${paused ? 'paused' : 'unpaused'} successfully`);
      addLog(`Token ${paused ? 'paused' : 'unpaused'} successfully`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
    } catch (error) {
      console.error(`Error ${paused ? 'pausing' : 'unpausing'} token:`, error);
      const cleanError = extractCleanError(error);
      setMessage(`Error ${paused ? 'pausing' : 'unpausing'} token: ${cleanError}`);
      addLog(`Error ${paused ? 'pausing' : 'unpausing'} token: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const mintTokens = async (recipient, amount) => {
    try {
      setDeploying(true);
      setMessage('Minting tokens...');
      addLog('Starting token minting via backend API', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      if (!recipient || !amount) {
        throw new Error('Please provide recipient address and amount');
      }

      addLog(`Minting ${amount} tokens to ${recipient}`, "info");

      const response = await fetch('/api/token/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedContracts.Token,
          recipient: recipient,
          amount: amount
        })
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Unknown error');
      
      setMessage(`Successfully minted ${amount} tokens to ${recipient}`);
      addLog(`Successfully minted ${amount} tokens to ${recipient}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      addLog(`Recipient balance after mint: ${result.recipientBalance} tokens`, "info");
    } catch (error) {
      console.error('Error minting tokens:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error minting tokens: ${cleanError}`);
      addLog(`Error minting tokens: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const burnTokens = async (fromAddress, amount) => {
    try {
      setDeploying(true);
      setMessage('Burning tokens...');
      addLog('Starting token burning via backend API', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      if (!fromAddress || !amount) {
        throw new Error('Please provide address to burn from and amount');
      }

      addLog(`Burning ${amount} tokens from ${fromAddress}`, "info");

      const response = await fetch('/api/token/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedContracts.Token,
          fromAddress: fromAddress,
          amount: amount
        })
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Unknown error');
      
      setMessage(`Successfully burned ${amount} tokens from ${fromAddress}`);
      addLog(`Successfully burned ${amount} tokens from ${fromAddress}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      addLog(`Address balance after burn: ${result.fromAddressBalance} tokens`, "info");
    } catch (error) {
      console.error('Error burning tokens:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error burning tokens: ${cleanError}`);
      addLog(`Error burning tokens: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const transferTokens = async (toAddress, amount) => {
    try {
      setDeploying(true);
      setMessage('Transferring tokens...');
      addLog('Starting token transfer via backend API', "info");

      if (!selectedContracts.Token) {
        throw new Error('Please select a token first');
      }

      if (!toAddress || !amount) {
        throw new Error('Please provide recipient address and amount');
      }

      addLog(`Transferring ${amount} tokens to ${toAddress}`, "info");

      const response = await fetch('/api/token/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedContracts.Token,
          toAddress: toAddress,
          amount: amount
        })
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Unknown error');
      
      setMessage(`Successfully transferred ${amount} tokens to ${toAddress}`);
      addLog(`Successfully transferred ${amount} tokens to ${toAddress}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      addLog(`Recipient balance after transfer: ${result.toAddressBalance} tokens`, "info");
    } catch (error) {
      console.error('Error transferring tokens:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error transferring tokens: ${cleanError}`);
      addLog(`Error transferring tokens: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const checkTokenStatus = async () => {
    try {
      if (!selectedContracts.Token) {
        setTokenStatus('No token selected');
        return;
      }

      addLog('Checking token status via backend API', "info");

      const result = await contractInteraction('call', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        method: 'paused',
        params: []
      });
      
      const isPaused = result.result;
      const status = isPaused ? 'PAUSED' : 'ACTIVE';
      
      setTokenStatus(status);
      addLog(`Token status: ${status}`, "info");
    } catch (error) {
      console.error('Error checking token status:', error);
      setTokenStatus('Error checking status');
      addLog(`Error checking token status: ${error.message}`, "error");
    }
  };

  const deployClaimIssuerAndAddAsTrusted = async (claimTopics) => {
    try {
      setDeploying(true);
      setMessage('Deploying ClaimIssuer and adding as trusted issuer...');
      addLog('Starting ClaimIssuer deployment and trusted issuer setup', "info");

      // Use the existing /api/deploy/claim-issuer endpoint (same as Easy Deploy)
      const response = await axios.post('/api/deploy/claim-issuer', {}, {
        timeout: 3 * 60 * 1000 // 3 minute timeout for ClaimIssuer deployment
      });
      
      if (response.data.success) {
        const { claimIssuerAddress, deployerAddress } = response.data;
        
        addLog(`ClaimIssuer deployed at: ${claimIssuerAddress}`, "success");
        addLog(`Deployer address: ${deployerAddress}`, "info");
        
        // Note: The backend automatically adds ClaimIssuer to TrustedIssuersRegistry with default topics [1, 2, 3]
        // For custom topics, we need to add them separately
        if (claimTopics.length > 0 && selectedContracts.TrustedIssuersRegistry) {
          addLog('Adding custom claim topics to TrustedIssuersRegistry...', "info");
          
          // Add custom claim topics to the TrustedIssuersRegistry
          const result = await contractInteraction('call', {
            contractName: 'TrustedIssuersRegistry',
            contractAddress: selectedContracts.TrustedIssuersRegistry,
            method: 'addTrustedIssuer',
            params: [claimIssuerAddress, claimTopics]
          });
          
          addLog(`Custom claim topics [${claimTopics.join(', ')}] added to ClaimIssuer`, "success");
        }
        
        setMessage(`ClaimIssuer deployed at ${claimIssuerAddress} and added as trusted issuer`);
        addLog('ClaimIssuer deployment and trusted issuer setup completed', "success");
        
        // Reload deployment state to include the new ClaimIssuer
        await reloadDeploymentState();
      } else {
        throw new Error(response.data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Error deploying ClaimIssuer and adding as trusted issuer:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error: ${cleanError}`);
      addLog(`Error: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  const runComprehensiveDiagnostics = async (userAddress) => {
    try {
      if (!selectedContracts.Token) {
        setVerificationMessage('Please select a token first');
        return;
      }

      // Use account 0 if no address is provided
      const addressToCheck = userAddress.trim() || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      setCheckingVerification(true);
      setVerificationMessage('Running comprehensive diagnostics...');
      addLog(`Running comprehensive diagnostics for user: ${addressToCheck}`, "info");

      // Call backend API for comprehensive diagnostics
      const result = await contractInteraction('diagnostics', {
        contractName: 'Token',
        contractAddress: selectedContracts.Token,
        userAddress: addressToCheck
      });
      
      setVerificationMessage(result.diagnosticResults);
      addLog('Comprehensive diagnostics completed', "success");
      
    } catch (error) {
      console.error('Error running comprehensive diagnostics:', error);
      const cleanError = extractCleanError(error);
      setVerificationMessage(`Error running diagnostics: ${cleanError}`);
      addLog(`Error running diagnostics: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };


  // Stepper logic
  const steps = [
    {
      title: 'Deploy Core Contracts',
      component: (
        <DeployCoreContractsTab
          deployedContracts={deployedContracts}
          deploying={deploying}
          deployContract={deployContract}
        />
      )
    },
    {
      title: 'Initialize Contracts',
      component: (
        <InitializeContractsTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          initializing={initializing}
          initializingContract={initializingContract}
          initializeContract={initializeContract}
          initializeAllContracts={initializeAllContracts}
          contractInitStatus={contractInitStatus}
          checkContractInitStatus={checkContractInitStatus}
          checkingInitStatus={checkingInitStatus}
          addLog={addLog}
        />
      )
    },
    {
      title: 'Configure Identity Registry',
      component: (
        <ConfigureIdentityRegistryTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          configuring={deploying}
          configureIdentityRegistry={configureIdentityRegistry}
          reloadDeploymentState={reloadDeploymentState}
          addLog={addLog}
        />
      )
    },
    {
      title: 'Add Claim Topics',
      component: (
        <AddClaimTopicsTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          availableClaimTopics={availableClaimTopics}
          loadingClaimTopics={loadingClaimTopics}
          addClaimTopic={addClaimTopic}
          removeClaimTopic={removeClaimTopic}
          loadClaimTopics={loadClaimTopics}
          reloadDeploymentState={reloadDeploymentState}
          addLog={addLog}
          deploying={deploying}
        />
      )
    },
    {
      title: 'Add Trusted Issuer',
      component: (
        <AddTrustedIssuerTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          deployClaimIssuerAndAddAsTrusted={deployClaimIssuerAndAddAsTrusted}
          reloadDeploymentState={reloadDeploymentState}
          addLog={addLog}
          deploying={deploying}
        />
      )
    },
    {
      title: 'Agent Management',
      component: (
        <AgentManagementTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          addLog={addLog}
        />
      )
    },
    {
      title: 'User Management',
      component: (
        <UserManagementTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          // ...other user management handlers...
        />
      )
    },
    {
      title: 'Token Management',
      component: (
        <TokenManagementTab
          deployedContracts={deployedContracts}
          deployedTokens={deployedTokens}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          deployToken={deployToken}
          addTokenAgent={addTokenAgent}
          setTokenPaused={setTokenPaused}
          mintTokens={mintTokens}
          burnTokens={burnTokens}
          transferTokens={transferTokens}
          checkTokenStatus={checkTokenStatus}
          runComprehensiveDiagnostics={runComprehensiveDiagnostics}
          tokenStatus={tokenStatus}
          setTokenStatus={setTokenStatus}
          checkingVerification={checkingVerification}
          deploying={deploying}
          reloadDeploymentState={reloadDeploymentState}
          addLog={addLog}
          setVerificationMessage={setVerificationMessage}
          verificationMessage={verificationMessage}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#222', background: 'white' }}>
      <h1 style={{ color: '#222' }}>Deployment Phase</h1>
      {/* Clear State Button (moved to top) */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={clearDeploymentState}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Clear All Deployment State
        </button>
      </div>
      {/* Stepper/Progress Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {steps.map((step, idx) => (
          <button
            key={step.title}
            onClick={() => setCurrentStep(idx + 1)}
            style={{
              backgroundColor: currentStep === idx + 1 ? '#007bff' : '#e9ecef',
              color: currentStep === idx + 1 ? 'white' : '#222',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              flex: 1,
              fontWeight: currentStep === idx + 1 ? 'bold' : 'normal',
              fontSize: '1rem',
            }}
          >
            Step {idx + 1}: {step.title}
          </button>
        ))}
      </div>
      {/* Message Display (reverted to top) */}
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '5px',
          color: message.includes('Error') ? '#721c24' : '#222',
          fontWeight: 'bold',
        }}>
          {message}
        </div>
      )}
      {/* Render current step */}
      <div style={{ marginBottom: '30px', color: '#222' }}>
        {steps[currentStep - 1].component}
      </div>
      {/* Logs */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ color: '#222' }}>Logs</h3>
          <button onClick={clearLogs} style={{ padding: '5px 10px', color: '#222', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px' }}>
            Clear Logs
          </button>
        </div>
        <div style={{
          height: '300px',
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#222',
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{
              marginBottom: '5px',
              color: log.type === 'error' ? '#dc3545' :
                log.type === 'success' ? '#28a745' :
                  log.type === 'warning' ? '#ffc107' : '#222'
            }}>
              [{log.timestamp}] {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeploymentPhase; 