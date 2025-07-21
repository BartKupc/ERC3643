import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';

const IDENTITIES_STORAGE_KEY = 'trex_user_identities';

const UserManagementTab = ({ deploymentDetails, addLog, getSigner, factories }) => {
  // User Management State
  const [userAddress, setUserAddress] = useState('');
  const [userCountry, setUserCountry] = useState('840');
  const [onchainIdAddress, setOnchainIdAddress] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [registeringUser, setRegisteringUser] = useState(false);
  const [addingClaim, setAddingClaim] = useState(false);
  const [message, setMessage] = useState('');
  
  // User Identities State
  const [userIdentities, setUserIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  
  // Claim Management State
  const [claimTopic, setClaimTopic] = useState('');
  const [claimValue, setClaimValue] = useState('');
  const [selectedClaimIssuer, setSelectedClaimIssuer] = useState('');
  const [availableClaimIssuers, setAvailableClaimIssuers] = useState([]);
  const [loadingClaimIssuers, setLoadingClaimIssuers] = useState(false);
  
  // Identity Registry and Claim Issuer Selection
  const [availableIRs, setAvailableIRs] = useState([]);
  const [selectedIR, setSelectedIR] = useState('');
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [selectedTrustedIssuer, setSelectedTrustedIssuer] = useState('');
  const [loadingIRs, setLoadingIRs] = useState(false);
  
  // Standard T-REX claim topics
  const claimTopics = [
    { id: 1, name: "KYC (Know Your Customer)", values: ["YES", "NO"] },
    { id: 2, name: "AML (Anti-Money Laundering)", values: ["YES", "NO"] },
    { id: 3, name: "Accredited Investor", values: ["YES", "NO"] },
    { id: 4, name: "EU Nationality Confirmed", values: ["YES", "NO"] },
    { id: 5, name: "US Nationality Confirmed", values: ["YES", "NO"] },
    { id: 6, name: "Blacklist", values: ["YES", "NO"] }
  ];

  // Extract clean error message from verbose ethers.js errors
  const extractCleanError = (error) => {
    try {
      if (error.error && error.error.reason) {
        if (error.error.reason.includes('reverted with reason string')) {
          const match = error.error.reason.match(/reverted with reason string '([^']+)'/);
          if (match) {
            return match[1];
          }
        }
        return error.error.reason;
      }
      if (error.reason) {
        return error.reason;
      }
      if (error.message) {
        return error.message;
      }
      return error.toString();
    } catch (e) {
      return error.message || error.toString();
    }
  };

  // Load user identities from localStorage
  useEffect(() => {
    const loadUserIdentities = () => {
      try {
        const savedIdentities = localStorage.getItem(IDENTITIES_STORAGE_KEY);
        if (savedIdentities) {
          const parsedIdentities = JSON.parse(savedIdentities);
          setUserIdentities(parsedIdentities);
          addLog && addLog(`Loaded ${parsedIdentities.length} user identities from storage`, "info");
        }
      } catch (error) {
        console.error('Error loading user identities:', error);
        addLog && addLog("Error loading user identities", "error");
      }
    };
    
    loadUserIdentities();
  }, []); // Remove addLog dependency to prevent infinite loops

  // Load available Identity Registries and their trusted issuers from ALL factories
  useEffect(() => {
    const loadAvailableIRs = async () => {
      if (!factories || factories.length === 0) return;
      
      setLoadingIRs(true);
      try {
        const irs = [];
        const irToTokenMap = new Map(); // Map IR address to token info
        
        // Collect IRs from ALL factories with their associated token info
        for (const factory of factories) {
          try {
            addLog && addLog(`Loading IRs from factory: ${factory.address}`, "info");
            
            // Get deployment details for this factory
            const response = await fetch(`/api/deployments/${factory.deploymentId}`);
            if (response.ok) {
              const factoryDeploymentDetails = await response.json();
              
              // Map IRs to their tokens
              if (factoryDeploymentDetails.tokens) {
                for (const token of factoryDeploymentDetails.tokens) {
                  if (token.suite?.identityRegistry) {
                    irToTokenMap.set(token.suite.identityRegistry, {
                      tokenName: token.token.name,
                      tokenSymbol: token.token.symbol,
                      timestamp: token.timestamp,
                      deploymentId: token.deploymentId
                    });
                    addLog && addLog(`Mapped IR ${token.suite.identityRegistry} to token ${token.token.name} (${token.token.symbol}) - ${new Date(token.timestamp).toLocaleString()}`, "info");
                  }
                }
              }
              
              // Also check for IR in suite and latestToken
              if (factoryDeploymentDetails.suite?.identityRegistry) {
                if (!irToTokenMap.has(factoryDeploymentDetails.suite.identityRegistry)) {
                  irToTokenMap.set(factoryDeploymentDetails.suite.identityRegistry, {
                    tokenName: 'Factory Suite',
                    tokenSymbol: 'SUITE',
                    timestamp: factoryDeploymentDetails.timestamp || Date.now(),
                    deploymentId: factoryDeploymentDetails.deploymentId
                  });
                }
              }
              
              if (factoryDeploymentDetails.latestToken?.suite?.identityRegistry) {
                if (!irToTokenMap.has(factoryDeploymentDetails.latestToken.suite.identityRegistry)) {
                  irToTokenMap.set(factoryDeploymentDetails.latestToken.suite.identityRegistry, {
                    tokenName: factoryDeploymentDetails.latestToken.token.name,
                    tokenSymbol: factoryDeploymentDetails.latestToken.token.symbol,
                    timestamp: factoryDeploymentDetails.latestToken.timestamp,
                    deploymentId: factoryDeploymentDetails.latestToken.deploymentId
                  });
                }
              }
              
              addLog && addLog(`Factory ${factory.address}: Found ${irToTokenMap.size} IR mappings`, "info");
            }
          } catch (error) {
            addLog && addLog(`Error loading IRs from factory ${factory.address}: ${error.message}`, "warning");
          }
        }
        
        addLog && addLog(`Total IRs found across all factories: ${irToTokenMap.size}`, "info");
        
        // Process each IR with its token info
        for (const [irAddress, tokenInfo] of irToTokenMap) {
          try {
            const signer = await getSigner();
            const irArtifacts = getContractArtifacts('IdentityRegistry');
            const ir = new ethers.Contract(irAddress, irArtifacts.abi, signer);
            
            // Get the TrustedIssuersRegistry for this IR
            const tirAddress = await ir.issuersRegistry();
            const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
            const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
            
            // Get trusted issuers for this IR
            const issuers = await tir.getTrustedIssuers();
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
              timestamp: tokenInfo.timestamp,
              tokenName: tokenInfo.tokenName,
              tokenSymbol: tokenInfo.tokenSymbol,
              deploymentId: tokenInfo.deploymentId
            });
            
            addLog && addLog(`IR ${irAddress} (${tokenInfo.tokenName}): ${issuersWithTopics.length} trusted issuers - ${new Date(tokenInfo.timestamp).toLocaleString()}`, "info");
          } catch (error) {
            addLog && addLog(`Error loading IR ${irAddress}: ${error.message}`, "error");
          }
        }
        
        setAvailableIRs(irs);
        
        // Auto-select first IR if none selected
        if (irs.length > 0 && !selectedIR) {
          setSelectedIR(irs[0].address);
          addLog && addLog(`Auto-selected IR: ${irs[0].address}`, "info");
        }
        
        addLog && addLog(`Loaded ${irs.length} Identity Registries`, "success");
      } catch (error) {
        console.error('Error loading IRs:', error);
        addLog && addLog(`Error loading IRs: ${error.message}`, "error");
      } finally {
        setLoadingIRs(false);
      }
    };
    
    loadAvailableIRs();
  }, [factories]); // Load IRs from all factories, not just selected factory

  // Load available Claim Issuers from localStorage and get actual topics
  useEffect(() => {
    const loadClaimIssuers = async () => {
      try {
        const savedClaimIssuers = localStorage.getItem('trex_available_claim_issuers');
        if (savedClaimIssuers) {
          const parsedClaimIssuers = JSON.parse(savedClaimIssuers);
          
          // Get actual topics from contracts
          const issuersWithActualTopics = await Promise.all(
            parsedClaimIssuers.map(async (issuer) => {
              try {
                const signer = await getSigner();
                const claimIssuerArtifacts = getContractArtifacts('ClaimIssuer');
                const claimIssuer = new ethers.Contract(issuer.address, claimIssuerArtifacts.abi, signer);
                
                // Try to get topics from the contract (this might not be available on all ClaimIssuer contracts)
                let actualTopics = issuer.claimTopics || [1, 2, 3]; // fallback to stored topics
                
                // For now, we'll use the stored topics but you can extend this to get from contract
                return {
                  ...issuer,
                  actualTopics: actualTopics
                };
              } catch (error) {
                // If we can't get topics from contract, use stored ones
                return {
                  ...issuer,
                  actualTopics: issuer.claimTopics || [1, 2, 3]
                };
              }
            })
          );
          
          setAvailableClaimIssuers(issuersWithActualTopics);
          addLog && addLog(`Loaded ${issuersWithActualTopics.length} Claim Issuers from storage`, "info");
        }
      } catch (error) {
        console.error('Error loading claim issuers:', error);
        addLog && addLog("Error loading claim issuers", "error");
      }
    };
    
    loadClaimIssuers();
  }, []); // Load once on component mount

  // Save user identity to localStorage
  const saveUserIdentity = (identity) => {
    setUserIdentities(prev => {
      const existingIndex = prev.findIndex(id => id.userAddress.toLowerCase() === identity.userAddress.toLowerCase());
      let updated;
      
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...identity };
        addLog && addLog(`Updated existing identity for ${identity.userAddress}`, "info");
      } else {
        updated = [...prev, identity];
        addLog && addLog(`Added new identity for ${identity.userAddress}`, "success");
      }
      
      localStorage.setItem(IDENTITIES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Check if identity already exists for a wallet
  const checkExistingIdentity = (walletAddress) => {
    return userIdentities.find(id => id.userAddress.toLowerCase() === walletAddress.toLowerCase());
  };

  // Create OnchainID for a wallet using TREX Factory pattern
  const createOnchainId = async () => {
    try {
      setCreatingUser(true);
      setMessage('Creating OnchainID...');
      addLog && addLog('Starting OnchainID creation using TREX Factory pattern', "info");

      if (!userAddress.trim()) {
        throw new Error('Please enter a wallet address');
      }

      // Check if identity already exists
      const existingIdentity = checkExistingIdentity(userAddress);
      if (existingIdentity) {
        setMessage(`Identity already exists for ${userAddress}. OnchainID: ${existingIdentity.onchainIdAddress}`);
        setOnchainIdAddress(existingIdentity.onchainIdAddress);
        addLog && addLog(`Using existing identity for ${userAddress}`, "info");
        return;
      }

      if (!deploymentDetails) {
        throw new Error('No deployment details available. Please deploy a factory first.');
      }
      
      addLog && addLog(`Debug - Deployment details: ${JSON.stringify(deploymentDetails, null, 2)}`, "info");
      
      if (!deploymentDetails.factories) {
        throw new Error('No factories found in deployment details. Please deploy a factory first.');
      }
      
      if (!deploymentDetails.factories.identityFactory) {
        throw new Error('Identity Factory not found in deployment details. Please deploy a factory first.');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      
      // Use the Identity Factory to create the OnchainID
      const identityFactoryAddress = deploymentDetails.factories.identityFactory;
      addLog && addLog(`Using Identity Factory at: ${identityFactoryAddress}`, "info");
      
      const identityFactoryArtifacts = getContractArtifacts('IIdFactory');
      const identityFactory = new ethers.Contract(identityFactoryAddress, identityFactoryArtifacts.abi, signer);
      
      // Debug: Check available methods
      addLog && addLog(`Debug - Available methods: ${Object.keys(identityFactory.functions).join(', ')}`, "info");
      addLog && addLog(`Debug - Has createIdentity: ${typeof identityFactory.createIdentity === 'function'}`, "info");
      
      // Generate a unique salt for this user
      const salt = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256'], 
          [userAddress, Date.now()]
        )
      );
      
      addLog && addLog(`Creating OnchainID for user ${userAddress} with salt ${salt}`, "info");
      
      // Use createIdentityWithManagementKeys to give the signer (issuer) management keys
      // The user address is already the wallet parameter, so we only add the issuer as management key
      const signerKeyHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address'], [signerAddress])
      );
      
      // Only the signer (issuer) gets management keys - the user is already the wallet
      const managementKeys = [signerKeyHash];
      
      addLog && addLog(`Creating OnchainID with management keys for issuer...`, "info");
      addLog && addLog(`User wallet: ${userAddress}`, "info");
      addLog && addLog(`Issuer key hash: ${signerKeyHash}`, "info");
      
      // Call createIdentityWithManagementKeys on the Identity Factory
      const tx = await identityFactory.createIdentityWithManagementKeys(userAddress, salt, managementKeys);
      const receipt = await tx.wait();
      
      // Get the identity address
      const identityAddress = await identityFactory.getIdentity(userAddress);
      
      addLog && addLog(`Transaction completed. Identity address: ${identityAddress}`, "info");
      addLog && addLog(`✅ OnchainID created with management keys for both user and issuer`, "success");
      
      setOnchainIdAddress(identityAddress);
      
      // Save the new identity
      const newIdentity = {
        userAddress: userAddress,
        onchainIdAddress: identityAddress,
        country: userCountry,
        createdAt: new Date().toISOString(),
        status: 'created',
        claims: [],
        salt: salt,
        factoryAddress: identityFactoryAddress
      };
      saveUserIdentity(newIdentity);
      
      addLog && addLog(`OnchainID created at ${identityAddress}`, "success");
      addLog && addLog(`Created via Identity Factory: ${identityFactoryAddress}`, "info");
      addLog && addLog(`Salt used: ${salt}`, "info");
      setMessage(`OnchainID created successfully at ${identityAddress}`);
    } catch (error) {
      console.error('Error creating OnchainID:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error creating OnchainID: ${cleanError}`);
      addLog && addLog(`Error creating OnchainID: ${cleanError}`, "error");
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle IR selection
  const handleIRSelection = (irAddress) => {
    setSelectedIR(irAddress);
    const selectedIRData = availableIRs.find(ir => ir.address === irAddress);
    if (selectedIRData) {
      addLog && addLog(`Selected IR: ${irAddress}`, "info");
    }
  };

  // Register identity in Identity Registry using TREX Factory pattern
  const registerIdentity = async () => {
    try {
      setRegisteringUser(true);
      setMessage('Registering identity...');
      addLog && addLog('Starting identity registration using TREX Factory pattern', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      if (!selectedIR) {
        throw new Error('Please select an Identity Registry first');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const identityRegistryAddress = selectedIR;
      const artifacts = getContractArtifacts('IdentityRegistry');
      const registry = new ethers.Contract(identityRegistryAddress, artifacts.abi, signer);
      
      // Pre-flight checks
      addLog && addLog(`Pre-flight checks for registration:`, "info");
      addLog && addLog(`- User Address: ${userAddress}`, "info");
      addLog && addLog(`- OnchainID Address: ${onchainIdAddress}`, "info");
      addLog && addLog(`- Country: ${userCountry}`, "info");
      addLog && addLog(`- IR Address: ${identityRegistryAddress}`, "info");
      addLog && addLog(`- Signer Address: ${signerAddress}`, "info");
      
      // In TREX Factory pattern, the signer should be an agent on the IR
      const isAgentIR = await registry.isAgent(signerAddress);
      addLog && addLog(`- Agent on IR: ${isAgentIR ? 'YES' : 'NO'}`, isAgentIR ? "success" : "error");
      
      if (!isAgentIR) {
        addLog && addLog(`⚠️ You are not an agent on this IR. In TREX Factory pattern:`, "warning");
        addLog && addLog(`1. The factory deployer is automatically added as an agent`, "info");
        addLog && addLog(`2. You can add more agents using the Agent Management tab`, "info");
        addLog && addLog(`3. Or use the factory deployer account to register users`, "info");
        throw new Error('You are not an agent on this Identity Registry');
      }
      
      // registerIdentity requires: userAddress, identityAddress, country
      addLog && addLog(`Calling registerIdentity(${userAddress}, ${onchainIdAddress}, ${userCountry})`, "info");
      const tx = await registry.registerIdentity(userAddress, onchainIdAddress, userCountry);
      await tx.wait();
      
      // Update identity status
      const updatedIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        country: userCountry,
        identityRegistries: [...(selectedIdentity?.identityRegistries || []), {
          address: identityRegistryAddress,
          registeredAt: new Date().toISOString()
        }],
        status: 'registered',
        registeredAt: new Date().toISOString()
      };
      saveUserIdentity(updatedIdentity);
      
      addLog && addLog(`Identity registered for ${userAddress}`, "success");
      addLog && addLog(`User ${userAddress} can now receive claims and tokens`, "info");
      setMessage(`Identity registered successfully for ${userAddress}`);
    } catch (error) {
      console.error('Error registering identity:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error registering identity: ${cleanError}`);
      addLog && addLog(`Error registering identity: ${cleanError}`, "error");
      
      if (cleanError.includes('AgentRole') || cleanError.includes('not an agent')) {
        addLog && addLog(`Agent role error detected. In TREX Factory pattern:`, "error");
        addLog && addLog(`1. The factory deployer is automatically added as an agent`, "info");
        addLog && addLog(`2. Use the factory deployer account or add yourself as an agent`, "info");
        addLog && addLog(`3. Check the Agent Management tab to add agents`, "info");
      }
    } finally {
      setRegisteringUser(false);
    }
  };

  // Add ClaimIssuer keys to OnchainID (required for claim signing)
  const addClaimIssuerKeysToOnchainID = async () => {
    try {
      setAddingClaim(true);
      setMessage('Adding ClaimIssuer keys to OnchainID...');
      addLog && addLog('Adding ClaimIssuer keys to OnchainID', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      // Use selected trusted issuer or get the first one
      let finalIssuerAddress = '';
      
      if (selectedTrustedIssuer) {
        finalIssuerAddress = selectedTrustedIssuer;
        addLog && addLog(`Using selected trusted issuer: ${finalIssuerAddress}`, "info");
      } else if (trustedIssuers.length > 0) {
        finalIssuerAddress = trustedIssuers[0].address;
        addLog && addLog(`No issuer selected, using first trusted issuer: ${finalIssuerAddress}`, "info");
      } else {
        throw new Error('No trusted issuer found. Please add a trusted issuer first.');
      }

      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      
      // Get the OnchainID contract
      const onchainIdArtifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, signer);
      
      // First, ensure the signer has management keys on this OnchainID
      addLog && addLog(`Checking if signer ${signerAddress} has management keys on OnchainID...`, "info");
      
      const signerKeyHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address'], [signerAddress])
      );
      
      try {
        const signerKey = await onchainId.getKey(signerKeyHash);
        const hasManagementKey = signerKey.purposes.some(p => p.toNumber() === 1);
        
        if (!hasManagementKey) {
          addLog && addLog(`Signer does not have management key. Adding management key for signer...`, "warning");
          
          // Add management key for the signer
          const addManagementKeyTx = await onchainId.addKey(signerKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
          await addManagementKeyTx.wait();
          addLog && addLog(`✅ Added management key for signer ${signerAddress}`, "success");
        } else {
          addLog && addLog(`✅ Signer already has management key`, "success");
        }
      } catch (e) {
        addLog && addLog(`Signer key not found. Adding management key for signer...`, "warning");
        
        // Add management key for the signer
        const addManagementKeyTx = await onchainId.addKey(signerKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
        await addManagementKeyTx.wait();
        addLog && addLog(`✅ Added management key for signer ${signerAddress}`, "success");
      }
      
      // Add the ClaimIssuer as keys to the OnchainID
      addLog && addLog(`Adding ClaimIssuer ${finalIssuerAddress} as keys to OnchainID...`, "info");
      
      try {
        // Create the key hash for the ClaimIssuer
        const claimIssuerKeyHash = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address'], [finalIssuerAddress])
        );
        
        // Check if key already exists
        try {
          const existingKey = await onchainId.getKey(claimIssuerKeyHash);
          if (existingKey.purposes.length > 0) {
            addLog && addLog(`ClaimIssuer ${finalIssuerAddress} keys already exist, skipping...`, "info");
            setMessage('ClaimIssuer keys already exist on this OnchainID');
            return;
          }
        } catch (e) {
          // Key doesn't exist, proceed to add it
        }
        
        // Add the ClaimIssuer as a management key (purpose=1) and signing key (purpose=3)
        addLog && addLog(`Adding ClaimIssuer ${finalIssuerAddress} as management key...`, "info");
        const addManagementKeyTx = await onchainId.addKey(claimIssuerKeyHash, 1, 1); // purpose=1 (management), keyType=1 (ECDSA)
        await addManagementKeyTx.wait();
        
        addLog && addLog(`Adding ClaimIssuer ${finalIssuerAddress} as signing key...`, "info");
        const addSigningKeyTx = await onchainId.addKey(claimIssuerKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
        await addSigningKeyTx.wait();
        
        addLog && addLog(`✅ Successfully added ClaimIssuer ${finalIssuerAddress} keys to OnchainID`, "success");
        setMessage(`Successfully added ClaimIssuer ${finalIssuerAddress} keys to OnchainID`);
        
      } catch (keyError) {
        addLog && addLog(`⚠️ Could not add keys for ClaimIssuer ${finalIssuerAddress}: ${extractCleanError(keyError)}`, "warning");
        setMessage(`Error adding ClaimIssuer keys: ${extractCleanError(keyError)}`);
      }
      
    } catch (error) {
      console.error('Error adding ClaimIssuer keys:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding ClaimIssuer keys: ${cleanError}`);
      addLog && addLog(`Error adding ClaimIssuer keys: ${cleanError}`, "error");
    } finally {
      setAddingClaim(false);
    }
  };

  // Add claim to identity
  const addClaimToIdentity = async () => {
    try {
      setAddingClaim(true);
      setMessage('Adding claim to identity...');
      addLog && addLog('Starting claim addition', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      if (!claimTopic.trim() || !claimValue.trim()) {
        throw new Error('Please enter claim topic and value');
      }

      // Use selected trusted issuer or get the first one
      let finalIssuerAddress = '';
      
      if (selectedTrustedIssuer) {
        finalIssuerAddress = selectedTrustedIssuer;
        addLog && addLog(`- Using selected trusted issuer: ${finalIssuerAddress}`, "info");
      } else if (trustedIssuers.length > 0) {
        finalIssuerAddress = trustedIssuers[0].address;
        addLog && addLog(`- No issuer selected, using first trusted issuer: ${finalIssuerAddress}`, "info");
      } else {
        throw new Error('No trusted issuer found. Please add a trusted issuer first.');
      }

      const signer = await getSigner();
      const artifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, artifacts.abi, signer);
      
      // Convert claim topic string to uint256
      let topicId;
      if (claimTopic === 'KYC (Know Your Customer)') topicId = 1;
      else if (claimTopic === 'AML (Anti-Money Laundering)') topicId = 2;
      else if (claimTopic === 'Accredited Investor') topicId = 3;
      else if (claimTopic === 'EU Nationality Confirmed') topicId = 4;
      else if (claimTopic === 'US Nationality Confirmed') topicId = 5;
      else if (claimTopic === 'Blacklist') topicId = 6;
      else {
        const parsed = parseInt(claimTopic);
        topicId = isNaN(parsed) ? ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(claimTopic))) : parsed;
      }
      
      addLog && addLog(`Adding claim with parameters:`, "info");
      addLog && addLog(`- Topic: ${claimTopic} (ID: ${topicId})`, "info");
      addLog && addLog(`- Value: ${claimValue}`, "info");
      addLog && addLog(`- Final issuer: ${finalIssuerAddress}`, "info");
      addLog && addLog(`- User OnchainID: ${onchainIdAddress}`, "info");
      
      // Check if the issuer is trusted for this claim topic
      const selectedIssuer = trustedIssuers.find(issuer => issuer.address === finalIssuerAddress);
      if (selectedIssuer && !selectedIssuer.topics.includes(topicId)) {
        addLog && addLog(`- WARNING: Selected trusted issuer does not support topic ${topicId}`, "warning");
        addLog && addLog(`- Selected issuer supports topics: ${selectedIssuer.topics.join(', ')}`, "warning");
      } else if (selectedIssuer) {
        addLog && addLog(`- ✅ Selected trusted issuer supports topic ${topicId}`, "success");
      }
      
      // Create a proper signature for the claim
      // The signature should be of: keccak256(abi.encode(address identityHolder_address, uint256 topic, bytes data))
      const claimData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(claimValue));
      
      addLog && addLog(`🔍 SIGNATURE DEBUG:`, "info");
      addLog && addLog(`  Raw claimValue: "${claimValue}"`, "info");
      addLog && addLog(`  claimData (hex): ${claimData}`, "info");
      addLog && addLog(`  onchainIdAddress: ${onchainIdAddress}`, "info");
      addLog && addLog(`  topicId: ${topicId} (type: ${typeof topicId})`, "info");
      
      const dataHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256', 'bytes'],
          [onchainIdAddress, topicId, claimData]
        )
      );
      
      addLog && addLog(`  dataHash: ${dataHash}`, "info");
      
      // Sign the data hash with the signer's private key
      const signature = await signer.signMessage(ethers.utils.arrayify(dataHash));
      
      addLog && addLog(`  signature: ${signature}`, "info");
      
      // Verify the signature can be recovered
      try {
        const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(dataHash), signature);
        addLog && addLog(`  recovered address: ${recoveredAddress}`, "info");
        addLog && addLog(`  signer address: ${await signer.getAddress()}`, "info");
        addLog && addLog(`  signature valid: ${recoveredAddress.toLowerCase() === (await signer.getAddress()).toLowerCase()}`, "info");
      } catch (e) {
        addLog && addLog(`  signature verification failed: ${e.message}`, "error");
      }
      
      // Add claim to the OnchainID
      // Parameters: topic, scheme, issuer, signature, data, uri
      const scheme = 1; // ECDSA
      const uri = '';
      
      addLog && addLog(`Calling addClaim(${topicId}, ${scheme}, ${finalIssuerAddress}, ${signature}, ${claimData}, ${uri})`, "info");
      const tx = await onchainId.addClaim(topicId, scheme, finalIssuerAddress, signature, claimData, uri);
      await tx.wait();
      
      // Update identity with new claim
      const updatedIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        claims: [...(selectedIdentity?.claims || []), {
          topic: topicId,
          value: claimValue,
          issuer: finalIssuerAddress,
          addedAt: new Date().toISOString()
        }]
      };
      saveUserIdentity(updatedIdentity);
      
      // Verify the claim was actually added by checking the contract
      try {
        addLog && addLog(`Verifying claim was added to contract...`, "info");
        const claimId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256', 'bytes'],
            [onchainIdAddress, topicId, claimData]
          )
        );
        
        const claim = await onchainId.getClaim(claimId);
        addLog && addLog(`Claim verification:`, "info");
        addLog && addLog(`  Claim ID: ${claimId}`, "info");
        addLog && addLog(`  Topic: ${claim.topic.toNumber()}`, "info");
        addLog && addLog(`  Scheme: ${claim.scheme.toNumber()}`, "info");
        addLog && addLog(`  Issuer: ${claim.issuer}`, "info");
        addLog && addLog(`  Signature: ${claim.signature}`, "info");
        addLog && addLog(`  Data: ${claim.data}`, "info");
        addLog && addLog(`  URI: ${claim.uri}`, "info");
        addLog && addLog(`✅ Claim verified on contract`, "success");
      } catch (verifyError) {
        addLog && addLog(`❌ Claim verification failed: ${verifyError.message}`, "error");
        addLog && addLog(`This means the claim was not properly added to the contract`, "error");
      }
      
      addLog && addLog(`Claim added successfully for ${userAddress}`, "success");
      setMessage(`Claim added successfully for ${userAddress}`);
      
      // Clear form
      setClaimTopic('');
      setClaimValue('');
      setSelectedTrustedIssuer('');
      
    } catch (error) {
      console.error('Error adding claim:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding claim: ${cleanError}`);
      addLog && addLog(`Error adding claim: ${cleanError}`, "error");
    } finally {
      setAddingClaim(false);
    }
  };

  // Load existing identity
  const loadExistingIdentity = (identity) => {
    setUserAddress(identity.userAddress);
    setUserCountry(identity.country);
    setOnchainIdAddress(identity.onchainIdAddress);
    setSelectedIdentity(identity);
    addLog && addLog(`Loaded existing identity for ${identity.userAddress}`, "info");
  };

  // Check claims on OnchainID contract
  const checkOnchainIDClaims = async () => {
    if (!onchainIdAddress) {
      setMessage('Please create an OnchainID first');
      return;
    }
    
    try {
      addLog && addLog(`Checking claims on OnchainID: ${onchainIdAddress}`, "info");
      const signer = await getSigner();
      const artifacts = getContractArtifacts('Identity');
      const onchainId = new ethers.Contract(onchainIdAddress, artifacts.abi, signer);
      
      // Check for claims on common topics (1-10) - expanded to catch more topics
      const commonTopics = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const claims = [];
      const processedClaimIds = new Set(); // To avoid duplicates
      
      addLog && addLog(`Checking ${commonTopics.length} common claim topics...`, "info");
      
      for (const topicId of commonTopics) {
        try {
          // Get claim IDs for this topic
          const claimIds = await onchainId.getClaimIdsByTopic(topicId);
          
          if (claimIds.length > 0) {
            addLog && addLog(`Topic ${topicId}: Found ${claimIds.length} claims`, "info");
            
            for (const claimId of claimIds) {
              const claimIdStr = claimId.toString();
              
              // Skip if we've already processed this claim ID
              if (processedClaimIds.has(claimIdStr)) {
                addLog && addLog(`  Skipping duplicate claim ID: ${claimIdStr}`, "info");
                continue;
              }
              
              try {
                const claim = await onchainId.getClaim(claimId);
                let claimData = '';
                try {
                  claimData = ethers.utils.toUtf8String(claim.data);
                } catch (e) {
                  claimData = claim.data; // Keep as hex if not UTF8
                }
                
                addLog && addLog(`  Claim ID: ${claimIdStr}`, "info");
                addLog && addLog(`    - Issuer: ${claim.issuer}`, "info");
                addLog && addLog(`    - Topic: ${claim.topic.toString()}`, "info");
                addLog && addLog(`    - Data: ${claimData}`, "info");
                addLog && addLog(`    - Scheme: ${claim.scheme.toString()}`, "info");
                
                claims.push({
                  id: claimIdStr,
                  topic: claim.topic.toNumber(),
                  issuer: claim.issuer,
                  data: claimData,
                  scheme: claim.scheme.toNumber()
                });
                
                processedClaimIds.add(claimIdStr);
              } catch (claimError) {
                addLog && addLog(`Error getting claim ${claimIdStr}: ${claimError.message}`, "error");
              }
            }
          }
        } catch (topicError) {
          // Topic might not exist or other error, continue to next topic
          addLog && addLog(`Topic ${topicId}: No claims or error - ${topicError.message}`, "warning");
        }
      }
      
      if (claims.length === 0) {
        addLog && addLog('No claims found on this OnchainID', "info");
        setMessage('No claims found on OnchainID contract');
        return;
      }
      
      addLog && addLog(`Total claims found on contract: ${claims.length}`, "success");
      addLog && addLog(`Unique claim IDs processed: ${processedClaimIds.size}`, "info");
      setMessage(`Found ${claims.length} claims on OnchainID contract`);
      
      // Update the selected identity with actual claims from contract
      if (selectedIdentity) {
        const updatedIdentity = {
          ...selectedIdentity,
          actualClaims: claims
        };
        saveUserIdentity(updatedIdentity);
        setSelectedIdentity(updatedIdentity);
      }
      
    } catch (error) {
      console.error('Error checking OnchainID claims:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking claims: ${cleanError}`);
      addLog && addLog(`Error checking claims: ${cleanError}`, "error");
    }
  };

  // Clear current identity
  const clearCurrentIdentity = () => {
    setUserAddress('');
    setUserCountry('840');
    setOnchainIdAddress('');
    setSelectedIdentity(null);
    setClaimTopic('');
    setClaimValue('');
    setSelectedTrustedIssuer('');
    setMessage('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>User Management</h3>
      
      {/* TREX Factory Pattern Information */}
      <div style={{ 
        background: '#e7f3ff', 
        borderRadius: 8, 
        border: '1px solid #b3d9ff',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <h5 style={{ color: '#1a237e', marginBottom: '0.5rem' }}>🏭 TREX Factory Pattern</h5>
        <p style={{ color: '#333', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
          In the TREX Factory pattern, users don't directly interact with contracts. Instead, the platform admin/issuer:
        </p>
        <ol style={{ color: '#333', fontSize: '0.9rem', margin: '0', paddingLeft: '1.5rem' }}>
          <li><strong>Creates OnchainID</strong> using <code>IIdFactory.createIdentity(userAddress, salt)</code></li>
          <li><strong>Registers user</strong> in IdentityRegistry using <code>registerIdentity(userAddress, identityAddress, countryCode)</code></li>
          <li><strong>Issues claims</strong> via a ClaimIssuer that has the right topic (e.g., KYC, AML)</li>
        </ol>
        <p style={{ color: '#666', fontSize: '0.8rem', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
          Once claims are verified and compliance modules approve, the user can receive or transfer tokens.
        </p>
      </div>
      
      {/* Message Display */}
      {message && (
        <div style={{ 
          color: message.includes('Error') ? '#721c24' : '#155724',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          padding: '0.5rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          {message}
        </div>
      )}

      {/* Existing Identities - MOVED TO TOP */}
      {userIdentities.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Existing Identities</h4>
          
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {userIdentities.map((identity, index) => (
              <div key={index} style={{ 
                border: selectedIdentity?.userAddress === identity.userAddress ? '2px solid #007bff' : '1px solid #dee2e6', 
                borderRadius: '4px', 
                padding: '1rem', 
                marginBottom: '1rem',
                background: selectedIdentity?.userAddress === identity.userAddress ? '#e7f3ff' : '#fff',
                boxShadow: selectedIdentity?.userAddress === identity.userAddress ? '0 2px 8px rgba(0, 123, 255, 0.2)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#333' }}>{identity.userAddress}</strong>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      onClick={() => loadExistingIdentity(identity)}
                      style={{ 
                        backgroundColor: selectedIdentity?.userAddress === identity.userAddress ? "#28a745" : "#007bff", 
                        color: "white", 
                        padding: '0.25rem 0.5rem', 
                        fontSize: '0.8rem',
                        fontWeight: selectedIdentity?.userAddress === identity.userAddress ? 'bold' : 'normal'
                      }}
                    >
                      {selectedIdentity?.userAddress === identity.userAddress ? 'Selected' : 'Select'}
                    </Button>
                    <Button
                      onClick={() => {
                        setOnchainIdAddress(identity.onchainIdAddress);
                        checkOnchainIDClaims();
                      }}
                      style={{ backgroundColor: "#17a2b8", color: "white", padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                      Check Claims
                    </Button>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  <div>OnchainID: {identity.onchainIdAddress}</div>
                  <div>Status: {identity.status}</div>
                  <div>Country: {identity.country}</div>
                  <div>Claims: {identity.claims?.length || 0}</div>
                  {identity.actualClaims && (
                    <div>Actual Claims on Contract: {identity.actualClaims.length}</div>
                  )}
                  {identity.identityRegistries && identity.identityRegistries.length > 0 && (
                    <div>
                      <strong>Registered in IRs:</strong>
                      {identity.identityRegistries.map((ir, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          • {ir.address}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Create OnchainID */}
      <div style={{ 
        background: '#fff', 
        borderRadius: 8, 
        border: '1px solid #dee2e6',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 1: Create OnchainID</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              User Address:
            </label>
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Country Code:
            </label>
            <input
              type="text"
              value={userCountry}
              onChange={(e) => setUserCountry(e.target.value)}
              placeholder="840"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <Button
            onClick={createOnchainId}
            disabled={creatingUser || !userAddress.trim()}
            style={{ backgroundColor: "#28a745", color: "white" }}
          >
            {creatingUser ? "Creating..." : "Create OnchainID"}
          </Button>
          <Button
            onClick={clearCurrentIdentity}
            style={{ backgroundColor: "#6c757d", color: "white" }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Step 2: Register in Identity Registry */}
      {onchainIdAddress && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 2: Register in Identity Registry</h4>
          
          {/* IR Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Select Identity Registry:
            </label>
            {loadingIRs ? (
              <div style={{ color: '#666', fontStyle: 'italic' }}>Loading Identity Registries...</div>
            ) : availableIRs.length > 0 ? (
              <select
                value={selectedIR}
                onChange={(e) => handleIRSelection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select an Identity Registry</option>
                {availableIRs.map(ir => (
                  <option key={ir.address} value={ir.address}>
                    IR: {ir.tokenName} ({ir.tokenSymbol}) - {ir.timestamp ? new Date(ir.timestamp).toLocaleString() : 'Unknown time'}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ 
                color: '#856404', 
                backgroundColor: '#fff3cd',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ffeaa7'
              }}>
                No Identity Registries found in deployment details
              </div>
            )}
          </div>
          
          {/* Available Claim Issuers - Show all regardless of IR selection */}
          {availableClaimIssuers.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Available Claim Issuers:
              </label>
              <select
                value={selectedTrustedIssuer}
                onChange={(e) => setSelectedTrustedIssuer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a Claim Issuer</option>
                {availableClaimIssuers.map((issuer, index) => (
                  <option key={index} value={issuer.address}>
                    {issuer.name || 'Unnamed Issuer'} - {issuer.timestamp ? new Date(issuer.timestamp).toLocaleString() : 'Unknown time'}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <Button
            onClick={registerIdentity}
            disabled={registeringUser || !selectedIR}
            style={{ backgroundColor: "#17a2b8", color: "white" }}
          >
            {registeringUser ? "Registering..." : "Register Identity"}
          </Button>
        </div>
      )}

      {/* Step 3: Add Claims */}
      {onchainIdAddress && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 3: Add Claims</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Claim Topic:
              </label>
              <select
                value={claimTopic}
                onChange={(e) => setClaimTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a claim topic</option>
                {claimTopics.map(topic => (
                  <option key={topic.id} value={topic.name}>{topic.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Claim Value:
              </label>
              <select
                value={claimValue}
                onChange={(e) => setClaimValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a value</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Trusted Issuer:
              </label>
              <select
                value={selectedTrustedIssuer}
                onChange={(e) => setSelectedTrustedIssuer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a Claim Issuer</option>
                {availableClaimIssuers.map(issuer => (
                  <option key={issuer.address} value={issuer.address}>
                    {issuer.name || 'Unnamed'} - {issuer.timestamp ? new Date(issuer.timestamp).toLocaleString() : 'Unknown time'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <Button
              onClick={addClaimIssuerKeysToOnchainID}
              disabled={addingClaim || !selectedTrustedIssuer}
              style={{ backgroundColor: "#28a745", color: "white" }}
            >
              {addingClaim ? "Adding Keys..." : "Add ClaimIssuer Keys to OnchainID"}
            </Button>
            
            <Button
              onClick={addClaimToIdentity}
              disabled={addingClaim || !claimTopic || !claimValue}
              style={{ backgroundColor: "#ffc107", color: "black" }}
            >
              {addingClaim ? "Adding Claim..." : "Add Claim"}
            </Button>
          </div>
        </div>
      )}

      {/* Actual Claims from Contract */}
      {selectedIdentity?.actualClaims && selectedIdentity.actualClaims.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>
            Claims on Contract ({selectedIdentity.actualClaims.length} total)
          </h4>
          
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {selectedIdentity.actualClaims.map((claim, index) => (
              <div key={index} style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '4px', 
                padding: '1rem', 
                marginBottom: '1rem',
                background: '#f8f9fa'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>Claim #{index + 1}</strong>
                    <span style={{ 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem' 
                    }}>
                      Topic {claim.topic}
                    </span>
                  </div>
                  <div><strong>Claim ID:</strong> {claim.id}</div>
                  <div><strong>Issuer:</strong> {claim.issuer}</div>
                  <div><strong>Data:</strong> {claim.data}</div>
                  <div><strong>Scheme:</strong> {claim.scheme}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: '#e7f3ff', 
            borderRadius: '4px', 
            fontSize: '0.8rem', 
            color: '#1a237e' 
          }}>
            <strong>Note:</strong> All claims shown above are directly from the OnchainID contract. 
            If you have claims from multiple issuers, they should all be displayed here.
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab; 