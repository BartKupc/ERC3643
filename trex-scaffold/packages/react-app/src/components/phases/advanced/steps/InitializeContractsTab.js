import React from 'react';

const InitializeContractsTab = ({
  deployedContracts,
  selectedContracts,
  setSelectedContracts,
  initializing,
  initializingContract,
  initializeContract,
  initializeAllContracts,
  contractInitStatus,
  checkContractInitStatus,
  checkingInitStatus,
  addLog
}) => {
  // Clear message when component mounts or when key props change
  React.useEffect(() => {
    // This ensures the message is cleared when switching to this tab
    // The actual message clearing is handled by the parent DeploymentPhase.js
  }, [deployedContracts, selectedContracts]);

  const handleContractSelect = (contractName, address) => {
    setSelectedContracts(prev => ({
      ...prev,
      [contractName]: address
    }));
  };

  const handleInitializeAll = () => {
    addLog("Starting bulk initialization of all contracts...", "info");
    initializeAllContracts();
  };

  const handleCheckStatus = () => {
    addLog("Checking initialization status of all contracts...", "info");
    checkContractInitStatus();
  };

  return (
  <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <h3>Step 2: Initialize Contracts</h3>
        <p>Initialize all deployed contracts with admin being the deployer.</p>
    {Object.keys(deployedContracts).length === 0 ? (
      <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
        No contracts deployed yet. Please deploy contracts in Step 1 first.
      </div>
    ) : (
      <div>
        {/* Action Buttons */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={handleInitializeAll}
            disabled={initializing}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: initializing ? 'not-allowed' : 'pointer',
              opacity: initializing ? 0.6 : 1
            }}
          >
            {initializing ? 'Initializing All...' : 'Initialize All Contracts'}
          </button>
          
          <button
            onClick={handleCheckStatus}
            disabled={checkingInitStatus}
            style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: checkingInitStatus ? 'not-allowed' : 'pointer',
              opacity: checkingInitStatus ? 0.6 : 1
            }}
          >
            {checkingInitStatus ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Contract Selection and Initialization */}
        <h4>Available Contracts for Initialization:</h4>
        {Object.entries(deployedContracts).map(([name, addresses]) => (
          <div key={name} style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>{name}</h5>
            
            {/* Contract Address Selection */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Select Address:
              </label>
              <select
                value={selectedContracts[name] || ''}
                onChange={(e) => handleContractSelect(name, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white'
                }}
              >
                <option value="">-- Select an address --</option>
                {Array.isArray(addresses) ? (
                  addresses.map((address, index) => (
                    <option key={index} value={address}>
                      {address} {index === 0 ? '(Latest)' : ''}
                    </option>
                  ))
                ) : (
                  <option value={addresses}>{addresses}</option>
                )}
              </select>
            </div>

            {/* Selected Address Display */}
            {selectedContracts[name] && (
              <div style={{ 
                marginBottom: '10px',
                backgroundColor: 'white', 
                padding: '10px', 
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'monospace',
                fontSize: '0.9rem'
              }}>
                <strong>Selected:</strong> {selectedContracts[name]}
              </div>
            )}

            {/* Initialization Status */}
            {contractInitStatus[name] && (
              <div style={{ 
                marginBottom: '10px',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: (typeof contractInitStatus[name] === 'string' ? contractInitStatus[name] === 'Initialized' : contractInitStatus[name].isInitialized) ? '#d4edda' : '#f8d7da',
                color: (typeof contractInitStatus[name] === 'string' ? contractInitStatus[name] === 'Initialized' : contractInitStatus[name].isInitialized) ? '#155724' : '#721c24',
                fontSize: '0.9rem'
              }}>
                <strong>Status:</strong> {typeof contractInitStatus[name] === 'string' ? contractInitStatus[name] : (contractInitStatus[name].isInitialized ? 'Initialized' : 'Not initialized')}
              </div>
            )}

            {/* Initialize Button */}
            {selectedContracts[name] && (
              <button
                onClick={() => initializeContract(name)}
                disabled={initializing || initializingContract[name]}
                style={{ 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  padding: '8px 16px', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: (initializing || initializingContract[name]) ? 'not-allowed' : 'pointer', 
                  opacity: (initializing || initializingContract[name]) ? 0.6 : 1 
                }}
              >
                {initializingContract[name] ? 'Initializing...' : 'Initialize'}
              </button>
            )}
          </div>
        ))}

        {/* Summary */}
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          border: '1px solid #b3d9ff'
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#004085' }}>Summary</h5>
          <p style={{ margin: '0', color: '#004085', fontSize: '0.9rem' }}>
            • Step 1: Deploy all contracts<br/>
            • Step 2: Initialize all contracts with admin being the deployer<br/>
            • Use "Initialize All Contracts" to initialize all deployed contracts at once<br/>
            • Use "Check Status" to verify which contracts are already initialized<br/>
            • Individual contracts can be initialized by clicking their "Initialize" button
          </p>
        </div>
      </div>
    )}
  </div>
  );
};

export default InitializeContractsTab; 