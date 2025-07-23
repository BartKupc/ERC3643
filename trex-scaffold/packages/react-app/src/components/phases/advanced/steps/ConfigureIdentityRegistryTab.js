import React from 'react';

const ConfigureIdentityRegistryTab = ({
  deployedContracts,
  configuring,
  configureIdentityRegistry
}) => (
  <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
    <h3>Step 3: Configure Identity Registry</h3>
    <p>Configure the Identity Registry contract with the required parameters.</p>
    {Object.keys(deployedContracts).length === 0 ? (
      <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
        No contracts deployed yet. Please deploy contracts in Step 1 first.
      </div>
    ) : (
      <div>
        <h4>Identity Registry Configuration</h4>
        <button
          onClick={configureIdentityRegistry}
          disabled={configuring}
          style={{ backgroundColor: '#17a2b8', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: configuring ? 'not-allowed' : 'pointer', opacity: configuring ? 0.6 : 1 }}
        >
          {configuring ? 'Configuring...' : 'Configure Identity Registry'}
        </button>
      </div>
    )}
  </div>
);

export default ConfigureIdentityRegistryTab; 