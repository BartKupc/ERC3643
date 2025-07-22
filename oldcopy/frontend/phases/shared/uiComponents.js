import React from 'react';

// Button component
export const Button = ({ children, onClick, disabled, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      ...style
    }}
  >
    {children}
  </button>
);

// Contract Selector Component
export const ContractSelector = ({ contractType, contracts, selectedAddress, onSelect, title, description }) => {
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
              fontSize: '0.9rem'
            }}
          >
            <option value="">-- Select a contract --</option>
            {contractAddresses.map((address, index) => (
              <option key={index} value={address}>
                {address} {index === 0 ? '(Latest)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}; 