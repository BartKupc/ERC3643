import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../../shared';

const IDENTITIES_STORAGE_KEY = 'trex_user_identities';

const claimTopics = [
  { id: 1, name: "KYC (Know Your Customer)" },
  { id: 2, name: "AML (Anti-Money Laundering)" },
  { id: 3, name: "Accredited Investor" },
  { id: 4, name: "EU Nationality Confirmed" },
  { id: 5, name: "US Nationality Confirmed" },
  { id: 6, name: "Blacklist" }
];

const UserManagementTab = ({ deployedContracts = {}, selectedContracts = {}, setSelectedContracts = () => {}, addLog = () => {} }) => {
  // State
  const [userAddress, setUserAddress] = useState('');
  const [userCountry, setUserCountry] = useState('840');
  const [onchainIdAddress, setOnchainIdAddress] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [registeringUser, setRegisteringUser] = useState(false);
  const [addingClaim, setAddingClaim] = useState(false);
  const [message, setMessage] = useState('');
  const [userIdentities, setUserIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [claimTopic, setClaimTopic] = useState('');
  const [claimValue, setClaimValue] = useState('');
  const [availableClaimIssuers, setAvailableClaimIssuers] = useState([]);
  const [selectedClaimIssuer, setSelectedClaimIssuer] = useState('');
  const [availableIRs, setAvailableIRs] = useState([]);
  const [selectedIR, setSelectedIR] = useState('');
  const [loadingIRs, setLoadingIRs] = useState(false);
  const [loadingClaimIssuers, setLoadingClaimIssuers] = useState(false);
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [selectedTrustedIssuer, setSelectedTrustedIssuer] = useState('');

  // Load user identities from localStorage
  useEffect(() => {
    const savedIdentities = localStorage.getItem(IDENTITIES_STORAGE_KEY);
    if (savedIdentities) {
      setUserIdentities(JSON.parse(savedIdentities));
    }
  }, []);

  // Load available IRs (from backend)
  useEffect(() => {
    const loadAvailableIRs = async () => {
      setLoadingIRs(true);
      try {
        const response = await axios.get('/api/identity-registries');
        if (response.data.success) {
          setAvailableIRs(response.data.identityRegistries);
          if (!selectedIR && response.data.identityRegistries.length > 0) {
            setSelectedIR(response.data.identityRegistries[0].address);
          }
        }
      } catch (error) {
        setMessage('Error loading Identity Registries');
      } finally {
        setLoadingIRs(false);
      }
    };
    loadAvailableIRs();
  }, []);

  // Load available claim issuers (from localStorage)
  useEffect(() => {
    setLoadingClaimIssuers(true);
    try {
      const savedClaimIssuers = localStorage.getItem('trex_available_claim_issuers');
      if (savedClaimIssuers) {
        setAvailableClaimIssuers(JSON.parse(savedClaimIssuers));
      }
    } catch (error) {
      setMessage('Error loading claim issuers');
    } finally {
      setLoadingClaimIssuers(false);
    }
  }, []);

  // Save user identity to localStorage
  const saveUserIdentity = (identity) => {
    setUserIdentities(prev => {
      const existingIndex = prev.findIndex(id => id.userAddress.toLowerCase() === identity.userAddress.toLowerCase());
      let updated;
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...identity };
      } else {
        updated = [...prev, identity];
      }
      localStorage.setItem(IDENTITIES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Create OnchainID
  const createOnchainId = async () => {
    try {
      setCreatingUser(true);
      setMessage('Creating OnchainID...');
      if (!userAddress.trim()) throw new Error('Please enter a wallet address');
      // Backend API
      const response = await axios.post('/api/identity/create-onchainid', { userAddress });
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setOnchainIdAddress(response.data.onchainIdAddress);
      saveUserIdentity({ userAddress, onchainIdAddress: response.data.onchainIdAddress, country: userCountry, status: 'created', claims: [] });
      setMessage(`OnchainID created at ${response.data.onchainIdAddress}`);
    } catch (error) {
      setMessage(`Error creating OnchainID: ${error.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  // Register in Identity Registry
  const registerIdentity = async () => {
    try {
      setRegisteringUser(true);
      setMessage('Registering identity...');
      if (!onchainIdAddress) throw new Error('Please create an OnchainID first');
      if (!selectedIR) throw new Error('Please select an Identity Registry');
      const response = await axios.post('/api/identity/register-identity', {
        userAddress,
        onchainIdAddress,
        userCountry,
        selectedIR
      });
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setMessage('Identity registered successfully');
      saveUserIdentity({ userAddress, onchainIdAddress, country: userCountry, status: 'registered', registeredAt: new Date().toISOString() });
    } catch (error) {
      setMessage(`Error registering identity: ${error.message}`);
    } finally {
      setRegisteringUser(false);
    }
  };

  // Add ClaimIssuer keys to OnchainID
  const addClaimIssuerKeysToOnchainID = async () => {
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

  // Add claim to identity
  const addClaimToIdentity = async () => {
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
      // Update local identity
      saveUserIdentity({ userAddress, onchainIdAddress, country: userCountry, status: 'claim-added', claims: [{ topic: claimTopic, value: claimValue, issuer: selectedClaimIssuer, addedAt: new Date().toISOString() }] });
    } catch (error) {
      setMessage(`Error adding claim: ${error.message}`);
    } finally {
      setAddingClaim(false);
    }
  };

  // Check claims on OnchainID
  const checkOnchainIDClaims = async () => {
    try {
      if (!onchainIdAddress) throw new Error('Please create an OnchainID first');
      const response = await axios.get(`/api/identity/check-onchainid-claims/${onchainIdAddress}`);
      if (!response.data.success) throw new Error(response.data.error || 'Unknown error');
      setMessage(`Found ${response.data.totalClaims} claims on OnchainID contract`);
    } catch (error) {
      setMessage(`Error checking claims: ${error.message}`);
    }
  };

  // Clear current identity
  const clearCurrentIdentity = () => {
    setUserAddress('');
    setUserCountry('840');
    setOnchainIdAddress('');
    setSelectedIdentity(null);
    setClaimTopic('');
    setClaimValue('');
    setSelectedClaimIssuer('');
    setMessage('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>User Management</h3>
      {/* Existing Identities */}
      {userIdentities.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #dee2e6', padding: '1.5rem', marginBottom: '2rem' }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Existing Identities</h4>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {userIdentities.map((identity, index) => (
              <div key={index} style={{ border: selectedIdentity?.userAddress === identity.userAddress ? '2px solid #007bff' : '1px solid #dee2e6', borderRadius: '4px', padding: '1rem', marginBottom: '1rem', background: selectedIdentity?.userAddress === identity.userAddress ? '#e7f3ff' : '#fff', boxShadow: selectedIdentity?.userAddress === identity.userAddress ? '0 2px 8px rgba(0, 123, 255, 0.2)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#333' }}>{identity.userAddress}</strong>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button onClick={() => setSelectedIdentity(identity)} style={{ backgroundColor: selectedIdentity?.userAddress === identity.userAddress ? "#28a745" : "#007bff", color: "white", padding: '0.25rem 0.5rem', fontSize: '0.8rem', fontWeight: selectedIdentity?.userAddress === identity.userAddress ? 'bold' : 'normal' }}>{selectedIdentity?.userAddress === identity.userAddress ? 'Selected' : 'Select'}</Button>
                    <Button onClick={checkOnchainIDClaims} style={{ backgroundColor: "#17a2b8", color: "white", padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Check Claims</Button>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  <div>OnchainID: {identity.onchainIdAddress}</div>
                  <div>Status: {identity.status}</div>
                  <div>Country: {identity.country}</div>
                  <div>Claims: {identity.claims?.length || 0}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Step 1: Create OnchainID */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #dee2e6', padding: '1.5rem', marginBottom: '2rem' }}>
        <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 1: Create OnchainID</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>User Address:</label>
            <input type="text" value={userAddress} onChange={e => setUserAddress(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>Country Code:</label>
            <input type="text" value={userCountry} onChange={e => setUserCountry(e.target.value)} placeholder="840" style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <Button onClick={createOnchainId} disabled={creatingUser || !userAddress.trim()} style={{ backgroundColor: "#28a745", color: "white" }}>{creatingUser ? "Creating..." : "Create OnchainID"}</Button>
          <Button onClick={clearCurrentIdentity} style={{ backgroundColor: "#6c757d", color: "white" }}>Clear</Button>
        </div>
      </div>
      {/* Step 2: Register in Identity Registry */}
      {onchainIdAddress && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #dee2e6', padding: '1.5rem', marginBottom: '2rem' }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 2: Register in Identity Registry</h4>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>Select Identity Registry:</label>
            {loadingIRs ? (
              <div style={{ color: '#666', fontStyle: 'italic' }}>Loading Identity Registries...</div>
            ) : availableIRs.length > 0 ? (
              <select value={selectedIR} onChange={e => setSelectedIR(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: 'white', color: '#333' }}>
                <option value="">Select an Identity Registry</option>
                {availableIRs.map(ir => (
                  <option key={ir.address} value={ir.address}>IR: {ir.tokenName} ({ir.tokenSymbol}) - {ir.timestamp ? new Date(ir.timestamp).toLocaleString() : 'Unknown time'}</option>
                ))}
              </select>
            ) : (
              <div style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ffeaa7' }}>No Identity Registries found</div>
            )}
          </div>
          <Button onClick={registerIdentity} disabled={registeringUser || !selectedIR} style={{ backgroundColor: "#17a2b8", color: "white" }}>{registeringUser ? "Registering..." : "Register Identity"}</Button>
        </div>
      )}
      {/* Step 3: Add Claims */}
      {onchainIdAddress && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #dee2e6', padding: '1.5rem', marginBottom: '2rem' }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 3: Add Claims</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>Claim Topic:</label>
              <select value={claimTopic} onChange={e => setClaimTopic(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: 'white', color: '#333' }}>
                <option value="">Select a claim topic</option>
                {claimTopics.map(topic => (
                  <option key={topic.id} value={topic.name}>{topic.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>Claim Value:</label>
              <select value={claimValue} onChange={e => setClaimValue(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: 'white', color: '#333' }}>
                <option value="">Select a value</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>Trusted Issuer:</label>
              <select value={selectedClaimIssuer} onChange={e => setSelectedClaimIssuer(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: 'white', color: '#333' }}>
                <option value="">Select a Claim Issuer</option>
                {availableClaimIssuers.map(issuer => (
                  <option key={issuer.address} value={issuer.address}>{issuer.name || 'Unnamed'} - {issuer.timestamp ? new Date(issuer.timestamp).toLocaleString() : 'Unknown time'}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <Button onClick={addClaimIssuerKeysToOnchainID} disabled={addingClaim || !selectedClaimIssuer} style={{ backgroundColor: "#28a745", color: "white" }}>{addingClaim ? "Adding Keys..." : "Add ClaimIssuer Keys to OnchainID"}</Button>
            <Button onClick={addClaimToIdentity} disabled={addingClaim || !claimTopic || !claimValue} style={{ backgroundColor: "#ffc107", color: "black" }}>{addingClaim ? "Adding Claim..." : "Add Claim"}</Button>
          </div>
        </div>
      )}
      {/* Actual Claims from Contract */}
      {selectedIdentity?.claims && selectedIdentity.claims.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #dee2e6', padding: '1.5rem', marginBottom: '2rem' }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Claims</h4>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {selectedIdentity.claims.map((claim, index) => (
              <div key={index} style={{ border: '1px solid #dee2e6', borderRadius: '4px', padding: '1rem', marginBottom: '1rem', background: '#f8f9fa' }}>
                <div style={{ fontSize: '0.9rem', color: '#333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>Claim #{index + 1}</strong>
                    <span style={{ backgroundColor: '#007bff', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>Topic {claim.topic}</span>
                  </div>
                  <div><strong>Issuer:</strong> {claim.issuer}</div>
                  <div><strong>Value:</strong> {claim.value}</div>
                  <div><strong>Added:</strong> {claim.addedAt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Message */}
      {message && (
        <div style={{ color: message.includes('Error') ? '#721c24' : '#155724', backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>{message}</div>
      )}
    </div>
  );
};

export default UserManagementTab;
