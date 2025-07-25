import React from 'react';

const AddClaimTopicsTab = ({
  deployedContracts,
  selectedContracts,
  setSelectedContracts,
  availableClaimTopics,
  loadingClaimTopics,
  addClaimTopic,
  removeClaimTopic,
  loadClaimTopics,
  reloadDeploymentState,
  addLog,
  deploying,
  message
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

  // Button Component
  const Button = ({ children, onClick, disabled, style }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontSize: '14px',
        fontWeight: '500',
        ...style
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
      {/* Green message box at the top */}
      {typeof message !== 'undefined' && message && (
        <div style={{ color: message.includes('Error') ? '#721c24' : '#155724', backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>{message}</div>
      )}
      <h3>Step 4: Add Claim Topics</h3>
      <p>Add essential claim topics for KYC/AML compliance.</p>
      
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
              <Button
                onClick={() => {
                  reloadDeploymentState();
                  addLog("Manually refreshed and auto-selected latest contracts", "info");
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
            onSelect={(address) => {
              setSelectedContracts(prev => ({ ...prev, ClaimTopicsRegistry: address }));
              if (address) {
                loadClaimTopics(address);
              }
            }}
            title="Claim Topics Registry"
            description="Select which ClaimTopicsRegistry to add claim topics to"
          />
          
          <Button
            onClick={() => {
              if (selectedContracts.ClaimTopicsRegistry) {
                loadClaimTopics(selectedContracts.ClaimTopicsRegistry);
              }
            }}
            disabled={!selectedContracts.ClaimTopicsRegistry || loadingClaimTopics}
            style={{ backgroundColor: '#17a2b8', color: 'white', marginBottom: '1rem', marginLeft: '0.5rem' }}
          >
            {loadingClaimTopics ? 'Loading...' : 'Refresh Claim Topics'}
          </Button>
          
          {/* Display existing claim topics */}
          {selectedContracts.ClaimTopicsRegistry && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#495057' }}>Current Claim Topics:</h4>
              {loadingClaimTopics ? (
                <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Loading claim topics...</div>
              ) : availableClaimTopics.length === 0 ? (
                <div style={{ color: '#6c757d', fontStyle: 'italic' }}>No claim topics found in this registry.</div>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {availableClaimTopics.map((topic, index) => (
                    <div key={topic.id} style={{ 
                      padding: '0.5rem', 
                      backgroundColor: '#fff', 
                      border: '1px solid #ced4da', 
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: '#495057' }}>{topic.name}</strong>
                        <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>ID: {topic.id}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>{topic.description}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '3px', 
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          ✓ Added
                        </div>
                        <Button
                          onClick={() => removeClaimTopic(topic.id)}
                          disabled={deploying}
                          style={{ 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            padding: '0.25rem 0.5rem', 
                            fontSize: '0.8rem',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: deploying ? 'not-allowed' : 'pointer'
                          }}
                        >
                          🗑️ Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
            <Button
              onClick={() => addClaimTopic(6)}
              disabled={deploying || !selectedContracts.ClaimTopicsRegistry || availableClaimTopics.some(t => t.id === 6)}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Add Topic 6 (Blacklist)
            </Button>
          </div>
          
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            <p><strong>What this does:</strong></p>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Adds claim topics to the ClaimTopicsRegistry contract</li>
              <li>Claim topics define what types of claims can be issued (KYC, AML, etc.)</li>
              <li>These topics are used by trusted issuers to specify what they can verify</li>
              <li>Required for the compliance system to work properly</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddClaimTopicsTab; 