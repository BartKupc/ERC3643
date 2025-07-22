import React from 'react';
import { Button, ContractSelector } from '../../shared';

const InitializeContractsTab = ({
  deployedContracts,
  selectedContracts,
  setSelectedContracts,
  reloadDeploymentState,
  addLog,
  deploying
}) => (
  <div>
    <h3>Step 2: Initialize Contracts</h3>
    <p>Initialize the deployed contracts with their required setup.</p>
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
      contractType="ClaimTopicsRegistry"
      contracts={deployedContracts}
      selectedAddress={selectedContracts.ClaimTopicsRegistry}
      onSelect={address => setSelectedContracts(prev => ({ ...prev, ClaimTopicsRegistry: address }))}
      title="Claim Topics Registry"
      description="Select the ClaimTopicsRegistry to initialize"
    />
    <ContractSelector
      contractType="TrustedIssuersRegistry"
      contracts={deployedContracts}
      selectedAddress={selectedContracts.TrustedIssuersRegistry}
      onSelect={address => setSelectedContracts(prev => ({ ...prev, TrustedIssuersRegistry: address }))}
      title="Trusted Issuers Registry"
      description="Select the TrustedIssuersRegistry to initialize"
    />
    <ContractSelector
      contractType="IdentityRegistryStorage"
      contracts={deployedContracts}
      selectedAddress={selectedContracts.IdentityRegistryStorage}
      onSelect={address => setSelectedContracts(prev => ({ ...prev, IdentityRegistryStorage: address }))}
      title="Identity Registry Storage"
      description="Select the IdentityRegistryStorage to initialize"
    />
    <ContractSelector
      contractType="IdentityRegistry"
      contracts={deployedContracts}
      selectedAddress={selectedContracts.IdentityRegistry}
      onSelect={address => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
      title="Identity Registry"
      description="Select the IdentityRegistry to initialize"
    />
    <ContractSelector
      contractType="ModularCompliance"
      contracts={deployedContracts}
      selectedAddress={selectedContracts.ModularCompliance}
      onSelect={address => setSelectedContracts(prev => ({ ...prev, ModularCompliance: address }))}
      title="ModularCompliance"
      description="Select the ModularCompliance contract to initialize"
    />
  </div>
);

export default InitializeContractsTab; 