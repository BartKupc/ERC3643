import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const AgentManagementPhase = ({ deployedComponents, setMessage }) => {
  const [selectedRegistry, setSelectedRegistry] = useState("");
  const [loading, setLoading] = useState(false);
  const [newAgent, setNewAgent] = useState("");
  const [checkAddress, setCheckAddress] = useState("");
  const [checkedAgent, setCheckedAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [message, setLocalMessage] = useState("");


  // Load agents when registry changes
  useEffect(() => {
    if (selectedRegistry) {
      loadAgents();
    } else {
      setAgents([]);
    }
  }, [selectedRegistry]);

  const loadAgents = async () => {
    try {
      const res = await axios.get(`/api/identity-registry/agents?address=${selectedRegistry}`);
      setAgents(res.data.agents || []);
    } catch (e) {
      console.error('Failed to load agents:', e);
    }
  };

  // Check if address is an agent
  const handleCheckAgent = async (address) => {
    if (!address || !selectedRegistry) return;
    setLoading(true);
    setLocalMessage("");
    try {
      const res = await axios.get(`/api/identity-registry/check-agent?registryAddress=${selectedRegistry}&agentAddress=${address}`);
      setCheckedAgent({ address, isAgent: res.data.isAgent });
      setLocalMessage(res.data.isAgent ? `${address} is an agent` : `${address} is not an agent`);

    } catch (e) {
      setLocalMessage(e.response?.data?.error || 'Failed to check agent status');
    }
    setLoading(false);
  };

  // Add agent
  const handleAddAgent = async (address) => {
    setLoading(true);
    setLocalMessage("");
    try {
      // Step 1: Get transaction data from backend
      const response = await axios.post('/api/identity-registry/agents', {
        registryAddress: selectedRegistry,
        agentAddress: address
      });
      
      if (response.data.alreadyAgent) {
        setLocalMessage("Address is already an agent - updated agents list");
        // Update agents list with the response data
        if (response.data.agents) {
          setAgents(response.data.agents);
        }
        setNewAgent("");
        setLoading(false);
        return;
      }
      
      if (!response.data.success) {
        setLocalMessage("Failed to prepare agent addition: " + response.data.error);
        return;
      }
      
      // Step 2: Sign transaction with MetaMask
      const { transactionData, to, from } = response.data;
      
      // Request MetaMask to sign the transaction
      const signerAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signerAddress = signerAccounts[0];
      
      if (!signerAddress || typeof signerAddress !== 'string' || !from || typeof from !== 'string') {
        setLocalMessage("Invalid wallet addresses detected");
        return;
      }
      
      if (signerAddress.toLowerCase() !== from.toLowerCase()) {
        setLocalMessage(`Please sign with the contract owner address: ${from}`);
        return;
      }
      
      // Send the transaction
      console.log('Sending agent transaction:', { to, data: transactionData, from: signerAddress });
      
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
      
      console.log('Agent transaction sent:', tx);
      setLocalMessage(`Agent addition transaction sent! Hash: ${tx}`);
      
      // Wait for transaction confirmation
      setLocalMessage("Waiting for transaction confirmation...");
      
      // Wait for the transaction to be mined
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const receipt = await provider.waitForTransaction(tx);
      
      if (receipt.status === 1) {
        setLocalMessage(`Agent added successfully! Transaction: ${tx}`);
        setNewAgent("");
        
        // Reload agents list from blockchain
        await loadAgents();
        // Update checked agent status immediately
        setCheckedAgent({ address, isAgent: true });

      } else {
        setLocalMessage(`Transaction failed! Hash: ${tx}`);
      }
    } catch (e) {
      console.error('Error adding agent:', e);
      // Handle different types of errors
      if (e.code === 4001) {
        setLocalMessage("Transaction was rejected by user");
      } else if (e.code === -32603) {
        setLocalMessage("Transaction failed on blockchain: " + (e.data?.message || e.message));
      } else if (e.response?.data?.error) {
        setLocalMessage("Failed to add agent: " + e.response.data.error);
      } else if (e.message) {
        setLocalMessage("Failed to add agent: " + e.message);
      } else {
        setLocalMessage("Failed to add agent: Unknown error occurred");
      }
    }
    setLoading(false);
  };

  // Remove agent
  const handleRemoveAgent = async (address) => {
    setLoading(true);
    setLocalMessage("");
    try {
      // Get account from MetaMask directly
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const deployerAddress = accounts[0];
      
      if (!deployerAddress) {
        setLocalMessage("Please connect your MetaMask wallet first");
        setLoading(false);
        return;
      }
      
      await axios.delete('/api/identity-registry/agents', {
        data: {
          registryAddress: selectedRegistry,
          agentAddress: address,
          deployerAddress: deployerAddress
        }
      });
      setLocalMessage("Agent removed successfully");
      // Reload agents list
      await loadAgents();
      // Update checked agent status
      if (checkedAgent && checkedAgent.address === address) {
        setCheckedAgent({ ...checkedAgent, isAgent: false });
      }
    } catch (e) {
      setLocalMessage(e.response?.data?.error || 'Failed to remove agent');
    }
    setLoading(false);
  };

  // Get all deployed Identity Registries
  const identityRegistries = Object.entries(deployedComponents)
    .filter(([name]) => name === 'IdentityRegistry' || /^IdentityRegistry(_\d+)?$/.test(name))
    .map(([name, address]) => ({ name, address }));

  return (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <h2 style={{ color: '#1a237e', marginBottom: '1.5rem' }}>Agent Management</h2>
      
      {/* Status Messages */}
      {message && (
        <div style={{ 
          padding: "1rem", 
          margin: "1rem 0", 
          backgroundColor: "#c8e6c9",
          color: "#222",
          border: "1px solid #388e3c",
          borderRadius: "4px"
        }}>
          {message}
        </div>
      )}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontWeight: 'bold', color: '#1a237e' }}>Select Identity Registry:</label>
        <select
          value={selectedRegistry}
          onChange={e => setSelectedRegistry(e.target.value)}
          style={{ marginLeft: 12, padding: '0.5rem', fontSize: '1rem' }}
        >
          <option value="">-- Select --</option>
          {identityRegistries.map(reg => (
            <option key={reg.address} value={reg.address}>{reg.name} ({reg.address})</option>
          ))}
        </select>
      </div>
      {selectedRegistry && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#1a237e' }}>Quick Add Common Agents</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                onClick={() => handleAddAgent('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')}
                disabled={loading}
              >
                Add Account #0
              </button>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                onClick={() => handleAddAgent('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
                disabled={loading}
              >
                Add Account #1
              </button>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                onClick={() => handleAddAgent('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')}
                disabled={loading}
              >
                Add Account #2
              </button>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                onClick={() => handleAddAgent('0x90F79bf6EB2c4f870365E785982E1f101E93b906')}
                disabled={loading}
              >
                Add Account #3
              </button>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                onClick={() => handleAddAgent('0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65')}
                disabled={loading}
              >
                Add Account #4
              </button>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                onClick={() => handleAddAgent('0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc')}
                disabled={loading}
              >
                Add Account #5
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              <strong>Note:</strong> These are common Hardhat test accounts. Click any button to quickly add that account as an agent.
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#1a237e' }}>Add Custom Agent</h4>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Enter agent address (e.g., your MetaMask address)"
                value={newAgent}
                onChange={e => setNewAgent(e.target.value)}
                style={{ width: 320, padding: '0.5rem', fontSize: '1rem', marginRight: 8 }}
                disabled={loading}
              />
              <button
                onClick={() => handleAddAgent(newAgent)}
                disabled={!newAgent || loading}
                style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: 4, padding: '0.5rem 1.2rem', fontWeight: 'bold', fontSize: '1rem' }}
              >
                Add Agent
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              <strong>Tip:</strong> You can add your MetaMask address or any other address as an agent. Make sure you have the private key for that address.
            </div>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#1a237e' }}>Current Agents (on-chain)</h4>
            {loading ? (
              <div>Loading agents...</div>
            ) : (
              <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                {agents.length === 0 ? (
                  <div style={{ color: '#666', textAlign: 'center' }}>
                    No agents added yet. Add some agents above to get started.
                  </div>
                ) : (
                  <div>
                    {agents.map((agent, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        margin: '0.25rem 0',
                        backgroundColor: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#333' }}>{agent}</span>
                        <button
                          onClick={() => handleRemoveAgent(agent)}
                          style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#1a237e' }}>Check Agent Status</h4>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Enter address to check"
                value={checkAddress}
                onChange={e => setCheckAddress(e.target.value)}
                style={{ width: 320, padding: '0.5rem', fontSize: '1rem', marginRight: 8 }}
                disabled={loading}
              />
              <button
                onClick={() => handleCheckAgent(checkAddress)}
                disabled={!checkAddress || loading}
                style={{ background: '#17a2b8', color: 'white', border: 'none', borderRadius: 4, padding: '0.5rem 1.2rem', fontWeight: 'bold', fontSize: '1rem' }}
              >
                Check
              </button>
            </div>
            {checkedAgent && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#222' }}>{checkedAgent.address}</span>
                <span style={{ marginLeft: 8, color: checkedAgent.isAgent ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                  {checkedAgent.isAgent ? '✓ IS AN AGENT' : '✗ NOT AN AGENT'}
                </span>
                {checkedAgent.isAgent && (
                  <button
                    onClick={() => handleRemoveAgent(checkedAgent.address)}
                    style={{ marginLeft: 16, background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.8rem', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    Remove Agent
                  </button>
                )}
              </div>
            )}
          </div>
          

          
        </>
      )}
    </div>
  );
};

export default AgentManagementPhase; 