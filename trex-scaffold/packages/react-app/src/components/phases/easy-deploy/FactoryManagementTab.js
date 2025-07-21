import React from 'react';
import { Button } from '../shared';

const FactoryManagementTab = ({
  selectedFactory,
  factories,
  handleFactoryChange,
  handleDeployFactory,
  deployingFactory,
  deploymentDetails
}) => (
  <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
    <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Factory Management</h3>
    
    {/* Factory Selection */}
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <label style={{ color: '#1a237e', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Select Factory:</label>
          <select
            value={selectedFactory?.deploymentId || ''}
            onChange={e => {
              if (e.target.value === '') {
                handleFactoryChange(null);
              } else {
                const factory = factories.find(f => f.deploymentId === e.target.value);
                handleFactoryChange(factory);
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
                {factory.address} - {factory.network} - {factory.tokenCount} tokens - {new Date(factory.timestamp).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleDeployFactory}
          disabled={deployingFactory}
          style={{ backgroundColor: '#007bff', color: 'white', minWidth: 160, height: 'fit-content' }}
        >
          {deployingFactory ? 'Deploying...' : 'Deploy New Factory'}
        </Button>
      </div>
    </div>

    {/* Factory Details */}
    {selectedFactory && (
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Factory Details</h4>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          color: '#333'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem',
            fontSize: '0.9rem'
          }}>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Address:</strong> 
              <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedFactory.address}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Network:</strong> 
              <div style={{ marginTop: '0.25rem' }}>{selectedFactory.network}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Deployment ID:</strong> 
              <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{selectedFactory.deploymentId}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Token Count:</strong> 
              <div style={{ marginTop: '0.25rem' }}>{selectedFactory.tokenCount}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Deployed:</strong> 
              <div style={{ marginTop: '0.25rem' }}>{new Date(selectedFactory.timestamp).toLocaleString()}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Transaction Hash:</strong> 
              <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>
                {selectedFactory.transaction?.hash || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Deployment Details */}
    {deploymentDetails && (
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Deployment Details</h4>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          color: '#333'
        }}>
          {/* Basic Details */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Deployment ID:</strong> 
              <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.deploymentId}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Network:</strong> 
              <div style={{ marginTop: '0.25rem' }}>{deploymentDetails.network}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Deployer:</strong> 
              <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.deployer}</div>
            </div>
            <div style={{ color: '#333' }}>
              <strong style={{ color: '#1a237e' }}>Deployed:</strong> 
              <div style={{ marginTop: '0.25rem' }}>{new Date(deploymentDetails.timestamp).toLocaleString()}</div>
            </div>
          </div>

          {/* Factory Details */}
          {deploymentDetails.factory && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🏭 Factory Contracts:</h5>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>TREXFactory:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.factory.address}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                    Owner: {deploymentDetails.factory.owner}
                  </div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Implementation Authority:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.factory.implementationAuthority}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>ID Factory:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.factory.idFactory}</div>
                </div>
              </div>
            </div>
          )}

          {/* Gateway Details */}
          {deploymentDetails.gateway && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🚪 Gateway Contract:</h5>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>TREXGateway:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.gateway.address}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                    Owner: {deploymentDetails.gateway.owner}
                  </div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Factory:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.gateway.factory}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Public Deployment:</strong> 
                  <div style={{ marginTop: '0.25rem' }}>
                    {deploymentDetails.gateway.publicDeploymentStatus ? '✅ Enabled' : '❌ Disabled'}
                  </div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Fee Collection:</strong> 
                  <div style={{ marginTop: '0.25rem' }}>
                    {deploymentDetails.gateway.feeEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Implementation Contracts */}
          {deploymentDetails.implementations && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🔧 Implementation Contracts:</h5>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Token Implementation:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.implementations.token}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Identity Registry:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.implementations.identityRegistry}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Identity Registry Storage:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.implementations.identityRegistryStorage}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Claim Topics Registry:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.implementations.claimTopicsRegistry}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Trusted Issuers Registry:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.implementations.trustedIssuersRegistry}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Modular Compliance:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.implementations.modularCompliance}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Identity Implementation:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.implementations.identity}</div>
                </div>
              </div>
            </div>
          )}

          {/* Authority Contracts */}
          {deploymentDetails.authorities && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🏛️ Authority Contracts:</h5>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Identity Implementation Authority:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.authorities.identityImplementationAuthority}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>TREX Implementation Authority:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.authorities.trexImplementationAuthority}</div>
                </div>
              </div>
            </div>
          )}

          {/* Factory Contracts */}
          {deploymentDetails.factories && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🏭 All Factory Contracts:</h5>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Identity Factory:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.factories.identityFactory}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>TREX Factory:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.factories.trexFactory}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>TREX Gateway:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.factories.trexGateway}</div>
                </div>
              </div>
            </div>
          )}

          {/* Suite Components (for backward compatibility) */}
          {deploymentDetails.suite && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🎯 Token Suite Components:</h5>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '1rem',
                fontSize: '0.9rem'
              }}>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Identity Registry:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.suite.identityRegistry}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Compliance:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.suite.compliance}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Claim Topics Registry:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.suite.claimTopicsRegistry}</div>
                </div>
                <div style={{ color: '#333' }}>
                  <strong style={{ color: '#1a237e' }}>Trusted Issuers Registry:</strong> 
                  <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>{deploymentDetails.suite.trustedIssuersRegistry}</div>
                </div>
              </div>
            </div>
          )}

          {/* Deployed Tokens */}
          {deploymentDetails.tokens && deploymentDetails.tokens.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #dee2e6' }}>
              <h5 style={{ color: '#1a237e', marginBottom: '1rem' }}>🎯 Deployed Tokens ({deploymentDetails.tokens.length}):</h5>
              <div style={{ 
                maxHeight: 300, 
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {deploymentDetails.tokens.map((token, index) => (
                  <div key={index} style={{ 
                    padding: '1rem', 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #dee2e6',
                    color: '#333'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#1a237e', marginBottom: '0.5rem' }}>
                      {token.token.name} ({token.token.symbol})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                      <strong>Address:</strong> {token.token.address}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      <strong>Decimals:</strong> {token.token.decimals}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

export default FactoryManagementTab; 