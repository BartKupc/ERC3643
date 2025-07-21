import React from 'react';
import { Button } from '../shared';

const TokenManagementTab = ({
  selectedFactory,
  factories,
  handleFactoryChange,
  tokenDetails,
  setTokenDetails,
  handleDeployToken,
  deployingToken,
  deploymentDetails,
  selectedToken,
  setSelectedToken,
  claimIssuers,
  setClaimIssuers,
  selectedClaimIssuer,
  setSelectedClaimIssuer,
  handleDeployClaimIssuer,
  claimTopics,
  setClaimTopics,
  selectedClaimTopics,
  setSelectedClaimTopics,
  addingClaimIssuer
}) => (
  <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
    <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Token Management</h3>
    
    {/* Step 1: Claim Issuer Setup */}
    <div style={{ margin: "2rem 0" }}>
      <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Step 1: Claim Issuer Setup</h4>
      <div style={{ 
        padding: "1.5rem", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        marginBottom: "1rem",
        color: '#333'
      }}>
        <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>Claim Issuer</h5>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
              Select Claim Issuer:
            </label>
            <select
              value={selectedClaimIssuer}
              onChange={(e) => setSelectedClaimIssuer(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "0.5rem", 
                borderRadius: "4px", 
                border: "1px solid #ccc",
                backgroundColor: 'white',
                color: '#333'
              }}
            >
              <option value="">-- Select a claim issuer --</option>
              {claimIssuers.map((issuer, index) => (
                <option key={index} value={issuer.address}>
                  {issuer.address} - {issuer.name || 'Unnamed Issuer'}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleDeployClaimIssuer}
            disabled={addingClaimIssuer}
            style={{ 
              backgroundColor: addingClaimIssuer ? "#6c757d" : "#28a745", 
              color: "white", 
              padding: "0.5rem 1rem", 
              fontSize: "1rem", 
              minWidth: 160,
              height: 'fit-content',
              cursor: addingClaimIssuer ? 'not-allowed' : 'pointer',
              opacity: addingClaimIssuer ? 0.7 : 1,
              transition: 'all 0.2s ease-in-out',
              transform: addingClaimIssuer ? 'scale(0.98)' : 'scale(1)',
              boxShadow: addingClaimIssuer ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseDown={(e) => {
              if (!addingClaimIssuer) {
                e.target.style.transform = 'scale(0.95)';
                e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
              }
            }}
            onMouseUp={(e) => {
              if (!addingClaimIssuer) {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!addingClaimIssuer) {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }
            }}
          >
            {addingClaimIssuer ? "Deploying..." : "Deploy New Claim Issuer"}
          </Button>
        </div>
      </div>

      {/* Claim Topics Selection */}
      <div style={{ 
        padding: "1.5rem", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        marginBottom: "1rem",
        color: '#333'
      }}>
        <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>Claim Topics</h5>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
            Select Claim Topics:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem' }}>
            {[
              { id: 1, name: 'KYC (Know Your Customer)' },
              { id: 2, name: 'AML (Anti-Money Laundering)' },
              { id: 3, name: 'Accredited Investor' },
              { id: 4, name: 'EU Nationality Confirmed' },
              { id: 5, name: 'US Nationality Confirmed' },
              { id: 6, name: 'Blacklist' }
            ].map(topic => (
              <label key={topic.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '0.75rem', 
                backgroundColor: 'white', 
                borderRadius: '4px', 
                border: '1px solid #dee2e6',
                cursor: 'pointer',
                color: '#333'
              }}>
                <input
                  type="checkbox"
                  checked={selectedClaimTopics.includes(topic.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClaimTopics([...selectedClaimTopics, topic.id]);
                    } else {
                      setSelectedClaimTopics(selectedClaimTopics.filter(id => id !== topic.id));
                    }
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Topic {topic.id}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{topic.name}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Step 2: Token Deployment */}
    <div style={{ margin: "2rem 0" }}>
      <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Step 2: Deploy Token</h4>
      
      {/* Token Details Form */}
      <div style={{ 
        padding: "1.5rem", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        border: "1px solid #dee2e6",
        marginBottom: "1rem",
        color: '#333'
      }}>
        <h5 style={{ color: '#1a237e', marginBottom: "1rem" }}>Token Details</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
              Token Name:
            </label>
            <input
              type="text"
              value={tokenDetails.name}
              onChange={(e) => setTokenDetails({...tokenDetails, name: e.target.value})}
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
              Token Symbol:
            </label>
            <input
              type="text"
              value={tokenDetails.symbol}
              onChange={(e) => setTokenDetails({...tokenDetails, symbol: e.target.value})}
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
              Decimals:
            </label>
            <input
              type="number"
              value={tokenDetails.decimals}
              onChange={(e) => setTokenDetails({...tokenDetails, decimals: parseInt(e.target.value)})}
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
              Total Supply:
            </label>
            <input
              type="text"
              value={tokenDetails.totalSupply}
              onChange={(e) => setTokenDetails({...tokenDetails, totalSupply: e.target.value})}
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
      </div>



      {/* Deploy Button */}
      <div style={{ textAlign: 'center' }}>
        <Button
          onClick={handleDeployToken}
          disabled={deployingToken || !tokenDetails.name || !tokenDetails.symbol || !selectedClaimIssuer || selectedClaimTopics.length === 0}
          style={{ 
            backgroundColor: "#007bff", 
            color: "white", 
            padding: "1rem 2rem", 
            fontSize: "1.1rem", 
            minWidth: 200,
            borderRadius: '8px'
          }}
        >
          {deployingToken ? 'Deploying Token...' : 'Deploy Token'}
        </Button>
      </div>
    </div>

    {/* Step 3: Token Details Display */}
    {deploymentDetails && deploymentDetails.tokens && deploymentDetails.tokens.length > 0 && (
      <div style={{ margin: "2rem 0" }}>
        <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Step 3: Deployed Tokens</h4>
        <div style={{ 
          padding: "1.5rem", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          color: '#333'
        }}>
          <label style={{ color: '#1a237e', fontWeight: 'bold', marginBottom: "0.5rem", display: 'block' }}>
            Select Token:
          </label>
          <select 
            value={selectedToken ? selectedToken.token.address : ''} 
            onChange={(e) => {
              const token = deploymentDetails.tokens.find(t => t.token.address === e.target.value);
              setSelectedToken(token);
            }}
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              borderRadius: "4px", 
              border: "1px solid #ccc",
              backgroundColor: 'white',
              color: '#333',
              marginBottom: '1rem'
            }}
          >
            <option value="">Select a token...</option>
            {deploymentDetails.tokens.map((token, index) => (
              <option key={index} value={token.token.address}>
                {token.token.name} ({token.token.symbol}) - {token.token.address}
              </option>
            ))}
          </select>

          {/* Selected Token Details */}
          {selectedToken && (
            <div style={{ marginTop: '1.5rem' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🎯 Token Details</h5>
              
              {/* Basic Token Information */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Token Name:</strong> 
                  <div style={{ marginTop: '0.25rem' }}>{selectedToken.token.name}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Token Symbol:</strong> 
                  <div style={{ marginTop: '0.25rem' }}>{selectedToken.token.symbol}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Token Address:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.token.address}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Decimals:</strong> 
                  <div style={{ marginTop: '0.25rem' }}>{selectedToken.token.decimals}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Deployment ID:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.deploymentId}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Deployed:</strong> 
                  <div style={{ marginTop: '0.25rem' }}>{new Date(selectedToken.timestamp).toLocaleString()}</div>
                </div>
              </div>

              {/* Suite Components */}
              {selectedToken.suite && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
                  <h6 style={{ color: '#1a237e', marginBottom: '1rem' }}>🔧 Suite Components:</h6>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '1rem',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Identity Registry:</strong> 
                      <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.suite.identityRegistry}</div>
                    </div>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Compliance:</strong> 
                      <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.suite.compliance}</div>
                    </div>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Claim Topics Registry:</strong> 
                      <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.suite.claimTopicsRegistry}</div>
                    </div>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Trusted Issuers Registry:</strong> 
                      <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.suite.trustedIssuersRegistry}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Information */}
              {selectedToken.transaction && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
                  <h6 style={{ color: '#1a237e', marginBottom: '1rem' }}>📋 Transaction Details:</h6>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                    gap: '1rem',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Transaction Hash:</strong> 
                      <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.transaction.hash}</div>
                    </div>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Gas Used:</strong> 
                      <div style={{ marginTop: '0.25rem' }}>{selectedToken.transaction.gasUsed}</div>
                    </div>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Deployer:</strong> 
                      <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.deployer}</div>
                    </div>
                    <div style={{ color: '#333' }}>
                      <strong style={{ color: '#1a237e' }}>Salt:</strong> 
                      <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.salt}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Factory Information */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
                <h6 style={{ color: '#1a237e', marginBottom: '1rem' }}>🏭 Factory Information:</h6>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: '1rem',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1a237e' }}>Factory Address:</strong> 
                    <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedToken.factoryAddress}</div>
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1a237e' }}>Network:</strong> 
                    <div style={{ marginTop: '0.25rem' }}>{selectedToken.network}</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
                <h6 style={{ color: '#1a237e', marginBottom: '1rem' }}>⚡ Quick Actions:</h6>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  flexWrap: 'wrap'
                }}>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedToken.token.address);
                      // You could add a toast notification here
                    }}
                    style={{ 
                      backgroundColor: '#17a2b8', 
                      color: 'white', 
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    Copy Token Address
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedToken.suite.identityRegistry);
                    }}
                    style={{ 
                      backgroundColor: '#6f42c1', 
                      color: 'white', 
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    Copy IR Address
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedToken.transaction.hash);
                    }}
                    style={{ 
                      backgroundColor: '#fd7e14', 
                      color: 'white', 
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    Copy TX Hash
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

export default TokenManagementTab; 