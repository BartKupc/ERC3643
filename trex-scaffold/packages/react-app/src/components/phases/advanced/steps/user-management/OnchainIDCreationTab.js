import React, { useState } from 'react';
import { Button } from '../../../shared';

const OnchainIDCreationTab = ({
  userIdentities = [],
  setUserIdentities = () => {},
  addLog = () => {},
  createOnchainId = () => {},
  deploying = false
}) => {
  const [userAddress, setUserAddress] = useState('');
  const [userCountry, setUserCountry] = useState('');

  return (
    <div>
      <h4>Section 1: OnchainID Creation</h4>
      <p>Create new OnchainID identities for users.</p>
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <h5 style={{ marginBottom: '10px', color: '#495057' }}>Current Identities ({userIdentities.length})</h5>
        <div style={{ marginBottom: '15px' }}>
          {userIdentities.length === 0 ? (
            <div style={{ color: '#6c757d', fontStyle: 'italic' }}>No identities created yet.</div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
              {userIdentities.map((identity, index) => (
                <div key={index} style={{ padding: '15px', borderBottom: index < userIdentities.length - 1 ? '1px solid #dee2e6' : 'none', backgroundColor: 'white' }}>
                  <div><strong>User:</strong> {identity.userAddress}</div>
                  <div><strong>OnchainID:</strong> {identity.onchainIdAddress}</div>
                  <div><strong>Country:</strong> {identity.country}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h5 style={{ marginBottom: '15px', color: '#495057' }}>Create New Identity</h5>
          <div style={{ marginBottom: '10px' }}>
            <label>Wallet Address:</label>
            <input
              type="text"
              value={userAddress}
              onChange={e => setUserAddress(e.target.value)}
              placeholder="0x..."
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Country Code (ISO 3166-1 numeric):</label>
            <input
              type="number"
              value={userCountry}
              onChange={e => setUserCountry(e.target.value)}
              placeholder="840"
              style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px' }}>
              Examples: 840 (USA), 124 (Canada), 826 (UK), 276 (Germany), 250 (France)
            </div>
          </div>
          <Button onClick={() => createOnchainId(userAddress, userCountry)} disabled={deploying || !userAddress.trim()}>
            {deploying ? 'Creating...' : 'Create OnchainID'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnchainIDCreationTab; 