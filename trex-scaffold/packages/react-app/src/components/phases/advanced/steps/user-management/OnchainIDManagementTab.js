import React from 'react';

const OnchainIDManagementTab = (props) => {
  // This will eventually delegate to sub-tabs/components for registration, adding keys, and adding claims
  return (
    <div>
      <h4>Section 2: OnchainID Management</h4>
      <p>Manage existing OnchainID identities - register in Identity Registry and add claims.</p>
      {/* TODO: Render sub-tabs/components for registration, adding keys, and adding claims here */}
      <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6', marginTop: '1rem' }}>
        <em>OnchainID management UI will be split into sub-tabs here.</em>
      </div>
    </div>
  );
};

export default OnchainIDManagementTab; 