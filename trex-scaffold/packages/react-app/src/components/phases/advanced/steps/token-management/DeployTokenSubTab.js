import React, { useState } from 'react';

const DeployTokenSubTab = ({
  deployedContracts = {},
  selectedContracts = {},
  setSelectedContracts = () => {},
  deployToken = () => {},
  deploying = false,
  deployedTokens = [],
  reloadDeploymentState = () => {},
  addLog = () => {}
}) => {
  const [tokenDetails, setTokenDetails] = useState({
    name: 'My Security Token',
    symbol: 'MST',
    decimals: 18
  });

  // Contract Selector Component
  const ContractSelector = ({ contractType, contracts, selectedAddress, onSelect, title, description }) => {
    const contractAddresses = contracts[contractType] || [];
    
    if (contractAddresses.length === 0) {
      return (
        <div style={{ color: '#666', fontStyle: 'italic' }}>
          No {contractType} contracts found
        </div>
      );
    }
    
    return (
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

  const handleDeployToken = async () => {
    if (!tokenDetails.name || !tokenDetails.symbol) {
      addLog('Please provide token name and symbol', 'error');
      return;
    }
    
    if (!selectedContracts.IdentityRegistry || !selectedContracts.ModularCompliance) {
      addLog('Please select both Identity Registry and ModularCompliance contracts', 'error');
      return;
    }
    
    try {
      await deployToken(tokenDetails);
    } catch (error) {
      console.error('Error deploying token:', error);
    }
  };

  return (
    <div>
      <h4>Deploy Token</h4>
      <p>Deploy the ERC-3643 token with compliance integration.</p>
      
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
      
      {/* Contract Selectors */}
      <div style={{ marginBottom: '1rem' }}>
        {/* Identity Registry Selector */}
        {deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry.length > 0 && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Select Identity Registry:</h4>
            <ContractSelector
              contractType="IdentityRegistry"
              contracts={deployedContracts}
              selectedAddress={selectedContracts.IdentityRegistry}
              onSelect={address => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
              title="IdentityRegistry"
              description="Choose which Identity Registry to attach to this token"
            />
          </div>
        )}
        
        {/* ModularCompliance Contract Selector */}
        {deployedContracts.ModularCompliance && deployedContracts.ModularCompliance.length > 0 && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Select ModularCompliance Contract:</h4>
            <ContractSelector
              contractType="ModularCompliance"
              contracts={deployedContracts}
              selectedAddress={selectedContracts.ModularCompliance}
              onSelect={address => setSelectedContracts(prev => ({ ...prev, ModularCompliance: address }))}
              title="ModularCompliance"
              description="Choose which ModularCompliance contract to attach to this token"
            />
          </div>
        )}
      </div>
      
      {/* Token Details Form */}
      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
        <h5>Token Details</h5>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label>Name:</label>
            <input
              type="text"
              value={tokenDetails.name}
              onChange={e => setTokenDetails(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Token Name"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label>Symbol:</label>
            <input
              type="text"
              value={tokenDetails.symbol}
              onChange={e => setTokenDetails(prev => ({ ...prev, symbol: e.target.value }))}
              placeholder="SYMBOL"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label>Decimals:</label>
            <input
              type="number"
              value={tokenDetails.decimals}
              onChange={e => setTokenDetails(prev => ({ ...prev, decimals: Number(e.target.value) }))}
              placeholder="18"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
        </div>
      </div>
      
      <Button
        onClick={handleDeployToken}
        disabled={deploying || !selectedContracts.IdentityRegistry || !selectedContracts.ModularCompliance || !tokenDetails.name || !tokenDetails.symbol}
        style={{ backgroundColor: '#007bff', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', padding: '0.75rem 2rem' }}
      >
        {deploying ? 'Deploying Token...' : 'Deploy Token'}
      </Button>
      
      {/* Show which contracts will be used */}
      {(selectedContracts.IdentityRegistry || selectedContracts.ModularCompliance) && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          <div>Will use Identity Registry: {selectedContracts.IdentityRegistry || (deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry[0])}</div>
          <div>Will use ModularCompliance: {selectedContracts.ModularCompliance || (deployedContracts.ModularCompliance && deployedContracts.ModularCompliance[0])}</div>
        </div>
      )}
      
      {/* Show deployed tokens */}
      {deployedTokens.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Deployed Tokens ({deployedTokens.length}):</h4>
          {deployedTokens.map((token, index) => (
            <div key={index} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
              <div><strong>{token.name} ({token.symbol})</strong></div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>Address: {token.address}</div>
              <div>Decimals: {token.decimals}</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Deployed: {new Date(token.deployedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeployTokenSubTab; 