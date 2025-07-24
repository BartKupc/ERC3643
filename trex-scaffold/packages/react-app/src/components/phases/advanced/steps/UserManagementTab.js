import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../shared';

const claimTopics = [
  { id: 1, name: "KYC (Know Your Customer)" },
  { id: 2, name: "AML (Anti-Money Laundering)" },
  { id: 3, name: "Accredited Investor" },
  { id: 4, name: "EU Nationality Confirmed" },
  { id: 5, name: "US Nationality Confirmed" },
  { id: 6, name: "Blacklist" }
];

const ContractSelector = ({ contractType, contracts, selectedAddress, onSelect, title, description }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ fontWeight: 'bold', color: '#333' }}>{title}</label>
    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>{description}</div>
    <select
      value={selectedAddress || ''}
      onChange={e => onSelect(e.target.value)}
      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
    >
      <option value=''>-- Select {contractType} --</option>
      {(contracts[contractType] || []).map((address, idx) => (
        <option key={address} value={address}>
          {idx === 0 ? 'Latest' : `#${idx + 1}`}: {address.slice(0, 8)}...{address.slice(-6)}
        </option>
      ))}
    </select>
  </div>
);

const UserManagementTab = ({ deployedContracts = {}, selectedContracts = {}, setSelectedContracts = () => {}, addLog = () => {} }) => {
  const [activeSubtab, setActiveSubtab] = useState('create');
  const [userAddress, setUserAddress] = useState('');
  const [userCountry, setUserCountry] = useState('840');
  const [onchainIdAddress, setOnchainIdAddress] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [registeringUser, setRegisteringUser] = useState(false);
  const [addingClaim, setAddingClaim] = useState(false);
  const [message, setMessage] = useState('');
  const [claimTopic, setClaimTopic] = useState('');
  const [claimValue, setClaimValue] = useState('');
  const [availableClaimIssuers, setAvailableClaimIssuers] = useState([]);
  const [selectedClaimIssuer, setSelectedClaimIssuer] = useState('');
  const [irError, setIRError] = useState('');

  // Load available claim issuers (from localStorage)
  useEffect(() => {
    try {
      const savedClaimIssuers = localStorage.getItem('trex_available_claim_issuers');
      if (savedClaimIssuers) {
        setAvailableClaimIssuers(JSON.parse(savedClaimIssuers));
      }
    } catch (error) {
      setMessage('Error loading claim issuers');
    }
  }, []);

  const createOnchainId = async () => {
    try {
      setCreatingUser(true);
      setMessage('Creating OnchainID...');
      if (!userAddress.trim()) throw new Error('Please enter a wallet address');
      const response = await axios.post('/api/identity/create-onchainid-direct', {
        userAddress,
        country: userCountry
      });
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setOnchainIdAddress(response.data.onchainIdAddress);
      setMessage(`OnchainID created at ${response.data.onchainIdAddress}`);
    } catch (error) {
      setMessage(`Error creating OnchainID: ${error.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  // Subtab: Register in IR
  const handleRegisterIdentity = async () => {
    try {
      setRegisteringUser(true);
      setMessage('Registering identity...');
      if (!onchainIdAddress) throw new Error('Please create an OnchainID first');
      if (!selectedContracts.IdentityRegistry) throw new Error('Please select an Identity Registry');
      const response = await axios.post('/api/identity/register-identity', {
        userAddress,
        onchainIdAddress,
        userCountry,
        selectedIR: selectedContracts.IdentityRegistry
      });
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setMessage('Identity registered successfully');
    } catch (error) {
      setMessage(`Error registering identity: ${error.message}`);
    } finally {
      setRegisteringUser(false);
    }
  };

  // Subtab: Add ClaimIssuer Keys
  const handleAddClaimIssuerKeys = async () => {
    try {
      setAddingClaim(true);
      setMessage('Adding ClaimIssuer keys to OnchainID...');
      if (!onchainIdAddress) throw new Error('Please create an OnchainID first');
      if (!selectedClaimIssuer) throw new Error('Please select a ClaimIssuer');
      const response = await axios.post('/api/identity/add-claim-issuer-keys', {
        onchainIdAddress,
        finalIssuerAddress: selectedClaimIssuer
      });
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setMessage('ClaimIssuer keys added to OnchainID');
    } catch (error) {
      setMessage(`Error adding ClaimIssuer keys: ${error.message}`);
    } finally {
      setAddingClaim(false);
    }
  };

  // Subtab: Add Claim
  const handleAddClaim = async () => {
    try {
      setAddingClaim(true);
      setMessage('Adding claim to identity...');
      if (!onchainIdAddress) throw new Error('Please create an OnchainID first');
      if (!claimTopic || !claimValue) throw new Error('Please select claim topic and value');
      if (!selectedClaimIssuer) throw new Error('Please select a ClaimIssuer');
      const response = await axios.post('/api/identity/add-claim-to-identity', {
        onchainIdAddress,
        claimTopic,
        claimValue,
        finalIssuerAddress: selectedClaimIssuer,
        userAddress
      });
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setMessage('Claim added to identity');
    } catch (error) {
      setMessage(`Error adding claim: ${error.message}`);
    } finally {
      setAddingClaim(false);
    }
  };

  // Subtab: View Claims
  const handleCheckClaims = async () => {
    try {
      if (!onchainIdAddress) throw new Error('Please create an OnchainID first');
      const response = await axios.get(`/api/identity/check-onchainid-claims/${onchainIdAddress}`);
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setMessage(`Found ${response.data.totalClaims} claims on OnchainID contract`);
    } catch (error) {
      setMessage(`Error checking claims: ${error.message}`);
    }
  };

  // Auto-select/refresh contracts
  const handleAutoSelectContracts = () => {
    setIRError('');
    if (!deployedContracts.IdentityRegistry || deployedContracts.IdentityRegistry.length === 0) {
      setIRError('No Identity Registry found. Please deploy one first.');
    } else {
      setSelectedContracts(prev => ({ ...prev, IdentityRegistry: deployedContracts.IdentityRegistry[0] }));
    }
    if (!deployedContracts.ClaimIssuer || deployedContracts.ClaimIssuer.length === 0) {
      setMessage('No ClaimIssuer found. Please deploy one first.');
    } else {
      setSelectedClaimIssuer(deployedContracts.ClaimIssuer[0]);
    }
  };

  // Subtab UI
  const subtabs = [
    { key: 'create', label: 'Create OnchainID' },
    { key: 'register', label: 'Register in IR' },
    { key: 'add-claim-issuer', label: 'Add ClaimIssuer Keys' },
    { key: 'add-claim', label: 'Add Claim' },
    { key: 'view-claims', label: 'View Claims' }
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>User Management</h3>
      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {subtabs.map(tab => (
          <Button
            key={tab.key}
            onClick={() => setActiveSubtab(tab.key)}
            style={{
              backgroundColor: activeSubtab === tab.key ? '#007bff' : '#e9ecef',
              color: activeSubtab === tab.key ? 'white' : '#222',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: activeSubtab === tab.key ? 'bold' : 'normal',
              fontSize: '1rem',
            }}
          >
            {tab.label}
          </Button>
        ))}
        <Button
          onClick={handleAutoSelectContracts}
          style={{ backgroundColor: '#2196f3', color: 'white', marginLeft: 'auto' }}
        >
          🔄 Auto-Select/Refresh
        </Button>
      </div>
      {irError && <div style={{ color: '#dc3545', marginBottom: '1rem' }}>{irError}</div>}
      {message && <div style={{ color: message.includes('Error') ? '#721c24' : '#155724', backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>{message}</div>}
      {/* Subtab Content */}
      {activeSubtab === 'create' && (
        <div>
          <label>User Address:</label>
          <input type="text" value={userAddress} onChange={e => setUserAddress(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', marginBottom: '1rem' }} />
          <label>Country Code:</label>
          <input type="text" value={userCountry} onChange={e => setUserCountry(e.target.value)} placeholder="840" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', marginBottom: '1rem' }} />
          <Button onClick={createOnchainId} disabled={creatingUser || !userAddress.trim()} style={{ backgroundColor: '#28a745', color: 'white' }}>{creatingUser ? 'Creating...' : 'Create OnchainID'}</Button>
        </div>
      )}
      {activeSubtab === 'register' && (
        <div>
          <ContractSelector
            contractType="IdentityRegistry"
            contracts={deployedContracts}
            selectedAddress={selectedContracts.IdentityRegistry}
            onSelect={address => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
            title="Identity Registry"
            description="Select which Identity Registry to register in"
          />
          <Button onClick={handleRegisterIdentity} disabled={registeringUser || !selectedContracts.IdentityRegistry} style={{ backgroundColor: '#17a2b8', color: 'white' }}>{registeringUser ? 'Registering...' : 'Register Identity'}</Button>
        </div>
      )}
      {activeSubtab === 'add-claim-issuer' && (
        <div>
          <ContractSelector
            contractType="ClaimIssuer"
            contracts={deployedContracts}
            selectedAddress={selectedClaimIssuer}
            onSelect={setSelectedClaimIssuer}
            title="ClaimIssuer"
            description="Select which ClaimIssuer to add as key"
          />
          <Button onClick={handleAddClaimIssuerKeys} disabled={addingClaim || !selectedClaimIssuer} style={{ backgroundColor: '#28a745', color: 'white' }}>{addingClaim ? 'Adding...' : 'Add ClaimIssuer Keys'}</Button>
        </div>
      )}
      {activeSubtab === 'add-claim' && (
        <div>
          <ContractSelector
            contractType="ClaimIssuer"
            contracts={deployedContracts}
            selectedAddress={selectedClaimIssuer}
            onSelect={setSelectedClaimIssuer}
            title="ClaimIssuer"
            description="Select which ClaimIssuer to use for claim"
          />
          <label>Claim Topic:</label>
          <select value={claimTopic} onChange={e => setClaimTopic(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', marginBottom: '1rem' }}>
            <option value=''>Select a claim topic</option>
            {claimTopics.map(topic => (
              <option key={topic.id} value={topic.name}>{topic.name}</option>
            ))}
          </select>
          <label>Claim Value:</label>
          <select value={claimValue} onChange={e => setClaimValue(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', marginBottom: '1rem' }}>
            <option value=''>Select a value</option>
            <option value='YES'>YES</option>
            <option value='NO'>NO</option>
          </select>
          <Button onClick={handleAddClaim} disabled={addingClaim || !claimTopic || !claimValue || !selectedClaimIssuer} style={{ backgroundColor: '#ffc107', color: 'black' }}>{addingClaim ? 'Adding...' : 'Add Claim'}</Button>
        </div>
      )}
      {activeSubtab === 'view-claims' && (
        <div>
          <Button onClick={handleCheckClaims} style={{ backgroundColor: '#007bff', color: 'white' }}>Check Claims</Button>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;
