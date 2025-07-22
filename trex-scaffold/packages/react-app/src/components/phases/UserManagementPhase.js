import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getContractArtifacts } from '../../hooks/compiledContracts';

const IDENTITIES_STORAGE_KEY = 'trex_user_identities';

const UserManagementPhase = ({ deployedContracts = {}, selectedContracts = {}, setSelectedContracts = () => {} }) => {
  // Debug logging to see what props we're receiving
  console.log('🔍 UserManagementPhase received props:', { deployedContracts, selectedContracts });
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [userAddress, setUserAddress] = useState('');
  const [onchainIdAddress, setOnchainIdAddress] = useState('');
  const [claimTopic, setClaimTopic] = useState('');
  const [claimValue, setClaimValue] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [userCountry, setUserCountry] = useState(0);
  const [currentSubStep, setCurrentSubStep] = useState('create');
  
  // Standard T-REX claim topics (Tokeny standard)
  const claimTopics = [
    { id: 1, name: "KYC (Know Your Customer)", values: ["YES", "NO"] },
    { id: 2, name: "AML (Anti-Money Laundering)", values: ["YES", "NO"] },
    { id: 3, name: "Accredited Investor", values: ["YES", "NO"] },
    { id: 4, name: "EU Nationality Confirmed", values: ["YES", "NO"] },
    { id: 5, name: "US Nationality Confirmed", values: ["YES", "NO"] },
    { id: 6, name: "Blacklist", values: ["YES", "NO"] }
  ];
  
  // New state for identity management
  const [userIdentities, setUserIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [showIdentityList, setShowIdentityList] = useState(false);
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [selectedTrustedIssuer, setSelectedTrustedIssuer] = useState('');
  const [selectedClaimIssuerForKeys, setSelectedClaimIssuerForKeys] = useState('');
  const [processingClaimIssuer, setProcessingClaimIssuer] = useState('');

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  // Extract clean error message from verbose ethers.js errors
  const extractCleanError = (error) => {
    try {
      // Check error.error.reason first (this is where the actual error is)
      if (error.error && error.error.reason) {
        if (error.error.reason.includes('reverted with reason string')) {
          const match = error.error.reason.match(/reverted with reason string '([^']+)'/);
          if (match) {
            return match[1]; // Return the clean error message
          }
        }
        return error.error.reason;
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

  // Load user identities from localStorage on component mount
  useEffect(() => {
    const loadUserIdentities = () => {
      try {
        const savedIdentities = localStorage.getItem(IDENTITIES_STORAGE_KEY);
        if (savedIdentities) {
          const parsedIdentities = JSON.parse(savedIdentities);
          setUserIdentities(parsedIdentities);
          addLog(`Loaded ${parsedIdentities.length} user identities from storage`, "info");
        }
      } catch (error) {
        console.error('Error loading user identities:', error);
        addLog("Error loading user identities", "error");
      }
    };
    
    loadUserIdentities();
  }, []);

  // Auto-select latest Identity Registry when deployedContracts changes
  useEffect(() => {
    if (
      deployedContracts.IdentityRegistry &&
      deployedContracts.IdentityRegistry.length > 0 &&
      !selectedContracts.IdentityRegistry
    ) {
      const latestIdentityRegistry = deployedContracts.IdentityRegistry[0];
      setSelectedContracts(prev => ({ ...prev, IdentityRegistry: latestIdentityRegistry }));
      addLog(`Auto-selected latest Identity Registry: ${latestIdentityRegistry}`, "info");
    }
  }, [deployedContracts.IdentityRegistry, selectedContracts.IdentityRegistry, setSelectedContracts]);

  // Load trusted issuers when Identity Registry changes
  useEffect(() => {
    const loadTrustedIssuers = async () => {
      if (selectedContracts.IdentityRegistry) {
        try {
          const issuers = await getAllTrustedIssuers();
          setTrustedIssuers(issuers);
        } catch (error) {
          console.error('Error loading trusted issuers:', error);
          addLog("Error loading trusted issuers", "error");
        }
      }
    };
    
    loadTrustedIssuers();
  }, [selectedContracts.IdentityRegistry]);



  // Save user identity to localStorage
  const saveUserIdentity = (identity) => {
    setUserIdentities(prev => {
      // Check for duplicates
      const existingIndex = prev.findIndex(id => id.userAddress.toLowerCase() === identity.userAddress.toLowerCase());
      let updated;
      
      if (existingIndex >= 0) {
        // Update existing identity
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...identity };
        addLog(`Updated existing identity for ${identity.userAddress}`, "info");
      } else {
        // Add new identity
        updated = [...prev, identity];
        addLog(`Added new identity for ${identity.userAddress}`, "success");
      }
      
      localStorage.setItem(IDENTITIES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Check if identity already exists for a wallet
  const checkExistingIdentity = (walletAddress) => {
    return userIdentities.find(id => id.userAddress.toLowerCase() === walletAddress.toLowerCase());
  };

  // NOTE: For network info, block number, gas price, etc., use the shared rpcCall helpers from contractHelpers.js
  const getSigner = async () => {
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat account 0
    return new ethers.Wallet(privateKey, provider);
  };

  // Create OnchainID for a wallet
  const createOnchainId = async () => {
    try {
      setDeploying(true);
      setMessage('Creating OnchainID...');
      addLog('Starting OnchainID creation', "info");

      if (!userAddress.trim()) {
        throw new Error('Please enter a wallet address');
      }

      // Check if identity already exists
      const existingIdentity = checkExistingIdentity(userAddress);
      if (existingIdentity) {
        setMessage(`Identity already exists for ${userAddress}. OnchainID: ${existingIdentity.onchainIdAddress}`);
        setOnchainIdAddress(existingIdentity.onchainIdAddress);
        addLog(`Using existing identity for ${userAddress}`, "info");
        return;
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts('Identity');
      
      console.log('Deploying Identity with artifacts:', artifacts);
      
      // Deploy Identity contract with signer as the owner (not userAddress)
      // This allows the signer to add ClaimIssuer keys
      addLog(`Creating OnchainID with signer ${signerAddress} as owner...`, "info");
      const contractFactory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, signer);
      const contract = await contractFactory.deploy(signerAddress, false); // Use signerAddress as owner
      await contract.deployed();
      
      const onchainIdAddress = contract.address;
      setOnchainIdAddress(onchainIdAddress);
      
      // Step 2: Add the userAddress as a management key to the OnchainID
      addLog(`Adding user ${userAddress} as management key to OnchainID...`, "info");
      
      const userKeyHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address'], [userAddress])
      );
      
      try {
        // Add the user as a management key (purpose=1) and action key (purpose=2)
        addLog(`Adding user ${userAddress} as management key...`, "info");
        const addManagementKeyTx = await contract.addKey(userKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
        await addManagementKeyTx.wait();
        
        addLog(`Adding user ${userAddress} as action key...`, "info");
        const addActionKeyTx = await contract.addKey(userKeyHash, 2, 1); // purpose=2 (action), keyType=1 (ECDSA)
        await addActionKeyTx.wait();
        
        addLog(`✅ Successfully added user ${userAddress} keys to OnchainID`, "success");
      } catch (keyError) {
        addLog(`⚠️ Could not add user keys: ${extractCleanError(keyError)}`, "warning");
      }
      
      // Note: ClaimIssuer keys are NOT added automatically
      // Users must manually select which ClaimIssuer to use for each claim
      // and manually add ClaimIssuer keys if needed using the "Add ClaimIssuer Keys" button
      addLog(`ℹ️ ClaimIssuer keys are NOT added automatically`, "info");
      addLog(`ℹ️ You must manually select which ClaimIssuer to use for each claim`, "info");
      addLog(`ℹ️ Use the "Add ClaimIssuer Keys" button if you need to add ClaimIssuer keys to this OnchainID`, "info");
      
      // Save the new identity
      const newIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        country: userCountry,
        createdAt: new Date().toISOString(),
        status: 'created',
        claims: []
      };
      saveUserIdentity(newIdentity);
      
      console.log('Identity deployed at:', onchainIdAddress);
      addLog(`OnchainID created at ${onchainIdAddress}`, "success");
      addLog(`OnchainID owner: ${signerAddress} (signer)`, "info");
      addLog(`User ${userAddress} added as management and action key`, "info");
      setMessage(`OnchainID created successfully at ${onchainIdAddress}`);
    } catch (error) {
      console.error('Error creating OnchainID:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error creating OnchainID: ${cleanError}`);
      addLog(`Error creating OnchainID: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  // Register identity in Identity Registry
  const registerIdentity = async () => {
    try {
      setDeploying(true);
      setMessage('Registering identity...');
      addLog('Starting identity registration', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
      if (!identityRegistryAddress) {
        throw new Error('No Identity Registry found. Please deploy one first.');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const artifacts = getContractArtifacts('IdentityRegistry');
      const registry = new ethers.Contract(identityRegistryAddress, artifacts.abi, signer);
      
      // Pre-flight checks
      addLog(`Pre-flight checks for registration:`, "info");
      addLog(`- User Address: ${userAddress}`, "info");
      addLog(`- OnchainID Address: ${onchainIdAddress}`, "info");
      addLog(`- Country: ${userCountry}`, "info");
      addLog(`- IR Address: ${identityRegistryAddress}`, "info");
      addLog(`- Signer Address: ${signerAddress}`, "info");
      
      // Check agent status right before registration
      const isAgentIR = await registry.isAgent(signerAddress);
      addLog(`- Agent on IR before registration: ${isAgentIR ? 'YES' : 'NO'}`, isAgentIR ? "success" : "error");
      
      // Get IRS address and check agent status
      const irsAddress = await registry.identityStorage();
      const irsArtifacts = getContractArtifacts('IdentityRegistryStorage');
      const irs = new ethers.Contract(irsAddress, irsArtifacts.abi, signer);
      const isAgentIRS = await irs.isAgent(signerAddress);
      addLog(`- Agent on IRS before registration: ${isAgentIRS ? 'YES' : 'NO'}`, isAgentIRS ? "success" : "error");
      
      if (!isAgentIR || !isAgentIRS) {
        throw new Error(`Agent check failed. IR: ${isAgentIR}, IRS: ${isAgentIRS}`);
      }
      
      // registerIdentity requires: userAddress, identityAddress, country
      addLog(`Calling registerIdentity(${userAddress}, ${onchainIdAddress}, ${userCountry})`, "info");
      const tx = await registry.registerIdentity(userAddress, onchainIdAddress, userCountry);
      await tx.wait();
      
      // Update identity status
      const updatedIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        country: userCountry,
        identityRegistryAddress: identityRegistryAddress,
        status: 'registered',
        registeredAt: new Date().toISOString()
      };
      saveUserIdentity(updatedIdentity);
      
      addLog(`Identity registered for ${userAddress}`, "success");
      setMessage(`Identity registered successfully for ${userAddress}`);
    } catch (error) {
      console.error('Error registering identity:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error registering identity: ${cleanError}`);
      addLog(`Error registering identity: ${cleanError}`, "error");
      
      // Additional error context
      if (cleanError.includes('AgentRole')) {
        addLog(`Agent role error detected. This usually means:`, "error");
        addLog(`1. You're not an agent on the IRS that IR is using`, "error");
        addLog(`2. The IRS contract has a different agent list than expected`, "error");
        addLog(`3. There's a mismatch between the IRS you think IR is using and the actual one`, "error");
      }
    } finally {
      setDeploying(false);
    }
  };

  // Get the first trusted issuer from the registry (for testing purposes)
  const getFirstTrustedIssuer = async () => {
    try {
      setDeploying(true);
      setMessage('Getting first trusted issuer...');
      addLog('Getting first trusted issuer from registry', "info");

      const signer = await getSigner();
      
      // Get the TrustedIssuersRegistry
      const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
      if (!identityRegistryAddress) {
        throw new Error('No IdentityRegistry selected. Please select one first.');
      }
      
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      const tirAddress = await ir.issuersRegistry();
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
      
      // Get all trusted issuers
      const trustedIssuers = await tir.getTrustedIssuers();
      
      if (trustedIssuers.length === 0) {
        addLog('No trusted issuers found in registry', "warning");
        setMessage('No trusted issuers found. Please add a trusted issuer in Step 6 first.');
        return null;
      }
      
      const firstIssuer = trustedIssuers[0];
      addLog(`Found trusted issuer: ${firstIssuer}`, "success");
      setMessage(`Found trusted issuer: ${firstIssuer}`);
      
      return firstIssuer;
      
    } catch (error) {
      console.error('Error getting trusted issuer:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error getting trusted issuer: ${cleanError}`);
      addLog(`Error getting trusted issuer: ${cleanError}`, "error");
      return null;
    } finally {
      setDeploying(false);
    }
  };

  // Add selected ClaimIssuer keys to OnchainID
  const addClaimIssuerKeysToOnchainID = async (onchainIdAddress) => {
    try {
      setDeploying(true);
      setMessage('Adding selected ClaimIssuer keys to OnchainID...');
      addLog(`Adding selected ClaimIssuer keys to OnchainID: ${onchainIdAddress}`, "info");

      if (!selectedClaimIssuerForKeys) {
        throw new Error('No ClaimIssuer selected. Please select a ClaimIssuer first.');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      
      // Get the OnchainID contract
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // First, ensure the signer has management keys on this OnchainID
      addLog(`Checking if signer ${signerAddress} has management keys on OnchainID...`, "info");
      
      const signerKeyHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address'], [signerAddress])
      );
      
      try {
        const signerKey = await onchainId.getKey(signerKeyHash);
        const hasManagementKey = signerKey.purposes.some(p => p.toNumber() === 1);
        
        if (!hasManagementKey) {
          addLog(`Signer does not have management key. Adding management key for signer...`, "warning");
          
          // Add management key for the signer
          const addManagementKeyTx = await onchainId.addKey(signerKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
          await addManagementKeyTx.wait();
          addLog(`✅ Added management key for signer ${signerAddress}`, "success");
        } else {
          addLog(`✅ Signer already has management key`, "success");
        }
      } catch (e) {
        addLog(`Signer key not found. Adding management key for signer...`, "warning");
        
        // Add management key for the signer
        const addManagementKeyTx = await onchainId.addKey(signerKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
        await addManagementKeyTx.wait();
        addLog(`✅ Added management key for signer ${signerAddress}`, "success");
      }
      
      // Add the selected ClaimIssuer as keys to the OnchainID
      const claimIssuer = selectedClaimIssuerForKeys;
      setProcessingClaimIssuer(`Adding ClaimIssuer keys: ${claimIssuer}`);
      addLog(`Adding ClaimIssuer ${claimIssuer} as keys to OnchainID...`, "info");
      
      try {
        // Create the key hash for the ClaimIssuer
        const claimIssuerKeyHash = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address'], [claimIssuer])
        );
        
        // Check if key already exists
        try {
          const existingKey = await onchainId.getKey(claimIssuerKeyHash);
          if (existingKey.purposes.length > 0) {
            addLog(`ClaimIssuer ${claimIssuer} keys already exist, skipping...`, "info");
            setMessage('ClaimIssuer keys already exist on this OnchainID');
            return;
          }
        } catch (e) {
          // Key doesn't exist, proceed to add it
        }
        
        // Add the ClaimIssuer as a management key (purpose=1) and signing key (purpose=3)
        addLog(`Adding ClaimIssuer ${claimIssuer} as management key...`, "info");
        const addManagementKeyTx = await onchainId.addKey(claimIssuerKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
        await addManagementKeyTx.wait();
        
        addLog(`Adding ClaimIssuer ${claimIssuer} as signing key...`, "info");
        const addSigningKeyTx = await onchainId.addKey(claimIssuerKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
        await addSigningKeyTx.wait();
        
        addLog(`✅ Successfully added ClaimIssuer ${claimIssuer} keys to OnchainID`, "success");
        setMessage(`Successfully added ClaimIssuer ${claimIssuer} keys to OnchainID`);
        
      } catch (keyError) {
        addLog(`⚠️ Could not add keys for ClaimIssuer ${claimIssuer}: ${extractCleanError(keyError)}`, "warning");
        setMessage(`Error adding ClaimIssuer keys: ${extractCleanError(keyError)}`);
      }
      
    } catch (error) {
      console.error('Error adding ClaimIssuer keys:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding ClaimIssuer keys: ${cleanError}`);
      addLog(`Error adding ClaimIssuer keys: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
      setProcessingClaimIssuer('');
    }
  };

  // Debug function to check ClaimIssuer setup
  const debugClaimIssuerSetup = async () => {
    try {
      setDeploying(true);
      setMessage('Debugging ClaimIssuer setup...');
      addLog('🔍 DEBUGGING CLAIM ISSUER SETUP', "info");

      const signer = await getSigner();
      
      // Get the TrustedIssuersRegistry
      const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
      if (!identityRegistryAddress) {
        throw new Error('No IdentityRegistry selected. Please select one first.');
      }
      
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      const tirAddress = await ir.issuersRegistry();
      addLog(`TrustedIssuersRegistry: ${tirAddress}`, "info");
      
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
      
      // Get all trusted issuers
      const trustedIssuers = await tir.getTrustedIssuers();
      addLog(`Found ${trustedIssuers.length} trusted issuers`, "info");
      
      for (let i = 0; i < trustedIssuers.length; i++) {
        const issuer = trustedIssuers[i];
        addLog(`\n🔍 Issuer ${i + 1}: ${issuer}`, "info");
        
        try {
          const topics = await tir.getTrustedIssuerClaimTopics(issuer);
          addLog(`  Topics: [${topics.map(t => t.toNumber()).join(', ')}]`, "info");
          
          // Check if it's a contract
          const code = await signer.provider.getCode(issuer);
          const isContract = code !== '0x' && code !== '0x0';
          addLog(`  Is Contract: ${isContract ? 'YES' : 'NO'}`, "info");
          
          // Check if it's trusted
          const isTrusted = await tir.isTrustedIssuer(issuer);
          addLog(`  Is Trusted: ${isTrusted ? 'YES' : 'NO'}`, "info");
          
        } catch (e) {
          addLog(`  ❌ Error checking issuer: ${e.message}`, "error");
        }
      }
      
      setMessage('ClaimIssuer setup debug completed');
      
    } catch (error) {
      console.error('Error debugging ClaimIssuer setup:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error debugging ClaimIssuer setup: ${cleanError}`);
      addLog(`Error debugging ClaimIssuer setup: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };

  // Get all trusted issuers from the registry with their topics
  const getAllTrustedIssuers = useCallback(async () => {
    try {
      setDeploying(true);
      setMessage('Getting trusted issuers...');
      addLog('Getting all trusted issuers from registry', "info");

      const signer = await getSigner();
      
      // Get the TrustedIssuersRegistry
      const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
      if (!identityRegistryAddress) {
        throw new Error('No IdentityRegistry selected. Please select one first.');
      }
      
      const irArtifacts = getContractArtifacts('IdentityRegistry');
      const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
      
      const tirAddress = await ir.issuersRegistry();
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
      
      // Get all trusted issuers
      const trustedIssuers = await tir.getTrustedIssuers();
      
      if (trustedIssuers.length === 0) {
        addLog('No trusted issuers found in registry', "warning");
        setMessage('No trusted issuers found. Please add a trusted issuer in Step 6 first.');
        return [];
      }
      
      // Get topics for each issuer
      const issuersWithTopics = [];
      for (const issuer of trustedIssuers) {
        try {
          const topics = await tir.getTrustedIssuerClaimTopics(issuer);
          issuersWithTopics.push({
            address: issuer,
            topics: topics.map(t => t.toNumber())
          });
        } catch (e) {
          addLog(`Could not get topics for issuer ${issuer}: ${e.message}`, "warning");
          issuersWithTopics.push({
            address: issuer,
            topics: []
          });
        }
      }
      
      addLog(`Found ${issuersWithTopics.length} trusted issuers`, "success");
      setMessage(`Found ${issuersWithTopics.length} trusted issuers`);
      
      return issuersWithTopics;
      
    } catch (error) {
      console.error('Error getting trusted issuers:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error getting trusted issuers: ${cleanError}`);
      addLog(`Error getting trusted issuers: ${cleanError}`, "error");
      return [];
    } finally {
      setDeploying(false);
    }
  }, [selectedContracts.IdentityRegistry, deployedContracts.IdentityRegistry]);

  // Add claim to identity
  const addClaim = async () => {
    try {
      setDeploying(true);
      setMessage('Adding claim to identity...');
      addLog('Starting claim addition', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      if (!claimTopic.trim() || !claimValue.trim()) {
        throw new Error('Please enter claim topic and value');
      }

      // Use a proper ClaimIssuer as the issuer, not the OnchainID itself
      let finalIssuerAddress = '';
      
      // First check if user selected a trusted issuer from dropdown
      if (selectedTrustedIssuer) {
        finalIssuerAddress = selectedTrustedIssuer;
        addLog(`- Using selected trusted issuer: ${finalIssuerAddress}`, "info");
      } else {
        // Try to get the first trusted issuer from the registry
        const trustedIssuer = await getFirstTrustedIssuer();
        if (!trustedIssuer) {
          throw new Error('No trusted issuer found. Please add a trusted issuer in Step 6 first or select one from the dropdown.');
        }
        finalIssuerAddress = trustedIssuer;
        addLog(`- No issuer selected, using first trusted issuer: ${finalIssuerAddress}`, "info");
      }

      const signer = await getSigner();
      const artifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, artifacts.abi, signer);
      
      // Add claim to the OnchainID
      // Parameters: topic, scheme, issuer, signature, data, uri
      
      // Convert claim topic string to uint256
      let topicId;
      if (claimTopic === 'KYC (Know Your Customer)') topicId = 1;
      else if (claimTopic === 'AML (Anti-Money Laundering)') topicId = 2;
      else if (claimTopic === 'Accredited Investor') topicId = 3;
      else if (claimTopic === 'EU Nationality Confirmed') topicId = 4;
      else if (claimTopic === 'US Nationality Confirmed') topicId = 5;
      else if (claimTopic === 'Blacklist') topicId = 6;
      else {
        // For custom topics, try to parse as number or use hash
        const parsed = parseInt(claimTopic);
        topicId = isNaN(parsed) ? ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(claimTopic))) : parsed;
      }
      
      // Debug logging
      addLog(`Adding claim with parameters:`, "info");
      addLog(`- Topic: ${claimTopic} (ID: ${topicId})`, "info");
      addLog(`- Value: ${claimValue}`, "info");
      addLog(`- Selected trusted issuer: ${selectedTrustedIssuer || 'None'}`, "info");
      addLog(`- Manual issuer input: ${issuerAddress}`, "info");
      addLog(`- Final issuer (trusted issuer): ${finalIssuerAddress}`, "info");
      addLog(`- User OnchainID: ${onchainIdAddress}`, "info");
      
      // Check if the selected trusted issuer supports this topic
      if (selectedTrustedIssuer) {
        const selectedIssuer = trustedIssuers.find(issuer => issuer.address === selectedTrustedIssuer);
        if (selectedIssuer && !selectedIssuer.topics.includes(topicId)) {
          addLog(`- WARNING: Selected trusted issuer does not support topic ${topicId}`, "warning");
          addLog(`- Selected issuer supports topics: ${selectedIssuer.topics.join(', ')}`, "warning");
          addLog(`- Consider selecting a different trusted issuer or adding this topic to the issuer`, "warning");
        } else if (selectedIssuer) {
          addLog(`- ✅ Selected trusted issuer supports topic ${topicId}`, "success");
        }
      }
      
      // Note: Trusted issuer verification is done later in the function with the correct issuer address
      
      // Check if the topic exists in the ClaimTopicsRegistry
      try {
        const claimTopicsRegistryAddress = selectedContracts.ClaimTopicsRegistry || (deployedContracts.ClaimTopicsRegistry && deployedContracts.ClaimTopicsRegistry[0]);
        if (claimTopicsRegistryAddress) {
          const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
          const ctr = new ethers.Contract(claimTopicsRegistryAddress, ctrArtifacts.abi, signer);
          const allTopics = await ctr.getClaimTopics();
          const topicExists = allTopics.some(topic => topic.toNumber() === topicId);
          addLog(`- Topic ${topicId} exists in registry: ${topicExists ? 'YES' : 'NO'}`, topicExists ? "success" : "error");
        }
      } catch (e) {
        addLog(`- Could not verify topic existence: ${e.message}`, "warning");
      }
      
      // Verify OnchainID contract exists and is valid
      try {
        const code = await signer.provider.getCode(onchainIdAddress);
        if (code === '0x') {
          throw new Error('OnchainID contract address is invalid or empty');
        }
        addLog(`- OnchainID contract verification: VALID`, "info");
        
              // Check if the OnchainID is properly initialized
      try {
        const managementKeys = await onchainId.getKeysByPurpose(1);
        addLog(`- OnchainID management keys: ${managementKeys.length}`, "info");
        
        if (managementKeys.length === 0) {
          addLog(`- WARNING: OnchainID has no management keys!`, "warning");
        } else {
          // Check if the signer has a management key
          const signerAddress = await signer.getAddress();
          const signerKeyHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [signerAddress]));
          
          try {
            const key = await onchainId.getKey(signerKeyHash);
            addLog(`- Signer key found: ${key.purposes.length > 0}`, "info");
            addLog(`- Signer key purposes: ${key.purposes.map(p => p.toNumber()).join(', ')}`, "info");
            addLog(`- Signer has management key: ${key.purposes.some(p => p.toNumber() === 1)}`, "info");
            addLog(`- Signer has action key: ${key.purposes.some(p => p.toNumber() === 2)}`, "info");
            
            // Check if we need to add an action key
            const hasActionKey = key.purposes.some(p => p.toNumber() === 2);
            if (!hasActionKey) {
              addLog(`- WARNING: Signer does not have action key! Adding one...`, "warning");
              
              // Add action key to the OnchainID
              const addActionKeyTx = await onchainId.addKey(signerKeyHash, 2, 1); // purpose=2 (action), keyType=1 (ECDSA)
              await addActionKeyTx.wait();
              addLog(`- Action key added successfully`, "success");
            } else {
              addLog(`- Signer has action key: YES`, "info");
            }
          } catch (e) {
            addLog(`- Signer key not found: ${e.message}`, "warning");
          }
        }
      } catch (e) {
        addLog(`- Could not check OnchainID keys: ${e.message}`, "warning");
      }
      } catch (error) {
        throw new Error(`OnchainID contract verification failed: ${error.message}`);
      }
      
      // Check if the OnchainID contract has the addClaim function
      const hasAddClaimFunction = onchainId.interface.fragments.some(fragment => 
        fragment.type === 'function' && fragment.name === 'addClaim'
      );
      
      if (!hasAddClaimFunction) {
        throw new Error('OnchainID contract does not have addClaim function');
      }
      addLog(`- OnchainID has addClaim function: YES`, "info");
      
      // Check if the issuer is trusted for this claim topic
      try {
        // Get the TrustedIssuersRegistry from the IdentityRegistry
        const identityRegistryAddress = selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0]);
        if (identityRegistryAddress) {
          const irArtifacts = getContractArtifacts('IdentityRegistry');
          const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, signer);
          
          try {
            const tirAddress = await ir.issuersRegistry();
            const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
            const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
            
            const isTrusted = await tir.isTrustedIssuer(finalIssuerAddress);
            if (!isTrusted) {
              addLog(`- Issuer ${finalIssuerAddress} is NOT a trusted issuer`, "error");
              throw new Error(`Issuer ${finalIssuerAddress} is not a trusted issuer. Please add them to TrustedIssuersRegistry first.`);
            }
            
            // Check if the issuer is trusted for this specific topic
            const issuerTopics = await tir.getTrustedIssuerClaimTopics(finalIssuerAddress);
            const isTrustedForTopic = issuerTopics.some(topic => topic.toNumber() === topicId);
            
            if (!isTrustedForTopic) {
              addLog(`- Issuer ${finalIssuerAddress} is not trusted for topic ${topicId}`, "error");
              addLog(`- Issuer is trusted for topics: ${issuerTopics.map(t => t.toNumber()).join(', ')}`, "info");
              throw new Error(`Issuer ${finalIssuerAddress} is not trusted for topic ${topicId}. Please update their trusted topics.`);
            }
            
            addLog(`- Issuer ${finalIssuerAddress} is trusted for topic ${topicId}`, "success");
          } catch (e) {
            addLog(`- Could not verify issuer trust status: ${e.message}`, "warning");
            // Continue anyway, the contract will reject if not trusted
          }
        }
      } catch (e) {
        addLog(`- Could not check issuer trust status: ${e.message}`, "warning");
        // Continue anyway, the contract will reject if not trusted
      }
      
      // Debug: Check the exact function signature
      const addClaimFragment = onchainId.interface.fragments.find(fragment => 
        fragment.type === 'function' && fragment.name === 'addClaim'
      );
      if (addClaimFragment) {
        addLog(`- addClaim function signature: ${addClaimFragment.format()}`, "info");
        addLog(`- addClaim parameters: ${addClaimFragment.inputs.map((input, i) => `${i}: ${input.type} ${input.name}`).join(', ')}`, "info");
      }
      
      // Check if we need to add a management key
      const signerAddress = await signer.getAddress();
      const signerKeyHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [signerAddress]));
      
      try {
        const key = await onchainId.getKey(signerKeyHash);
        const hasManagementKey = key.purposes.some(p => p.toNumber() === 1);
        
        if (!hasManagementKey) {
          addLog(`- WARNING: Signer does not have management key! Adding one...`, "warning");
          
          // Add management key to the OnchainID
          const addKeyTx = await onchainId.addKey(signerKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
          await addKeyTx.wait();
          addLog(`- Management key added successfully`, "success");
        } else {
          addLog(`- Signer has management key: YES`, "info");
        }
      } catch (e) {
        addLog(`- Error checking/adding management key: ${e.message}`, "error");
        throw new Error(`Management key issue: ${e.message}`);
      }
      
      // Create a proper signature for the claim
      // The signature should be of: keccak256(abi.encode(address identityHolder_address, uint256 topic, bytes data))
      const claimData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(claimValue));
      
      // Debug: Log the raw values
      addLog(`🔍 SIGNATURE DEBUG:`, "info");
      addLog(`  Raw claimValue: "${claimValue}"`, "info");
      addLog(`  claimData (hex): ${claimData}`, "info");
      addLog(`  onchainIdAddress: ${onchainIdAddress}`, "info");
      addLog(`  topicId: ${topicId} (type: ${typeof topicId})`, "info");
      
      const dataHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256', 'bytes'],
          [onchainIdAddress, topicId, claimData]
        )
      );
      
      addLog(`  dataHash: ${dataHash}`, "info");
      addLog(`  dataHash (arrayify length): ${ethers.utils.arrayify(dataHash).length}`, "info");
      
      // Sign the data hash with the issuer's private key
      // For self-issued claims, we'll use the signer's private key
      const signature = await signer.signMessage(ethers.utils.arrayify(dataHash));
      
      addLog(`  signature: ${signature}`, "info");
      addLog(`  signature length: ${signature.length}`, "info");
      addLog(`  signature (arrayify length): ${ethers.utils.arrayify(signature).length}`, "info");
      
      // Verify the signature can be recovered
      try {
        const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(dataHash), signature);
        addLog(`  recovered address: ${recoveredAddress}`, "info");
        addLog(`  signer address: ${await signer.getAddress()}`, "info");
        addLog(`  signature valid: ${recoveredAddress.toLowerCase() === (await signer.getAddress()).toLowerCase()}`, "info");
      } catch (e) {
        addLog(`  signature verification failed: ${e.message}`, "error");
      }
      
      // Log the exact parameters being passed
      addLog(`Calling addClaim with:`, "info");
      addLog(`  topicId: ${topicId} (type: ${typeof topicId})`, "info");
      addLog(`  scheme: 1 (ECDSA)`, "info");
      addLog(`  issuer: ${finalIssuerAddress}`, "info");
      addLog(`  signature: ${signature}`, "info");
      addLog(`  data: ${claimData}`, "info");
      addLog(`  uri: ''`, "info");
      
      // Debug: Log the exact parameters being passed to the contract
      addLog(`🔍 CONTRACT CALL DEBUG:`, "info");
      addLog(`  topicId: ${topicId} (${typeof topicId})`, "info");
      addLog(`  scheme: 1 (number)`, "info");
      addLog(`  issuerAddress: ${finalIssuerAddress} (${typeof finalIssuerAddress})`, "info");
      addLog(`  signature: ${signature} (${typeof signature})`, "info");
      addLog(`  claimData: ${claimData} (${typeof claimData})`, "info");
      addLog(`  uri: '' (${typeof ''})`, "info");
      
      // Try to encode the function call to see if there are any encoding issues
      try {
        const encodedData = onchainId.interface.encodeFunctionData('addClaim', [
          topicId,
          1,
          finalIssuerAddress,
          signature,
          claimData,
          ''
        ]);
        addLog(`  encoded function data: ${encodedData}`, "info");
        addLog(`  encoded data length: ${encodedData.length}`, "info");
      } catch (e) {
        addLog(`  encoding failed: ${e.message}`, "error");
      }
      
      // Call addClaim - this returns a bytes32 claimRequestId, not a transaction hash
      try {
        const claimRequestId = await onchainId.addClaim(
          topicId, // topic (uint256)
          1, // scheme (1 = ECDSA)
          finalIssuerAddress, // issuer
          signature, // signature
          claimData, // data
          '' // uri (empty for now)
        );
        
        addLog(`- Claim request ID: ${claimRequestId}`, "success");
        addLog(`- Claim added successfully!`, "success");
        
        // The claim is now added to the OnchainID
        // Some OnchainID implementations might require approval, but most add claims directly
        
      } catch (error) {
        // If the transaction reverts, it's likely due to the issuer not being trusted
        if (error.message.includes('unexpected amount of data')) {
          addLog(`- Transaction reverted. This usually means:`, "error");
          addLog(`  1. The issuer (${finalIssuerAddress}) is not trusted for topic ${topicId}`, "error");
          addLog(`  2. The issuer needs to be added to TrustedIssuersRegistry`, "error");
          addLog(`  3. The issuer needs to be trusted for this specific claim topic`, "error");
          throw new Error(`Issuer ${finalIssuerAddress} is not trusted for topic ${topicId}. Please add the issuer to TrustedIssuersRegistry first.`);
        } else {
          throw error;
        }
      }
      
      // Update identity with new claim
      const newClaim = {
        topic: claimTopic,
        value: claimValue,
        issuer: finalIssuerAddress,
        addedAt: new Date().toISOString()
      };
      
      // Get existing identity to preserve claims
      const existingIdentity = checkExistingIdentity(userAddress);
      const existingClaims = existingIdentity?.claims || [];
      
      const updatedIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        country: userCountry,
        status: 'with_claims',
        claims: [...existingClaims, newClaim] // Preserve existing claims and add new one
      };
      saveUserIdentity(updatedIdentity);
      
      addLog(`Claim added to identity: ${claimTopic} = ${claimValue}`, "success");
      setMessage(`Claim added successfully: ${claimTopic} = ${claimValue}`);
      
      // Clear claim inputs
      setClaimTopic('');
      setClaimValue('');
      setIssuerAddress('');
    } catch (error) {
      console.error('Error adding claim:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding claim: ${cleanError}`);
      addLog(`Error adding claim: ${cleanError}`, "error");
    } finally {
      setDeploying(false);
    }
  };





  // Load existing identity
  const loadExistingIdentity = (identity) => {
    setUserAddress(identity.userAddress);
    setOnchainIdAddress(identity.onchainIdAddress);
    setUserCountry(identity.country || 0);
    setSelectedIdentity(identity);
    addLog(`Loaded existing identity for ${identity.userAddress}`, "info");
  };

  // Clear current identity
  const clearCurrentIdentity = () => {
    setUserAddress('');
    setOnchainIdAddress('');
    setClaimTopic('');
    setClaimValue('');
    setIssuerAddress('');
    setUserCountry(0);
    setSelectedIdentity(null);
  };

  // Clear all user identities
  const clearAllIdentities = () => {
    if (window.confirm('Are you sure you want to clear all user identities? This action cannot be undone.')) {
      setUserIdentities([]);
      localStorage.removeItem(IDENTITIES_STORAGE_KEY);
      clearCurrentIdentity();
      addLog('All user identities cleared', "warning");
      setMessage('All user identities have been cleared');
    }
  };



  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
      <h2>User Management Phase</h2>
      <p>Create and manage user identities with OnchainID</p>

      {/* Sub-step Navigation */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Button
            onClick={() => setCurrentSubStep('create')}
            style={{ 
              backgroundColor: currentSubStep === 'create' ? '#007bff' : '#6c757d', 
              color: 'white',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            OnchainID Creation
          </Button>
          <Button
            onClick={() => setCurrentSubStep('manage')}
            style={{ 
              backgroundColor: currentSubStep === 'manage' ? '#007bff' : '#6c757d', 
              color: 'white',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            OnchainID Management
          </Button>
        </div>
      </div>

      {/* Sub-step 1: OnchainID Creation */}
      {currentSubStep === 'create' && (
        <div>
          <h3>Section 1: OnchainID Creation</h3>
          <p>Create new OnchainID identities for users.</p>

          {/* Current Identities Box */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '10px', color: '#495057' }}>Current Identities ({userIdentities.length})</h4>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
              {userIdentities.length > 0 && (
                <Button
                  onClick={clearAllIdentities}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  Clear All Identities
                </Button>
              )}
            </div>

            {/* All Identities Display */}
            <div style={{ marginBottom: '15px' }}>
              {userIdentities.length === 0 ? (
                <div style={{ color: '#6c757d', fontStyle: 'italic' }}>No identities created yet.</div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                  {userIdentities.map((identity, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        padding: '15px', 
                        borderBottom: index < userIdentities.length - 1 ? '1px solid #dee2e6' : 'none',
                        backgroundColor: 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#495057', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {identity.isTokenOnchainID && (
                              <span style={{ 
                                backgroundColor: '#ffc107', 
                                color: '#856404', 
                                padding: '2px 6px', 
                                borderRadius: '3px', 
                                fontSize: '0.7rem', 
                                fontWeight: 'bold' 
                              }}>
                                TOKEN ISSUER
                              </span>
                            )}
                            User: {identity.userAddress}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '2px' }}>
                            OnchainID: {identity.onchainIdAddress}
                          </div>
                          {identity.isTokenOnchainID && (
                            <div style={{ fontSize: '0.8rem', color: '#17a2b8', marginTop: '2px' }}>
                              Token: {identity.tokenAddress}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                            Country: {identity.country || 0}
                          </div>
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: identity.isTokenOnchainID ? '#ffc107' : '#28a745', 
                            fontWeight: 'bold' 
                          }}>
                            Status: {identity.status || 'created'}
                          </div>
                        </div>
                      </div>
                      
                      {identity.claims && identity.claims.length > 0 && (
                        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                          <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '5px' }}>Claims:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {identity.claims.map((claim, idx) => (
                              <div key={idx} style={{ 
                                padding: '4px 8px', 
                                backgroundColor: '#e3f2fd', 
                                borderRadius: '3px',
                                fontSize: '0.8rem',
                                color: '#1976d2',
                                border: '1px solid #2196f3'
                              }}>
                                {claim.topic}: {claim.value}
                                <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '2px' }}>
                                  by {claim.issuer.slice(0, 8)}...{claim.issuer.slice(-6)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create New Identity Box */}
          <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Create New Identity</h4>
            <div style={{ fontSize: '0.8rem', color: '#17a2b8', marginBottom: '10px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
              💡 <strong>Manual Approach:</strong> OnchainIDs are created with the signer as owner. You must manually select which ClaimIssuer to use for each claim. The user wallet is added as a management key.
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Wallet Address:</label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Country Code (ISO 3166-1 numeric):</label>
              <input
                type="number"
                value={userCountry}
                onChange={(e) => setUserCountry(parseInt(e.target.value) || 0)}
                placeholder="0 (default)"
                style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
              <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px' }}>
                Examples: 840 (USA), 124 (Canada), 826 (UK), 276 (Germany), 250 (France)
              </div>
            </div>
            <Button onClick={createOnchainId} disabled={deploying || !userAddress.trim()}>
              {deploying ? 'Creating...' : 'Create OnchainID'}
            </Button>
            

          </div>
        </div>
      )}

            {/* Sub-step 2: OnchainID Management */}
      {currentSubStep === 'manage' && (
        <div>
          <h3>Section 2: OnchainID Management</h3>
          <p>Manage existing OnchainID identities - register in Identity Registry and add claims.</p>

          {/* OnchainID Selection */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '10px', color: '#495057' }}>Select OnchainID to Manage</h4>
            <select
              value={onchainIdAddress || ''}
              onChange={(e) => {
                setOnchainIdAddress(e.target.value);
                // Also set userAddress and userCountry from the selected identity
                const found = userIdentities.find(id => id.onchainIdAddress === e.target.value);
                if (found) {
                  setUserAddress(found.userAddress);
                  setUserCountry(found.country || 0);
                }
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="">-- Select an OnchainID to manage --</option>
              {userIdentities.map((identity, index) => (
                <option key={index} value={identity.onchainIdAddress}>
                  User: {identity.userAddress} - OnchainID: {identity.onchainIdAddress}
                </option>
              ))}
            </select>
            {userIdentities.length === 0 && (
              <div style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '5px' }}>
                No OnchainIDs found. Please create some in Section 1 first.
              </div>
            )}
          </div>

        {/* Identity Registry Selection */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <h3 style={{ marginBottom: '15px', color: '#495057' }}>Identity Registry Configuration</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Identity Registry:</label>
          <select
            value={selectedContracts.IdentityRegistry || ''}
            onChange={e => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: e.target.value }))}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
          >
            <option value="">-- Select Identity Registry --</option>
            {(deployedContracts.IdentityRegistry || []).map((address, idx) => (
              <option key={address} value={address}>
                IdentityRegistry {idx + 1} - {address.slice(0, 8)}...{address.slice(-6)}
              </option>
            ))}
          </select>
          {(!deployedContracts.IdentityRegistry || deployedContracts.IdentityRegistry.length === 0) && (
            <div style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '5px' }}>
              No Identity Registries found. Please deploy one in the Deployment Phase first.
            </div>
          )}
        </div>
      </div>

      

      {/* Register Identity Section */}
      {onchainIdAddress && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Register Identity</h3>
          <p style={{ marginBottom: '10px', color: '#6c757d' }}>Register the identity in the Identity Registry.</p>
          <Button onClick={registerIdentity} disabled={deploying || !selectedContracts.IdentityRegistry}>
            {deploying ? 'Registering...' : 'Register Identity'}
          </Button>
        </div>
      )}

      {/* Add ClaimIssuer Keys Section */}
      {onchainIdAddress && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Add ClaimIssuer Keys to OnchainID</h3>
          <p style={{ marginBottom: '10px', color: '#6c757d' }}>Add ClaimIssuer contracts as management/signing keys to this OnchainID.</p>
          
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#856404' }}>
              🔑 Why Add ClaimIssuer Keys?
            </div>
            <div style={{ fontSize: '0.9rem', color: '#856404' }}>
              Adding a ClaimIssuer as a key to an OnchainID allows that ClaimIssuer to sign claims for this OnchainID. 
              This is required for the ClaimIssuer to add claims without permission errors.
            </div>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Select ClaimIssuer to Add as Key:</label>
            <select
              value={selectedClaimIssuerForKeys}
              onChange={(e) => setSelectedClaimIssuerForKeys(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="">-- Select a ClaimIssuer to add as key --</option>
              {trustedIssuers.map((issuer, index) => (
                <option key={issuer.address} value={issuer.address}>
                  ClaimIssuer {index + 1} - {issuer.address.slice(0, 8)}...{issuer.address.slice(-6)} (Topics: {issuer.topics.join(', ')})
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px' }}>
              Select which ClaimIssuer contract to add as a management and signing key to this OnchainID.
            </div>
          </div>
          
          <div style={{ marginTop: '10px' }}>
            <Button
              onClick={async () => {
                const issuers = await getAllTrustedIssuers();
                setTrustedIssuers(issuers);
              }}
              disabled={deploying}
              style={{ backgroundColor: '#17a2b8', color: 'white', fontSize: '0.9rem' }}
            >
              {deploying ? 'Loading...' : 'Load Trusted Issuers'}
            </Button>
            <Button
              onClick={() => selectedClaimIssuerForKeys && addClaimIssuerKeysToOnchainID(onchainIdAddress)}
              disabled={deploying || !selectedClaimIssuerForKeys}
              style={{ backgroundColor: '#28a745', color: 'white', fontSize: '0.9rem', marginLeft: '0.5rem' }}
            >
              {deploying ? 'Adding Keys...' : 'Add Selected ClaimIssuer Keys'}
            </Button>
            <Button
              onClick={debugClaimIssuerSetup}
              disabled={deploying}
              style={{ backgroundColor: '#6f42c1', color: 'white', fontSize: '0.9rem', marginLeft: '0.5rem' }}
            >
              {deploying ? 'Debugging...' : 'Debug Setup'}
            </Button>
          </div>
          
          {selectedClaimIssuerForKeys && (
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#d4edda', 
              borderRadius: '4px', 
              border: '1px solid #c3e6cb' 
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#155724' }}>
                ✅ Selected ClaimIssuer to Add as Key:
              </div>
              <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: '#155724' }}>
                {selectedClaimIssuerForKeys}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#155724', marginTop: '5px' }}>
                This ClaimIssuer will be added as both management and signing key to the OnchainID.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Claims Section */}
      {onchainIdAddress && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Add Claims</h3>
          <p style={{ marginBottom: '10px', color: '#6c757d' }}>Add claims to the OnchainID using a trusted issuer.</p>
          
          {/* ClaimIssuer Selection Instructions */}
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#1976d2' }}>
              📋 How to Select ClaimIssuers:
            </div>
            <div style={{ fontSize: '0.9rem', color: '#1976d2' }}>
              1. <strong>Load Trusted Issuers:</strong> Click "Load Trusted Issuers" button below to fetch ClaimIssuers from the registry
              <br />
              2. <strong>Select ClaimIssuer:</strong> Choose from the dropdown which ClaimIssuer to use for adding claims
              <br />
              3. <strong>Add Claims:</strong> Select topic, value, and add the claim using the selected ClaimIssuer
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
              💡 You have {trustedIssuers.length} ClaimIssuers loaded. {trustedIssuers.length === 0 ? 'Click "Load Trusted Issuers" to get started.' : 'Select one from the dropdown below.'}
            </div>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Claim Topic:</label>
            <select
              value={claimTopic}
              onChange={(e) => setClaimTopic(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="">-- Select a claim topic --</option>
              {claimTopics.map((topic) => (
                <option key={topic.id} value={topic.name}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Claim Value:</label>
            <select
              value={claimValue}
              onChange={(e) => setClaimValue(e.target.value)}
              disabled={!claimTopic}
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="">-- Select a claim value --</option>
              {claimTopic && claimTopics.find(t => t.name === claimTopic)?.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Select Trusted Issuer (Recommended):</label>
            <select
              value={selectedTrustedIssuer}
              onChange={(e) => setSelectedTrustedIssuer(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="">-- Select a trusted issuer --</option>
              {trustedIssuers.map((issuer, index) => (
                <option key={issuer.address} value={issuer.address}>
                  Trusted Issuer {index + 1} - {issuer.address.slice(0, 8)}...{issuer.address.slice(-6)} (Topics: {issuer.topics.join(', ')})
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px' }}>
              Select a trusted issuer from the registry. These are ClaimIssuer contracts added in Step 6.
            </div>
            <div style={{ marginTop: '10px' }}>
              <Button
                onClick={async () => {
                  const issuers = await getAllTrustedIssuers();
                  setTrustedIssuers(issuers);
                }}
                disabled={deploying}
                style={{ backgroundColor: '#17a2b8', color: 'white', fontSize: '0.9rem' }}
              >
                {deploying ? 'Loading...' : 'Load Trusted Issuers'}
              </Button>
              <Button
                onClick={debugClaimIssuerSetup}
                disabled={deploying}
                style={{ backgroundColor: '#6f42c1', color: 'white', fontSize: '0.9rem', marginLeft: '0.5rem' }}
              >
                {deploying ? 'Debugging...' : 'Debug Setup'}
              </Button>
              <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '5px' }}>
                Load all trusted issuers from the registry (added in Step 6) or debug the setup
              </div>
            </div>
          </div>
          
          {/* Current Issuer Selection Display */}
          {(selectedTrustedIssuer || issuerAddress.trim()) && (
            <div style={{ 
              marginBottom: '10px', 
              padding: '10px', 
              backgroundColor: selectedTrustedIssuer ? '#d4edda' : '#fff3cd', 
              borderRadius: '4px', 
              border: `1px solid ${selectedTrustedIssuer ? '#c3e6cb' : '#ffeaa7'}` 
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {selectedTrustedIssuer ? '✅ Using Trusted Issuer:' : '⚠️ Using Manual Issuer:'}
              </div>
              <div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
                {selectedTrustedIssuer || issuerAddress}
              </div>
              {selectedTrustedIssuer && (
                <div style={{ fontSize: '0.8rem', color: '#155724', marginTop: '5px' }}>
                  This issuer is trusted for compliance verification.
                </div>
              )}
              {issuerAddress.trim() && !selectedTrustedIssuer && (
                <div style={{ fontSize: '0.8rem', color: '#856404', marginTop: '5px' }}>
                  ⚠️ This issuer may not be trusted for compliance verification.
                </div>
              )}
            </div>
          )}
          <Button onClick={addClaim} disabled={deploying || !claimTopic.trim() || !claimValue.trim()}>
            {deploying ? 'Adding...' : 'Add Claim'}
          </Button>
        </div>
      )}
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          borderRadius: '5px' 
        }}>
          {message}
        </div>
      )}

      {/* Global Progress Indicator */}
      {processingClaimIssuer && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#e3f2fd',
          color: '#1976d2',
          borderRadius: '5px',
          border: '1px solid #2196f3'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            🔄 Processing ClaimIssuer Keys
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {processingClaimIssuer}
          </div>
        </div>
      )}

      {/* Logs */}
      <div style={{ marginTop: '20px' }}>
        <h4>Logs:</h4>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          backgroundColor: '#f8f9fa', 
          padding: '10px', 
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: '5px',
              color: log.type === 'error' ? '#dc3545' : 
                     log.type === 'success' ? '#28a745' : 
                     log.type === 'warning' ? '#ffc107' : '#6c757d'
            }}>
              [{log.timestamp}] {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Button = ({ children, onClick, disabled, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '10px 20px',
      backgroundColor: disabled ? '#6c757d' : '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '14px',
      ...style
    }}
  >
    {children}
  </button>
);

export default UserManagementPhase; 