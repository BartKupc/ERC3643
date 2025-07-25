import React, { useState } from 'react';

const FunctionManagementSubTab = ({
  deployedTokens = [],
  selectedContracts = {},
  setSelectedContracts = () => {},
  setTokenPaused = () => {},
  mintTokens = () => {},
  burnTokens = () => {},
  transferTokens = () => {},
  checkTokenStatus = () => {},
  deploying = false,
  tokenStatus = 'Not checked',
  setTokenStatus = () => {},
  addLog = () => {}
}) => {
  const [mintRecipient, setMintRecipient] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [burnAddress, setBurnAddress] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferToAdvanced, setTransferToAdvanced] = useState('');
  const [transferAmountAdvanced, setTransferAmountAdvanced] = useState('');
  const [transferFromResult, setTransferFromResult] = useState('');

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

  const handleMintTokens = async () => {
    if (!selectedContracts.Token) {
      addLog('Please select a token first', 'error');
      return;
    }
    
    if (!mintRecipient || !mintAmount) {
      addLog('Please provide recipient address and amount', 'error');
      return;
    }
    
    try {
      await mintTokens(mintRecipient, mintAmount);
      setMintRecipient('');
      setMintAmount('');
    } catch (error) {
      console.error('Error minting tokens:', error);
    }
  };

  const handleBurnTokens = async () => {
    if (!selectedContracts.Token) {
      addLog('Please select a token first', 'error');
      return;
    }
    
    if (!burnAddress || !burnAmount) {
      addLog('Please provide address to burn from and amount', 'error');
      return;
    }
    
    try {
      await burnTokens(burnAddress, burnAmount);
      setBurnAddress('');
      setBurnAmount('');
    } catch (error) {
      console.error('Error burning tokens:', error);
    }
  };

  const handleTransferTokens = async () => {
    if (!selectedContracts.Token) {
      addLog('Please select a token first', 'error');
      return;
    }
    
    if (!transferTo || !transferAmount) {
      addLog('Please provide recipient address and amount', 'error');
      return;
    }
    
    try {
      await transferTokens(transferTo, transferAmount);
      setTransferTo('');
      setTransferAmount('');
    } catch (error) {
      console.error('Error transferring tokens:', error);
    }
  };

  const handleTransferFrom = async () => {
    if (!selectedContracts.Token) {
      addLog('Please select a token first', 'error');
      return;
    }
    if (!transferFrom || !transferToAdvanced || !transferAmountAdvanced) {
      addLog('Please provide from address, to address, and amount', 'error');
      return;
    }
    setTransferFromResult('');
    try {
      const res = await fetch('/api/token/transfer-from', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: selectedContracts.Token,
          fromAddress: transferFrom,
          toAddress: transferToAdvanced,
          amount: transferAmountAdvanced
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      setTransferFromResult(`Success! Tx1: ${data.transactionHash1}\nTx2: ${data.transactionHash2}`);
      addLog(`TransferFrom success: ${data.transactionHash1}, ${data.transactionHash2}`, 'success');
      setTransferFrom('');
      setTransferToAdvanced('');
      setTransferAmountAdvanced('');
    } catch (error) {
      setTransferFromResult(`Error: ${error.message}`);
      addLog(`TransferFrom error: ${error.message}`, 'error');
    }
  };

  return (
    <div>
      <h4>Function Management</h4>
      <p>Perform token operations and management functions.</p>
      
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
      
      {/* Token Operations */}
      {selectedContracts.Token && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>Token Operations:</h4>
          <p>Perform token operations (requires agent role).</p>
          
          {/* Token Status */}
          <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
            <strong>Token Status:</strong> 
            <span style={{ 
              marginLeft: '0.5rem',
              color: tokenStatus.includes('PAUSED') ? '#dc3545' : 
                     tokenStatus.includes('ACTIVE') ? '#28a745' : 
                     tokenStatus.includes('❌') ? '#dc3545' : 
                     tokenStatus.includes('⚠️') ? '#ffc107' : '#6c757d'
            }}>
              {tokenStatus}
            </span>
            <Button
              onClick={checkTokenStatus}
              disabled={deploying || !selectedContracts.Token}
              style={{ marginLeft: '0.5rem', backgroundColor: '#6c757d', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              Refresh Status
            </Button>
          </div>
          
          {/* Pause/Unpause Controls */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Button
              onClick={() => setTokenPaused(true)}
              disabled={deploying}
              style={{ backgroundColor: '#dc3545', color: 'white' }}
            >
              Pause Token
            </Button>
            <Button
              onClick={() => setTokenPaused(false)}
              disabled={deploying}
              style={{ backgroundColor: '#28a745', color: 'white' }}
            >
              Unpause Token
            </Button>
          </div>
          
          {/* Mint Tokens */}
          <div style={{ marginBottom: '1rem' }}>
            <h5>Mint Tokens:</h5>
            <input
              type="text"
              placeholder="Recipient Address"
              value={mintRecipient}
              onChange={(e) => setMintRecipient(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input
              type="number"
              placeholder="Amount to Mint"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <Button
              onClick={handleMintTokens}
              disabled={deploying}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              {deploying ? 'Minting...' : 'Mint Tokens'}
            </Button>
          </div>
          
          {/* Burn Tokens */}
          <div style={{ marginBottom: '1rem' }}>
            <h5>Burn Tokens:</h5>
            <input
              type="text"
              placeholder="Address to Burn From"
              value={burnAddress}
              onChange={(e) => setBurnAddress(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input
              type="number"
              placeholder="Amount to Burn"
              value={burnAmount}
              onChange={(e) => setBurnAmount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <Button
              onClick={handleBurnTokens}
              disabled={deploying}
              style={{ backgroundColor: '#dc3545', color: 'white' }}
            >
              {deploying ? 'Burning...' : 'Burn Tokens'}
            </Button>
          </div>

          {/* Transfer Tokens */}
          <div>
            <h5>Transfer Tokens (Simple):</h5>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Transfer tokens from your wallet (signer/agent) to another address. This uses <code>transfer()</code> with full compliance checks.
            </p>
            
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
              <h6>✅ Standard Transfer:</h6>
              <p style={{ fontSize: '0.9rem', color: '#155724', marginBottom: '0.5rem' }}>
                • <strong>From:</strong> Your wallet (signer/agent)</p>
              <p style={{ fontSize: '0.9rem', color: '#155724', marginBottom: '0.5rem' }}>
                • <strong>To:</strong> Any verified address</p>
              <p style={{ fontSize: '0.9rem', color: '#155724', margin: '0' }}>
                • <strong>Compliance:</strong> Full validation (identity, compliance rules)</p>
            </div>
            
            <input
              type="text"
              placeholder="To Address (recipient)"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input
              type="number"
              placeholder="Amount to Transfer"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <Button
              onClick={handleTransferTokens}
              disabled={deploying}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              {deploying ? 'Transferring...' : 'Transfer Tokens'}
            </Button>
          </div>

          {/* Transfer Between Accounts (forcedTransfer + transfer) */}
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '2px solid #dee2e6' }}>
            <h5>Transfer Between Accounts (Option 2 - Advanced):</h5>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              <strong>Optional:</strong> Test transfers between different accounts using agent privileges. This simulates real-world scenarios.<br/>
              <strong>Step 1:</strong> Agent uses <code>forcedTransfer()</code> to move tokens from Account A to Agent<br/>
              <strong>Step 2:</strong> Agent uses <code>transfer()</code> to move tokens from Agent to Account B (with compliance)
            </p>
            <input
              type="text"
              placeholder="From Address (e.g., Account 2)"
              value={transferFrom}
              onChange={e => setTransferFrom(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="To Address (e.g., Account 3)"
              value={transferToAdvanced}
              onChange={e => setTransferToAdvanced(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <input
              type="number"
              placeholder="Amount to Transfer"
              value={transferAmountAdvanced}
              onChange={e => setTransferAmountAdvanced(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
            />
            <Button
              onClick={handleTransferFrom}
              disabled={deploying}
              style={{ backgroundColor: '#17a2b8', color: 'white' }}
            >
              {deploying ? 'Transferring...' : 'Transfer Between Accounts'}
            </Button>
            {transferFromResult && (
              <div style={{ marginTop: '1rem', color: transferFromResult.startsWith('Error') ? '#dc3545' : '#155724', background: transferFromResult.startsWith('Error') ? '#f8d7da' : '#d4edda', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${transferFromResult.startsWith('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>
                <pre style={{ margin: 0 }}>{transferFromResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FunctionManagementSubTab; 