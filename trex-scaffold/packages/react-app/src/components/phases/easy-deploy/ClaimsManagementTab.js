import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';
import { CLAIM_TOPIC_LABELS } from './constants';

const ClaimsManagementTab = ({ deploymentDetails, addLog, getSigner }) => {
  const [claimTopics, setClaimTopics] = useState([]);
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
      const signer = await getSigner();
      
      // Get the ClaimTopicsRegistry address from the selected token's suite
      const ctrAddress = selectedToken.suite?.claimTopicsRegistry;
      if (!ctrAddress) {
        throw new Error('No ClaimTopicsRegistry found for selected token');
      }
      
      addLog && addLog(`Loading claim topics from ${ctrAddress}`, 'info');
      
      const ctrArtifacts = getContractArtifacts('ClaimTopicsRegistry');
      const ctr = new ethers.Contract(ctrAddress, ctrArtifacts.abi, signer);
      
      // Get all claim topics
      const topics = await ctr.getClaimTopics();
      setClaimTopics(topics.map(topic => topic.toNumber()));
      
      addLog && addLog(`Loaded ${topics.length} claim topics`, 'success');
    } catch (err) {
      console.error('Error loading claim topics:', err);
      setError(`Failed to load claim topics: ${err.message}`);
      addLog && addLog(`Error loading claim topics: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [selectedToken, addLog, getSigner]);

  useEffect(() => {
    if (selectedToken) {
      loadClaimTopics();
    }
  }, [selectedToken]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Claims Management</h3>
      
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
                {token.token.name} ({token.token.symbol}) - {token.token.address}
              </option>
            ))}
          </select>
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