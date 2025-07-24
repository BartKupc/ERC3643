import React, { useState } from 'react';

const RoleManagementSubTab = ({
  deployedTokens = [],
  selectedContracts = {},
  setSelectedContracts = () => {},
  addTokenAgent = () => {},
  deploying = false,
  tokenStatus = 'Not checked',
  checkTokenStatus = () => {},
  addLog = () => {}
}) => {
  const [tokenAgentInput, setTokenAgentInput] = useState('');

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

  const handleAddTokenAgent = async () => {
    if (!selectedContracts.Token) {
      addLog('Please select a token first', 'error');
      return;
    }
    
    const agentAddress = tokenAgentInput.trim();
    if (!agentAddress) {
      addLog('Please provide an agent address', 'error');
      return;
    }
    
    try {
      await addTokenAgent(agentAddress);
      setTokenAgentInput(''); // Clear input after successful addition
    } catch (error) {
      console.error('Error adding token agent:', error);
    }
  };

  return (
    <div>
      <h4>Role Management</h4>
      <p>Set up token roles and permissions for minting, burning, and pausing.</p>
      
      {/* Token Selector */}
      {deployedTokens.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Select Token:</h4>
          <select
            value={selectedContracts.Token || ""}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            onChange={(e) => {
              const tokenAddress = e.target.value;
              if (tokenAddress) {
                setSelectedContracts(prev => ({ ...prev, Token: tokenAddress }));
                setTokenStatus('Checking...');
                setTimeout(() => checkTokenStatus(), 100);
              } else {
                setTokenStatus('No token selected');
              }
            }}
          >
            <option value="">-- Select a token --</option>
            {deployedTokens.map((token, index) => (
              <option key={index} value={token.address}>
                {token.name} ({token.symbol}) - {token.address}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Agent Management */}
      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Add Token Agent:</h4>
        <p>Add an agent to the selected token. Agents can mint, burn, and pause tokens.</p>
        <input
          type="text"
          placeholder="Agent Address (leave empty to use your address)"
          value={tokenAgentInput}
          onChange={e => setTokenAgentInput(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <Button
          onClick={handleAddTokenAgent}
          disabled={deploying || !selectedContracts.Token}
          style={{ backgroundColor: '#007bff', color: 'white' }}
        >
          {deploying ? 'Adding Agent...' : 'Add Token Agent'}
        </Button>
      </div>

      {/* Token Status Display */}
      {selectedContracts.Token && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e8f5e8', borderRadius: '4px', border: '1px solid #28a745' }}>
          <h4>Token Status:</h4>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '0.5rem',
            backgroundColor: 'white',
            borderRadius: '4px'
          }}>
            <div>
              <strong>Status:</strong> 
              <span style={{ 
                marginLeft: '0.5rem',
                color: tokenStatus.includes('PAUSED') ? '#dc3545' : 
                       tokenStatus.includes('ACTIVE') ? '#28a745' : 
                       tokenStatus.includes('❌') ? '#dc3545' : 
                       tokenStatus.includes('⚠️') ? '#ffc107' : '#6c757d'
              }}>
                {tokenStatus}
              </span>
            </div>
            <Button
              onClick={checkTokenStatus}
              disabled={deploying || !selectedContracts.Token}
              style={{ backgroundColor: '#6c757d', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              Refresh Status
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementSubTab; 