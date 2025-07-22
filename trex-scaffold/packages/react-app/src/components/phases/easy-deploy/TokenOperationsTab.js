import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';

const TokenOperationsTab = ({ 
  deploymentDetails, 
  addLog, 
  getSigner,
  selectedOperationsToken,
  setSelectedOperationsToken,
  mintAmount,
  setMintAmount,
  mintRecipient,
  setMintRecipient,
  burnAmount,
  setBurnAmount,
  burnFrom,
  setBurnFrom,
  transferAmount,
  setTransferAmount,
  transferTo,
  setTransferTo,
  transferFrom,
  setTransferFrom,
  mintingToken,
  burningToken,
  transferringToken,
  handleMintToken,
  handleBurnToken,
  handleTransferToken,
  handleTransferFromToken,
  message
}) => {
  const [selectedToken, setSelectedToken] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('info');
  const [userAddressToCheck, setUserAddressToCheck] = useState('');
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [tokenStatus, setTokenStatus] = useState('Unknown');
  const [pausingToken, setPausingToken] = useState(false);

  // Load token information from blockchain
  const loadTokenInfo = useCallback(async (tokenAddress) => {
    if (!tokenAddress) {
      setTokenInfo(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      addLog && addLog(`Loading token information from ${tokenAddress} via backend...`, 'info');
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch(`/api/token-info/${tokenAddress}`);
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setTokenInfo(data.tokenInfo);
      addLog && addLog(`Token loaded via backend: ${data.tokenInfo.name} (${data.tokenInfo.symbol})`, 'success');
    } catch (err) {
      console.error('Error loading token info:', err);
      setError(`Failed to load token information: ${err.message}`);
      addLog && addLog(`Error loading token information: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Check token status (paused/active)
  const checkTokenStatus = async () => {
    if (!selectedToken || !selectedToken.token || !selectedToken.token.address) {
      setTokenStatus('No token selected');
      return;
    }

    try {
      setTokenStatus('Checking...');
      
      const tokenAddress = selectedToken.token.address;
      addLog && addLog(`Checking token status for ${tokenAddress} via backend...`, 'info');
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch(`/api/token-status/${tokenAddress}`);
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      setTokenStatus(data.status);
      addLog && addLog(`Token status checked via backend: ${data.status}`, "info");
    } catch (error) {
      console.error('Error checking token status:', error);
      setTokenStatus('❌ Error checking status');
      addLog && addLog(`Error checking token status: ${error.message}`, "error");
    }
  };

  // Pause/Unpause token
  const setTokenPaused = async (paused) => {
    if (!selectedToken || !selectedToken.token || !selectedToken.token.address) {
      addLog && addLog('No token selected for pause/unpause operation', "error");
      return;
    }

    try {
      setPausingToken(true);
      addLog && addLog(`${paused ? 'Pausing' : 'Unpausing'} token...`, "info");

      addLog && addLog('Sending pause/unpause request to backend...', "info");
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch('/api/token/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenAddress: selectedToken.token.address,
          paused: paused
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      addLog && addLog(`✅ Token ${paused ? 'paused' : 'unpaused'} successfully via backend`, "success");
      addLog && addLog(`Transaction hash: ${data.transactionHash}`, "info");
      
      // Refresh token status
      await checkTokenStatus();
    } catch (error) {
      console.error(`Error ${paused ? 'pausing' : 'unpausing'} token:`, error);
      addLog && addLog(`Error ${paused ? 'pausing' : 'unpausing'} token: ${error.message}`, "error");
    } finally {
      setPausingToken(false);
    }
  };

  // Handle token selection
  const handleTokenSelection = (tokenData) => {
    setSelectedToken(tokenData);
    setSelectedOperationsToken(tokenData);
    if (tokenData && tokenData.token && tokenData.token.address) {
      loadTokenInfo(tokenData.token.address);
      checkTokenStatus(); // Also check status when token is selected
    } else {
      setTokenInfo(null);
      setTokenStatus('No token selected');
    }
  };

  // Check user verification
  const checkUserVerification = async () => {
    if (!selectedToken || !userAddressToCheck.trim()) {
      // Assuming setMessage is passed as a prop, otherwise this will cause an error
      // For now, we'll just log a warning.
      console.warn("Please select a token and enter a user address to check verification.");
      return;
    }

    setCheckingVerification(true);
    setVerificationResults(null);
    addLog && addLog(`Checking verification for user: ${userAddressToCheck}`, "info");

    try {
      addLog && addLog('Sending verification check request to backend...', "info");
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch(`/api/token/verify-user/${selectedToken.token.address}/${userAddressToCheck}`);
      
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      addLog && addLog(`✅ Verification check completed via backend`, "success");
      
      setVerificationResults({
        verified: data.verified,
        reason: data.reason,
        details: data.details
      });
      
      addLog && addLog(`Verification check completed. User verified: ${data.verified}`, data.verified ? "success" : "error");
      
    } catch (error) {
      console.error('Error checking verification:', error);
      const cleanError = error.message || error.toString();
      setVerificationResults({
        verified: false,
        reason: `Error checking verification: ${cleanError}`,
        details: null
      });
      addLog && addLog(`Error checking verification: ${cleanError}`, "error");
    } finally {
      setCheckingVerification(false);
    }
  };

  // Auto-select first token if available
  useEffect(() => {
    if (deploymentDetails && deploymentDetails.tokens && deploymentDetails.tokens.length > 0 && !selectedToken) {
      handleTokenSelection(deploymentDetails.tokens[0]);
    }
  }, [deploymentDetails]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Token Operations</h3>
      
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
      
      {/* Sub-tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '3px solid #dee2e6',
        marginBottom: '2rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px 8px 0 0',
        padding: '0.5rem 0.5rem 0 0.5rem'
      }}>
        <button
          onClick={() => setActiveSubTab('info')}
          style={{
            flex: 1,
            padding: '1.5rem 2rem',
            border: 'none',
            backgroundColor: activeSubTab === 'info' ? '#1a237e' : '#e9ecef',
            color: activeSubTab === 'info' ? 'white' : '#495057',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            borderRadius: '8px 8px 0 0',
            borderBottom: activeSubTab === 'info' ? '3px solid #1a237e' : '3px solid transparent',
            transition: 'all 0.3s ease',
            boxShadow: activeSubTab === 'info' ? '0 2px 8px rgba(26, 35, 126, 0.3)' : 'none',
            marginRight: '0.5rem'
          }}
        >
          📊 Token Info & Verification
        </button>
        <button
          onClick={() => setActiveSubTab('operations')}
          style={{
            flex: 1,
            padding: '1.5rem 2rem',
            border: 'none',
            backgroundColor: activeSubTab === 'operations' ? '#1a237e' : '#e9ecef',
            color: activeSubTab === 'operations' ? 'white' : '#495057',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            borderRadius: '8px 8px 0 0',
            borderBottom: activeSubTab === 'operations' ? '3px solid #1a237e' : '3px solid transparent',
            transition: 'all 0.3s ease',
            boxShadow: activeSubTab === 'operations' ? '0 2px 8px rgba(26, 35, 126, 0.3)' : 'none'
          }}
        >
          ⚡ Token Operations
        </button>
      </div>

      {/* Token Info & Verification Tab */}
      {activeSubTab === 'info' && (
        <div>
          {/* Token Selection */}
          {deploymentDetails && deploymentDetails.tokens && deploymentDetails.tokens.length > 0 ? (
            <div style={{
              padding: "1.5rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              marginBottom: "2rem",
              color: '#333'
            }}>
              <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Select Token</h4>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                  Deployed Tokens:
                </label>
                <select
                  value={selectedToken ? selectedToken.token.address : ''}
                  onChange={(e) => {
                    const token = deploymentDetails.tokens.find(t => t.token.address === e.target.value);
                    handleTokenSelection(token);
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
                  <option value="">-- Select a token --</option>
                  {deploymentDetails.tokens.map((token, index) => (
                    <option key={index} value={token.token.address}>
                      {token.token.name} ({token.token.symbol}) - {new Date(token.timestamp).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div style={{
              padding: "1.5rem",
              backgroundColor: "#fff3cd",
              color: "#856404",
              borderRadius: "8px",
              border: "1px solid #ffeaa7",
              marginBottom: "2rem"
            }}>
              <h4 style={{ color: '#856404', marginBottom: "1rem" }}>No Tokens Deployed</h4>
              <p>No tokens have been deployed yet. Please deploy a token in the Token Management tab first.</p>
            </div>
          )}
          
          {/* Token Information */}
          {selectedToken && (
      <div style={{
        padding: "1.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        marginBottom: "2rem",
        color: '#333'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "1rem" }}>
          <h4 style={{ color: '#1a237e', margin: 0 }}>Token Information</h4>
          <Button
                  onClick={() => loadTokenInfo(selectedToken.token.address)}
            disabled={loading}
            style={{ backgroundColor: "#17a2b8", color: "white" }}
          >
                  {loading ? "Loading..." : "Refresh On-Chain Data"}
          </Button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: "2rem", color: '#333' }}>
            Loading token information from blockchain...
          </div>
        ) : tokenInfo ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '0.5rem' }}>Name</div>
              <div>{tokenInfo.name}</div>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '0.5rem' }}>Symbol</div>
              <div>{tokenInfo.symbol}</div>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '0.5rem' }}>Decimals</div>
              <div>{tokenInfo.decimals}</div>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '0.5rem' }}>Total Supply</div>
              <div>{tokenInfo.totalSupply} {tokenInfo.symbol}</div>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '0.5rem' }}>Owner</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{tokenInfo.owner}</div>
            </div>
            <div style={{
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              color: '#333'
            }}>
              <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '0.5rem' }}>Contract Address</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{tokenInfo.address}</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: "2rem", color: '#666' }}>
                  No on-chain token information available. Click "Refresh On-Chain Data" to load.
                </div>
              )}
            </div>
          )}

          {/* Token Status and Pause/Unpause Controls */}
          {selectedToken && (
            <div style={{
              padding: "1.5rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "1px solid #dee2e6",
              marginBottom: "2rem",
              color: '#333'
            }}>
              <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Token Status & Controls</h4>
              
              {/* Token Status */}
              <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                <strong>Token Status:</strong> 
                <span style={{ 
                  marginLeft: '0.5rem',
                  color: tokenStatus.includes('PAUSED') ? '#dc3545' : 
                         tokenStatus.includes('ACTIVE') ? '#28a745' : 
                         tokenStatus.includes('❌') ? '#dc3545' : 
                         tokenStatus.includes('⚠️') ? '#ffc107' : '#6c757d'
                }}>
                  {tokenStatus}
                </span>
                <Button
                  onClick={checkTokenStatus}
                  disabled={pausingToken || !selectedToken}
                  style={{ marginLeft: '0.5rem', backgroundColor: '#6c757d', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                >
                  Refresh Status
                </Button>
              </div>
              
              {/* Pause/Unpause Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <Button
                  onClick={() => setTokenPaused(true)}
                  disabled={pausingToken || !selectedToken}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  {pausingToken ? 'Pausing...' : 'Pause Token'}
                </Button>
                <Button
                  onClick={() => setTokenPaused(false)}
                  disabled={pausingToken || !selectedToken}
                  style={{ backgroundColor: '#28a745', color: 'white' }}
                >
                  {pausingToken ? 'Unpausing...' : 'Unpause Token'}
                </Button>
              </div>
            </div>
          )}

          {/* User Verification Check */}
          {selectedToken && (
            <div style={{
              padding: "1.5rem",
              backgroundColor: "#e8f5e8",
              borderRadius: "8px",
              border: "1px solid #c3e6c3",
              marginBottom: "2rem",
              color: '#333'
            }}>
              <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>🔍 User Verification Check</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: "1rem" }}>
                <div>
                  <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                    User Address to Check:
                  </label>
                  <input
                    type="text"
                    value={userAddressToCheck}
                    onChange={(e) => setUserAddressToCheck(e.target.value)}
                    placeholder="0x..."
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      backgroundColor: 'white',
                      color: '#333'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <Button
                    onClick={checkUserVerification}
                    disabled={checkingVerification || !userAddressToCheck.trim()}
                    style={{ backgroundColor: "#28a745", color: "white", width: '100%' }}
                  >
                    {checkingVerification ? "Checking..." : "Check Verification"}
                  </Button>
                </div>
              </div>

              {/* Verification Results */}
              {verificationResults && (
                <div style={{
                  padding: "1rem",
                  backgroundColor: verificationResults.verified ? "#d4edda" : "#f8d7da",
                  color: verificationResults.verified ? "#155724" : "#721c24",
                  borderRadius: "4px",
                  border: `1px solid ${verificationResults.verified ? "#c3e6cb" : "#f5c6cb"}`
                }}>
                  <h5 style={{ marginBottom: "0.5rem" }}>
                    {verificationResults.verified ? "✅ VERIFIED" : "❌ NOT VERIFIED"}
                  </h5>
                  <p style={{ marginBottom: "1rem" }}>{verificationResults.reason}</p>
                  
                  {verificationResults.details && (
                    <div style={{ fontSize: '0.9rem' }}>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong>User Address:</strong> {verificationResults.details.userAddress}
                      </div>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong>OnchainID:</strong> {verificationResults.details.onchainIdAddress}
                      </div>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong>Investor Country:</strong> {verificationResults.details.investorCountry}
                      </div>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <strong>Required Topics:</strong> {verificationResults.details.requiredTopics ? verificationResults.details.requiredTopics.join(', ') : 'None'}
                      </div>
                      
                      <div style={{ marginTop: "1rem" }}>
                        <strong>Verification Details:</strong>
                        {verificationResults.details.verificationDetails && verificationResults.details.verificationDetails.map((detail, index) => (
                          <div key={index} style={{ 
                            marginLeft: "1rem", 
                            marginTop: "0.5rem",
                            padding: "0.5rem",
                            backgroundColor: "white",
                            borderRadius: "4px"
                          }}>
                            <div><strong>Topic {detail.topic || 'Unknown'}:</strong></div>
                            <div>Has Claims: {detail.hasClaims ? "✅ YES" : "❌ NO"}</div>
                            <div>Has Valid Claim: {detail.hasValidClaim ? "✅ YES" : "❌ NO"}</div>
                            <div>Trusted Issuers: {Array.isArray(detail.trustedIssuers) ? detail.trustedIssuers.length : 0}</div>
                            {Array.isArray(detail.claimDetails) && detail.claimDetails.length > 0 && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <strong>Claims:</strong>
                                {detail.claimDetails.map((claim, claimIndex) => (
                                  <div key={claimIndex} style={{ marginLeft: "1rem", fontSize: '0.8rem' }}>
                                    • {claim.claimId || 'Unknown'}: {claim.issuer || 'Unknown'} {claim.isFromTrustedIssuer ? "✅" : "❌"}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Token Operations Tab */}
      {activeSubTab === 'operations' && (
        <div>
          {selectedToken ? (
            <div>
              <div style={{
                padding: "1rem",
                backgroundColor: "#e3f2fd",
                borderRadius: "8px",
                border: "1px solid #bbdefb",
                marginBottom: "2rem",
                color: '#333'
              }}>
                <h4 style={{ color: '#1a237e', marginBottom: "0.5rem" }}>Selected Token</h4>
                <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedToken.token.name} ({selectedToken.token.symbol}) - {selectedToken.token.address}
                </div>
              </div>

              {/* Mint Operation */}
              <div style={{
                padding: "1.5rem",
                backgroundColor: "#e8f5e8",
                borderRadius: "8px",
                border: "1px solid #c3e6c3",
                marginBottom: "1rem",
                color: '#333'
              }}>
                <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>🪙 Mint Tokens</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: "1rem" }}>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      Amount:
                    </label>
                    <input
                      type="text"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      placeholder="Enter amount to mint"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      Recipient Address:
                    </label>
                    <input
                      type="text"
                      value={mintRecipient}
                      onChange={(e) => setMintRecipient(e.target.value)}
                      placeholder="0x..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleMintToken}
                  disabled={mintingToken || !mintAmount || !mintRecipient}
                  style={{ backgroundColor: "#28a745", color: "white" }}
                >
                  {mintingToken ? "Minting..." : "Mint Tokens"}
                </Button>
              </div>

              {/* Burn Operation */}
              <div style={{
                padding: "1.5rem",
                backgroundColor: "#fff3cd",
                borderRadius: "8px",
                border: "1px solid #ffeaa7",
                marginBottom: "1rem",
                color: '#333'
              }}>
                <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>🔥 Burn Tokens</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: "1rem" }}>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      Amount:
                    </label>
                    <input
                      type="text"
                      value={burnAmount}
                      onChange={(e) => setBurnAmount(e.target.value)}
                      placeholder="Enter amount to burn"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      From Address:
                    </label>
                    <input
                      type="text"
                      value={burnFrom}
                      onChange={(e) => setBurnFrom(e.target.value)}
                      placeholder="0x..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleBurnToken}
                  disabled={burningToken || !burnAmount || !burnFrom}
                  style={{ backgroundColor: "#fd7e14", color: "white" }}
                >
                  {burningToken ? "Burning..." : "Burn Tokens"}
                </Button>
              </div>

              {/* Transfer Operation */}
              <div style={{
                padding: "1.5rem",
                backgroundColor: "#e3f2fd",
                borderRadius: "8px",
                border: "1px solid #bbdefb",
                marginBottom: "1rem",
                color: '#333'
              }}>
                <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>💸 Transfer Tokens</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: "1rem" }}>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      Amount:
                    </label>
                    <input
                      type="text"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Enter amount to transfer"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      To Address:
                    </label>
                    <input
                      type="text"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="0x..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleTransferToken}
                  disabled={transferringToken || !transferAmount || !transferTo}
                  style={{ backgroundColor: "#007bff", color: "white" }}
                >
                  {transferringToken ? "Transferring..." : "Transfer Tokens"}
                </Button>
              </div>

              {/* Transfer From Operation */}
              <div style={{
                padding: "1.5rem",
                backgroundColor: "#f3e5f5",
                borderRadius: "8px",
                border: "1px solid #e1bee7",
                marginBottom: "1rem",
                color: '#333'
              }}>
                <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>🔄 Transfer From (Approved Transfer)</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: "1rem" }}>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      Amount:
                    </label>
                    <input
                      type="text"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Enter amount to transfer"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      From Address:
                    </label>
                    <input
                      type="text"
                      value={transferFrom}
                      onChange={(e) => setTransferFrom(e.target.value)}
                      placeholder="0x..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
                      To Address:
                    </label>
                    <input
                      type="text"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="0x..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        backgroundColor: 'white',
                        color: '#333'
                      }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleTransferFromToken}
                  disabled={transferringToken || !transferAmount || !transferFrom || !transferTo}
                  style={{ backgroundColor: "#6f42c1", color: "white" }}
                >
                  {transferringToken ? "Transferring..." : "Transfer From"}
                </Button>
              </div>


            </div>
          ) : (
            <div style={{
              padding: "1.5rem",
              backgroundColor: "#fff3cd",
              color: "#856404",
              borderRadius: "8px",
              border: "1px solid #ffeaa7",
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#856404', marginBottom: "1rem" }}>No Token Selected</h4>
              <p>Please go to the "Token Info & Verification" tab to select a token first.</p>
          </div>
        )}
      </div>
      )}
      
      {/* Token Operations Status */}
      <div style={{
        padding: "1.5rem",
        backgroundColor: "#e8f5e8",
        borderRadius: "8px",
        border: "1px solid #c3e6c3",
        color: '#333'
      }}>
        <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Token Operations Status</h4>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          <p>✅ Token selection and information display is working</p>
          <p>✅ Token status checking and pause/unpause controls</p>
          <p>✅ User verification checks with detailed compliance analysis</p>
          <p>✅ Token operations (mint, burn, transfer, transferFrom) are available</p>
          <p>📊 Currently showing {deploymentDetails?.tokens?.length || 0} deployed tokens</p>
          <p>⚠️ Note: Token operations require proper permissions and compliance checks</p>
        </div>
      </div>
    </div>
  );
};

export default TokenOperationsTab; 