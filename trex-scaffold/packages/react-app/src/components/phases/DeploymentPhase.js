import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

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
        addLog("Loaded deployment state from storage", "info");
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

  // Save deployed token to storage
  const saveDeployedToken = (tokenDetails) => {
    setDeployedTokens(prev => {
      const updated = [...prev, tokenDetails];
      
      // Save to localStorage
      const savedState = localStorage.getItem(STORAGE_KEY);
      const parsedState = savedState ? JSON.parse(savedState) : {};
      const newState = {
        ...parsedState,
        tokens: updated
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      
      return updated;
    });
  };

  // Clear deployment state
  const clearDeploymentState = () => {
    setDeployedContracts({});
    setDeployedTokens([]);
    setSelectedContracts({});
    localStorage.removeItem(STORAGE_KEY);
    addLog("Cleared deployment state", "info");
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

  // Helper to reload deployment state from backend
  const reloadDeploymentState = async () => {
    try {
      const response = await axios.get('/api/contracts/state');
      if (response.data.success && response.data.deployment) {
        const deployment = response.data.deployment;
        
        // Update local state based on backend deployment data
        const newContracts = {};
        if (deployment.suite) {
          Object.keys(deployment.suite).forEach(key => {
            if (deployment.suite[key]) {
              newContracts[key.charAt(0).toUpperCase() + key.slice(1)] = [deployment.suite[key]];
            }
          });
        }
        if (deployment.factory) {
          newContracts.Factory = [deployment.factory.address];
        }
        
        setDeployedContracts(newContracts);
        addLog("Reloaded deployment state from backend", "info");
        
        // Auto-select latest contracts
        setTimeout(() => {
          autoSelectLatestContracts();
        }, 100);
      }
    } catch (error) {
      console.error("Error reloading deployment state:", error);
      addLog("Error reloading deployment state from backend", "error");
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
    addLog("Auto-selected latest deployed contracts", "info");
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
          try {
            const result = await contractInteraction('call', {
              contractName: contractType,
              contractAddress: address,
              method: 'isInitialized',
              params: []
            });
            status[contractType] = result.result;
          } catch (error) {
            status[contractType] = 'Error checking';
            addLog(`Error checking ${contractType} initialization: ${error.message}`, "error");
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

      const result = await contractInteraction('call', {
        contractName: 'ClaimTopicsRegistry',
        contractAddress: registryAddress,
        method: 'getClaimTopics',
        params: []
      });
      
      setAvailableClaimTopics(result.result || []);
      addLog(`Loaded ${result.result?.length || 0} claim topics`, "success");
    } catch (error) {
      console.error("Error loading claim topics:", error);
      const cleanError = extractCleanError(error);
      addLog(`Error loading claim topics: ${cleanError}`, "error");
    } finally {
      setLoadingClaimTopics(false);
    }
  };

  // Initialize contract using new API
  const initializeContract = async (contractName) => {
    try {
      setInitializing(true);
      setMessage(`Initializing ${contractName}...`);
      addLog(`Starting initialization of ${contractName} via backend API`, "info");

      const address = selectedContracts[contractName] || (deployedContracts[contractName] && deployedContracts[contractName][0]);
      
      if (!address) {
        throw new Error(`No ${contractName} found. Please deploy one first.`);
      }
      
      const result = await contractInteraction('initialize', {
        contractName,
        contractAddress: address
      });
      
      setMessage(`${contractName} initialized successfully`);
      addLog(`${contractName} initialized successfully`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
      await checkContractInitStatus();
    } catch (error) {
      console.error(`Error initializing ${contractName}:`, error);
      const cleanError = extractCleanError(error);
      setMessage(`Error initializing ${contractName}: ${cleanError}`);
      addLog(`Error initializing ${contractName}: ${cleanError}`, "error");
    } finally {
      setInitializing(false);
    }
  };

  // Load state on component mount
  useEffect(() => {
    loadDeploymentState();
    reloadDeploymentState();
  }, []);

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Deployment Phase</h1>
      
      {/* Step Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setCurrentStep(1)} 
          style={{ 
            marginRight: '10px', 
            backgroundColor: currentStep === 1 ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Step 1: Deploy Contracts
        </button>
        <button 
          onClick={() => setCurrentStep(2)} 
          style={{ 
            marginRight: '10px', 
            backgroundColor: currentStep === 2 ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Step 2: Initialize Contracts
        </button>
        <button 
          onClick={() => setCurrentStep(3)} 
          style={{ 
            backgroundColor: currentStep === 3 ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Step 3: Configure
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '5px',
          color: message.includes('Error') ? '#721c24' : '#155724'
        }}>
          {message}
        </div>
      )}

      {/* Step 1: Deploy Contracts */}
      {currentStep === 1 && (
        <div>
          <h2>Step 1: Deploy Core Contracts</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => deployContract('ClaimTopicsRegistry')}
              disabled={deploying}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              {deploying ? 'Deploying...' : 'Deploy ClaimTopicsRegistry'}
            </button>
            
            <button 
              onClick={() => deployContract('TrustedIssuersRegistry')}
              disabled={deploying}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              {deploying ? 'Deploying...' : 'Deploy TrustedIssuersRegistry'}
            </button>
            
            <button 
              onClick={() => deployContract('IdentityRegistry')}
              disabled={deploying}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              {deploying ? 'Deploying...' : 'Deploy IdentityRegistry'}
            </button>
            
            <button 
              onClick={() => deployContract('Compliance')}
              disabled={deploying}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              {deploying ? 'Deploying...' : 'Deploy Compliance'}
            </button>
          </div>

          {/* Deployed Contracts Display */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Deployed Contracts:</h3>
            {Object.entries(deployedContracts).map(([contractType, addresses]) => (
              <div key={contractType} style={{ marginBottom: '10px' }}>
                <strong>{contractType}:</strong> {addresses.join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Initialize Contracts */}
      {currentStep === 2 && (
        <div>
          <h2>Step 2: Initialize Contracts</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={checkContractInitStatus}
              disabled={checkingInitStatus}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              {checkingInitStatus ? 'Checking...' : 'Check Initialization Status'}
            </button>
          </div>

          {/* Initialization Status */}
          {Object.keys(contractInitStatus).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Initialization Status:</h3>
              {Object.entries(contractInitStatus).map(([contractType, status]) => (
                <div key={contractType} style={{ marginBottom: '10px' }}>
                  <strong>{contractType}:</strong> {status ? 'Initialized' : 'Not Initialized'}
                  {!status && (
                    <button 
                      onClick={() => initializeContract(contractType)}
                      disabled={initializing}
                      style={{ marginLeft: '10px' }}
                    >
                      {initializing ? 'Initializing...' : 'Initialize'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Configure */}
      {currentStep === 3 && (
        <div>
          <h2>Step 3: Configure Claim Topics</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => addClaimTopic(1)}
              disabled={deploying}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              Add Claim Topic 1
            </button>
            
            <button 
              onClick={() => addClaimTopic(2)}
              disabled={deploying}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              Add Claim Topic 2
            </button>
            
            <button 
              onClick={() => addClaimTopic(3)}
              disabled={deploying}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            >
              Add Claim Topic 3
            </button>
          </div>

          {/* Available Claim Topics */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Available Claim Topics:</h3>
            {loadingClaimTopics ? (
              <div>Loading claim topics...</div>
            ) : (
              <div>
                {availableClaimTopics.length > 0 ? (
                  availableClaimTopics.map(topic => (
                    <span key={topic} style={{ 
                      marginRight: '10px', 
                      padding: '5px 10px', 
                      backgroundColor: '#e9ecef', 
                      borderRadius: '15px' 
                    }}>
                      {topic}
                      <button 
                        onClick={() => removeClaimTopic(topic)}
                        disabled={deploying}
                        style={{ marginLeft: '5px', border: 'none', background: 'none', color: 'red', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <div>No claim topics available</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>Logs</h3>
          <button onClick={clearLogs} style={{ padding: '5px 10px' }}>
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

      {/* Clear State Button */}
      <div style={{ marginTop: '20px' }}>
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
    </div>
  );
};

export default DeploymentPhase; 