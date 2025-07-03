
import React, { useState, useEffect } from "react";
import { useEthers, useContractFunction } from "@usedapp/core";
import { Contract } from "@ethersproject/contracts";
import { addresses, abis } from "@my-app/contracts";
import { Button, Container } from "./components";

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

  // Save deployed addresses to localStorage
  const saveDeployedAddresses = (newAddresses) => {
    const updated = { ...deployedAddresses, ...newAddresses };
    setDeployedAddresses(updated);
    localStorage.setItem("trexDeployedAddresses", JSON.stringify(updated));
  };

  // Deploy Factory
  const handleDeployFactory = async () => {
    setLoading(true);
    setMessage("Deploying TREX Factory...");
    
    try {
      // This would need to be implemented based on your deployment script
      setMessage("Factory deployment not yet implemented - use npm run deploy:factory");
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Deploy Token
  const handleDeployToken = async () => {
    if (!deployedAddresses.TREXFactory) {
      setMessage("Please deploy factory first");
      return;
    }

    setLoading(true);
    setMessage("Deploying Token...");
    
    try {
      // This would need to be implemented based on your deployment script
      setMessage("Token deployment not yet implemented - use npm run deploy:token");
    } catch (error) {
      setMessage(`Error: ${error.message}`);
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
  const handleClearAddresses = () => {
    if (window.confirm("Are you sure you want to clear all deployed addresses?")) {
      setDeployedAddresses({});
      localStorage.removeItem("trexDeployedAddresses");
      setMessage("Addresses cleared!");
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
            backgroundColor: message.includes("Error") ? "#fee" : "#efe",
            border: `1px solid ${message.includes("Error") ? "#fcc" : "#cfc"}`,
            borderRadius: "4px"
          }}>
            {message}
          </div>
        )}

        {/* Deployed Addresses */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Deployed Contracts</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <strong>TREX Factory:</strong>
              <div style={{ 
                padding: "0.5rem", 
                backgroundColor: "#f5f5f5", 
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.9rem"
              }}>
                {deployedAddresses.TREXFactory || "Not deployed"}
              </div>
            </div>
            <div>
              <strong>Token:</strong>
              <div style={{ 
                padding: "0.5rem", 
                backgroundColor: "#f5f5f5", 
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.9rem"
              }}>
                {deployedAddresses.Token || "Not deployed"}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ margin: "2rem 0" }}>
          <h3>Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            
            {/* Deploy Buttons */}
            <Button 
              onClick={handleDeployFactory}
              disabled={loading || !!deployedAddresses.TREXFactory}
              style={{ 
                backgroundColor: deployedAddresses.TREXFactory ? "#ccc" : "#007bff",
                color: "white"
              }}
            >
              {deployedAddresses.TREXFactory ? "Factory Deployed" : "Deploy Factory"}
            </Button>

            <Button 
              onClick={handleDeployToken}
              disabled={loading || !deployedAddresses.TREXFactory}
              style={{ 
                backgroundColor: !deployedAddresses.TREXFactory ? "#ccc" : "#28a745",
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
          <p><strong>Current Network:</strong> {window.ethereum?.networkVersion || "Unknown"}</p>
          <p><strong>Block Number:</strong> Loading...</p>
          <p><strong>Gas Price:</strong> Loading...</p>
        </div>
      </div>
    </Container>
  );
};

export default Dashboard;