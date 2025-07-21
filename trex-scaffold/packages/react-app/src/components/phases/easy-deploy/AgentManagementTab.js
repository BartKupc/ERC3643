import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';

const AgentManagementTab = ({ deploymentDetails, addLog, getSigner }) => {
  const [agents, setAgents] = useState({ token: [], ir: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  // Get available tokens from deployment details
  const availableTokens = deploymentDetails?.tokens || [];

  // Auto-select the latest token if none selected
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedToken) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens, selectedToken]);

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
      const signer = await getSigner();
      const newAgents = { token: [], ir: [] };

      // Get contract addresses from the selected token
      const tokenAddress = selectedToken.token.address;
      const irAddress = selectedToken.suite?.identityRegistry;
      
      addLog && addLog(`Found addresses - Token: ${tokenAddress}, IR: ${irAddress}`, 'info');

      // Get the deployer address (account 0)
      const deployerAddress = await signer.getAddress();
      addLog && addLog(`Checking agent status for deployer: ${deployerAddress}`, 'info');

      // Check Token agents using isAgent() method
      if (tokenAddress) {
        try {
          const tokenArtifacts = getContractArtifacts('Token');
          const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, signer);
          
          // Check if deployer is a token agent
          const isTokenAgent = await token.isAgent(deployerAddress);
          if (isTokenAgent) {
            newAgents.token.push(deployerAddress);
            addLog && addLog(`✅ Deployer is Token Agent`, 'success');
          } else {
            addLog && addLog(`❌ Deployer is NOT Token Agent`, 'warning');
          }
        } catch (err) {
          addLog && addLog(`Error checking token agents: ${err.message}`, 'warning');
        }
      }

      // Check Identity Registry agents using isAgent() method
      if (irAddress) {
        try {
          const irArtifacts = getContractArtifacts('IdentityRegistry');
          const ir = new ethers.Contract(irAddress, irArtifacts.abi, signer);
          
          // Check if deployer is an IR agent
          const isIRAgent = await ir.isAgent(deployerAddress);
          if (isIRAgent) {
            newAgents.ir.push(deployerAddress);
            addLog && addLog(`✅ Deployer is IR Agent`, 'success');
          } else {
            addLog && addLog(`❌ Deployer is NOT IR Agent`, 'warning');
          }
          
          // Check if token contract is an IR agent (should be automatic)
          if (tokenAddress) {
            const isTokenIRAgent = await ir.isAgent(tokenAddress);
            if (isTokenIRAgent) {
              newAgents.ir.push(tokenAddress);
              addLog && addLog(`✅ Token contract is IR Agent`, 'info');
            }
          }
        } catch (err) {
          addLog && addLog(`Error checking IR agents: ${err.message}`, 'warning');
        }
      }

      setAgents(newAgents);
      const totalAgents = newAgents.token.length + newAgents.ir.length;
      addLog && addLog(`Loaded ${totalAgents} total agents`, 'success');
      addLog && addLog(`Token agents: ${newAgents.token.length}, IR agents: ${newAgents.ir.length}`, 'info');
      addLog && addLog(`Token agents: ${JSON.stringify(newAgents.token)}`, 'info');
      addLog && addLog(`IR agents: ${JSON.stringify(newAgents.ir)}`, 'info');
      addLog && addLog(`Final agents state: ${JSON.stringify(newAgents)}`, 'info');
    } catch (err) {
      setError(`Failed to load agents: ${err.message}`);
      addLog && addLog(`Failed to load agents: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [selectedToken, addLog, getSigner]);

  useEffect(() => {
    if (selectedToken) {
      loadAgents();
    }
  }, [selectedToken]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Agent Management</h3>
      
      {/* Token Selection */}
      {availableTokens.length > 0 && (
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
                {token.token.name} ({token.token.symbol}) - {token.token.address}
              </option>
            ))}
          </select>
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