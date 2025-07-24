import React, { useState } from 'react';

const AddTrustedIssuerTab = ({
  deployedContracts = {},
  selectedContracts = {},
  setSelectedContracts = () => {},
  deployClaimIssuerAndAddAsTrusted = () => {},
  reloadDeploymentState = () => {},
  addLog = () => {},
  deploying = false
}) => {
  const [selectedTopics, setSelectedTopics] = useState([1, 2, 3]); // Default: KYC, AML, Accredited Investor

  const handleTopicToggle = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleDeployClaimIssuer = () => {
    if (selectedTopics.length === 0) {
      addLog('Please select at least one claim topic', "error");
      return;
    }
    deployClaimIssuerAndAddAsTrusted(selectedTopics);
  };

  const claimTopics = [
    { id: 1, name: "KYC (Know Your Customer)" },
    { id: 2, name: "AML (Anti-Money Laundering)" },
    { id: 3, name: "Accredited Investor" },
    { id: 4, name: "EU Nationality Confirmed" },
    { id: 5, name: "US Nationality Confirmed" },
    { id: 6, name: "Blacklist" }
  ];

  return (
    <div>
      <h3>Step 5: Add Trusted Issuer</h3>
      <p>Create a ClaimIssuer contract and add it as a trusted issuer with specific claim topics.</p>
      
      {/* Refresh and Auto-Select Button */}
      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>🔄 Auto-Select Latest Contracts</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1976d2' }}>
              Click to refresh deployment state and automatically select the latest deployed contracts
            </p>
          </div>
          <button
            onClick={() => {
              reloadDeploymentState();
              addLog("Manually refreshed and auto-selected latest contracts", "info");
            }}
            style={{ backgroundColor: '#2196f3', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            🔄 Refresh & Auto-Select
          </button>
        </div>
      </div>
      
      {/* TrustedIssuersRegistry Selector */}
      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#495057' }}>Trusted Issuers Registry</h4>
        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6c757d' }}>
          Select which TrustedIssuersRegistry to add trusted issuer to
        </p>
        
        {deployedContracts.TrustedIssuersRegistry && deployedContracts.TrustedIssuersRegistry.length > 0 ? (
          <select
            value={selectedContracts.TrustedIssuersRegistry || ''}
            onChange={(e) => setSelectedContracts(prev => ({ ...prev, TrustedIssuersRegistry: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          >
            <option value="">-- Select TrustedIssuersRegistry --</option>
            {deployedContracts.TrustedIssuersRegistry.map((address, index) => (
              <option key={address} value={address}>
                {index === 0 ? 'Latest' : `#${index + 1}`}: {address.slice(0, 8)}...{address.slice(-6)}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ color: '#dc3545', fontStyle: 'italic' }}>
            No TrustedIssuersRegistry found. Please deploy one in Step 1 first.
          </div>
        )}
      </div>
      
      {/* Claim Topics Selection */}
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
        <h4 style={{ marginBottom: '1rem', color: '#495057' }}>Select Claim Topics for Trusted Issuer</h4>
        <p style={{ marginBottom: '1rem', color: '#6c757d', fontSize: '0.9rem' }}>
          Choose which claim topics this trusted issuer can issue:
        </p>
        
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
          {claimTopics.map(topic => (
            <label key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={selectedTopics.includes(topic.id)}
                onChange={() => handleTopicToggle(topic.id)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span><strong>Topic {topic.id}:</strong> {topic.name}</span>
            </label>
          ))}
        </div>
        
        <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '1rem' }}>
          <strong>Note:</strong> The trusted issuer will only be able to issue claims for the selected topics.
        </div>
      </div>
      
      <button
        onClick={handleDeployClaimIssuer}
        disabled={deploying || !selectedContracts.TrustedIssuersRegistry || selectedTopics.length === 0}
        style={{ 
          backgroundColor: deploying ? '#6c757d' : '#007bff', 
          color: 'white', 
          padding: '0.75rem 1.5rem',
          border: 'none',
          borderRadius: '4px',
          cursor: deploying ? 'not-allowed' : 'pointer',
          fontSize: '1rem'
        }}
      >
        {deploying ? 'Deploying ClaimIssuer...' : 'Deploy ClaimIssuer & Add as Trusted'}
      </button>
      
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
};

export default AddTrustedIssuerTab;