import React, { useState } from 'react';
import OnchainIDCreationTab from './user-management/OnchainIDCreationTab';
import OnchainIDManagementTab from './user-management/OnchainIDManagementTab';

const UserManagementTab = (props) => {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div>
      <h3>Step 7: User Management</h3>
      <p>Create and manage user identities (do this BEFORE deploying tokens).</p>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            backgroundColor: activeTab === 'create' ? '#007bff' : '#6c757d',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          OnchainID Creation
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          style={{
            backgroundColor: activeTab === 'manage' ? '#007bff' : '#6c757d',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          OnchainID Management
        </button>
      </div>
      {activeTab === 'create' && <OnchainIDCreationTab {...props} />}
      {activeTab === 'manage' && <OnchainIDManagementTab {...props} />}
    </div>
  );
};

export default UserManagementTab; 