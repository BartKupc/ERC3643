import React, { useState, useEffect } from "react";
import { useEthers } from "@usedapp/core";
import { Button, Container } from "./components";
import axios from "axios";
import AdvancedDashboard from "./AdvancedDashboard";

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
  const [activeMode, setActiveMode] = useState("easy"); // "easy" or "advanced"

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

  // Clear all addresses
  const handleClearAddresses = async () => {
    if (window.confirm("Are you sure you want to clear all deployed addresses?")) {
      try {
        const response = await axios.delete('/api/addresses');
        setDeployedAddresses({});
        // Clear localStorage for advanced components as well
        localStorage.removeItem("trexDeployedComponents");
        setMessage(response.data.message || "Addresses cleared!");
        await loadFactories();
        window.location.reload();
      } catch (error) {
        setMessage("Failed to clear addresses: " + (error.response?.data?.error || error.message));
      }
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
    </div>
  );

  return (
    <div style={{ background: "#f4f8fb", minHeight: "100vh", width: "100vw" }}>
      <Container style={{ background: "#f4f8fb", minHeight: "100vh" }}>
        <Sidebar />
        {activeMode === "easy" ? <EasyDeploy /> : <AdvancedDashboard account={account} handleClearAddresses={handleClearAddresses} />}
      </Container>
    </div>
  );
};

export default Dashboard;