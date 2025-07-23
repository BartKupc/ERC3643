import React from 'react';
import { Button, ContractSelector } from '../../shared/uiComponents';

const DeployTokenSubTab = ({
  deployedContracts = {},
  selectedContracts = {},
  setSelectedContracts = () => {},
  tokenDetails = {},
  setTokenDetails = () => {},
  handleDeployToken = () => {},
  deployingToken = false
}) => {
  return (
    <div>
      <h4>Deploy Token</h4>
      <p>Deploy the ERC-3643 token with compliance integration.</p>
      {/* Contract Selectors */}
      <div style={{ marginBottom: '1rem' }}>
        {/* Identity Registry Selector */}
        {deployedContracts.IdentityRegistry && deployedContracts.IdentityRegistry.length > 0 && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4>Select Identity Registry:</h4>
            <ContractSelector
              contractType="IdentityRegistry"
              contracts={deployedContracts.IdentityRegistry}
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
            <h4>Select ModularCompliance:</h4>
            <ContractSelector
              contractType="ModularCompliance"
              contracts={deployedContracts.ModularCompliance}
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
              value={tokenDetails.name || ''}
              onChange={e => setTokenDetails(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Token Name"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label>Symbol:</label>
            <input
              type="text"
              value={tokenDetails.symbol || ''}
              onChange={e => setTokenDetails(prev => ({ ...prev, symbol: e.target.value }))}
              placeholder="SYMBOL"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label>Decimals:</label>
            <input
              type="number"
              value={tokenDetails.decimals || 18}
              onChange={e => setTokenDetails(prev => ({ ...prev, decimals: Number(e.target.value) }))}
              placeholder="18"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div>
            <label>Total Supply:</label>
            <input
              type="number"
              value={tokenDetails.totalSupply || ''}
              onChange={e => setTokenDetails(prev => ({ ...prev, totalSupply: e.target.value }))}
              placeholder="1000000"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
        </div>
      </div>
      <Button
        onClick={handleDeployToken}
        disabled={deployingToken}
        style={{ backgroundColor: '#28a745', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', padding: '0.75rem 2rem' }}
      >
        {deployingToken ? 'Deploying...' : 'Deploy Token'}
      </Button>
    </div>
  );
};

export default DeployTokenSubTab; 