import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import AdvancedNav from '../AdvancedNav';
import DeployCoreContractsTab from './advanced/steps/DeployCoreContractsTab';
import InitializeContractsTab from './advanced/steps/InitializeContractsTab';
import ConfigureIdentityRegistryTab from './advanced/steps/ConfigureIdentityRegistryTab';
import AddClaimTopicsTab from './advanced/steps/AddClaimTopicsTab';
import UserManagementTab from './advanced/steps/UserManagementTab';
import TokenManagementTab from './advanced/steps/TokenManagementTab';

const STORAGE_KEY = 'trex_advanced_phase_state';

const AdvancedPhase = () => {
  const [advancedPhase, setAdvancedPhase] = useState('deployment');
  const [phaseComplete, setPhaseComplete] = useState({});
  const [deployedContracts, setDeployedContracts] = useState({});
  const [selectedContracts, setSelectedContracts] = useState({});
  const [deploying, setDeploying] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);

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

  // Load state from storage
  const loadState = () => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setDeployedContracts(parsedState.contracts || {});
        setSelectedContracts(parsedState.selectedContracts || {});
        setPhaseComplete(parsedState.phaseComplete || {});
        addLog("Loaded advanced phase state from storage", "info");
      }
    } catch (error) {
      console.error("Error loading advanced phase state:", error);
      addLog("Error loading advanced phase state", "error");
    }
  };

  // Save state to storage
  const saveState = () => {
    try {
      const state = {
        contracts: deployedContracts,
        selectedContracts: selectedContracts,
        phaseComplete: phaseComplete
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving advanced phase state:", error);
    }
  };

  // Contract interaction function using new API
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

  // Reload deployment state from backend
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

  // Deploy contract function
  const deployContract = async (contractName) => {
    try {
      setDeploying(true);
      setMessage(`Deploying ${contractName}...`);
      addLog(`Starting deployment of ${contractName} via backend API`, "info");

      const result = await contractInteraction('deploy', { contractName });
      
      console.log(`${contractName} deployed at:`, result.contractAddress);
      addLog(`${contractName} deployed successfully at ${result.contractAddress}`, "success");
      addLog(`Transaction hash: ${result.transactionHash}`, "info");
      
      // Update deployed contracts
      setDeployedContracts(prev => ({
        ...prev,
        [contractName]: [...(prev[contractName] || []), result.contractAddress]
      }));
      
      setMessage(`${contractName} deployed successfully at ${result.contractAddress}`);
      
      await reloadDeploymentState(); // Reload from backend
      
      // Mark deployment phase as complete if all core contracts are deployed
      const coreContracts = ['ClaimTopicsRegistry', 'TrustedIssuersRegistry', 'IdentityRegistryStorage', 'IdentityRegistry', 'ModularCompliance'];
      const deployedCoreContracts = coreContracts.filter(contract => 
        deployedContracts[contract] && deployedContracts[contract].length > 0
      );
      
      if (deployedCoreContracts.length === coreContracts.length) {
        setPhaseComplete(prev => ({ ...prev, deployment: true }));
        addLog("All core contracts deployed - deployment phase complete!", "success");
      }
      
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

  // Initialize contract function
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
      
      // Mark initialization phase as complete if all contracts are initialized
      const coreContracts = ['ClaimTopicsRegistry', 'TrustedIssuersRegistry', 'IdentityRegistryStorage', 'IdentityRegistry', 'ModularCompliance'];
      setPhaseComplete(prev => ({ ...prev, initialization: true }));
      addLog("All contracts initialized - initialization phase complete!", "success");
      
    } catch (error) {
      console.error(`Error initializing ${contractName}:`, error);
      const cleanError = extractCleanError(error);
      setMessage(`Error initializing ${contractName}: ${cleanError}`);
      addLog(`Error initializing ${contractName}: ${cleanError}`, "error");
    } finally {
      setInitializing(false);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Clear all state
  const clearState = () => {
    setDeployedContracts({});
    setSelectedContracts({});
    setPhaseComplete({});
    setMessage('');
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY);
    addLog("Cleared all advanced phase state", "info");
  };

  // Save state whenever it changes
  useEffect(() => {
    saveState();
  }, [deployedContracts, selectedContracts, phaseComplete]);

  // Load state on component mount
  useEffect(() => {
    loadState();
    reloadDeploymentState();
  }, []);

  // Render current phase
  const renderCurrentPhase = () => {
    const commonProps = {
      deployedContracts,
      selectedContracts,
      setSelectedContracts,
      deploying,
      initializing,
      message,
      addLog,
      deployContract,
      initializeContract
    };

    switch (advancedPhase) {
      case 'deployment':
        return <DeployCoreContractsTab {...commonProps} />;
      case 'initialization':
        return <InitializeContractsTab {...commonProps} />;
      case 'agentManagement':
        return <ConfigureIdentityRegistryTab {...commonProps} />;
      case 'claimTopics':
        return <AddClaimTopicsTab {...commonProps} />;
      case 'trustedIssuers':
        return <div><h3>Trusted Issuers Management</h3><p>Coming soon...</p></div>;
      case 'claimIssuers':
        return <div><h3>Claim Issuers Management</h3><p>Coming soon...</p></div>;
      case 'users':
        return <UserManagementTab {...commonProps} />;
      case 'token':
        return <TokenManagementTab {...commonProps} />;
      case 'logs':
        return (
          <div>
            <h3>System Logs</h3>
            <div style={{ 
              height: '400px', 
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
            <button onClick={clearLogs} style={{ marginTop: '10px', padding: '5px 10px' }}>
              Clear Logs
            </button>
          </div>
        );
      default:
        return <div><h3>Unknown Phase</h3></div>;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Advanced T-REX Deployment</h1>
      
      {/* Navigation */}
      <AdvancedNav 
        advancedPhase={advancedPhase} 
        setAdvancedPhase={setAdvancedPhase} 
        phaseComplete={phaseComplete} 
      />

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

      {/* Current Phase Content */}
      <div style={{ marginBottom: '20px' }}>
        {renderCurrentPhase()}
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

      {/* Clear State Button */}
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={clearState}
          style={{ 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Clear All State
        </button>
      </div>
    </div>
  );
};

export default AdvancedPhase; 