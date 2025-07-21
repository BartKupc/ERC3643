import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { Button, createLoggingUtils, loadDeploymentState, clearDeploymentState } from './shared';
import { getContractArtifacts } from '../../hooks/compiledContracts';
import TabNavigation from './easy-deploy/TabNavigation';
import FactoryManagementTab from './easy-deploy/FactoryManagementTab';
import TokenManagementTab from './easy-deploy/TokenManagementTab';
import ClaimsManagementTab from './easy-deploy/ClaimsManagementTab';
import TrustedIssuerManagementTab from './easy-deploy/TrustedIssuerManagementTab';
import AgentManagementTab from './easy-deploy/AgentManagementTab';
import UserManagementTab from './easy-deploy/UserManagementTab';
import TokenOperationsTab from './easy-deploy/TokenOperationsTab';
import { CLAIM_TOPIC_LABELS } from './easy-deploy/constants';

const EasyDeployPhase = () => {
  // State management
  const [activeTab, setActiveTab] = useState('factory');
  const [deployedContracts, setDeployedContracts] = useState({});
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [factories, setFactories] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [deploymentDetails, setDeploymentDetails] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [deployingFactory, setDeployingFactory] = useState(false);
  const [deployingToken, setDeployingToken] = useState(false);
  const [tokenDetails, setTokenDetails] = useState({
    name: 'MySecurityToken',
    symbol: 'MST',
    decimals: 18,
    totalSupply: '1000000'
  });

  // User Management State
  const [userAddress, setUserAddress] = useState('');
  const [userCountry, setUserCountry] = useState('840');
  const [userIdentities, setUserIdentities] = useState([]);
  const [creatingUser, setCreatingUser] = useState(false);

  // Claims Management State
  const [claimTopics, setClaimTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingClaimTopic, setAddingClaimTopic] = useState(false);
  const [removingClaimTopicState, setRemovingClaimTopicState] = useState(false);

  // Trusted Issuer Management State
  const [issuerAddress, setIssuerAddress] = useState('');
  const [issuerClaimTopics, setIssuerClaimTopics] = useState([]);
  const [newClaimTopic, setNewClaimTopic] = useState('');
  const [addingIssuer, setAddingIssuer] = useState(false);
  const [deployedClaimIssuers, setDeployedClaimIssuers] = useState([]);

  // Agent Management State
  const [agents, setAgents] = useState({ token: [], ir: [], irs: [] });
  const [removingAgentState, setRemovingAgentState] = useState(false);

  // Token OnchainID State
  const [tokenOnchainId, setTokenOnchainId] = useState(null);
  const [loadingTokenOnchainId, setLoadingTokenOnchainId] = useState(false);

  // Claim Issuer Management State
  const [selectedIdentityForClaims, setSelectedIdentityForClaims] = useState('');
  const [selectedClaimIssuer, setSelectedClaimIssuer] = useState('');
  const [availableClaimIssuers, setAvailableClaimIssuers] = useState(() => {
    try {
      const saved = localStorage.getItem('trex_available_claim_issuers');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading claim issuers from localStorage:', error);
      return [];
    }
  });
  const [loadingClaimIssuers, setLoadingClaimIssuers] = useState(false);
  const [addingClaimIssuer, setAddingClaimIssuer] = useState(false);

  // Claim Topics Management State
  const [selectedIdentityForClaimTopics, setSelectedIdentityForClaimTopics] = useState('');
  const [selectedClaimTopic, setSelectedClaimTopic] = useState('');
  const [claimTopicValue, setClaimTopicValue] = useState('');
  const [addingClaimTopicToIdentity, setAddingClaimTopicToIdentity] = useState(false);

  // Token Operations State
  const [mintAmount, setMintAmount] = useState('');
  const [mintRecipient, setMintRecipient] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [burnFrom, setBurnFrom] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [mintingToken, setMintingToken] = useState(false);
  const [burningToken, setBurningToken] = useState(false);
  const [transferringToken, setTransferringToken] = useState(false);

  // Additional state
  const [selectedOperationsToken, setSelectedOperationsToken] = useState(null);
  const [selectedAgentContractType, setSelectedAgentContractType] = useState('token');
  const [agentAddressInput, setAgentAddressInput] = useState('');
  const [selectedTokenForAgent, setSelectedTokenForAgent] = useState(null);
  const [selectedIRForAgent, setSelectedIRForAgent] = useState(null);

  const [selectedClaimTopics, setSelectedClaimTopics] = useState([]);
  const [claimIssuers, setClaimIssuers] = useState([]);

  // Simple logging
  const addLog = useCallback((message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { message, type, timestamp };
    setLogs(prevLogs => [...prevLogs, newLog]);
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  // Helper function to get signer for Hardhat local environment
  const getSigner = async () => {
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    return new ethers.Wallet(privateKey, provider);
  };

  // Load deployment details
  const loadDeploymentDetails = async (deploymentId) => {
    try {
      addLog(`Loading deployment details for: ${deploymentId}`, "info");
      const response = await axios.get(`/api/deployments/${deploymentId}`);
      setDeploymentDetails(response.data);
      addLog("Deployment details loaded successfully!", "success");
    } catch (error) {
      console.error('Error loading deployment details:', error);
      addLog(`Error loading deployment details: ${error.message}`, "error");
    }
  };

  // Load user identities from localStorage
  useEffect(() => {
    const loadUserIdentities = () => {
      try {
        const savedIdentities = localStorage.getItem('trex_user_identities');
        if (savedIdentities) {
          const parsedIdentities = JSON.parse(savedIdentities);
          setUserIdentities(parsedIdentities);
          addLog(`Loaded ${parsedIdentities.length} user identities from storage`, "info");
        }
      } catch (error) {
        console.error('Error loading user identities:', error);
        addLog("Error loading user identities,error");
      }
    };

    loadUserIdentities();
  }, []);

  // Load deployment state and factories
  useEffect(() => {
    const loadState = () => {
      try {
        const savedState = loadDeploymentState();
        setDeployedContracts(savedState.contracts || {});
        addLog("Loaded deployment state from storage", "info");
      } catch (error) {
        console.error("Error loading deployment state:", error);
        addLog("Error loading deployment state", "error");
      }
    };

    const loadFactories = async () => {
      try {
        addLog("Loading factories from backend...", "info");
        const response = await axios.get('/api/factories');
        setFactories(response.data);
        addLog(`Loaded ${response.data.length} factories`, "success");

        if (response.data.length > 0) {
          setSelectedFactory(response.data[0]);
          addLog(`Selected first factory: ${response.data[0].address}`, "info");
          loadDeploymentDetails(response.data[0].deploymentId);
        } else {
          addLog("No factories found", "warning");
        }
      } catch (error) {
        console.error('Error loading factories:', error);
        addLog(`Error loading factories: ${error.message}`, "error");
      }
    };

    loadState();
    loadFactories();
  }, []);

  // Synchronize claimIssuers with availableClaimIssuers
  useEffect(() => {
    setClaimIssuers(availableClaimIssuers);
  }, [availableClaimIssuers]);

  // Factory change handler
  const handleFactoryChange = (factory) => {
    setSelectedFactory(factory);
    if (factory) {
      loadDeploymentDetails(factory.deploymentId);
    } else {
      setDeploymentDetails(null);
    }
  };

  // Deploy Factory
  const handleDeployFactory = async () => {
    setDeployingFactory(true);
    setMessage("");
    addLog("Starting factory deployment...", "info");

    try {
      addLog("Sending factory deployment request to backend...", "info");
      await axios.post('/api/deploy/factory');

      addLog("Factory deployment request sent successfully", "success");
      addLog("Waiting for backend to process deployment...", "info");

      await new Promise(res => setTimeout(res, 1500));

      addLog("Loading updated factory list...", "info");
      const factoriesResponse = await axios.get('/api/factories');
      setFactories(factoriesResponse.data);

      if (factoriesResponse.data.length > 0) {
        const latestFactory = factoriesResponse.data[factoriesResponse.data.length - 1];
        setSelectedFactory(latestFactory);
        addLog(`Selected latest factory: ${latestFactory.address}`, "success");
        loadDeploymentDetails(latestFactory.deploymentId);
      }

      setMessage("Factory deployed successfully!");
      addLog("Factory deployment completed successfully!", "success");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setMessage("Failed to deploy factory: " + errorMessage);
      addLog(`Factory deployment failed: ${errorMessage}`, "error");
    }
    setDeployingFactory(false);
  };

  // Deploy Token
  const handleDeployToken = async () => {
    if (!selectedFactory) {
      setMessage("Please select a factory first.");
      addLog("Token deployment cancelled: No factory selected", "warning");
      return;
    }

    if (!selectedClaimIssuer) {
      setMessage("Please select a ClaimIssuer first.");
      addLog("Token deployment cancelled: No ClaimIssuer selected", "warning");
      return;
    }

    if (selectedClaimTopics.length === 0) {
      setMessage("Please select at least one claim topic first.");
      addLog("Token deployment cancelled: No claim topics selected", "warning");
      return;
    }

    setDeployingToken(true);
    setMessage("");
    addLog("Starting token deployment...", "info");

    try {
      const claimDetails = {
        issuers: [selectedClaimIssuer],
        issuerClaims: [selectedClaimTopics],
        claimTopics: selectedClaimTopics
      };

      addLog("Sending token deployment request to backend...", "info");
      const response = await axios.post('/api/deploy/token', {
        factoryAddress: selectedFactory.address,
        tokenDetails,
        claimDetails
      });

      addLog("Token deployment request sent successfully", "success");
      addLog("Waiting for backend to process deployment...", "info");

      await new Promise(res => setTimeout(res, 1500));

      addLog("Loading updated factory list...", "info");
      const factoriesResponse = await axios.get('/api/factories');
      setFactories(factoriesResponse.data);

      if (selectedFactory) {
        addLog("Reloading deployment details to show new token...", "info");
        await loadDeploymentDetails(selectedFactory.deploymentId);

        if (response.data && response.data.tokenData) {
          addLog("Auto-selecting newly deployed token...", "info");
          setSelectedToken(response.data.tokenData);
        }
      }

      if (response.data && response.data.tokenAddress) {
        addLog(`Token deployed at: ${response.data.tokenAddress}`, "success");
      }

      setMessage("Token deployed successfully with claim issuer and topics!");
      addLog("Token deployment completed successfully!", "success");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setMessage("Failed to deploy token: " + errorMessage);
      addLog(`Token deployment failed: ${errorMessage}`, "error");
    }
    setDeployingToken(false);
  };

  // Placeholder functions for other operations
  const createUserIdentity = async () => {
    addLog("User identity creation not implemented yet", "warning");
  };

  const loadAvailableClaimIssuers = async () => {
    addLog("Loading claim issuers not implemented yet", "warning");
  };

  const addClaimIssuerToOnchainID = async () => {
    addLog("Adding claim issuer not implemented yet", "warning");
  };

  const addClaimTopicToOnchainID = async () => {
    addLog("Adding claim topic not implemented yet", "warning");
  };

  // Token Operations
  const handleMintToken = async () => {
    if (!selectedOperationsToken) {
      setMessage("Please select a token first");
      addLog("Token minting cancelled: No token selected", "warning");
      return;
    }

    if (!mintAmount || !mintRecipient) {
      setMessage("Please enter amount and recipient address");
      addLog("Token minting cancelled: Missing amount or recipient", "warning");
      return;
    }

    setMintingToken(true);
    setMessage("");
    addLog("Starting token minting...", "info");

    try {
      const signer = await getSigner();
      const tokenAddress = selectedOperationsToken.token.address;
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      addLog(`Minting ${mintAmount} tokens to ${mintRecipient}`, "info");
      
      // Convert amount to wei based on token decimals
      const decimals = await token.decimals();
      const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
      const amountInWei = ethers.utils.parseUnits(mintAmount, decimalsNumber);
      
      const tx = await token.mint(mintRecipient, amountInWei);
      await tx.wait();
      
      addLog(`Successfully minted ${mintAmount} tokens to ${mintRecipient}`, "success");
      setMessage(`Successfully minted ${mintAmount} tokens to ${mintRecipient}`);
      
      // Clear form
      setMintAmount('');
      setMintRecipient('');
      
    } catch (error) {
      console.error('Error minting tokens:', error);
      const cleanError = error.message || error.toString();
      setMessage(`Error minting tokens: ${cleanError}`);
      addLog(`Error minting tokens: ${cleanError}`, "error");
    } finally {
      setMintingToken(false);
    }
  };

  const handleBurnToken = async () => {
    if (!selectedOperationsToken) {
      setMessage("Please select a token first");
      addLog("Token burning cancelled: No token selected", "warning");
      return;
    }

    if (!burnAmount || !burnFrom) {
      setMessage("Please enter amount and from address");
      addLog("Token burning cancelled: Missing amount or from address", "warning");
      return;
    }

    setBurningToken(true);
    setMessage("");
    addLog("Starting token burning...", "info");

    try {
      const signer = await getSigner();
      const tokenAddress = selectedOperationsToken.token.address;
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      addLog(`Burning ${burnAmount} tokens from ${burnFrom}`, "info");
      
      // Convert amount to wei based on token decimals
      const decimals = await token.decimals();
      const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
      const amountInWei = ethers.utils.parseUnits(burnAmount, decimalsNumber);
      
      const tx = await token.burn(burnFrom, amountInWei);
      await tx.wait();
      
      addLog(`Successfully burned ${burnAmount} tokens from ${burnFrom}`, "success");
      setMessage(`Successfully burned ${burnAmount} tokens from ${burnFrom}`);
      
      // Clear form
      setBurnAmount('');
      setBurnFrom('');
      
    } catch (error) {
      console.error('Error burning tokens:', error);
      const cleanError = error.message || error.toString();
      setMessage(`Error burning tokens: ${cleanError}`);
      addLog(`Error burning tokens: ${cleanError}`, "error");
    } finally {
      setBurningToken(false);
    }
  };

  const handleTransferToken = async () => {
    if (!selectedOperationsToken) {
      setMessage("Please select a token first");
      addLog("Token transfer cancelled: No token selected", "warning");
      return;
    }

    if (!transferAmount || !transferTo) {
      setMessage("Please enter amount and recipient address");
      addLog("Token transfer cancelled: Missing amount or recipient", "warning");
      return;
    }

    setTransferringToken(true);
    setMessage("");
    addLog("Starting token transfer...", "info");

    try {
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const tokenAddress = selectedOperationsToken.token.address;
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      // Always use transfer() - this transfers from the signer's address
      addLog(`Using transfer() - transferring from signer (${signerAddress}) to ${transferTo}`, "info");
      
      // Convert amount to wei based on token decimals
      const decimals = await token.decimals();
      const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
      const amountInWei = ethers.utils.parseUnits(transferAmount, decimalsNumber);
      
      const tx = await token.transfer(transferTo, amountInWei);
      await tx.wait();
      
      addLog(`Successfully transferred ${transferAmount} tokens to ${transferTo}`, "success");
      setMessage(`Successfully transferred ${transferAmount} tokens to ${transferTo}`);
      
      // Clear form
      setTransferAmount('');
      setTransferTo('');
      
    } catch (error) {
      console.error('Error transferring tokens:', error);
      const cleanError = error.message || error.toString();
      setMessage(`Error transferring tokens: ${cleanError}`);
      addLog(`Error transferring tokens: ${cleanError}`, "error");
    } finally {
      setTransferringToken(false);
    }
  };

  const handleTransferFromToken = async () => {
    if (!selectedOperationsToken) {
      setMessage("Please select a token first");
      addLog("Token transferFrom cancelled: No token selected", "warning");
      return;
    }

    if (!transferAmount || !transferFrom || !transferTo) {
      setMessage("Please enter amount, from address, and to address");
      addLog("Token transferFrom cancelled: Missing parameters", "warning");
      return;
    }

    setTransferringToken(true);
    setMessage("");
    addLog("Starting transferFrom operation with agent privileges", "info");

    try {
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      const tokenAddress = selectedOperationsToken.token.address;
      const tokenArtifacts = getContractArtifacts('Token');
      const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
      
      const requiredAmount = ethers.utils.parseUnits(transferAmount, 18); // Assuming 18 decimals
      
      // Check if signer is an agent
      addLog(`Checking if ${signerAddress} is a token agent...`, "info");
      const isAgent = await token.isAgent(signerAddress);
      addLog(`Is agent: ${isAgent}`, isAgent ? "success" : "error");
      
      if (!isAgent) {
        addLog(`❌ ${signerAddress} is not a token agent. Cannot perform this operation.`, "error");
        setMessage(`Error: ${signerAddress} is not a token agent. Add yourself as an agent first.`);
        return;
      }
      
      // Check if from address has sufficient balance
      const fromBalance = await token.balanceOf(transferFrom);
      addLog(`From address balance: ${ethers.utils.formatEther(fromBalance)} tokens`, "info");
      
      if (fromBalance.lt(requiredAmount)) {
        addLog(`❌ Insufficient balance. Need ${transferAmount} tokens, but ${transferFrom} only has ${ethers.utils.formatEther(fromBalance)}`, "error");
        setMessage(`Insufficient balance in ${transferFrom}.`);
        return;
      }
      
      // Use two-step process like advanced tab:
      // Step 1: Transfer tokens from source to agent (using forcedTransfer)
      addLog(`Step 1: Transferring ${transferAmount} tokens from ${transferFrom} to agent (${signerAddress}) using forcedTransfer`, "info");
      const tx1 = await token.forcedTransfer(transferFrom, signerAddress, requiredAmount);
      await tx1.wait();
      addLog(`✅ Step 1 complete: Tokens moved to agent`, "success");
      
      // Check agent's new balance
      const agentBalance = await token.balanceOf(signerAddress);
      addLog(`Agent balance after step 1: ${ethers.utils.formatEther(agentBalance)} tokens`, "info");
      
      // Step 2: Transfer tokens from agent to destination (using regular transfer with compliance)
      addLog(`Step 2: Transferring ${transferAmount} tokens from agent to ${transferTo} (with compliance check)`, "info");
      const tx2 = await token.transfer(transferTo, requiredAmount);
      await tx2.wait();
      addLog(`✅ Step 2 complete: Tokens transferred to destination with compliance`, "success");
      
      // Check final balances
      const finalFromBalance = await token.balanceOf(transferFrom);
      const finalToBalance = await token.balanceOf(transferTo);
      const finalAgentBalance = await token.balanceOf(signerAddress);
      
      addLog(`Final balances:`, "info");
      addLog(`  ${transferFrom}: ${ethers.utils.formatEther(finalFromBalance)} tokens`, "info");
      addLog(`  ${transferTo}: ${ethers.utils.formatEther(finalToBalance)} tokens`, "info");
      addLog(`  Agent: ${ethers.utils.formatEther(finalAgentBalance)} tokens`, "info");
      
      setMessage(`Successfully transferred ${transferAmount} tokens from ${transferFrom} to ${transferTo} with compliance checks`);
      addLog(`TransferFrom operation completed successfully with compliance validation`, "success");
      
      // Clear form
      setTransferAmount('');
      setTransferFrom('');
      setTransferTo('');
      
    } catch (error) {
      console.error('Error executing transferFrom:', error);
      const cleanError = error.message || error.toString();
      setMessage(`Error executing transferFrom: ${cleanError}`);
      addLog(`Error executing transferFrom: ${cleanError}`, "error");
    } finally {
      setTransferringToken(false);
    }
  };



  const handleDeployClaimIssuer = async () => {
    setAddingClaimIssuer(true);
    setMessage("");
    addLog("Starting ClaimIssuer deployment...", "info");
    
    try {
      const signer = await getSigner();
      const signerAddress = await signer.getAddress();
      
      // Step 1: Deploy ClaimIssuer contract
      addLog("Step 1: Deploying ClaimIssuer contract...", "info");
      const claimIssuerArtifacts = getContractArtifacts('ClaimIssuer');
      const claimIssuerFactory = new ethers.ContractFactory(claimIssuerArtifacts.abi, claimIssuerArtifacts.bytecode, signer);
      const claimIssuer = await claimIssuerFactory.deploy(signerAddress); // Pass the management key
      await claimIssuer.deployed();
      
      addLog(`ClaimIssuer deployed at: ${claimIssuer.address}`, "success");
      
      // Step 2: Add signing key to ClaimIssuer
      addLog("Step 2: Adding signing key to ClaimIssuer...", "info");
      const signingKeyHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [signerAddress]));
      const addKeyTx = await claimIssuer.addKey(signingKeyHash, 3, 1); // purpose=3 (signing), keyType=1 (ECDSA)
      await addKeyTx.wait();
      addLog("Signing key added to ClaimIssuer", "success");
      
      // Step 3: Add ClaimIssuer as trusted issuer if we have a factory with deployment details
      if (selectedFactory && deploymentDetails && deploymentDetails.suite && deploymentDetails.suite.trustedIssuersRegistry) {
        addLog("Step 3: Adding ClaimIssuer as trusted issuer...", "info");
        const tirAddress = deploymentDetails.suite.trustedIssuersRegistry;
        const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
        const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
        
        // Check if issuer already exists
        try {
          const exists = await tir.isTrustedIssuer ? await tir.isTrustedIssuer(claimIssuer.address) : false;
          if (exists) {
            addLog("ClaimIssuer already exists as trusted issuer", "info");
          } else {
            // Add with default claim topics [1, 2, 3] (KYC, AML, Accredited)
            const defaultClaimTopics = [1, 2, 3];
            const addTrustedTx = await tir.addTrustedIssuer(claimIssuer.address, defaultClaimTopics);
            await addTrustedTx.wait();
            addLog("ClaimIssuer added as trusted issuer with default claim topics [1, 2, 3]", "success");
          }
        } catch (e) {
          addLog(`Error checking/adding trusted issuer: ${e.message}`, "error");
        }
      } else {
        addLog("No TrustedIssuersRegistry found - skipping trusted issuer registration", "warning");
      }
      
      // Add to local state
      const newClaimIssuer = {
        address: claimIssuer.address,
        name: `ClaimIssuer-${Date.now()}`,
        claimTopics: [1, 2, 3], // Default topics
        timestamp: Date.now()
      };
      
      setClaimIssuers(prev => [...prev, newClaimIssuer]);
      setSelectedClaimIssuer(claimIssuer.address);
      
      // Also save to localStorage for persistence
      setAvailableClaimIssuers(prev => {
        const updated = [...prev, newClaimIssuer];
        localStorage.setItem('trex_available_claim_issuers', JSON.stringify(updated));
        return updated;
      });
      
      addLog(`ClaimIssuer deployment completed successfully!`, "success");
      addLog(`Address: ${claimIssuer.address}`, "info");
      addLog(`Auto-selected for token deployment`, "info");
      
      setMessage("ClaimIssuer deployed successfully!");
      
    } catch (error) {
      console.error('Error deploying ClaimIssuer:', error);
      const cleanError = error.message || error.toString();
      setMessage("Failed to deploy ClaimIssuer: " + cleanError);
      addLog(`Error deploying ClaimIssuer: ${cleanError}`, "error");
    } finally {
      setAddingClaimIssuer(false);
    }
  };

  return (
    <div>
      {/* Clean All Data button at the top */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '1rem',
        marginTop: '0.5rem',
      }}>
        <Button
          onClick={async () => {
            // Clear backend data
            try {
              await axios.delete('/api/addresses');
              addLog("Backend data cleared", "info");
            } catch (error) {
              addLog(`Warning: Could not clear backend data: ${error.message}`, "warning");
            }
            // Clear all localStorage items
            clearDeploymentState();
            localStorage.removeItem('trex_user_identities');
            localStorage.removeItem('trex_available_claim_issuers');
            // Clear all state
            setDeployedContracts({});
            setFactories([]);
            setSelectedFactory(null);
            setDeploymentDetails(null);
            setSelectedToken(null);
            setClaimIssuers([]);
            setSelectedClaimIssuer('');
            setSelectedClaimTopics([]);
            setUserIdentities([]);
            setAvailableClaimIssuers([]);
            setLogs([]);
            // Clear other state variables
            setMessage('');
            setActiveTab('factory');
            setTokenDetails({
              name: 'MySecurityToken',
              symbol: 'MST',
              decimals: 18,
              totalSupply: '1000000'
            });
            setUserAddress('');
            setUserCountry('840');
            setCreatingUser(false);
            setClaimTopics([]);
            setLoading(false);
            setError(null);
            setAddingClaimTopic(false);
            setRemovingClaimTopicState(false);
            setIssuerAddress('');
            setIssuerClaimTopics([]);
            setNewClaimTopic('');
            setAddingIssuer(false);
            setDeployedClaimIssuers([]);
            setAgents({ token: [], ir: [], irs: [] });
            setRemovingAgentState(false);
            setTokenOnchainId(null);
            setLoadingTokenOnchainId(false);
            setSelectedIdentityForClaims('');
            setLoadingClaimIssuers(false);
            setAddingClaimIssuer(false);
            setSelectedIdentityForClaimTopics('');
            setSelectedClaimTopic('');
            setClaimTopicValue('');
            setAddingClaimTopicToIdentity(false);
            setMintAmount('');
            setMintRecipient('');
            setBurnAmount('');
            setBurnFrom('');
            setTransferAmount('');
            setTransferTo('');
            setTransferFrom('');
            setMintingToken(false);
            setBurningToken(false);
            setTransferringToken(false);
            setSelectedOperationsToken(null);
            setSelectedAgentContractType('token');
            setAgentAddressInput('');
            setSelectedTokenForAgent(null);
            setSelectedIRForAgent(null);

            addLog("All data cleared - starting fresh", "info");
          }}
          style={{
            backgroundColor: '#ffc107',
            color: 'black',
            padding: '4px 8px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clean All Data
        </Button>
      </div>
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'factory' && (
        <FactoryManagementTab
          selectedFactory={selectedFactory}
          factories={factories}
          handleFactoryChange={handleFactoryChange}
          handleDeployFactory={handleDeployFactory}
          deployingFactory={deployingFactory}
          deploymentDetails={deploymentDetails}
          message={message}
        />
      )}
      {activeTab === 'token' && (
        <TokenManagementTab
          selectedFactory={selectedFactory}
          factories={factories}
          handleFactoryChange={handleFactoryChange}
          tokenDetails={tokenDetails}
          setTokenDetails={setTokenDetails}
          handleDeployToken={handleDeployToken}
          deployingToken={deployingToken}
          deploymentDetails={deploymentDetails}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
          claimIssuers={claimIssuers}
          setClaimIssuers={setClaimIssuers}
          selectedClaimIssuer={selectedClaimIssuer}
          setSelectedClaimIssuer={setSelectedClaimIssuer}
          handleDeployClaimIssuer={handleDeployClaimIssuer}
          claimTopics={claimTopics}
          setClaimTopics={setClaimTopics}
          selectedClaimTopics={selectedClaimTopics}
          setSelectedClaimTopics={setSelectedClaimTopics}
          addingClaimIssuer={addingClaimIssuer}
          message={message}
        />
      )}
      {activeTab === 'claims' && (
        <ClaimsManagementTab deploymentDetails={deploymentDetails} addLog={addLog} getSigner={getSigner} factories={factories} />
      )}
      {activeTab === 'issuers' && (
        <TrustedIssuerManagementTab deploymentDetails={deploymentDetails} addLog={addLog} getSigner={getSigner} factories={factories} />
      )}
      {activeTab === 'agents' && (
        <AgentManagementTab deploymentDetails={deploymentDetails} addLog={addLog} getSigner={getSigner} factories={factories} />
      )}
      {activeTab === 'users' && (
        <UserManagementTab
          selectedFactory={selectedFactory}
          factories={factories}
          handleFactoryChange={handleFactoryChange}
          userAddress={userAddress}
          setUserAddress={setUserAddress}
          userCountry={userCountry}
          setUserCountry={setUserCountry}
          createUserIdentity={createUserIdentity}
          creatingUser={creatingUser}
          userIdentities={userIdentities}
          tokenOnchainId={tokenOnchainId}
          loadingTokenOnchainId={loadingTokenOnchainId}
          selectedIdentityForClaims={selectedIdentityForClaims}
          setSelectedIdentityForClaims={setSelectedIdentityForClaims}
          selectedClaimIssuer={selectedClaimIssuer}
          setSelectedClaimIssuer={setSelectedClaimIssuer}
          availableClaimIssuers={availableClaimIssuers}
          loadingClaimIssuers={loadingClaimIssuers}
          addingClaimIssuer={addingClaimIssuer}
          loadAvailableClaimIssuers={loadAvailableClaimIssuers}
          addClaimIssuerToOnchainID={addClaimIssuerToOnchainID}
          selectedIdentityForClaimTopics={selectedIdentityForClaimTopics}
          setSelectedIdentityForClaimTopics={setSelectedIdentityForClaimTopics}
          selectedClaimTopic={selectedClaimTopic}
          setSelectedClaimTopic={setSelectedClaimTopic}
          claimTopicValue={claimTopicValue}
          setClaimTopicValue={setClaimTopicValue}
          addingClaimTopicToIdentity={addingClaimTopicToIdentity}
          addClaimTopicToOnchainID={addClaimTopicToOnchainID}
          deploymentDetails={deploymentDetails}
          addLog={addLog}
          getSigner={getSigner}
        />
      )}
      {activeTab === 'operations' && (
        <TokenOperationsTab
          deploymentDetails={deploymentDetails}
          addLog={addLog}
          getSigner={getSigner}
          selectedOperationsToken={selectedOperationsToken}
          setSelectedOperationsToken={setSelectedOperationsToken}
          mintAmount={mintAmount}
          setMintAmount={setMintAmount}
          mintRecipient={mintRecipient}
          setMintRecipient={setMintRecipient}
          burnAmount={burnAmount}
          setBurnAmount={setBurnAmount}
          burnFrom={burnFrom}
          setBurnFrom={setBurnFrom}
          transferAmount={transferAmount}
          setTransferAmount={setTransferAmount}
          transferTo={transferTo}
          setTransferTo={setTransferTo}
          transferFrom={transferFrom}
          setTransferFrom={setTransferFrom}
          mintingToken={mintingToken}
          burningToken={burningToken}
          transferringToken={transferringToken}
          handleMintToken={handleMintToken}
          handleBurnToken={handleBurnToken}
          handleTransferToken={handleTransferToken}
          handleTransferFromToken={handleTransferFromToken}
          message={message}
        />
      )}
      
      {/* Logs */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '1rem', 
        borderRadius: '4px',
        maxHeight: '300px',
        overflow: 'auto',
        marginTop: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h4 style={{ margin: 0, color: 'black' }}>Deployment Logs</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={clearLogs}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '4px 8px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Logs
            </Button>
          </div>
        </div>
        {logs.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            No logs yet. Actions will appear here.
          </div>
        ) : (
          logs.map((log, index) => (
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
          ))
        )}
      </div>
    </div>
  );
};

export default EasyDeployPhase;