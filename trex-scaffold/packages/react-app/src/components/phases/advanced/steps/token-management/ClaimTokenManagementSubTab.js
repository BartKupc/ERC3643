import React, { useState } from 'react';

const ClaimTokenManagementSubTab = ({
  deployedTokens = [],
  selectedContracts = {},
  setSelectedContracts = () => {},
  runComprehensiveDiagnostics = () => {},
  checkingVerification = false,
  addLog = () => {},
  setVerificationMessage
}) => {
  const [userAddressToCheck, setUserAddressToCheck] = useState('');

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

  const handleRunDiagnostics = async () => {
    if (!selectedContracts.Token) {
      addLog('Please select a token first', 'error');
      if (setVerificationMessage) setVerificationMessage('Please select a token first');
      return;
    }
    const userAddress = userAddressToCheck.trim();
    if (!userAddress) {
      addLog('Please provide a user address to check', 'error');
      if (setVerificationMessage) setVerificationMessage('Please provide a user address to check');
      return;
    }
    try {
      await runComprehensiveDiagnostics(userAddress);
    } catch (error) {
      console.error('Error running diagnostics:', error);
      if (setVerificationMessage) setVerificationMessage('Error running diagnostics.');
    }
  };

  return (
    <div>
      <h4>Claim/Token Check</h4>
      <p>Check required claims and user verification status for token operations.</p>
      
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
      
      {/* User Address to Check */}
      <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>User Verification Check:</h4>
        <p>Check if a user is verified for this token (has all required claims from trusted issuers).</p>
        <div style={{ marginBottom: '1rem' }}>
          <label>User Address to Check:</label>
          <input
            type="text"
            value={userAddressToCheck}
            onChange={(e) => setUserAddressToCheck(e.target.value)}
            placeholder="0x... (leave empty to use account 0)"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
          />
          <Button
            onClick={handleRunDiagnostics}
            disabled={checkingVerification || !selectedContracts.Token}
            style={{ backgroundColor: '#007bff', color: 'white', marginTop: '0.5rem', marginBottom: '1rem', marginRight: '0.5rem' }}
          >
            {checkingVerification ? 'Checking...' : 'Run Comprehensive Check'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClaimTokenManagementSubTab; 