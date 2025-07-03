import React, { useState, useEffect } from "react";
import { useEthers, useContractFunction } from "@usedapp/core";
import { Contract } from "@ethersproject/contracts";
import { addresses, abis } from "@my-app/contracts";
import { Button, Container } from "./components";
import axios from "axios";

const Dashboard = () => {
  const { account } = useEthers();
  const [deployedAddresses, setDeployedAddresses] = useState({});
  const [tokenDetails, setTokenDetails] = useState({
    name: "",
    symbol: "",
    decimals: 18,
    totalSupply: "1000000"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [factories, setFactories] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [deploymentDetails, setDeploymentDetails] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  
  // New state for sidebar and advanced mode
  const [activeMode, setActiveMode] = useState("easy"); // "easy" or "advanced"
  const [advancedPhase, setAdvancedPhase] = useState("components"); // "components", "users", "token", "logs"
  const [logs, setLogs] = useState([]);
  const [deployedComponents, setDeployedComponents] = useState({});

  // Contract instances
  const trexFactory = new Contract(addresses.TREXFactory, abis.TREXFactory);

  // Contract functions
  const { send: deployFactory, state: factoryState } = useContractFunction(trexFactory, "deployTREXSuite", {
    transactionName: "Deploy TREX Factory",
  });

  const { send: deployToken, state: tokenState } = useContractFunction(trexFactory, "deployTREXSuite", {
    transactionName: "Deploy Token",
  });

  // Load deployed addresses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("trexDeployedAddresses");
    if (saved) {
      setDeployedAddresses(JSON.parse(saved));
    }
  }, []);

  // Load factories from API
  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async () => {
    try {
      const response = await axios.get('/api/factories');
      setFactories(response.data);
      if (response.data.length > 0) {
        setSelectedFactory(response.data[0]);
        loadDeploymentDetails(response.data[0].deploymentId);
      }
    } catch (error) {
      console.error('Error loading factories:', error);
    }
  };

  const loadDeploymentDetails = async (deploymentId) => {
    try {
      const response = await axios.get(`/api/deployments/${deploymentId}`);
      setDeploymentDetails(response.data);
    } catch (error) {
      console.error('Error loading deployment details:', error);
    }
  };

  const handleFactoryChange = (factory) => {
    setSelectedFactory(factory);
    loadDeploymentDetails(factory.deploymentId);
  };

  // Save deployed addresses to localStorage
  const saveDeployedAddresses = (newAddresses) => {
    const updated = { ...deployedAddresses, ...newAddresses };
    setDeployedAddresses(updated);
    localStorage.setItem("trexDeployedAddresses", JSON.stringify(updated));
  };

  // Reset selectedToken when deploymentDetails changes
  useEffect(() => {
    setSelectedToken(null);
  }, [deploymentDetails]);

  // Add log entry
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    setLogs(prev => [...prev, logEntry]);
  };

  // Deploy Factory (Easy Mode)
  const handleDeployFactory = async () => {
    if (!account) {
      setMessage("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setMessage("Deploying TREX Factory...");
    addLog("Starting factory deployment...", "info");
    
    try {
      const response = await axios.post('/api/deploy/factory');
      
      if (response.data.success) {
        setMessage("Factory deployed successfully! Refreshing...");
        addLog("Factory deployed successfully!", "success");
        await loadFactories();
      } else {
        setMessage("Factory deployment failed: " + response.data.error);
        addLog("Factory deployment failed: " + response.data.error, "error");
      }
    } catch (error) {
      setMessage("Factory deployment failed: " + error.message);
      addLog("Factory deployment failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Deploy Token (Easy Mode)
  const handleDeployToken = async () => {
    if (!account) {
      setMessage("Please connect your wallet first");
      return;
    }

    if (!selectedFactory) {
      setMessage("Please select a factory first");
      return;
    }

    if (!tokenDetails.name || !tokenDetails.symbol) {
      setMessage("Please fill in token name and symbol");
      return;
    }

    setLoading(true);
    setMessage("Deploying Token...");
    addLog("Starting token deployment...", "info");
    
    try {
      const response = await axios.post('/api/deploy/token', {
        factoryAddress: selectedFactory.address,
        tokenDetails
      });
      
      if (response.data.success) {
        setMessage("Token deployed successfully! Refreshing...");
        addLog("Token deployed successfully!", "success");
        await loadFactories();
        if (selectedFactory) {
          await loadDeploymentDetails(selectedFactory.deploymentId);
        }
      } else {
        setMessage("Token deployment failed: " + response.data.error);
        addLog("Token deployment failed: " + response.data.error, "error");
      }
    } catch (error) {
      setMessage("Token deployment failed: " + error.message);
      addLog("Token deployment failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Clear all addresses
  const handleClearAddresses = async () => {
    if (window.confirm("Are you sure you want to clear all deployed addresses?")) {
      try {
        const response = await axios.delete('/api/addresses');
        setDeployedAddresses({});
        setDeployedComponents({});
        setMessage(response.data.message || "Addresses cleared!");
        addLog("All addresses and components cleared", "info");
        await loadFactories();
        window.location.reload();
      } catch (error) {
        setMessage("Failed to clear addresses: " + (error.response?.data?.error || error.message));
        addLog("Failed to clear addresses: " + error.message, "error");
      }
    }
  };

  // Advanced Mode Functions
  const deployComponent = async (componentName) => {
    addLog(`Deploying ${componentName}...`, "info");
    setLoading(true);
    
    try {
      // Simulate deployment for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      setDeployedComponents(prev => ({
        ...prev,
        [componentName]: mockAddress
      }));
      addLog(`${componentName} deployed successfully at ${mockAddress}`, "success");
    } catch (error) {
      addLog(`Failed to deploy ${componentName}: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Sidebar Component
  const Sidebar = () => (
    <div style={{
      width: "250px",
      backgroundColor: "#1a237e",
      color: "white",
      height: "100vh",
      padding: "2rem 0",
      position: "fixed",
      left: 0,
      top: 0
    }}>
      <div style={{ padding: "0 1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>T-REX Admin</h2>
      </div>
      
      <div style={{ padding: "0 1.5rem" }}>
        <div
          onClick={() => setActiveMode("easy")}
          style={{
            padding: "1rem",
            marginBottom: "0.5rem",
            cursor: "pointer",
            backgroundColor: activeMode === "easy" ? "#3949ab" : "transparent",
            borderRadius: "8px",
            transition: "background-color 0.2s"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Easy Deploy</h3>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", opacity: 0.8 }}>
            Quick factory and token deployment
          </p>
        </div>
        
        <div
          onClick={() => setActiveMode("advanced")}
          style={{
            padding: "1rem",
            cursor: "pointer",
            backgroundColor: activeMode === "advanced" ? "#3949ab" : "transparent",
            borderRadius: "8px",
            transition: "background-color 0.2s"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Advanced</h3>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", opacity: 0.8 }}>
            Component-first deployment workflow
          </p>
        </div>
      </div>
    </div>
  );

  // Easy Deploy Component
  const EasyDeploy = () => (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "2rem" }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>Easy Deploy Dashboard</h2>
        <Button 
          onClick={handleClearAddresses}
          style={{ backgroundColor: "#dc3545", color: "white" }}
        >
          Clear Addresses
        </Button>
      </div>
      
      <p style={{ color: '#666', marginBottom: "2rem" }}>Connected: {account}</p>

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
            disabled={loading}
            style={{ backgroundColor: "#007bff", color: "white", minWidth: 160 }}
          >
            Deploy Factory
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
        
        <div style={{ marginTop: "1rem" }}>
          <Button 
            onClick={handleDeployToken}
            disabled={loading || !selectedFactory}
            style={{ 
              backgroundColor: !selectedFactory ? "#ccc" : "#28a745",
              color: "white",
              padding: "0.75rem 2rem"
            }}
          >
            Deploy Token
          </Button>
        </div>
      </div>
    </div>
  );

  // Advanced Mode Navigation
  const AdvancedNav = () => (
    <div style={{ 
      display: "flex", 
      gap: "1rem", 
      marginBottom: "2rem",
      padding: "1rem",
      backgroundColor: "#f0f8ff",
      borderRadius: "8px",
      border: "1px solid #b3d9ff"
    }}>
      {[
        { id: "components", label: "1. Deploy Components" },
        { id: "users", label: "2. Manage Users" },
        { id: "token", label: "3. Deploy Token" },
        { id: "logs", label: "4. Logs" }
      ].map(phase => (
        <Button
          key={phase.id}
          onClick={() => setAdvancedPhase(phase.id)}
          style={{
            backgroundColor: advancedPhase === phase.id ? "#1a237e" : "#6c757d",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem"
          }}
        >
          {phase.label}
        </Button>
      ))}
    </div>
  );

  // Advanced Components Phase
  const ComponentsPhase = () => (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deploy Components</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          "IdentityRegistry",
          "IdentityRegistryStorage", 
          "ClaimTopicsRegistry",
          "TrustedIssuersRegistry",
          "ModularCompliance"
        ].map(component => (
          <div key={component} style={{
            padding: "1rem",
            border: "1px solid #b3d9ff",
            borderRadius: "8px",
            backgroundColor: "#fafbff"
          }}>
            <h4 style={{ color: '#1a237e', margin: "0 0 1rem 0" }}>{component}</h4>
            {deployedComponents[component] ? (
              <div>
                <p style={{ color: '#28a745', margin: "0 0 0.5rem 0" }}>✅ Deployed</p>
                <p style={{ fontFamily: "monospace", fontSize: "0.8rem", color: '#666' }}>
                  {deployedComponents[component]}
                </p>
              </div>
            ) : (
              <Button
                onClick={() => deployComponent(component)}
                disabled={loading}
                style={{ backgroundColor: "#007bff", color: "white" }}
              >
                Deploy {component}
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {Object.keys(deployedComponents).length > 0 && (
        <div>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deployed Instances</h4>
          <div style={{ backgroundColor: "#f0f8ff", padding: "1rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
            {Object.entries(deployedComponents).map(([name, address]) => (
              <div key={name} style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: '#1a237e' }}>{name}:</strong> 
                <span style={{ fontFamily: "monospace", marginLeft: "0.5rem" }}>{address}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Advanced Users Phase
  const UsersPhase = () => (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Manage Users/Identities</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Actions</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Button style={{ backgroundColor: "#17a2b8", color: "white" }}>
              Add User Wallet
            </Button>
            <Button style={{ backgroundColor: "#6f42c1", color: "white" }}>
              Deploy ONCHAINID
            </Button>
            <Button style={{ backgroundColor: "#fd7e14", color: "white" }}>
              Assign Role
            </Button>
            <Button style={{ backgroundColor: "#20c997", color: "white" }}>
              Add Claim
            </Button>
          </div>
          
          <div style={{ marginTop: "2rem" }}>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Select Identity Registry:</label>
            <select style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
              <option>-- Select Identity Registry --</option>
              {deployedComponents.IdentityRegistry && (
                <option>{deployedComponents.IdentityRegistry}</option>
              )}
            </select>
          </div>
        </div>
        
        <div>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>User/Identity Details</h4>
          <div style={{ backgroundColor: "#f0f8ff", padding: "1rem", borderRadius: "8px", minHeight: "200px", border: "1px solid #b3d9ff" }}>
            <p style={{ color: '#666', fontStyle: "italic" }}>
              User and identity information will appear here after actions are performed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Advanced Token Phase
  const TokenPhase = () => (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deploy Token</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Token Details</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Token Name:</label>
              <input
                type="text"
                placeholder="My Security Token"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Token Symbol:</label>
              <input
                type="text"
                placeholder="MST"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Decimals:</label>
              <input
                type="number"
                defaultValue="18"
                min="0"
                max="18"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Total Supply:</label>
              <input
                type="text"
                placeholder="1000000"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>
          </div>
        </div>
        
        <div>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Select Components to Link</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Identity Registry:</label>
              <select style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                <option>-- Select Identity Registry --</option>
                {deployedComponents.IdentityRegistry && (
                  <option>{deployedComponents.IdentityRegistry}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Compliance:</label>
              <select style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                <option>-- Select Compliance --</option>
                {deployedComponents.ModularCompliance && (
                  <option>{deployedComponents.ModularCompliance}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Claim Topics Registry:</label>
              <select style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                <option>-- Select Claim Topics Registry --</option>
                {deployedComponents.ClaimTopicsRegistry && (
                  <option>{deployedComponents.ClaimTopicsRegistry}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Trusted Issuers Registry:</label>
              <select style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                <option>-- Select Trusted Issuers Registry --</option>
                {deployedComponents.TrustedIssuersRegistry && (
                  <option>{deployedComponents.TrustedIssuersRegistry}</option>
                )}
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: "2rem" }}>
            <Button 
              style={{ 
                backgroundColor: "#28a745", 
                color: "white",
                padding: "0.75rem 2rem",
                width: "100%"
              }}
            >
              Deploy Token
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Advanced Logs Phase
  const LogsPhase = () => (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Live Log Output</h3>
      <div style={{ 
        backgroundColor: "#1e1e1e", 
        color: "#fff", 
        padding: "1rem", 
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "0.9rem",
        height: "400px",
        overflowY: "auto"
      }}>
        {logs.length === 0 ? (
          <p style={{ color: '#666', fontStyle: "italic" }}>No logs yet. Actions will appear here.</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: "0.5rem",
              color: log.type === "error" ? "#ff6b6b" : 
                     log.type === "success" ? "#51cf66" : "#fff"
            }}>
              <span style={{ color: '#666' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Advanced Mode Component
  const AdvancedMode = () => (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "2rem" }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>Advanced Workflow</h2>
        <Button 
          onClick={handleClearAddresses}
          style={{ backgroundColor: "#dc3545", color: "white" }}
        >
          Clear All
        </Button>
      </div>
      
      <p style={{ color: '#666', marginBottom: "2rem" }}>Connected: {account}</p>

      <AdvancedNav />
      
      {advancedPhase === "components" && <ComponentsPhase />}
      {advancedPhase === "users" && <UsersPhase />}
      {advancedPhase === "token" && <TokenPhase />}
      {advancedPhase === "logs" && <LogsPhase />}
    </div>
  );

  return (
    <div style={{ backgroundColor: "#fafbff", minHeight: "100vh" }}>
      <Sidebar />
      {activeMode === "easy" ? <EasyDeploy /> : <AdvancedMode />}
    </div>
  );
};

export default Dashboard;