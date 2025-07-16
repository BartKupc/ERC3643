import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Button, 
  createLoggingUtils, 
  loadDeploymentState, 
  clearDeploymentState 
} from './shared';

const EasyDeployPhase = () => {
  // State management
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
    name: "MySecurityToken",
    symbol: "MST",
    decimals: 18,
    totalSupply: "1000000"
  });

  // Initialize logging utilities
  const { addLog, clearLogs } = createLoggingUtils(setLogs);

  // Load deployment details
  const loadDeploymentDetails = async (deploymentId) => {
    try {
      addLog(`Loading deployment details for: ${deploymentId}`, "info");
      const response = await axios.get(`/api/deployments/${deploymentId}`);
      setDeploymentDetails(response.data);
      addLog("Deployment details loaded successfully", "success");
    } catch (error) {
      console.error('Error loading deployment details:', error);
      addLog(`Error loading deployment details: ${error.message}`, "error");
    }
  };

  // Load deployment state from localStorage on component mount
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
    
    // Load factories from API
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
  }, []); // Only run once on mount

  // Handle factory change
  const handleFactoryChange = (factory) => {
    setSelectedFactory(factory);
    addLog(`Factory changed to: ${factory.address}`, "info");
    loadDeploymentDetails(factory.deploymentId);
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
      
      // Wait a moment for backend to update deployments.json
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
    
    setDeployingToken(true);
    setMessage("");
    addLog("Starting token deployment...", "info");
    addLog(`Using factory: ${selectedFactory.address}`, "info");
    addLog(`Token details: ${tokenDetails.name} (${tokenDetails.symbol})`, "info");
    
    try {
      addLog("Sending token deployment request to backend...", "info");
      const response = await axios.post('/api/deploy/token', {
        factoryAddress: selectedFactory.address,
        tokenDetails
      });
      
      addLog("Token deployment request sent successfully", "success");
      addLog("Waiting for backend to process deployment...", "info");
      
      // Wait a moment for backend to update deployments.json
      await new Promise(res => setTimeout(res, 1500));
      
      addLog("Loading updated factory list...", "info");
      const factoriesResponse = await axios.get('/api/factories');
      setFactories(factoriesResponse.data);
      
      // Reload deployment details to show the new token
      if (selectedFactory) {
        addLog("Reloading deployment details to show new token...", "info");
        await loadDeploymentDetails(selectedFactory.deploymentId);
        
        // Auto-select the newly deployed token
        if (response.data && response.data.tokenData) {
          addLog("Auto-selecting newly deployed token...", "info");
          setSelectedToken(response.data.tokenData);
        }
      }
      
      if (response.data && response.data.tokenAddress) {
        addLog(`Token deployed at: ${response.data.tokenAddress}`, "success");
      }
      
      setMessage("Token deployed successfully!");
      addLog("Token deployment completed successfully!", "success");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setMessage("Failed to deploy token: " + errorMessage);
      addLog(`Token deployment failed: ${errorMessage}`, "error");
    }
    setDeployingToken(false);
  };

  // Clear all data
  const handleClearAllData = async () => {
    if (window.confirm("Are you sure you want to clear all deployed addresses?")) {
      try {
        addLog("Clearing all deployed addresses...", "warning");
        const response = await axios.delete('/api/addresses');
        setDeployedContracts({});
        setFactories([]);
        setSelectedFactory(null);
        setDeploymentDetails(null);
        setSelectedToken(null);
        clearDeploymentState();
        setMessage(response.data.message || "Addresses cleared!");
        addLog("All addresses cleared successfully", "success");
        window.location.reload();
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        setMessage("Failed to clear addresses: " + errorMessage);
        addLog(`Failed to clear addresses: ${errorMessage}`, "error");
      }
    } else {
      addLog("Address clearing cancelled by user", "info");
    }
  };

  return (
    <div style={{ backgroundColor: 'white', color: 'black', padding: '2rem', marginLeft: '250px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: 'black' }}>Easy Deploy Dashboard</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button 
            onClick={clearLogs}
            style={{ backgroundColor: "#6c757d", color: "white" }}
          >
            Clear Logs
          </Button>
          <Button 
            onClick={handleClearAllData}
            style={{ backgroundColor: "#dc3545", color: "white" }}
          >
            Clear All Data
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div style={{ 
          padding: "1rem", 
          margin: "1rem 0", 
          backgroundColor: /fail|error|not found/i.test(message) ? "#d32f2f" : "#c8e6c9",
          color: /fail|error|not found/i.test(message) ? "#fff" : "#222",
          border: `1px solid ${/fail|error|not found/i.test(message) ? "#b71c1c" : "#388e3c"}`,
          borderRadius: "4px"
        }}>
          {message}
        </div>
      )}

      {/* Logs Section */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deployment Logs</h3>
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          border: "1px solid #dee2e6", 
          borderRadius: "8px", 
          padding: "1rem",
          maxHeight: "300px",
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: "0.85rem"
        }}>
          {logs.length === 0 ? (
            <div style={{ color: "#6c757d", fontStyle: "italic" }}>No logs yet. Start a deployment to see activity.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ 
                marginBottom: "0.5rem",
                padding: "0.25rem 0",
                borderBottom: index < logs.length - 1 ? "1px solid #e9ecef" : "none"
              }}>
                <span style={{ color: "#6c757d", marginRight: "0.5rem" }}>[{log.timestamp}]</span>
                <span style={{ 
                  color: log.type === "error" ? "#dc3545" : 
                         log.type === "success" ? "#28a745" : 
                         log.type === "warning" ? "#ffc107" : "#007bff"
                }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Factory Management */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Factory Management</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Select Factory:</label>
            <select
              value={selectedFactory?.deploymentId || ""}
              onChange={(e) => {
                const factory = factories.find(f => f.deploymentId === e.target.value);
                handleFactoryChange(factory);
              }}
              style={{ 
                width: "100%", 
                padding: "0.5rem", 
                marginTop: "0.25rem",
                fontSize: "0.9rem"
              }}
            >
              {factories.map((factory) => (
                <option key={factory.deploymentId} value={factory.deploymentId}>
                  {factory.address} - {factory.network} - {factory.tokenCount} tokens - {new Date(factory.timestamp).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleDeployFactory}
            disabled={deployingFactory}
            style={{ backgroundColor: "#007bff", color: "white", minWidth: 160 }}
          >
            {deployingFactory ? "Deploying..." : "Deploy New Factory"}
          </Button>
        </div>
      </div>

      {/* Deployment Details */}
      {deploymentDetails && (
        <div style={{ margin: "2rem 0" }}>
          <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deployment Details</h3>
          <div style={{ 
            backgroundColor: "#f0f8ff", 
            padding: "1rem", 
            borderRadius: "8px",
            border: "1px solid #b3d9ff"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <strong style={{ color: '#1a237e' }}>Factory Address:</strong>
                <div style={{ fontFamily: "monospace", fontSize: "0.9rem", wordBreak: "break-all", color: '#111' }}>
                  {deploymentDetails.factory.address}
                </div>
              </div>
              <div>
                <strong style={{ color: '#1a237e' }}>Deployment ID:</strong>
                <div style={{ color: '#111' }}>{deploymentDetails.deploymentId}</div>
              </div>
              <div>
                <strong style={{ color: '#1a237e' }}>Network:</strong>
                <div style={{ color: '#111' }}>{deploymentDetails.network}</div>
              </div>
              <div>
                <strong style={{ color: '#1a237e' }}>Deployed:</strong>
                <div style={{ color: '#111' }}>{new Date(deploymentDetails.timestamp).toLocaleString()}</div>
              </div>
            </div>

            {/* Token Dropdown and Details */}
            {deploymentDetails.tokens && deploymentDetails.tokens.length > 0 && (
              <div style={{ margin: "1rem 0" }}>
                <label><strong style={{ color: '#1a237e' }}>Select Token:</strong></label>
                <select
                  value={selectedToken ? selectedToken.deploymentId : ""}
                  onChange={e => {
                    const token = deploymentDetails.tokens.find(t => t.deploymentId === e.target.value);
                    setSelectedToken(token);
                  }}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", fontSize: "0.9rem" }}
                >
                  <option value="">-- Select a token --</option>
                  {deploymentDetails.tokens.map(token => (
                    <option key={token.deploymentId} value={token.deploymentId}>
                      {token.token.name} ({token.token.symbol}) - {token.token.address}
                    </option>
                  ))}
                </select>
                {selectedToken && (
                  <div style={{ marginTop: "1rem", background: "#f0f8ff", padding: "1rem", borderRadius: "6px", border: "1px solid #b3d9ff" }}>
                    <div><strong style={{ color: '#1a237e' }}>Name:</strong> <span style={{ color: '#111' }}>{selectedToken.token.name}</span></div>
                    <div><strong style={{ color: '#1a237e' }}>Symbol:</strong> <span style={{ color: '#111' }}>{selectedToken.token.symbol}</span></div>
                    <div><strong style={{ color: '#1a237e' }}>Address:</strong> <span style={{ color: '#111' }}>{selectedToken.token.address}</span></div>
                    <div><strong style={{ color: '#1a237e' }}>Deployed:</strong> <span style={{ color: '#111' }}>{new Date(selectedToken.timestamp).toLocaleString()}</span></div>
                    <div><strong style={{ color: '#1a237e' }}>Identity Registry:</strong> <span style={{ color: '#111' }}>{selectedToken.suite.identityRegistry}</span></div>
                    <div><strong style={{ color: '#1a237e' }}>Compliance:</strong> <span style={{ color: '#111' }}>{selectedToken.suite.compliance}</span></div>
                  </div>
                )}
              </div>
            )}

            {/* Implementation Contracts */}
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ color: '#1a237e' }}>Implementation Contracts</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem", color: '#111' }}>
                <div><strong style={{ color: '#1a237e' }}>Token:</strong> <span style={{ fontFamily: "monospace" }}>{deploymentDetails.implementations.token}</span></div>
                <div><strong style={{ color: '#1a237e' }}>Identity Registry:</strong> <span style={{ fontFamily: "monospace" }}>{deploymentDetails.implementations.identityRegistry}</span></div>
                <div><strong style={{ color: '#1a237e' }}>Modular Compliance:</strong> <span style={{ fontFamily: "monospace" }}>{deploymentDetails.implementations.modularCompliance}</span></div>
                <div><strong style={{ color: '#1a237e' }}>Claim Topics Registry:</strong> <span style={{ fontFamily: "monospace" }}>{deploymentDetails.implementations.claimTopicsRegistry}</span></div>
                <div><strong style={{ color: '#1a237e' }}>Trusted Issuers Registry:</strong> <span style={{ fontFamily: "monospace" }}>{deploymentDetails.implementations.trustedIssuersRegistry}</span></div>
                <div><strong style={{ color: '#1a237e' }}>Identity Registry Storage:</strong> <span style={{ fontFamily: "monospace" }}>{deploymentDetails.implementations.identityRegistryStorage}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Configuration */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Token Configuration</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Token Name:</label>
            <input
              type="text"
              value={tokenDetails.name}
              onChange={(e) => setTokenDetails({...tokenDetails, name: e.target.value})}
              placeholder="My Security Token"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </div>
          <div>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Token Symbol:</label>
            <input
              type="text"
              value={tokenDetails.symbol}
              onChange={(e) => setTokenDetails({...tokenDetails, symbol: e.target.value})}
              placeholder="MST"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </div>
          <div>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Decimals:</label>
            <input
              type="number"
              value={tokenDetails.decimals}
              onChange={(e) => setTokenDetails({...tokenDetails, decimals: parseInt(e.target.value)})}
              min="0"
              max="18"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </div>
          <div>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Total Supply:</label>
            <input
              type="text"
              value={tokenDetails.totalSupply}
              onChange={(e) => setTokenDetails({...tokenDetails, totalSupply: e.target.value})}
              placeholder="1000000"
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </div>
        </div>
      </div>

      {/* Token Deployment */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deploy Token</h3>
        <div style={{ 
          padding: "1rem", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "8px",
          border: "1px solid #dee2e6"
        }}>
          <p style={{ marginBottom: "1rem", color: "#6c757d" }}>
            Deploy a new ERC-3643 token using the selected factory. The token will be created with the specified configuration.
          </p>
          <Button
            onClick={handleDeployToken}
            disabled={deployingToken || !selectedFactory}
            style={{ 
              backgroundColor: deployingToken || !selectedFactory ? "#6c757d" : "#28a745", 
              color: "white",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem"
            }}
          >
            {deployingToken ? "Deploying..." : "Deploy Token"}
          </Button>
          {!selectedFactory && (
            <div style={{ marginTop: "0.5rem", color: "#dc3545", fontSize: "0.9rem" }}>
              Please select a factory first
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EasyDeployPhase;