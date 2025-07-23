import React from 'react';

const DeployCoreContractsTab = ({
  deployedContracts,
  deploying,
  deployContract
}) => (
  <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
    <h3>Step 1: Deploy Core Contracts</h3>
    <p>Deploy the essential T-REX contracts in the correct order.</p>
    
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <button
        onClick={() => deployContract('ClaimTopicsRegistry')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: deploying ? 'not-allowed' : 'pointer', opacity: deploying ? 0.6 : 1 }}
      >
        {deploying ? 'Deploying...' : 'Deploy ClaimTopicsRegistry'}
      </button>
      <button
        onClick={() => deployContract('TrustedIssuersRegistry')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: deploying ? 'not-allowed' : 'pointer', opacity: deploying ? 0.6 : 1 }}
      >
        {deploying ? 'Deploying...' : 'Deploy TrustedIssuersRegistry'}
      </button>
      <button
        onClick={() => deployContract('IdentityRegistryStorage')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: deploying ? 'not-allowed' : 'pointer', opacity: deploying ? 0.6 : 1 }}
      >
        {deploying ? 'Deploying...' : 'Deploy IdentityRegistryStorage'}
      </button>
      <button
        onClick={() => deployContract('IdentityRegistry')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: deploying ? 'not-allowed' : 'pointer', opacity: deploying ? 0.6 : 1 }}
      >
        {deploying ? 'Deploying...' : 'Deploy IdentityRegistry'}
      </button>
      <button
        onClick={() => deployContract('ModularCompliance')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: deploying ? 'not-allowed' : 'pointer', opacity: deploying ? 0.6 : 1 }}
      >
        {deploying ? 'Deploying...' : 'Deploy ModularCompliance'}
      </button>
    </div>

    {/* Show deployed contracts */}
    {Object.keys(deployedContracts).length > 0 && (
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Deployed Contracts:</h4>
        {Object.entries(deployedContracts).map(([name, addresses]) => (
          <div key={name} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
            <div><strong>{name}</strong> ({Array.isArray(addresses) ? addresses.length : 1})</div>
            {Array.isArray(addresses) ? (
              addresses.map((address, index) => (
                <div key={index} style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.9rem',
                  padding: '0.25rem 0',
                  borderBottom: index < addresses.length - 1 ? '1px solid #eee' : 'none'
                }}>
                  {index + 1}. {address} {index === 0 ? '(Latest)' : ''}
                </div>
              ))
            ) : (
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {addresses}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default DeployCoreContractsTab; 