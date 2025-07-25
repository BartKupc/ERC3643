import React, { useState } from 'react';
import DeployTokenSubTab from './token-management/DeployTokenSubTab';
import RoleManagementSubTab from './token-management/RoleManagementSubTab';
import ClaimTokenManagementSubTab from './token-management/ClaimTokenManagementSubTab';
import FunctionManagementSubTab from './token-management/FunctionManagementSubTab';

const TokenManagementTab = (props) => {
  const [activeSubTab, setActiveSubTab] = useState('deploy');

  // Clear message when component mounts or when key props change
  React.useEffect(() => {
    // This ensures the message is cleared when switching to this tab
    // The actual message clearing is handled by the parent DeploymentPhase.js
  }, [props.deployedContracts, props.selectedContracts]);

  return (
    <div>
      <h3>Step 8: Token Management</h3>
      <p>Deploy and manage ERC-3643 tokens with comprehensive role and function management.</p>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('deploy')}
          style={{
            backgroundColor: activeSubTab === 'deploy' ? '#007bff' : '#6c757d',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Deploy Token
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          style={{
            backgroundColor: activeSubTab === 'roles' ? '#007bff' : '#6c757d',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Role Management
        </button>
        <button
          onClick={() => setActiveSubTab('claims')}
          style={{
            backgroundColor: activeSubTab === 'claims' ? '#007bff' : '#6c757d',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Claim/Token Management
        </button>
        <button
          onClick={() => setActiveSubTab('functions')}
          style={{
            backgroundColor: activeSubTab === 'functions' ? '#007bff' : '#6c757d',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Function Management
        </button>
      </div>
      {activeSubTab === 'deploy' && <DeployTokenSubTab {...props} />}
      {activeSubTab === 'roles' && <RoleManagementSubTab {...props} />}
      {activeSubTab === 'claims' && (
        <ClaimTokenManagementSubTab
          {...props}
          verificationMessage={props.verificationMessage}
          setVerificationMessage={props.setVerificationMessage}
        />
      )}
      {activeSubTab === 'functions' && <FunctionManagementSubTab {...props} setTokenStatus={props.setTokenStatus} />}
    </div>
  );
};

export default TokenManagementTab; 