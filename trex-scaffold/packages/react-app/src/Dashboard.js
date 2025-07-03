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

  // Deploy Factory
  const handleDeployFactory = async () => {
    if (!account) {
      setMessage("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setMessage("Deploying TREX Factory...");
    
    try {
      // Call the backend to trigger factory deployment
      const response = await axios.post('/api/deploy/factory');
      
      if (response.data.success) {
        setMessage("Factory deployed successfully! Refreshing...");
        await loadFactories(); // Reload factories
      } else {
        setMessage("Factory deployment failed: " + response.data.error);
      }
    } catch (error) {
      setMessage("Factory deployment failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Deploy Token
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
    
    try {
      // Call the backend to trigger token deployment
      const response = await axios.post('/api/deploy/token', {
        factoryAddress: selectedFactory.address,
        tokenDetails
      });
      
      if (response.data.success) {
        setMessage("Token deployed successfully! Refreshing...");
        await loadFactories(); // Reload to get updated token list
        // Also reload deployment details for the selected factory
        if (selectedFactory) {
          await loadDeploymentDetails(selectedFactory.deploymentId);
        }
      } else {
        setMessage("Token deployment failed: " + response.data.error);
      }
    } catch (error) {
      setMessage("Token deployment failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update deployed addresses manually
  const handleUpdateAddresses = () => {
    const factoryAddress = prompt("Enter TREX Factory Address:");
    const tokenAddress = prompt("Enter Token Address:");
    
    if (factoryAddress || tokenAddress) {
      const newAddresses = {};
      if (factoryAddress) newAddresses.TREXFactory = factoryAddress;
      if (tokenAddress) newAddresses.Token = tokenAddress;
      saveDeployedAddresses(newAddresses);
      setMessage("Addresses updated!");
    }
  };

  // Clear all addresses
  const handleClearAddresses = async () => {
    if (window.confirm("Are you sure you want to clear all deployed addresses?")) {
      try {
        const response = await axios.delete('/api/addresses');
        setDeployedAddresses({});
        setMessage(response.data.message || "Addresses cleared!");
        await loadFactories(); // Refresh factories list
        window.location.reload();
      } catch (error) {
        setMessage("Failed to clear addresses: " + (error.response?.data?.error || error.message));
      }
    }
  };

  return (
    <Container>
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h2>T-REX Dashboard</h2>
        <p>Connected: {account}</p>

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

        {/* Factory Selection */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Factory Management</h3>
          {factories.length > 0 ? (
            <div style={{ marginBottom: "1rem" }}>
              <label>Select Factory:</label>
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
          ) : (
            <p>No factories deployed yet. Deploy your first factory below.</p>
          )}
        </div>

        {/* Deployment Details */}
        {deploymentDetails && (
          <div style={{ margin: "2rem 0" }}>
            <h3>Deployment Details</h3>
            <div style={{ 
              backgroundColor: "#f8f9fa", 
              padding: "1rem", 
              borderRadius: "8px",
              border: "1px solid #dee2e6"
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
                    <div style={{ marginTop: "1rem", background: "#f5f5f5", padding: "1rem", borderRadius: "6px" }}>
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

              {/* Deployed Tokens */}
              {deploymentDetails.tokens && deploymentDetails.tokens.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4>Deployed Tokens ({deploymentDetails.tokens.length})</h4>
                  {deploymentDetails.tokens.map((token, index) => (
                    <div key={index} style={{ 
                      backgroundColor: "white", 
                      padding: "0.75rem", 
                      margin: "0.5rem 0", 
                      borderRadius: "4px",
                      border: "1px solid #dee2e6"
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem", color: '#111' }}>
                        <div><strong style={{ color: '#1a237e' }}>Name:</strong> {token.token.name}</div>
                        <div><strong style={{ color: '#1a237e' }}>Symbol:</strong> {token.token.symbol}</div>
                        <div><strong style={{ color: '#1a237e' }}>Address:</strong> <span style={{ fontFamily: "monospace" }}>{token.token.address}</span></div>
                        <div><strong style={{ color: '#1a237e' }}>Deployed:</strong> {new Date(token.timestamp).toLocaleString()}</div>
                        <div><strong style={{ color: '#1a237e' }}>Identity Registry:</strong> <span style={{ fontFamily: "monospace" }}>{token.suite.identityRegistry}</span></div>
                        <div><strong style={{ color: '#1a237e' }}>Compliance:</strong> <span style={{ fontFamily: "monospace" }}>{token.suite.compliance}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            
            {/* Deploy Buttons */}
            <Button 
              onClick={handleDeployFactory}
              disabled={loading}
              style={{ 
                backgroundColor: "#007bff",
                color: "white"
              }}
            >
              Deploy Factory
            </Button>

            <Button 
              onClick={handleDeployToken}
              disabled={loading || !selectedFactory}
              style={{ 
                backgroundColor: !selectedFactory ? "#ccc" : "#28a745",
                color: "white"
              }}
            >
              Deploy Token
            </Button>

            {/* Management Buttons */}
            <Button 
              onClick={handleUpdateAddresses}
              style={{ backgroundColor: "#ffc107", color: "black" }}
            >
              Update Addresses
            </Button>

            <Button 
              onClick={handleClearAddresses}
              style={{ backgroundColor: "#dc3545", color: "white" }}
            >
              Clear Addresses
            </Button>
          </div>
        </div>

        {/* Token Details Form */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Token Configuration</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label>Token Name:</label>
              <input
                type="text"
                value={tokenDetails.name}
                onChange={(e) => setTokenDetails({...tokenDetails, name: e.target.value})}
                placeholder="My Security Token"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>
            <div>
              <label>Token Symbol:</label>
              <input
                type="text"
                value={tokenDetails.symbol}
                onChange={(e) => setTokenDetails({...tokenDetails, symbol: e.target.value})}
                placeholder="MST"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>
            <div>
              <label>Decimals:</label>
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
              <label>Total Supply:</label>
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

        {/* Quick Actions */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Quick Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            <Button style={{ backgroundColor: "#17a2b8", color: "white" }}>
              View Token Info
            </Button>
            <Button style={{ backgroundColor: "#6f42c1", color: "white" }}>
              Manage Compliance
            </Button>
            <Button style={{ backgroundColor: "#fd7e14", color: "white" }}>
              Identity Registry
            </Button>
            <Button style={{ backgroundColor: "#20c997", color: "white" }}>
              Transfer Tokens
            </Button>
          </div>
        </div>

        {/* Network Info */}
        <div style={{ margin: "2rem 0", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
          <h3>Network Information</h3>
          <p><strong style={{ color: '#1a237e' }}>Current Network:</strong> {window.ethereum?.networkVersion || "Unknown"}</p>
          <p><strong style={{ color: '#1a237e' }}>Block Number:</strong> Loading...</p>
          <p><strong style={{ color: '#1a237e' }}>Gas Price:</strong> Loading...</p>
        </div>
      </div>
    </Container>
  );
};

export default Dashboard;