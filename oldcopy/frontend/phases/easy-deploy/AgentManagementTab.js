import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';

const AgentManagementTab = ({ deploymentDetails, addLog, getSigner, factories }) => {
  const [agents, setAgents] = useState({ token: [], ir: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [availableTokens, setAvailableTokens] = useState([]);

  // Load tokens from selected factory
  useEffect(() => {
    const loadTokensFromFactory = async () => {
      if (!selectedFactory) {
        setAvailableTokens([]);
        setSelectedToken(null);
        return;
      }

      try {
        addLog && addLog(`Loading tokens from factory: ${selectedFactory.address}`, "info");
        
        // Get deployment details for this factory
        const response = await fetch(`/api/deployments/${selectedFactory.deploymentId}`);
        if (response.ok) {
          const factoryDeploymentDetails = await response.json();
          const tokens = factoryDeploymentDetails.tokens || [];
          setAvailableTokens(tokens);
          
          // Auto-select the latest token if none selected
          if (tokens.length > 0 && !selectedToken) {
            setSelectedToken(tokens[0]);
          }
          
          addLog && addLog(`Loaded ${tokens.length} tokens from factory ${selectedFactory.address}`, "info");
        }
      } catch (error) {
        addLog && addLog(`Error loading tokens from factory ${selectedFactory.address}: ${error.message}`, "error");
        setAvailableTokens([]);
      }
    };

    loadTokensFromFactory();
  }, [selectedFactory, addLog]);

  // Load agents from the selected token's contracts
  const loadAgents = useCallback(async () => {
    if (!selectedToken) {
      addLog && addLog('No token selected', 'warning');
      return;
    }

    console.log('🔍 AgentManagementTab - selectedToken:', selectedToken);
    addLog && addLog(`🔍 Debug - Selected token: ${JSON.stringify(selectedToken, null, 2)}`, 'info');
    
    setLoading(true);
    setError(null);
    try {
      const tokenAddress = selectedToken.token?.address;
      if (!tokenAddress) {
        throw new Error('No token address found for selected token');
      }
      
      addLog && addLog(`Loading agents for token ${tokenAddress} via backend...`, 'info');
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch(`/api/agents/${tokenAddress}`);
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setAgents(data.agents);
      const totalAgents = data.agents.token.length + data.agents.ir.length;
      addLog && addLog(`Loaded ${totalAgents} total agents via backend`, 'success');
      addLog && addLog(`Token agents: ${data.agents.token.length}, IR agents: ${data.agents.ir.length}`, 'info');
      addLog && addLog(`Token agents: ${JSON.stringify(data.agents.token)}`, 'info');
      addLog && addLog(`IR agents: ${JSON.stringify(data.agents.ir)}`, 'info');
      addLog && addLog(`Final agents state: ${JSON.stringify(data.agents)}`, 'info');
    } catch (err) {
      setError(`Failed to load agents: ${err.message}`);
      addLog && addLog(`Failed to load agents: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [selectedToken, addLog]);

  useEffect(() => {
    if (selectedToken) {
      loadAgents();
    }
  }, [selectedToken]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Agent Management</h3>
      
      {/* Message Display */}
      {message && (
        <div style={{
          padding: "1rem",
          backgroundColor: message.includes('Error') ? "#f8d7da" : "#d4edda",
          color: message.includes('Error') ? "#721c24" : "#155724",
          borderRadius: "4px",
          marginBottom: "1rem",
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          {message}
        </div>
      )}
      
      {/* Factory Selection */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ color: '#1a237e', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Select Factory:</label>
            <select
              value={selectedFactory?.deploymentId || ''}
              onChange={e => {
                if (e.target.value === '') {
                  setSelectedFactory(null);
                } else {
                  const factory = factories.find(f => f.deploymentId === e.target.value);
                  setSelectedFactory(factory);
                }
              }}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                fontSize: '0.9rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: 'white',
                color: '#333'
              }}
            >
              <option value=''>-- Select a factory --</option>
              {factories.map(factory => (
                <option key={factory.deploymentId} value={factory.deploymentId}>
                  {factory.address} - {factory.network} - {factory.tokenCount} tokens - {new Date(factory.timestamp).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Selected Factory Info */}
        {selectedFactory && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#e7f3ff', 
            borderRadius: '8px', 
            border: '1px solid #007bff',
            color: '#333'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ color: '#1a237e' }}>Selected Factory:</strong>
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ Ready to Load Tokens</span>
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              <strong>Address:</strong> {selectedFactory.address}<br/>
              <strong>Network:</strong> {selectedFactory.network}<br/>
              <strong>Token Count:</strong> {selectedFactory.tokenCount}<br/>
              <strong>Deployed:</strong> {new Date(selectedFactory.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
      
      {/* Token Selection */}
      {selectedFactory && availableTokens.length > 0 && (
        <div style={{ 
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          color: '#333'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Select Token</h4>
          <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
            Choose which token's agents to manage:
          </label>
          <select 
            value={selectedToken ? selectedToken.token.address : ''} 
            onChange={(e) => {
              const token = availableTokens.find(t => t.token.address === e.target.value);
              setSelectedToken(token);
            }}
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              backgroundColor: 'white',
              color: '#333'
            }}
          >
            <option value="">Select a token...</option>
            {availableTokens.map((token, index) => (
              <option key={index} value={token.token.address}>
                {token.token.name} ({token.token.symbol}) - {new Date(token.timestamp).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* No Factory Selected Message */}
      {!selectedFactory && (
        <div style={{
          padding: "1.5rem",
          backgroundColor: "#fff3cd",
          color: "#856404",
          borderRadius: "8px",
          border: "1px solid #ffeaa7",
          marginBottom: "2rem"
        }}>
          <h4 style={{ color: '#856404', marginBottom: "1rem" }}>No Factory Selected</h4>
          <p>Please select a factory above to view and manage its tokens' agents.</p>
        </div>
      )}
      
      {/* No Tokens Message */}
      {selectedFactory && availableTokens.length === 0 && (
        <div style={{
          padding: "1.5rem",
          backgroundColor: "#fff3cd",
          color: "#856404",
          borderRadius: "8px",
          border: "1px solid #ffeaa7",
          marginBottom: "2rem"
        }}>
          <h4 style={{ color: '#856404', marginBottom: "1rem" }}>No Tokens Found</h4>
          <p>No tokens have been deployed in the selected factory yet. Please deploy a token in the Token Management tab first.</p>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div style={{ 
          color: '#721c24', 
          backgroundColor: '#f8d7da',
          padding: '0.5rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}
      
      {/* Agents Summary */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ color: '#1a237e', margin: 0 }}>Deployed Agents</h4>
          <Button
            onClick={loadAgents}
            disabled={loading}
            style={{ backgroundColor: "#17a2b8", color: "white" }}
          >
            {loading ? "Loading..." : "Check On-Chain"}
          </Button>
        </div>
        
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            color: '#333'
          }}>
            Loading agents from blockchain...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Debug info */}
            <div style={{ 
              padding: '0.5rem', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: '#856404'
            }}>
              Debug: Token agents: {agents.token.length}, IR agents: {agents.ir.length}
            </div>
            
            {/* Token Agents */}
            <div style={{
              padding: "1.5rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>Token Contract Agents</h5>
              {agents.token.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {agents.token.map((agent, index) => (
                    <div key={index} style={{
                      padding: '0.75rem',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#333' }}>
                        {agent}
                      </div>
                      <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ✓ Verified
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#666', fontStyle: 'italic' }}>
                  No token agents found on-chain
                </div>
              )}
            </div>

            {/* Identity Registry Agents */}
            <div style={{
              padding: "1.5rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>Identity Registry Agents</h5>
              {agents.ir.length > 0 ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {agents.ir.map((agent, index) => (
                    <div key={index} style={{
                      padding: '0.75rem',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#333' }}>
                        {agent}
                      </div>
                      <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ✓ Verified
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#666', fontStyle: 'italic' }}>
                  No identity registry agents found on-chain
                </div>
              )}
            </div>


          </div>
        )}
      </div>
 
      {/* Contract Information */}
      {deploymentDetails?.suite && (
        <div style={{
          padding: "1.5rem",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
          border: "1px solid #c3e6c3",
          color: '#333'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deployed Contracts</h4>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
            {deploymentDetails.suite.token && (
              <div style={{ fontFamily: 'monospace', color: '#666' }}>
                Token: {deploymentDetails.suite.token}
              </div>
            )}
            {deploymentDetails.suite.identityRegistry && (
              <div style={{ fontFamily: 'monospace', color: '#666' }}>
                Identity Registry: {deploymentDetails.suite.identityRegistry}
              </div>
            )}

          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
            Status: All contracts deployed and active
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentManagementTab; 