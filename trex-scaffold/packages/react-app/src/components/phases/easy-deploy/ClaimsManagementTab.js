import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';
import { CLAIM_TOPIC_LABELS } from './constants';

const ClaimsManagementTab = ({ deploymentDetails, addLog, getSigner, factories }) => {
  const [claimTopics, setClaimTopics] = useState([]);
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



  // Load claim topics from the selected token's ClaimTopicsRegistry
  const loadClaimTopics = useCallback(async () => {
    if (!selectedToken) {
      addLog && addLog('No token selected', 'warning');
      return;
    }

    console.log('🔍 ClaimsManagementTab - selectedToken:', selectedToken);
    addLog && addLog(`🔍 Debug - Selected token: ${JSON.stringify(selectedToken, null, 2)}`, 'info');
    
    setLoading(true);
    setError(null);
    try {
      const tokenAddress = selectedToken.token?.address;
      if (!tokenAddress) {
        throw new Error('No token address found for selected token');
      }
      
      addLog && addLog(`Loading claim topics for token ${tokenAddress} via backend...`, 'info');
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch(`/api/claims/claim-topics/${tokenAddress}`);
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setClaimTopics(data.claimTopics);
      addLog && addLog(`Loaded ${data.claimTopics.length} claim topics via backend`, 'success');
    } catch (err) {
      console.error('Error loading claim topics:', err);
      setError(`Failed to load claim topics: ${err.message}`);
      addLog && addLog(`Error loading claim topics: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [selectedToken, addLog]);

  useEffect(() => {
    if (selectedToken) {
      loadClaimTopics();
    }
  }, [selectedToken]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Claims Management</h3>
      
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
            Choose which token's claim topics to manage:
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
          <p>Please select a factory above to view and manage its tokens' claim topics.</p>
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
          padding: "1rem",
          backgroundColor: "#f8d7da",
          color: "#721c24",
          borderRadius: "4px",
          marginBottom: "1rem",
          border: "1px solid #f5c6cb"
        }}>
          {error}
        </div>
      )}
      
      {/* Claim Topics Summary */}
      <div style={{
        padding: "1.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        marginBottom: "2rem",
        color: '#333'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "1rem" }}>
          <h4 style={{ color: '#1a237e', margin: 0 }}>Deployed Claim Topics</h4>
          <Button
            onClick={loadClaimTopics}
            disabled={loading}
            style={{ backgroundColor: "#17a2b8", color: "white" }}
          >
            {loading ? "Loading..." : "Check On-Chain"}
          </Button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: "2rem", color: '#333' }}>
            Loading claim topics from blockchain...
          </div>
        ) : claimTopics.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {claimTopics.map((topicId) => (
              <div key={topicId} style={{
                padding: "1rem",
                backgroundColor: "white",
                borderRadius: "8px",
                border: "1px solid #dee2e6",
                color: '#333'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#1a237e' }}>Topic {topicId}</strong>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>
                      {CLAIM_TOPIC_LABELS[topicId] || 'Unknown Topic'}
                    </div>
                  </div>
                  <div style={{ 
                    color: '#28a745', 
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    ✓ Verified
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: "2rem", color: '#666' }}>
            No claim topics found on-chain
          </div>
        )}
      </div>
      
      {/* Registry Information */}
      {deploymentDetails?.suite?.claimTopicsRegistry && (
        <div style={{
          padding: "1.5rem",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
          border: "1px solid #c3e6c3",
          color: '#333'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Claim Topics Registry</h4>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#666' }}>
            Address: {deploymentDetails.suite.claimTopicsRegistry}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
            Status: Deployed and Active
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimsManagementTab; 