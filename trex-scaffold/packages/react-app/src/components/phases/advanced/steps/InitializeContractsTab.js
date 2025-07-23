import React from 'react';

const InitializeContractsTab = ({
  deployedContracts,
  initializing,
  initializeContract
}) => (
  <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
    <h3>Step 2: Initialize Contracts</h3>
    <p>Initialize the deployed contracts with their required setup.</p>
    {Object.keys(deployedContracts).length === 0 ? (
      <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
        No contracts deployed yet. Please deploy contracts in Step 1 first.
      </div>
    ) : (
      <div>
        <h4>Available Contracts for Initialization:</h4>
        {Object.entries(deployedContracts).map(([name, addresses]) => (
          <div key={name} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h5>{name}</h5>
            {Array.isArray(addresses) ? (
              addresses.map((address, index) => (
                <div key={index} style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.9rem',
                  padding: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{address} {index === 0 ? '(Latest)' : ''}</span>
                  <button
                    onClick={() => initializeContract(name, address)}
                    disabled={initializing}
                    style={{ backgroundColor: '#28a745', color: 'white', padding: '0.25rem 0.75rem', border: 'none', borderRadius: '4px', cursor: initializing ? 'not-allowed' : 'pointer', opacity: initializing ? 0.6 : 1 }}
                  >
                    {initializing ? 'Initializing...' : 'Initialize'}
                  </button>
                </div>
              ))
            ) : (
              <div style={{ 
                fontFamily: 'monospace', 
                fontSize: '0.9rem',
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>{addresses}</span>
                <button
                  onClick={() => initializeContract(name, addresses)}
                  disabled={initializing}
                  style={{ backgroundColor: '#28a745', color: 'white', padding: '0.25rem 0.75rem', border: 'none', borderRadius: '4px', cursor: initializing ? 'not-allowed' : 'pointer', opacity: initializing ? 0.6 : 1 }}
                >
                  {initializing ? 'Initializing...' : 'Initialize'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default InitializeContractsTab; 