import React from 'react';

const ConfigureIdentityRegistryTab = ({
  deployedContracts,
  selectedContracts,
  setSelectedContracts,
  configuring,
  configureIdentityRegistry,
  reloadDeploymentState,
  addLog
}) => {
  // Clear message when component mounts or when key props change
  React.useEffect(() => {
    // This ensures the message is cleared when switching to this tab
    // The actual message clearing is handled by the parent DeploymentPhase.js
  }, [deployedContracts, selectedContracts]);

  // Contract Selector Component
  const ContractSelector = ({ contractType, contracts, selectedAddress, onSelect, title, description }) => {
    // Handle both formats: contracts as array or contracts as object with contractType key
    let contractAddresses;
    if (Array.isArray(contracts)) {
      // Direct array format (used in token deployment)
      contractAddresses = contracts;
    } else {
      // Object format with contractType key (used in other phases)
      contractAddresses = contracts[contractType] || [];
    }
    
    if (!Array.isArray(contractAddresses)) {
      // Single contract case
      return (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '15px', 
          marginTop: '15px',
          backgroundColor: '#f9f9f9'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📋 {title}</h4>
          <p style={{ margin: '0 0 10px 0', color: '#666' }}>{description}</p>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '10px', 
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <strong>Selected:</strong> {contracts[contractType] || 'None found'}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '15px', 
        marginTop: '15px',
        backgroundColor: '#f9f9f9'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📋 {title}</h4>
        <p style={{ margin: '0 0 10px 0', color: '#666' }}>{description}</p>
        
        {contractAddresses.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            No {contractType} contracts found
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Select {contractType}:
            </label>
            <select
              value={selectedAddress || ''}
              onChange={(e) => onSelect(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: 'white'
              }}
            >
              <option value="">-- Select a contract --</option>
              {contractAddresses.map((address, index) => (
                <option key={index} value={address}>
                  {address} {index === 0 ? '(Latest)' : ''}
                </option>
              ))}
            </select>
            
            {selectedAddress && (
              <div style={{ 
                marginTop: '10px',
                backgroundColor: 'white', 
                padding: '10px', 
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}>
                <strong>Selected:</strong> {selectedAddress}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
      <h3>Step 3: Configure Identity Registry</h3>
      <p>Connect the Identity Registry to the other registries to establish the T-REX ecosystem.</p>
      
      {Object.keys(deployedContracts).length === 0 ? (
        <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
          No contracts deployed yet. Please deploy contracts in Step 1 first.
        </div>
      ) : (
        <div>
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
          
          {/* Contract Selectors for Configuration */}
          <ContractSelector
            contractType="IdentityRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
            title="Identity Registry to Configure"
            description="Select which Identity Registry to configure"
          />
          
          <ContractSelector
            contractType="TrustedIssuersRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.TrustedIssuersRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, TrustedIssuersRegistry: address }))}
            title="Trusted Issuers Registry"
            description="Select which TrustedIssuersRegistry to connect"
          />
          
          <ContractSelector
            contractType="ClaimTopicsRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.ClaimTopicsRegistry}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, ClaimTopicsRegistry: address }))}
            title="Claim Topics Registry"
            description="Select which ClaimTopicsRegistry to connect"
          />
          
          <ContractSelector
            contractType="IdentityRegistryStorage"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistryStorage}
            onSelect={(address) => setSelectedContracts(prev => ({ ...prev, IdentityRegistryStorage: address }))}
            title="Identity Registry Storage"
            description="Select which IdentityRegistryStorage to connect"
          />
          
          {/* Show what connections will be made */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3' }}>
            <h4>Connections to be established:</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2196f3', fontWeight: 'bold' }}>→</span>
                <span><strong>TrustedIssuersRegistry:</strong></span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedContracts.TrustedIssuersRegistry || 'Not selected'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2196f3', fontWeight: 'bold' }}>→</span>
                <span><strong>ClaimTopicsRegistry:</strong></span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedContracts.ClaimTopicsRegistry || 'Not selected'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2196f3', fontWeight: 'bold' }}>→</span>
                <span><strong>IdentityRegistryStorage:</strong></span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedContracts.IdentityRegistryStorage || 'Not selected'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={configureIdentityRegistry}
            disabled={configuring || !selectedContracts.IdentityRegistry || !selectedContracts.ClaimTopicsRegistry || !selectedContracts.TrustedIssuersRegistry || !selectedContracts.IdentityRegistryStorage}
            style={{ 
              backgroundColor: configuring ? '#6c757d' : '#007bff', 
              color: 'white', 
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: configuring ? 'not-allowed' : 'pointer',
              opacity: configuring ? 0.6 : 1
            }}
          >
            {configuring ? 'Configuring...' : 'Configure All Connections'}
          </button>
          
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            <p><strong>What this does:</strong></p>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Calls <code>setTrustedIssuersRegistry()</code> to link Identity Registry to Trusted Issuers Registry</li>
              <li>Calls <code>setClaimTopicsRegistry()</code> to link Identity Registry to Claim Topics Registry</li>
              <li>Calls <code>setIdentityRegistryStorage()</code> to link Identity Registry to Identity Registry Storage</li>
              <li>Calls <code>bindIdentityRegistry()</code> to establish bilateral binding between IR and IRS</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigureIdentityRegistryTab; 