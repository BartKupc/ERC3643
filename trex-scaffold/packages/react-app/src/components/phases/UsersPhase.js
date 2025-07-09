import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const UsersPhase = ({ deployedComponents }) => {
  // State management
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ address: "", country: 0 });
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [userClaims, setUserClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedIdentityRegistry, setSelectedIdentityRegistry] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [availableClaimTopics, setAvailableClaimTopics] = useState([]);
  const [availableClaimIssuers, setAvailableClaimIssuers] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [onchainIdDetails, setOnchainIdDetails] = useState(null);
  // Claim issuance state
  const [issuingClaim, setIssuingClaim] = useState(false);
  const [selectedClaimIssuer, setSelectedClaimIssuer] = useState('');
  const [selectedClaimTopic, setSelectedClaimTopic] = useState('');
  
  // OnchainID options
  const [onchainIdOption, setOnchainIdOption] = useState("create"); // "create", "existing", "manual"
  const [existingOnchainIdAddress, setExistingOnchainIdAddress] = useState("");
  const [manualOnchainIdAddress, setManualOnchainIdAddress] = useState("");

  // Load available claim topics and trusted issuers when component mounts
  useEffect(() => {
    if (deployedComponents.ClaimTopicsRegistry) {
      loadClaimTopics();
    }
    if (deployedComponents.TrustedIssuersRegistry) {
      loadTrustedIssuers();
    }
  }, [deployedComponents]);

  // Load users and agents when identity registry is selected
  useEffect(() => {
    if (selectedIdentityRegistry) {
      loadUsers();
      loadAgents();
    } else {
      setAvailableAgents([]);
    }
  }, [selectedIdentityRegistry]);

  const loadAgents = async () => {
    try {
      const response = await axios.get(`/api/identity-registry/agents?address=${selectedIdentityRegistry}`);
      setAvailableAgents(response.data.agents || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      setAvailableAgents([]);
    }
  };

  // Load user claims when user is selected
  useEffect(() => {
    if (selectedUser && selectedIdentityRegistry) {
      loadUserClaims();
      loadOnchainIdDetails();
    }
  }, [selectedUser, selectedIdentityRegistry]);

  const loadOnchainIdDetails = async () => {
    try {
      // Find the user's OnchainID address
      const user = users.find(u => u.address === selectedUser);
      if (user && user.identity && user.identity !== '0x0000000000000000000000000000000000000000') {
        const response = await axios.get(`/api/onchainid/${user.identity}`);
        setOnchainIdDetails(response.data);
      } else {
        setOnchainIdDetails(null);
      }
    } catch (error) {
      console.error('Error loading OnchainID details:', error);
      setOnchainIdDetails(null);
    }
  };

  // Get all available Identity Registry components (including numbered versions)
  const getAvailableIdentityRegistries = () => {
    const registries = [];
    Object.keys(deployedComponents).forEach(key => {
      // Only include IdentityRegistry, not IdentityRegistryStorage
      if (key === 'IdentityRegistry' || key.match(/^IdentityRegistry_\d+$/)) {
        registries.push({
          name: key,
          address: deployedComponents[key]
        });
      }
    });
    return registries;
  };

  const loadClaimTopics = async () => {
    try {
      if (!deployedComponents.ClaimTopicsRegistry) {
        console.log('ClaimTopicsRegistry not deployed yet');
        setAvailableClaimTopics([]);
        return;
      }
      const response = await axios.get(`/api/claim-topics?registryAddress=${deployedComponents.ClaimTopicsRegistry}`);
      setAvailableClaimTopics(response.data);
    } catch (error) {
      console.error('Error loading claim topics:', error);
      setMessage("Failed to load claim topics: " + (error.response?.data?.error || error.message));
    }
  };

  // Load trusted issuers from backend
  const loadTrustedIssuers = async () => {
    try {
      if (!deployedComponents.TrustedIssuersRegistry) {
        setAvailableClaimIssuers([]);
        return;
      }
      const response = await axios.get(`/api/trusted-issuers?registryAddress=${deployedComponents.TrustedIssuersRegistry}`);
      setAvailableClaimIssuers(response.data);
    } catch (error) {
      console.error('Error loading trusted issuers:', error);
      setAvailableClaimIssuers([]);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/users?identityRegistryAddress=${selectedIdentityRegistry}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage("Failed to load users: " + error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserClaims = async () => {
    try {
      console.log('Loading claims for user:', selectedUser);
      console.log('Identity Registry:', selectedIdentityRegistry);
      
      const response = await axios.get(`/api/users/${selectedUser}/claims?identityRegistryAddress=${selectedIdentityRegistry}`);
      console.log('Claims API response:', response.data);
      
      setUserClaims(response.data);
      console.log('Set user claims:', response.data);
    } catch (error) {
      console.error('Error loading user claims:', error);
    }
  };

  const handleAddUser = async () => {
    if (!selectedIdentityRegistry) {
      setMessage("Please select an Identity Registry first");
      return;
    }
    if (!selectedAgent) {
      setMessage("Please select an agent first");
      return;
    }
    if (!newUser.address) {
      setMessage("Please enter a user address");
      return;
    }

    setLoading(true);
    
    // Declare variables at function scope for error handling
    let to, transactionData, signerAddress, from;
    
    try {
      // Get account from MetaMask directly
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const deployerAddress = accounts[0];
      
      if (!deployerAddress) {
        setMessage("Please connect your MetaMask wallet first");
        setLoading(false);
        return;
      }
      
      // Step 1: Get transaction data from backend
      const requestData = {
        userAddress: newUser.address,
        identityRegistryAddress: selectedIdentityRegistry,
        country: newUser.country,
        agentAddress: selectedAgent
      };
      
      // Add OnchainID information based on user selection
      if (onchainIdOption === "existing" && existingOnchainIdAddress) {
        requestData.existingOnchainIdAddress = existingOnchainIdAddress;
        console.log('Using existing OnchainID:', existingOnchainIdAddress);
      } else if (onchainIdOption === "manual" && manualOnchainIdAddress) {
        requestData.existingOnchainIdAddress = manualOnchainIdAddress;
        console.log('Using manual OnchainID:', manualOnchainIdAddress);
      } else {
        console.log('Creating new OnchainID for user');
      }
      
      console.log('Sending user registration request:', requestData);
      
      const response = await axios.post('/api/users', requestData);
      
      if (!response.data.success) {
        setMessage("Failed to prepare user registration: " + response.data.error);
        return;
      }
      
      // Check if we need to deploy OnchainID first
      if (response.data.onchainIdDeployment) {
        setMessage("Step 1: Deploying user OnchainID contract...");
        
        // Deploy OnchainID contract first
        const { transactionData: onchainIdTxData, from: onchainIdFrom, gas, gasPrice } = response.data.onchainIdDeployment;
        
        // Request MetaMask to sign the OnchainID deployment
        // The manager will deploy the OnchainID for the user
        const signerAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        signerAddress = signerAccounts[0];
        
        // Check if the signer is the agent (manager)
        if (!signerAddress || typeof signerAddress !== 'string' || !onchainIdFrom || typeof onchainIdFrom !== 'string') {
          setMessage("Invalid wallet addresses detected");
          return;
        }
        
        if (signerAddress.toLowerCase() !== onchainIdFrom.toLowerCase()) {
          setMessage(`Please switch MetaMask to the agent address: ${onchainIdFrom} to deploy the OnchainID`);
          return;
        }
        
        // Use the current signer (manager) to deploy the OnchainID
        // The OnchainID will be created with the user's address as the management key
        console.log('Deploying OnchainID for user with manager wallet:', signerAddress);
        
        // Deploy OnchainID using gas limits from backend
        const onchainIdTx = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            data: onchainIdTxData,
            from: signerAddress,
            gas: gas || '0x3D0900', // Use backend gas or default to 4,000,000
            gasPrice: gasPrice || '0x59682F00' // Use backend gas price or default to 1.5 gwei
          }]
        });
        
        console.log('OnchainID deployment transaction sent:', onchainIdTx);
        setMessage(`OnchainID deployment transaction sent! Hash: ${onchainIdTx}`);
        
        // Wait for OnchainID deployment confirmation
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const onchainIdReceipt = await provider.waitForTransaction(onchainIdTx);
        
        if (onchainIdReceipt.status === 1) {
          const onchainIdAddress = onchainIdReceipt.contractAddress;
          setMessage(`OnchainID deployed successfully at: ${onchainIdAddress}`);
          
          // Now register the user with the new OnchainID
          setMessage("Step 2: Registering user with OnchainID...");
          
          const userRegData = {
            userAddress: response.data.userRegistration.userAddress,
            identityRegistryAddress: response.data.userRegistration.registryAddress,
            country: response.data.userRegistration.countryCode,
            agentAddress: response.data.userRegistration.agentAddress,
            onchainIdAddress: onchainIdAddress
          };
          
          console.log('Sending user registration with OnchainID:', userRegData);
          
          const userRegResponse = await axios.post('/api/users/register-with-onchainid', userRegData);
          
          if (!userRegResponse.data.success) {
            setMessage("Failed to register user: " + userRegResponse.data.error);
            return;
          }
          
          // Register user with the new OnchainID
          ({ transactionData, to, from } = userRegResponse.data);
          
          // For user registration, we need to sign with the AGENT address (not the user address)
          if (!signerAddress || typeof signerAddress !== 'string' || !from || typeof from !== 'string') {
            setMessage("Invalid wallet addresses detected");
            return;
          }
          
          if (signerAddress.toLowerCase() !== from.toLowerCase()) {
            setMessage(`Please switch MetaMask to the agent address: ${from} to register the user`);
            return;
          }
          
          const userTx = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              to: to,
              data: transactionData,
              from: signerAddress,
              gas: '0x186A0',
              gasPrice: '0x59682F00'
            }]
          });
          
          console.log('User registration transaction sent:', userTx);
          setMessage(`User registration transaction sent! Hash: ${userTx}`);
          
          // Wait for user registration confirmation
          const userReceipt = await provider.waitForTransaction(userTx);
          
          if (userReceipt.status === 1) {
            setMessage(`User registered successfully with OnchainID! Transaction: ${userTx}`);
            // Reset form state
            setNewUser({ address: "", country: 0 });
            setShowAddUserForm(false);
            setOnchainIdOption("create");
            setExistingOnchainIdAddress("");
            setManualOnchainIdAddress("");
            
            // Reload users list from blockchain
            await loadUsers();
          } else {
            setMessage(`User registration failed! Hash: ${userTx}`);
          }
        } else {
          setMessage(`OnchainID deployment failed! Hash: ${onchainIdTx}`);
        }
      } else {
        // Direct user registration (existing OnchainID found)
        // Step 2: Sign transaction with MetaMask
        ({ transactionData, to, from } = response.data);
        
        // Request MetaMask to sign the transaction
        const signerAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        signerAddress = signerAccounts[0];
        
        if (!signerAddress || typeof signerAddress !== 'string' || !from || typeof from !== 'string') {
          setMessage("Invalid wallet addresses detected");
          return;
        }
        
        if (signerAddress.toLowerCase() !== from.toLowerCase()) {
          setMessage(`Please sign with the correct agent address: ${from}`);
          return;
        }
        
        // Send the transaction
        console.log('Sending transaction:', { to, data: transactionData, from: signerAddress });
        
        // First, try to estimate gas to see if the transaction would succeed
        try {
          const gasEstimate = await window.ethereum.request({
            method: 'eth_estimateGas',
            params: [{
              to: to,
              data: transactionData,
              from: signerAddress
            }]
          });
          console.log('Gas estimate:', gasEstimate);
        } catch (gasError) {
          console.error('Gas estimation failed:', gasError);
          setMessage("Transaction would fail: " + (gasError.data?.message || gasError.message));
          return;
        }
        
        const tx = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            to: to,
            data: transactionData,
            from: signerAddress,
            gas: '0x186A0', // 100,000 gas limit
            gasPrice: '0x59682F00' // 1.5 gwei
          }]
        });
        
        console.log('Transaction sent:', tx);
        setMessage(`User registration transaction sent! Hash: ${tx}`);
        
        // Wait for transaction confirmation
        setMessage("Waiting for transaction confirmation...");
        
        // Wait for the transaction to be mined
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const receipt = await provider.waitForTransaction(tx);
        
        if (receipt.status === 1) {
          setMessage(`User registered successfully! Transaction: ${tx}`);
          // Reset form state
          setNewUser({ address: "", country: 0 });
          setShowAddUserForm(false);
          setOnchainIdOption("create");
          setExistingOnchainIdAddress("");
          setManualOnchainIdAddress("");
          
          // Reload users list from blockchain
          await loadUsers();
        } else {
          setMessage(`Transaction failed! Hash: ${tx}`);
        }
      }
    } catch (error) {
      console.error('Error adding user:', error);
      
      // Handle different types of errors
      if (error.code === 4001) {
        setMessage("Transaction was rejected by user");
      } else if (error.code === -32603) {
        console.error('Transaction revert details:', error);
        // Try to get more details about the revert
        if (error.data) {
          setMessage("Transaction failed on blockchain: " + (error.data?.message || error.message));
        } else {
          setMessage("Transaction failed on blockchain: " + error.message);
        }
        
        // Log the transaction data for debugging
        console.log('Failed transaction data:', {
          to: to,
          data: transactionData,
          from: signerAddress,
          gas: '0x186A0',
          gasPrice: '0x59682F00'
        });
      } else if (error.response?.data?.error) {
        setMessage("Failed to add user: " + error.response.data.error);
      } else if (error.message) {
        setMessage("Failed to add user: " + error.message);
      } else {
        setMessage("Failed to add user: Unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };



  const handleLinkIdentity = async (onchainIdAddress) => {
    if (!selectedUser) {
      setMessage("Please select a user first");
      return;
    }

    setLoading(true);
    try {
      // Get account from MetaMask directly
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const signerAddress = accounts[0];
      
      if (!signerAddress) {
        setMessage("Please connect your MetaMask wallet first");
        setLoading(false);
        return;
      }
      
      // Create provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Prepare the identity update transaction
      const response = await axios.post(`/api/users/${selectedUser}/identity`, {
        onchainIdAddress,
        identityRegistryAddress: selectedIdentityRegistry,
        agentAddress: signerAddress
      });
      
      if (!response.data.success) {
        setMessage("Failed to prepare identity update: " + response.data.error);
        return;
      }
      
      const { transactionData, to, from } = response.data;
      
      // Check if the signer is the agent
      if (!signerAddress || typeof signerAddress !== 'string' || !from || typeof from !== 'string') {
        setMessage("Invalid wallet addresses detected");
        return;
      }
      
      if (signerAddress.toLowerCase() !== from.toLowerCase()) {
        setMessage(`Please switch MetaMask to the agent address: ${from} to update the user identity`);
        return;
      }
      
      setMessage("Signing identity update transaction...");
      
      // Send the transaction
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          to: to,
          data: transactionData,
          from: signerAddress,
          gas: '0x186A0', // 100,000 gas limit
          gasPrice: '0x59682F00' // 1.5 gwei
        }]
      });
      
      console.log('Identity update transaction sent:', tx);
      setMessage(`Identity update transaction sent! Hash: ${tx}`);
      
      // Wait for transaction confirmation
      const receipt = await provider.waitForTransaction(tx);
      
      if (receipt.status === 1) {
        setMessage(`User identity updated successfully! Transaction: ${tx}`);
        // Reload users list to show the updated identity
        await loadUsers();
      } else {
        setMessage(`Identity update failed! Hash: ${tx}`);
      }
    } catch (error) {
      console.error('Error updating user identity:', error);
      
      if (error.code === 4001) {
        setMessage("Transaction was rejected by user");
      } else if (error.code === -32603) {
        setMessage("Transaction failed on blockchain: " + (error.data?.message || error.message));
      } else if (error.response?.data?.error) {
        setMessage("Failed to update identity: " + error.response.data.error);
      } else if (error.message) {
        setMessage("Failed to update identity: " + error.message);
      } else {
        setMessage("Failed to update identity: Unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "2rem" }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>User Management</h2>
      </div>

      {/* Status Messages */}
      {message && (
        <div style={{ 
          padding: "1rem", 
          margin: "1rem 0", 
          backgroundColor: /fail|error/i.test(message) ? "#d32f2f" : "#c8e6c9",
          color: /fail|error/i.test(message) ? "#fff" : "#222",
          border: `1px solid ${/fail|error/i.test(message) ? "#b71c1c" : "#388e3c"}`,
          borderRadius: "4px"
        }}>
          {message}
        </div>
      )}

      {/* Identity Registry Selection */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Identity Registry</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Select Identity Registry:</label>
            <select
              value={selectedIdentityRegistry}
              onChange={(e) => setSelectedIdentityRegistry(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "0.5rem", 
                marginTop: "0.25rem",
                fontSize: "0.9rem"
              }}
            >
              <option value="">-- Select Identity Registry --</option>
              {getAvailableIdentityRegistries().map((registry, index) => (
                <option key={index} value={registry.address}>
                  {registry.name} - {registry.address.slice(0, 6)}...{registry.address.slice(-4)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {getAvailableIdentityRegistries().length === 0 && (
          <div style={{ 
            marginTop: "1rem",
            padding: "1rem", 
            backgroundColor: "#fff3cd", 
            borderRadius: "8px", 
            border: "1px solid #ffeaa7",
            color: "#856404"
          }}>
            <p style={{ margin: "0 0 0.5rem 0" }}>
              <strong>No Identity Registry deployed yet.</strong>
            </p>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              Please go to Phase 1 (Components) and deploy an Identity Registry first. Users are stored in the Identity Registry contract.
            </p>
          </div>
        )}
      </div>

      {selectedIdentityRegistry && (
        <>
          {/* User List - Show first */}
          <div style={{ margin: "2rem 0" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "1rem" }}>
              <h3 style={{ color: '#1a237e', margin: 0 }}>Registered Users</h3>
              <button
                onClick={() => setShowAddUserForm(true)}
                style={{ 
                  backgroundColor: "#28a745", 
                  color: "white", 
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                + Add New User
              </button>
            </div>
            
            {loading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={{ 
                padding: "2rem", 
                backgroundColor: "#f8f9fa", 
                borderRadius: "8px", 
                border: "1px solid #dee2e6",
                textAlign: "center"
              }}>
                <p style={{ color: '#666', marginBottom: "1rem" }}>No users registered in this Identity Registry yet.</p>
                <button
                  onClick={() => setShowAddUserForm(true)}
                  style={{ 
                    backgroundColor: "#007bff", 
                    color: "white", 
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Add First User
                </button>
              </div>
            ) : (
              <div style={{ 
                backgroundColor: "#f0f8ff", 
                padding: "1rem", 
                borderRadius: "8px",
                border: "1px solid #b3d9ff"
              }}>
                {users.map((user, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedUser(user.address)}
                    style={{
                      padding: "1rem",
                      margin: "0.5rem 0",
                      backgroundColor: selectedUser === user.address ? "#e3f2fd" : "#fff",
                      border: "1px solid #b3d9ff",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <strong style={{ color: '#1a237e', fontSize: '1.3rem' }}>Address:</strong>
                        <div style={{ fontFamily: "monospace", fontSize: "1.3rem", color: "#000", fontWeight: "500" }}>{user.address}</div>
                      </div>
                      <div>
                        <strong style={{ color: '#1a237e', fontSize: '1.3rem' }}>Country:</strong>
                        <div style={{ fontSize: "1.3rem", color: "#000", fontWeight: "500" }}>{user.country}</div>
                      </div>
                      <div>
                        <strong style={{ color: '#1a237e', fontSize: '1.3rem' }}>OnchainID:</strong>
                        <div style={{ fontFamily: "monospace", fontSize: "1.3rem", color: "#000", fontWeight: "500" }}>
                          {user.identity === "0x0000000000000000000000000000000000000000" ? (
                            <span style={{ color: "#dc3545" }}>Not linked</span>
                          ) : (
                            <span style={{ color: "#28a745" }}>✓ Linked</span>
                          )}
                        </div>
                        {user.identity !== "0x0000000000000000000000000000000000000000" && (
                          <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                            {user.identity}
                          </div>
                        )}
                      </div>
                      <div>
                        <strong style={{ color: '#1a237e', fontSize: '1.3rem' }}>Verified:</strong>
                        <div style={{ fontSize: "1.3rem", color: "#000", fontWeight: "500" }}>{user.isVerified ? "Yes" : "No"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add User Section - Show when adding new user */}
          {showAddUserForm && (
            <div style={{ margin: "2rem 0" }}>
              <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Add New User</h3>
              <div style={{ 
                backgroundColor: "#f0f8ff", 
                padding: "1.5rem", 
                borderRadius: "8px",
                border: "1px solid #b3d9ff"
              }}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Agent Address:</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                  >
                    <option value="">-- Select Agent --</option>
                    {availableAgents.length === 0 ? (
                      <option value="" disabled>No agents available</option>
                    ) : (
                      availableAgents.map((agent, index) => (
                        <option key={index} value={agent}>
                          {agent}
                        </option>
                      ))
                    )}
                  </select>
                  <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                    {availableAgents.length === 0 ? (
                      <strong style={{ color: "#dc3545" }}>No agents available. Go to the Agent Management tab to add agents first.</strong>
                    ) : (
                      <strong>Available agents: {availableAgents.length}</strong>
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold' }}>User Address:</label>
                    <input
                      type="text"
                      value={newUser.address}
                      onChange={(e) => setNewUser({...newUser, address: e.target.value})}
                      placeholder="0x..."
                      style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                    />
                    <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                      <strong>Example addresses for testing:</strong><br/>
                      • 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Account #1)<br/>
                      • 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Account #2)<br/>
                      • 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (Account #3)<br/>
                      • 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (Account #4)<br/>
                      • 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc (Account #5)
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Country Code:</label>
                    <input
                      type="number"
                      value={newUser.country}
                      onChange={(e) => setNewUser({...newUser, country: parseInt(e.target.value)})}
                      placeholder="0"
                      style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                    />
                    <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                      <strong>Common country codes:</strong><br/>
                      • 1 = United States<br/>
                      • 44 = United Kingdom<br/>
                      • 33 = France<br/>
                      • 49 = Germany<br/>
                      • 0 = Unknown/Not specified
                    </div>
                  </div>
                </div>
                
                {/* OnchainID Options */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ color: '#1a237e', fontWeight: 'bold' }}>OnchainID Options:</label>
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <input
                        type="radio"
                        id="create-onchainid"
                        name="onchainIdOption"
                        value="create"
                        checked={onchainIdOption === "create"}
                        onChange={(e) => setOnchainIdOption(e.target.value)}
                      />
                      <label htmlFor="create-onchainid" style={{ marginLeft: "0.5rem", color: "#000" }}>
                        <strong>Create new OnchainID</strong> (Manager will deploy OnchainID for user)
                      </label>
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <input
                        type="radio"
                        id="existing-onchainid"
                        name="onchainIdOption"
                        value="existing"
                        checked={onchainIdOption === "existing"}
                        onChange={(e) => setOnchainIdOption(e.target.value)}
                      />
                      <label htmlFor="existing-onchainid" style={{ marginLeft: "0.5rem", color: "#000" }}>
                        <strong>Use existing OnchainID</strong> (User already has an OnchainID)
                      </label>
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <input
                        type="radio"
                        id="manual-onchainid"
                        name="onchainIdOption"
                        value="manual"
                        checked={onchainIdOption === "manual"}
                        onChange={(e) => setOnchainIdOption(e.target.value)}
                      />
                      <label htmlFor="manual-onchainid" style={{ marginLeft: "0.5rem", color: "#000" }}>
                        <strong>Enter OnchainID address manually</strong>
                      </label>
                    </div>
                  </div>
                  
                  {/* Conditional inputs based on selection */}
                  {onchainIdOption === "existing" && (
                    <div style={{ marginTop: "1rem" }}>
                      <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Existing OnchainID Address:</label>
                      <input
                        type="text"
                        value={existingOnchainIdAddress}
                        onChange={(e) => setExistingOnchainIdAddress(e.target.value)}
                        placeholder="0x..."
                        style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                      />
                      <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                        Enter the address of the user's existing OnchainID contract
                      </div>
                    </div>
                  )}
                  
                  {onchainIdOption === "manual" && (
                    <div style={{ marginTop: "1rem" }}>
                      <label style={{ color: '#1a237e', fontWeight: 'bold' }}>OnchainID Address:</label>
                      <input
                        type="text"
                        value={manualOnchainIdAddress}
                        onChange={(e) => setManualOnchainIdAddress(e.target.value)}
                        placeholder="0x..."
                        style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                      />
                      <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                        Enter the OnchainID contract address manually
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    onClick={handleAddUser}
                    disabled={loading}
                    style={{ 
                      backgroundColor: "#007bff", 
                      color: "white", 
                      padding: "0.5rem 1rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: loading ? "not-allowed" : "pointer"
                    }}
                  >
                    {loading ? "Adding..." : "Add User"}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddUserForm(false);
                      setNewUser({ address: "", country: 0 });
                      setOnchainIdOption("create");
                      setExistingOnchainIdAddress("");
                      setManualOnchainIdAddress("");
                    }}
                    style={{ 
                      backgroundColor: "#6c757d", 
                      color: "white", 
                      padding: "0.5rem 1rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Details and Claims */}
          {selectedUser && (
            <div style={{ margin: "2rem 0" }}>
              <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>User Details & Claims</h3>
              <div style={{ 
                backgroundColor: "#f0f8ff", 
                padding: "1.5rem", 
                borderRadius: "8px",
                border: "1px solid #b3d9ff"
              }}>
                <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Selected User: {selectedUser}</h4>

                {/* Add Claim Section */}
                <div style={{ marginBottom: "2rem" }}>
                  <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>Add Claim via Trusted Issuer</h5>
                  
                  {availableClaimIssuers.length === 0 ? (
                    <div style={{ 
                      padding: "1rem", 
                      backgroundColor: "#fff3cd", 
                      border: "1px solid #ffeaa7",
                      borderRadius: "4px",
                      color: "#856404"
                    }}>
                      <strong>No Trusted Issuers available.</strong> Please go to the Trusted Issuers tab to register trusted issuers first.
                    </div>
                  ) : (
                    <>
                      <div style={{ 
                        backgroundColor: "#f8f9fa", 
                        padding: "1rem", 
                        borderRadius: "4px",
                        border: "1px solid #dee2e6",
                        marginBottom: "1rem"
                      }}>
                        <p style={{ marginBottom: "1rem", color: "#666" }}>
                          <strong>Production Flow:</strong> Claims should be issued by trusted ClaimIssuer contracts, not manually added.
                        </p>
                        <div style={{ marginBottom: "1rem" }}>
                          <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Available Trusted Issuers:</label>
                          <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.5rem" }}>
                            {availableClaimIssuers.map(issuer => (
                              <div key={issuer.address} style={{
                                padding: "0.75rem",
                                backgroundColor: "#fff",
                                border: "1px solid #dee2e6",
                                borderRadius: "4px"
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#000" }}>
                                      {issuer.address}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "0.8rem", color: "#000" }}>
                                      <strong>Claim Topics:</strong>
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "#000" }}>
                                      {issuer.topics.map(topicId => {
                                        const topic = availableClaimTopics.find(t => t.id === topicId);
                                        return topic ? `${topic.name} - ${topic.description}` : `Topic ${topicId}`;
                                      }).join(', ')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Claim Issuance Form */}
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          if (!selectedUser) {
                            setMessage("Please select a user first");
                            return;
                          }
                          if (!selectedClaimIssuer) {
                            setMessage("Please select a Trusted Issuer");
                            return;
                          }
                          if (!selectedClaimTopic) {
                            setMessage("Please select a claim topic");
                            return;
                          }
                          setIssuingClaim(true);
                          setMessage("");
                          try {
                            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                            const deployerAddress = accounts[0];
                            const response = await axios.post(`/api/users/${selectedUser}/claims`, {
                              claimTopic: selectedClaimTopic,
                              identityRegistryAddress: selectedIdentityRegistry,
                              deployerAddress,
                              claimIssuerAddress: selectedClaimIssuer
                            });
                            if (response.data && response.data.transactionData && response.data.to) {
                              console.log('Sending transaction:', {
                                step: response.data.step,
                                to: response.data.to,
                                data: response.data.transactionData,
                                from: deployerAddress
                              });
                              
                              try {
                                // Send transaction via MetaMask - let MetaMask estimate gas
                                console.log('Sending transaction to OnchainID...');
                                const txResult = await window.ethereum.request({
                                  method: 'eth_sendTransaction',
                                  params: [{
                                    to: response.data.to,
                                    data: response.data.transactionData,
                                    from: deployerAddress
                                  }]
                                });
                                
                                console.log('Transaction sent:', txResult);
                                
                                // If this was step 1 (adding claim key), proceed to step 2 (adding claim)
                                if (response.data.step === 'addClaimKey' && response.data.nextStep) {
                                  setMessage("Claim signer key added successfully! Now adding the claim...");
                                  
                                  // Wait a moment for the transaction to be mined
                                  await new Promise(resolve => setTimeout(resolve, 2000));
                                  
                                  // Call backend again to add the actual claim
                                  const claimResponse = await axios.post(`/api/users/${selectedUser}/claims`, {
                                    claimTopic: response.data.nextStep.claimTopic,
                                    identityRegistryAddress: selectedIdentityRegistry,
                                    deployerAddress,
                                    claimIssuerAddress: selectedClaimIssuer
                                  });

                                  if (claimResponse.data && claimResponse.data.transactionData && claimResponse.data.to) {
                                    console.log('Sending claim transaction:', {
                                      to: claimResponse.data.to,
                                      data: claimResponse.data.transactionData,
                                      from: deployerAddress
                                    });
                                    
                                    const claimTxResult = await window.ethereum.request({
                                      method: 'eth_sendTransaction',
                                      params: [{
                                        to: claimResponse.data.to,
                                        data: claimResponse.data.transactionData,
                                        from: deployerAddress
                                      }]
                                    });
                                    
                                    console.log('Claim transaction sent:', claimTxResult);
                                    setMessage('Claim issued successfully!');
                                  } else {
                                    setMessage('Failed to add claim: ' + (claimResponse.data.error || 'Unknown error'));
                                  }
                                } else {
                                  setMessage('Claim issued successfully!');
                                }
                              } catch (txError) {
                                console.error('MetaMask transaction error:', txError);
                                throw new Error(`MetaMask error: ${txError.message || txError}`);
                              }
                              setSelectedClaimIssuer('');
                              setSelectedClaimTopic('');
                              loadUserClaims();
                            } else {
                              setMessage('Failed to prepare claim issuance: ' + (response.data.error || 'Unknown error'));
                            }
                          } catch (err) {
                            setMessage('Error issuing claim: ' + (err?.message || err));
                          } finally {
                            setIssuingClaim(false);
                          }
                        }} style={{ marginTop: "1.5rem" }}>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Trusted Issuer:</label>
                            <select value={selectedClaimIssuer} onChange={e => {
                              setSelectedClaimIssuer(e.target.value);
                              setSelectedClaimTopic('');
                            }} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #b3d9ff" }}>
                              <option value="">Select Trusted Issuer</option>
                              {availableClaimIssuers.map(issuer => (
                                <option key={issuer.address} value={issuer.address}>{issuer.address}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Claim Topic:</label>
                            <select value={selectedClaimTopic} onChange={e => setSelectedClaimTopic(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #b3d9ff" }} disabled={!selectedClaimIssuer}>
                              <option value="">Select Claim Topic</option>
                              {selectedClaimIssuer && availableClaimIssuers.find(i => i.address === selectedClaimIssuer)?.topics.map(topicId => (
                                <option key={topicId} value={topicId}>
                                  {availableClaimTopics.find(t => t.id === topicId)?.name || `Topic ${topicId}`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button type="submit" disabled={issuingClaim} style={{ marginTop: "0.5rem", backgroundColor: '#1565c0', color: '#fff', padding: '0.5rem 1.5rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: issuingClaim ? 'not-allowed' : 'pointer' }}>
                            {issuingClaim ? 'Issuing...' : 'Issue Claim'}
                          </button>
                        </form>
                        {message && <div style={{ marginTop: "1rem", color: message.includes('success') ? 'green' : 'red' }}>{message}</div>}
                      </div>
                      <div style={{ 
                        padding: "1rem", 
                        backgroundColor: "#e3f2fd", 
                        border: "1px solid #bbdefb",
                        borderRadius: "4px",
                        color: "#1565c0"
                      }}>
                        <strong>How to use Trusted Issuers:</strong>
                        <ol style={{ margin: "0.5rem 0 0 1rem", padding: 0 }}>
                          <li>Deploy ClaimIssuer contracts in the ClaimIssuers tab</li>
                          <li>Register them as trusted issuers in the Trusted Issuers tab</li>
                          <li>Use the ClaimIssuer contracts to issue claims to users</li>
                          <li>Claims are automatically validated by the OnchainID contract</li>
                        </ol>
                      </div>
                    </>
                  )}
                </div>

                {/* User Claims */}
                <div>
                  <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>User Claims</h5>
                  {userClaims.length === 0 ? (
                    <p style={{ color: '#666' }}>No claims found for this user.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {userClaims.map((claim, index) => (
                        <div 
                          key={index}
                          style={{
                            padding: "1rem",
                            backgroundColor: "#fff",
                            border: "1px solid #b3d9ff",
                            borderRadius: "4px"
                          }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                              <strong style={{ color: '#1a237e', fontSize: '1.1rem' }}>Topic:</strong>
                              <div style={{ fontSize: "1rem", color: "#000", fontWeight: "500" }}>{claim.name || `Topic ${claim.topic}`}</div>
                            </div>
                            <div>
                              <strong style={{ color: '#1a237e', fontSize: '1.1rem' }}>Issuer:</strong>
                              <div style={{ fontFamily: "monospace", fontSize: "1rem", color: "#000", fontWeight: "500" }}>
                                {claim.issuer.slice(0, 6)}...{claim.issuer.slice(-4)}
                              </div>
                            </div>
                            <div>
                              <strong style={{ color: '#1a237e', fontSize: '1.1rem' }}>Issued:</strong>
                              <div style={{ fontSize: "1rem", color: "#000", fontWeight: "500" }}>{new Date(claim.issuedAt).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* OnchainID Details */}
                {onchainIdDetails && (
                  <div style={{ marginTop: "2rem" }}>
                    <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>🔐 OnchainID Details</h5>
                    <div style={{ 
                      backgroundColor: "#fff", 
                      padding: "1rem", 
                      borderRadius: "4px",
                      border: "1px solid #b3d9ff"
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                        <div>
                          <strong style={{ color: '#1a237e', fontSize: '1.1rem' }}>OnchainID Address:</strong>
                          <div style={{ fontFamily: "monospace", fontSize: "1rem", color: "#000", fontWeight: "500" }}>
                            {onchainIdDetails.address}
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: '#1a237e', fontSize: '1.1rem' }}>Management Key:</strong>
                          <div style={{ fontFamily: "monospace", fontSize: "1rem", color: "#000", fontWeight: "500" }}>
                            {onchainIdDetails.managementKey}
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: '#1a237e', fontSize: '1.1rem' }}>Total Claims:</strong>
                          <div style={{ fontSize: "1rem", color: "#000", fontWeight: "500" }}>
                            {onchainIdDetails.totalClaims}
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: '#1a237e', fontSize: '1.1rem' }}>Total Keys:</strong>
                          <div style={{ fontSize: "1rem", color: "#000", fontWeight: "500" }}>
                            {onchainIdDetails.totalKeys}
                          </div>
                        </div>
                      </div>
                      
                      {/* OnchainID Claims */}
                      {onchainIdDetails.claims && onchainIdDetails.claims.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                          <h6 style={{ color: '#1a237e', marginBottom: "0.5rem" }}>OnchainID Claims:</h6>
                          <div style={{ display: "grid", gap: "0.5rem" }}>
                            {onchainIdDetails.claims.map((claim, index) => (
                              <div 
                                key={index}
                                style={{
                                  padding: "0.75rem",
                                  backgroundColor: "#f8f9fa",
                                  border: "1px solid #dee2e6",
                                  borderRadius: "4px"
                                }}
                              >
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                  <div>
                                    <strong style={{ color: '#1a237e', fontSize: '0.9rem' }}>Topic:</strong>
                                    <div style={{ fontSize: "0.9rem", color: "#000" }}>{claim.topic}</div>
                                  </div>
                                  <div>
                                    <strong style={{ color: '#1a237e', fontSize: '0.9rem' }}>Issuer:</strong>
                                    <div style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "#000" }}>
                                      {claim.issuer.slice(0, 6)}...{claim.issuer.slice(-4)}
                                    </div>
                                  </div>
                                  {claim.data && (
                                    <div style={{ gridColumn: "1 / -1" }}>
                                      <strong style={{ color: '#1a237e', fontSize: '0.9rem' }}>Data:</strong>
                                      <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#666", wordBreak: "break-all" }}>
                                        {claim.data}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* OnchainID Keys */}
                      {onchainIdDetails.keys && onchainIdDetails.keys.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                          <h6 style={{ color: '#1a237e', marginBottom: "0.5rem" }}>OnchainID Keys:</h6>
                          <div style={{ display: "grid", gap: "0.5rem" }}>
                            {onchainIdDetails.keys.map((key, index) => (
                              <div 
                                key={index}
                                style={{
                                  padding: "0.75rem",
                                  backgroundColor: "#f8f9fa",
                                  border: "1px solid #dee2e6",
                                  borderRadius: "4px"
                                }}
                              >
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                  <div>
                                    <strong style={{ color: '#1a237e', fontSize: '0.9rem' }}>Address:</strong>
                                    <div style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "#000" }}>
                                      {key.address}
                                    </div>
                                  </div>
                                  <div>
                                    <strong style={{ color: '#1a237e', fontSize: '0.9rem' }}>Purposes:</strong>
                                    <div style={{ fontSize: "0.9rem", color: "#000" }}>
                                      {key.purposes.join(', ')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Link Identity Section */}
                <div style={{ marginTop: "2rem" }}>
                  <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>Link ONCHAINID</h5>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "end" }}>
                    <div>
                      <label style={{ color: '#1a237e', fontWeight: 'bold' }}>ONCHAINID Address:</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleLinkIdentity(e.target.value);
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="0x..."]');
                        if (input) handleLinkIdentity(input.value);
                      }}
                      disabled={loading}
                      style={{ 
                        backgroundColor: "#ffc107", 
                        color: "#000", 
                        padding: "0.5rem 1rem",
                        border: "none",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer"
                      }}
                    >
                      {loading ? "Linking..." : "Link Identity"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Console Instructions */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Console Instructions</h3>
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "1.5rem", 
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          fontFamily: "monospace",
          fontSize: "0.9rem"
        }}>
          <p style={{ color: '#666', marginBottom: "1rem" }}>
            <strong>Phase 4 - User Management Console Commands:</strong>
          </p>
          
          {selectedIdentityRegistry && (
            <>
              <p style={{ color: '#333', marginBottom: "0.5rem" }}>
                <strong>Identity Registry Address:</strong> {selectedIdentityRegistry}
              </p>
              
              <p style={{ color: '#333', marginBottom: "0.5rem" }}>
                <strong>Check if user is registered:</strong>
              </p>
              <p style={{ color: '#666', marginBottom: "1rem" }}>
                const identityRegistry = await ethers.getContractAt("IdentityRegistry", "{selectedIdentityRegistry}");<br/>
                const isRegistered = await identityRegistry.contains("USER_ADDRESS");
              </p>
              
              <p style={{ color: '#333', marginBottom: "0.5rem" }}>
                <strong>Get user identity:</strong>
              </p>
              <p style={{ color: '#666', marginBottom: "1rem" }}>
                const userIdentity = await identityRegistry.identity("USER_ADDRESS");
              </p>
              
              <p style={{ color: '#333', marginBottom: "0.5rem" }}>
                <strong>Check if user is verified:</strong>
              </p>
              <p style={{ color: '#666', marginBottom: "1rem" }}>
                const isVerified = await identityRegistry.isVerified("USER_ADDRESS");
              </p>
            </>
          )}
          
          <p style={{ color: '#333', marginBottom: "0.5rem" }}>
            <strong>💡 Tip:</strong> Use the dashboard to register users and add claims, then verify the results in the console.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UsersPhase; 