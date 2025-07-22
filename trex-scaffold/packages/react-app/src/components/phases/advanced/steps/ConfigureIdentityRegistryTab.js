import React from 'react';
import { Button, ContractSelector } from '../../shared';

const ConfigureIdentityRegistryTab = ({
  deployedContracts,
  selectedContracts,
  setSelectedContracts,
  reloadDeploymentState,
  addLog,
  deploying
}) => (
  <div>
    <h3>Step 3: Configure Identity Registry</h3>
    <p>Connect the Identity Registry to the other registries to establish the T-REX ecosystem.</p>
    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>🔄 Auto-Select Latest Contracts</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976d2' }}>
            Click to refresh deployment state and automatically select the latest deployed contracts
          </p>
        </div>
        <Button
          onClick={() => {
            reloadDeploymentState();
            addLog && addLog("Manually refreshed and auto-selected latest contracts", "info");
          }}
          style={{ backgroundColor: '#2196f3', color: 'white', padding: '0.5rem 1rem' }}
        >
          🔄 Refresh & Auto-Select
        </Button>
      </div>
    </div>
    <ContractSelector
      contractType="IdentityRegistry"
      contracts={deployedContracts}
      selectedAddress={selectedContracts.IdentityRegistry}
      onSelect={address => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
      title="Identity Registry to Configure"
      description="Select which Identity Registry to configure"
    />
    {/* Add more configuration UI as needed */}
  </div>
);

export default ConfigureIdentityRegistryTab; 