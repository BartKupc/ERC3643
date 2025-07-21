import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';
import { CLAIM_TOPIC_LABELS } from './constants';

const TrustedIssuerManagementTab = ({ deploymentDetails, addLog, getSigner }) => {
  const [deployedClaimIssuers, setDeployedClaimIssuers] = useState([]);
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

  // Load trusted issuers from the selected token's TrustedIssuersRegistry
  const loadTrustedIssuers = useCallback(async () => {
    if (!selectedToken) {
      addLog && addLog('No token selected', 'warning');
      return;
    }

    console.log('🔍 TrustedIssuerManagementTab - selectedToken:', selectedToken);
    addLog && addLog(`🔍 Debug - Selected token: ${JSON.stringify(selectedToken, null, 2)}`, 'info');
    
    setLoading(true);
    setError(null);
    try {
      const signer = await getSigner();
      
      // Get the TrustedIssuersRegistry address from the selected token's suite
      const tirAddress = selectedToken.suite?.trustedIssuersRegistry;
      if (!tirAddress) {
        throw new Error('No TrustedIssuersRegistry found for selected token');
      }
      
      addLog && addLog(`Loading trusted issuers from ${tirAddress}`, 'info');
      
      const tirArtifacts = getContractArtifacts('TrustedIssuersRegistry');
      const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, signer);
      
      // Check if the contract is initialized
      try {
        const owner = await tir.owner();
        addLog && addLog(`TrustedIssuersRegistry owner: ${owner}`, 'info');
      } catch (err) {
        addLog && addLog(`Warning: Could not get owner - contract may not be initialized: ${err.message}`, 'warning');
      }
      
      // Use the correct method: getTrustedIssuers() returns all trusted issuers
      addLog && addLog('Calling getTrustedIssuers()...', 'info');
      const trustedIssuers = await tir.getTrustedIssuers();
      
      addLog && addLog(`Found ${trustedIssuers.length} trusted issuers`, 'success');
      
      // Get additional details for each trusted issuer
      const issuersWithDetails = [];
      for (const issuerAddress of trustedIssuers) {
        try {
          const claimTopics = await tir.getTrustedIssuerClaimTopics(issuerAddress);
          issuersWithDetails.push({
            address: issuerAddress,
            claimTopics: claimTopics.map(topic => topic.toNumber())
          });
          addLog && addLog(`Trusted issuer ${issuerAddress} has claim topics: ${claimTopics.map(t => t.toNumber()).join(', ')}`, 'info');
        } catch (err) {
          addLog && addLog(`Warning: Could not get claim topics for ${issuerAddress}: ${err.message}`, 'warning');
          issuersWithDetails.push({
            address: issuerAddress,
            claimTopics: []
          });
        }
      }
      
      setDeployedClaimIssuers(issuersWithDetails);
      
    } catch (err) {
      console.error('Error loading trusted issuers:', err);
      setError(`Failed to load trusted issuers: ${err.message}`);
      addLog && addLog(`Error loading trusted issuers: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [selectedToken, addLog, getSigner]);

  useEffect(() => {
    if (selectedToken) {
      loadTrustedIssuers();
    }
  }, [selectedToken]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Trusted Issuer Management</h3>
      
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
            Choose which token's trusted issuers to manage:
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
      
      {/* Trusted Issuers Summary */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ color: '#1a237e', margin: 0 }}>Deployed Trusted Issuers</h4>
          <Button
            onClick={loadTrustedIssuers}
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
            Loading trusted issuers from blockchain...
          </div>
        ) : (
          <div style={{ 
            background: '#fff', 
            borderRadius: 8, 
            border: '1px solid #dee2e6',
            overflow: 'hidden'
          }}>
            {/* Debug info */}
            <div style={{ 
              padding: '0.5rem', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeaa7',
              fontSize: '0.8rem',
              color: '#856404'
            }}>
              Debug: {deployedClaimIssuers.length} trusted issuers loaded
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    borderBottom: '1px solid #dee2e6',
                    color: '#1a237e',
                    fontWeight: 'bold'
                  }}>
                    Address
                  </th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left', 
                    borderBottom: '1px solid #dee2e6',
                    color: '#1a237e',
                    fontWeight: 'bold'
                  }}>
                    Claim Topics
                  </th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'center', 
                    borderBottom: '1px solid #dee2e6',
                    color: '#1a237e',
                    fontWeight: 'bold'
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {deployedClaimIssuers.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ 
                      textAlign: 'center', 
                      padding: '2rem',
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      No trusted issuers found on-chain
                    </td>
                  </tr>
                ) : deployedClaimIssuers.map(issuer => (
                  <tr key={issuer.address} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ 
                      padding: '1rem', 
                      color: '#333',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }}>
                      {issuer.address}
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      color: '#333'
                    }}>
                      {issuer.claimTopics.map(tid => CLAIM_TOPIC_LABELS[tid] || `Topic ${tid}`).join(', ')}
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        color: '#28a745', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        ✓ Verified
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
      {/* Registry Information */}
      {deploymentDetails?.suite?.trustedIssuersRegistry && (
        <div style={{
          padding: "1.5rem",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
          border: "1px solid #c3e6c3",
          color: '#333'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Trusted Issuers Registry</h4>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#666' }}>
            Address: {deploymentDetails.suite.trustedIssuersRegistry}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
            Status: Deployed and Active
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustedIssuerManagementTab; 