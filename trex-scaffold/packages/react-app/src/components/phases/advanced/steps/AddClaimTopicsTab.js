import React from 'react';
import { Button, ContractSelector } from '../../shared';

const AddClaimTopicsTab = ({
  deployedContracts,
  selectedContracts,
  setSelectedContracts,
  availableClaimTopics,
  addClaimTopic,
  reloadDeploymentState,
  addLog,
  deploying
}) => (
  <div>
    <h3>Step 5: Add Claim Topics</h3>
    <p>Add essential claim topics for KYC/AML compliance.</p>
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
      onSelect={address => {
        setSelectedContracts(prev => ({ ...prev, ClaimTopicsRegistry: address }));
        if (address) {
          // Optionally, trigger loading claim topics for the selected registry
        }
      }}
      title="Claim Topics Registry"
      description="Select which ClaimTopicsRegistry to add claim topics to"
    />
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
      <Button
        onClick={() => addClaimTopic(1)}
        disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 1)}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Add Topic 1 (KYC)
      </Button>
      <Button
        onClick={() => addClaimTopic(2)}
        disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 2)}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Add Topic 2 (AML)
      </Button>
      <Button
        onClick={() => addClaimTopic(3)}
        disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 3)}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Add Topic 3 (Accreditation)
      </Button>
      <Button
        onClick={() => addClaimTopic(4)}
        disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 4)}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Add Topic 4 (EU Nationality)
      </Button>
      <Button
        onClick={() => addClaimTopic(5)}
        disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 5)}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Add Topic 5 (US Nationality)
      </Button>
    </div>
    {/* Optionally, show checkboxes for topics and info about what this does */}
    <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
      <p><strong>What this does:</strong></p>
      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
        <li>Deploys a ClaimIssuer contract (specialized Identity for issuing claims)</li>
        <li>Adds your address as the management key to the ClaimIssuer</li>
        <li>Adds a signing key to the ClaimIssuer for signing claims</li>
        <li>Registers the ClaimIssuer as a trusted issuer in the TrustedIssuersRegistry</li>
        <li>Specifies which claim topics this issuer can issue</li>
      </ul>
    </div>
  </div>
);

export default AddClaimTopicsTab; 