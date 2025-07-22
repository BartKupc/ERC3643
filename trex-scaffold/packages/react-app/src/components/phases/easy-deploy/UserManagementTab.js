import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from '../shared';
import { getContractArtifacts } from '../../../hooks/compiledContracts';

const IDENTITIES_STORAGE_KEY = 'trex_user_identities';

const UserManagementTab = ({ deploymentDetails, addLog, getSigner, factories }) => {
  // User Management State
  const [userAddress, setUserAddress] = useState('');
  const [userCountry, setUserCountry] = useState('840');
  const [onchainIdAddress, setOnchainIdAddress] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [registeringUser, setRegisteringUser] = useState(false);
  const [addingClaim, setAddingClaim] = useState(false);
  const [message, setMessage] = useState('');
  
  // User Identities State
  const [userIdentities, setUserIdentities] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  
  // Claim Management State
  const [claimTopic, setClaimTopic] = useState('');
  const [claimValue, setClaimValue] = useState('');
  const [selectedClaimIssuer, setSelectedClaimIssuer] = useState('');
  const [availableClaimIssuers, setAvailableClaimIssuers] = useState([]);
  const [loadingClaimIssuers, setLoadingClaimIssuers] = useState(false);
  
  // Identity Registry and Claim Issuer Selection
  const [availableIRs, setAvailableIRs] = useState([]);
  const [selectedIR, setSelectedIR] = useState('');
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [selectedTrustedIssuer, setSelectedTrustedIssuer] = useState('');
  const [loadingIRs, setLoadingIRs] = useState(false);
  
  // Standard T-REX claim topics
  const claimTopics = [
    { id: 1, name: "KYC (Know Your Customer)", values: ["YES", "NO"] },
    { id: 2, name: "AML (Anti-Money Laundering)", values: ["YES", "NO"] },
    { id: 3, name: "Accredited Investor", values: ["YES", "NO"] },
    { id: 4, name: "EU Nationality Confirmed", values: ["YES", "NO"] },
    { id: 5, name: "US Nationality Confirmed", values: ["YES", "NO"] },
    { id: 6, name: "Blacklist", values: ["YES", "NO"] }
  ];

  // Extract clean error message from verbose ethers.js errors
  const extractCleanError = (error) => {
    try {
      if (error.error && error.error.reason) {
        if (error.error.reason.includes('reverted with reason string')) {
          const match = error.error.reason.match(/reverted with reason string '([^']+)'/);
          if (match) {
            return match[1];
          }
        }
        return error.error.reason;
      }
      if (error.reason) {
        return error.reason;
      }
      if (error.message) {
        return error.message;
      }
      return error.toString();
    } catch (e) {
      return error.message || error.toString();
    }
  };

  // Load user identities from localStorage
  useEffect(() => {
    const loadUserIdentities = () => {
      try {
        const savedIdentities = localStorage.getItem(IDENTITIES_STORAGE_KEY);
        if (savedIdentities) {
          const parsedIdentities = JSON.parse(savedIdentities);
          setUserIdentities(parsedIdentities);
          addLog && addLog(`Loaded ${parsedIdentities.length} user identities from storage`, "info");
        }
      } catch (error) {
        console.error('Error loading user identities:', error);
        addLog && addLog("Error loading user identities", "error");
      }
    };
    
    loadUserIdentities();
  }, []); // Remove addLog dependency to prevent infinite loops

  // Load available Identity Registries and their trusted issuers from ALL factories
  useEffect(() => {
    const loadAvailableIRs = async () => {
      if (!factories || factories.length === 0) return;
      
      setLoadingIRs(true);
      try {
        addLog && addLog('Loading Identity Registries from all factories via backend...', 'info');
        
        // Use backend API instead of direct blockchain interaction
        const response = await fetch('/api/identity-registries');
        if (!response.ok) {
          throw new Error(`Backend request failed: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Unknown error');
        }
        
        setAvailableIRs(data.identityRegistries);
        
        // Auto-select first IR if none selected
        if (data.identityRegistries.length > 0 && !selectedIR) {
          setSelectedIR(data.identityRegistries[0].address);
          addLog && addLog(`Auto-selected IR: ${data.identityRegistries[0].address}`, "info");
        }
        
        addLog && addLog(`Loaded ${data.identityRegistries.length} Identity Registries via backend`, "success");
      } catch (error) {
        console.error('Error loading IRs:', error);
        addLog && addLog(`Error loading IRs: ${error.message}`, "error");
      } finally {
        setLoadingIRs(false);
      }
    };
    
    loadAvailableIRs();
  }, [factories]); // Load IRs from all factories, not just selected factory

  // Load available Claim Issuers from localStorage and get actual topics
  useEffect(() => {
    const loadClaimIssuers = async () => {
      try {
        const savedClaimIssuers = localStorage.getItem('trex_available_claim_issuers');
        if (savedClaimIssuers) {
          const parsedClaimIssuers = JSON.parse(savedClaimIssuers);
          
          // Use stored topics since direct contract access causes CORS issues
          const issuersWithActualTopics = parsedClaimIssuers.map((issuer) => {
            return {
              ...issuer,
              actualTopics: issuer.claimTopics || [1, 2, 3]
            };
          });
          
          setAvailableClaimIssuers(issuersWithActualTopics);
          addLog && addLog(`Loaded ${issuersWithActualTopics.length} Claim Issuers from storage`, "info");
        }
      } catch (error) {
        console.error('Error loading claim issuers:', error);
        addLog && addLog("Error loading claim issuers", "error");
      }
    };
    
    loadClaimIssuers();
  }, []); // Load once on component mount

  // Save user identity to localStorage
  const saveUserIdentity = (identity) => {
    setUserIdentities(prev => {
      const existingIndex = prev.findIndex(id => id.userAddress.toLowerCase() === identity.userAddress.toLowerCase());
      let updated;
      
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...identity };
        addLog && addLog(`Updated existing identity for ${identity.userAddress}`, "info");
      } else {
        updated = [...prev, identity];
        addLog && addLog(`Added new identity for ${identity.userAddress}`, "success");
      }
      
      localStorage.setItem(IDENTITIES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Check if identity already exists for a wallet
  const checkExistingIdentity = (walletAddress) => {
    return userIdentities.find(id => id.userAddress.toLowerCase() === walletAddress.toLowerCase());
  };

  // Create OnchainID for a wallet using TREX Factory pattern
  const createOnchainId = async () => {
    try {
      setCreatingUser(true);
      setMessage('Creating OnchainID...');
      addLog && addLog('Starting OnchainID creation using TREX Factory pattern', "info");

      if (!userAddress.trim()) {
        throw new Error('Please enter a wallet address');
      }

      // Check if identity already exists
      const existingIdentity = checkExistingIdentity(userAddress);
      if (existingIdentity) {
        setMessage(`Identity already exists for ${userAddress}. OnchainID: ${existingIdentity.onchainIdAddress}`);
        setOnchainIdAddress(existingIdentity.onchainIdAddress);
        addLog && addLog(`Using existing identity for ${userAddress}`, "info");
        return;
      }

      if (!deploymentDetails) {
        throw new Error('No deployment details available. Please deploy a factory first.');
      }
      
      addLog && addLog(`Debug - Deployment details: ${JSON.stringify(deploymentDetails, null, 2)}`, "info");
      
      if (!deploymentDetails.factories) {
        throw new Error('No factories found in deployment details. Please deploy a factory first.');
      }
      
      if (!deploymentDetails.factories.identityFactory) {
        throw new Error('Identity Factory not found in deployment details. Please deploy a factory first.');
      }

      addLog && addLog('Sending OnchainID creation request to backend...', "info");
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch('/api/create-onchainid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
          deploymentDetails: deploymentDetails
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      const { onchainIdAddress, transactionHash } = data;
      
      addLog && addLog(`✅ OnchainID created via backend at: ${onchainIdAddress}`, "success");
      addLog && addLog(`Transaction hash: ${transactionHash}`, "info");
      
      setOnchainIdAddress(onchainIdAddress);
      
      // Save the new identity
      const newIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        country: userCountry,
        createdAt: new Date().toISOString(),
        status: 'created',
        claims: [],
        factoryAddress: deploymentDetails.factories.identityFactory
      };
      saveUserIdentity(newIdentity);
      
      addLog && addLog(`OnchainID created at ${onchainIdAddress}`, "success");
      addLog && addLog(`Created via Identity Factory: ${deploymentDetails.factories.identityFactory}`, "info");
      setMessage(`OnchainID created successfully at ${onchainIdAddress}`);
    } catch (error) {
      console.error('Error creating OnchainID:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error creating OnchainID: ${cleanError}`);
      addLog && addLog(`Error creating OnchainID: ${cleanError}`, "error");
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle IR selection
  const handleIRSelection = (irAddress) => {
    setSelectedIR(irAddress);
    const selectedIRData = availableIRs.find(ir => ir.address === irAddress);
    if (selectedIRData) {
      addLog && addLog(`Selected IR: ${irAddress}`, "info");
    }
  };

  // Register identity in Identity Registry using TREX Factory pattern
  const registerIdentity = async () => {
    try {
      setRegisteringUser(true);
      setMessage('Registering identity...');
      addLog && addLog('Starting identity registration using TREX Factory pattern', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      if (!selectedIR) {
        throw new Error('Please select an Identity Registry first');
      }

      addLog && addLog('Sending identity registration request to backend...', "info");
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch('/api/register-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
          onchainIdAddress: onchainIdAddress,
          userCountry: userCountry,
          selectedIR: selectedIR
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      const { transactionHash } = data;
      
      addLog && addLog(`✅ Identity registered via backend`, "success");
      addLog && addLog(`Transaction hash: ${transactionHash}`, "info");
      
      // Update identity status
      const updatedIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        country: userCountry,
        identityRegistries: [...(selectedIdentity?.identityRegistries || []), {
          address: selectedIR,
          registeredAt: new Date().toISOString()
        }],
        status: 'registered',
        registeredAt: new Date().toISOString()
      };
      saveUserIdentity(updatedIdentity);
      
      addLog && addLog(`Identity registered for ${userAddress}`, "success");
      addLog && addLog(`User ${userAddress} can now receive claims and tokens`, "info");
      setMessage(`Identity registered successfully for ${userAddress}`);
    } catch (error) {
      console.error('Error registering identity:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error registering identity: ${cleanError}`);
      addLog && addLog(`Error registering identity: ${cleanError}`, "error");
      
      if (cleanError.includes('AgentRole') || cleanError.includes('not an agent')) {
        addLog && addLog(`Agent role error detected. In TREX Factory pattern:`, "error");
        addLog && addLog(`1. The factory deployer is automatically added as an agent`, "info");
        addLog && addLog(`2. Use the factory deployer account or add yourself as an agent`, "info");
        addLog && addLog(`3. Check the Agent Management tab to add agents`, "info");
      }
    } finally {
      setRegisteringUser(false);
    }
  };

  // Add ClaimIssuer keys to OnchainID (required for claim signing)
  const addClaimIssuerKeysToOnchainID = async () => {
    try {
      setAddingClaim(true);
      setMessage('Adding ClaimIssuer keys to OnchainID...');
      addLog && addLog('Adding ClaimIssuer keys to OnchainID', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      // Use selected trusted issuer or get the first one
      let finalIssuerAddress = '';
      
      if (selectedTrustedIssuer) {
        finalIssuerAddress = selectedTrustedIssuer;
        addLog && addLog(`Using selected trusted issuer: ${finalIssuerAddress}`, "info");
      } else if (trustedIssuers.length > 0) {
        finalIssuerAddress = trustedIssuers[0].address;
        addLog && addLog(`No issuer selected, using first trusted issuer: ${finalIssuerAddress}`, "info");
      } else {
        throw new Error('No trusted issuer found. Please add a trusted issuer first.');
      }

      addLog && addLog('Sending ClaimIssuer keys request to backend...', "info");
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch('/api/add-claim-issuer-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onchainIdAddress: onchainIdAddress,
          finalIssuerAddress: finalIssuerAddress
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      addLog && addLog(`✅ Successfully added ClaimIssuer ${finalIssuerAddress} keys to OnchainID via backend`, "success");
      if (data.managementKeyTx) {
        addLog && addLog(`Management key transaction: ${data.managementKeyTx}`, "info");
      }
      if (data.signingKeyTx) {
        addLog && addLog(`Signing key transaction: ${data.signingKeyTx}`, "info");
      }
      setMessage(data.message || `Successfully added ClaimIssuer ${finalIssuerAddress} keys to OnchainID`);
      
    } catch (error) {
      console.error('Error adding ClaimIssuer keys:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding ClaimIssuer keys: ${cleanError}`);
      addLog && addLog(`Error adding ClaimIssuer keys: ${cleanError}`, "error");
    } finally {
      setAddingClaim(false);
    }
  };

  // Add claim to identity
  const addClaimToIdentity = async () => {
    try {
      setAddingClaim(true);
      setMessage('Adding claim to identity...');
      addLog && addLog('Starting claim addition', "info");

      if (!onchainIdAddress) {
        throw new Error('Please create an OnchainID first');
      }

      if (!claimTopic.trim() || !claimValue.trim()) {
        throw new Error('Please enter claim topic and value');
      }

      // Use selected trusted issuer or get the first one
      let finalIssuerAddress = '';
      
      if (selectedTrustedIssuer) {
        finalIssuerAddress = selectedTrustedIssuer;
        addLog && addLog(`- Using selected trusted issuer: ${finalIssuerAddress}`, "info");
      } else if (trustedIssuers.length > 0) {
        finalIssuerAddress = trustedIssuers[0].address;
        addLog && addLog(`- No issuer selected, using first trusted issuer: ${finalIssuerAddress}`, "info");
      } else {
        throw new Error('No trusted issuer found. Please add a trusted issuer first.');
      }

      addLog && addLog('Sending claim addition request to backend...', "info");
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch('/api/add-claim-to-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onchainIdAddress: onchainIdAddress,
          claimTopic: claimTopic,
          claimValue: claimValue,
          finalIssuerAddress: finalIssuerAddress,
          userAddress: userAddress
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      addLog && addLog(`✅ Successfully added claim to identity via backend`, "success");
      addLog && addLog(`Transaction hash: ${data.transactionHash}`, "info");
      
      // Update identity with new claim
      const updatedIdentity = {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        claims: [...(selectedIdentity?.claims || []), {
          topic: data.topic,
          value: data.value,
          issuer: data.issuer,
          addedAt: new Date().toISOString()
        }]
      };
      saveUserIdentity(updatedIdentity);
      
      setMessage(`Successfully added claim to identity. Transaction: ${data.transactionHash}`);
      
    } catch (error) {
      console.error('Error adding claim to identity:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error adding claim to identity: ${cleanError}`);
      addLog && addLog(`Error adding claim to identity: ${cleanError}`, "error");
    } finally {
      setAddingClaim(false);
    }
  };

  // Load existing identity
  const loadExistingIdentity = (identity) => {
    setUserAddress(identity.userAddress);
    setUserCountry(identity.country);
    setOnchainIdAddress(identity.onchainIdAddress);
    setSelectedIdentity(identity);
    addLog && addLog(`Loaded existing identity for ${identity.userAddress}`, "info");
  };

  // Check claims on OnchainID contract
  const checkOnchainIDClaims = async () => {
    if (!onchainIdAddress) {
      setMessage('Please create an OnchainID first');
      return;
    }
    
    try {
      addLog && addLog(`Checking claims on OnchainID: ${onchainIdAddress}`, "info");
      
      // Use backend API instead of direct blockchain interaction
      const response = await fetch(`/api/check-onchainid-claims/${onchainIdAddress}`);
      
      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      const { claims, totalClaims } = data;
      
      if (totalClaims === 0) {
        addLog && addLog('No claims found on this OnchainID', "info");
        setMessage('No claims found on OnchainID contract');
        return;
      }
      
      addLog && addLog(`Total claims found on contract: ${totalClaims}`, "success");
      setMessage(`Found ${totalClaims} claims on OnchainID contract`);
      
      // Update the selected identity with actual claims from contract
      if (selectedIdentity) {
        const updatedIdentity = {
          ...selectedIdentity,
          actualClaims: claims
        };
        saveUserIdentity(updatedIdentity);
        setSelectedIdentity(updatedIdentity);
      }
      
    } catch (error) {
      console.error('Error checking OnchainID claims:', error);
      const cleanError = extractCleanError(error);
      setMessage(`Error checking claims: ${cleanError}`);
      addLog && addLog(`Error checking claims: ${cleanError}`, "error");
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
    setSelectedTrustedIssuer('');
    setMessage('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>User Management</h3>
      
      {/* TREX Factory Pattern Information */}
      <div style={{ 
        background: '#e7f3ff', 
        borderRadius: 8, 
        border: '1px solid #b3d9ff',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <h5 style={{ color: '#1a237e', marginBottom: '0.5rem' }}>🏭 TREX Factory Pattern</h5>
        <p style={{ color: '#333', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
          In the TREX Factory pattern, users don't directly interact with contracts. Instead, the platform admin/issuer:
        </p>
        <ol style={{ color: '#333', fontSize: '0.9rem', margin: '0', paddingLeft: '1.5rem' }}>
          <li><strong>Creates OnchainID</strong> using <code>IIdFactory.createIdentity(userAddress, salt)</code></li>
          <li><strong>Registers user</strong> in IdentityRegistry using <code>registerIdentity(userAddress, identityAddress, countryCode)</code></li>
          <li><strong>Issues claims</strong> via a ClaimIssuer that has the right topic (e.g., KYC, AML)</li>
        </ol>
        <p style={{ color: '#666', fontSize: '0.8rem', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
          Once claims are verified and compliance modules approve, the user can receive or transfer tokens.
        </p>
      </div>
      
      {/* Message Display */}
      {message && (
        <div style={{ 
          color: message.includes('Error') ? '#721c24' : '#155724',
          backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
          padding: '0.5rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}`
        }}>
          {message}
        </div>
      )}

      {/* Existing Identities - MOVED TO TOP */}
      {userIdentities.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Existing Identities</h4>
          
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {userIdentities.map((identity, index) => (
              <div key={index} style={{ 
                border: selectedIdentity?.userAddress === identity.userAddress ? '2px solid #007bff' : '1px solid #dee2e6', 
                borderRadius: '4px', 
                padding: '1rem', 
                marginBottom: '1rem',
                background: selectedIdentity?.userAddress === identity.userAddress ? '#e7f3ff' : '#fff',
                boxShadow: selectedIdentity?.userAddress === identity.userAddress ? '0 2px 8px rgba(0, 123, 255, 0.2)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#333' }}>{identity.userAddress}</strong>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button
                      onClick={() => loadExistingIdentity(identity)}
                      style={{ 
                        backgroundColor: selectedIdentity?.userAddress === identity.userAddress ? "#28a745" : "#007bff", 
                        color: "white", 
                        padding: '0.25rem 0.5rem', 
                        fontSize: '0.8rem',
                        fontWeight: selectedIdentity?.userAddress === identity.userAddress ? 'bold' : 'normal'
                      }}
                    >
                      {selectedIdentity?.userAddress === identity.userAddress ? 'Selected' : 'Select'}
                    </Button>
                    <Button
                      onClick={() => {
                        setOnchainIdAddress(identity.onchainIdAddress);
                        checkOnchainIDClaims();
                      }}
                      style={{ backgroundColor: "#17a2b8", color: "white", padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    >
                      Check Claims
                    </Button>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  <div>OnchainID: {identity.onchainIdAddress}</div>
                  <div>Status: {identity.status}</div>
                  <div>Country: {identity.country}</div>
                  <div>Claims: {identity.claims?.length || 0}</div>
                  {identity.actualClaims && (
                    <div>Actual Claims on Contract: {identity.actualClaims.length}</div>
                  )}
                  {identity.identityRegistries && identity.identityRegistries.length > 0 && (
                    <div>
                      <strong>Registered in IRs:</strong>
                      {identity.identityRegistries.map((ir, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          • {ir.address}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Create OnchainID */}
      <div style={{ 
        background: '#fff', 
        borderRadius: 8, 
        border: '1px solid #dee2e6',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 1: Create OnchainID</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              User Address:
            </label>
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Country Code:
            </label>
            <input
              type="text"
              value={userCountry}
              onChange={(e) => setUserCountry(e.target.value)}
              placeholder="840"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <Button
            onClick={createOnchainId}
            disabled={creatingUser || !userAddress.trim()}
            style={{ backgroundColor: "#28a745", color: "white" }}
          >
            {creatingUser ? "Creating..." : "Create OnchainID"}
          </Button>
          <Button
            onClick={clearCurrentIdentity}
            style={{ backgroundColor: "#6c757d", color: "white" }}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Step 2: Register in Identity Registry */}
      {onchainIdAddress && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 2: Register in Identity Registry</h4>
          
          {/* IR Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Select Identity Registry:
            </label>
            {loadingIRs ? (
              <div style={{ color: '#666', fontStyle: 'italic' }}>Loading Identity Registries...</div>
            ) : availableIRs.length > 0 ? (
              <select
                value={selectedIR}
                onChange={(e) => handleIRSelection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select an Identity Registry</option>
                {availableIRs.map(ir => (
                  <option key={ir.address} value={ir.address}>
                    IR: {ir.tokenName} ({ir.tokenSymbol}) - {ir.timestamp ? new Date(ir.timestamp).toLocaleString() : 'Unknown time'}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ 
                color: '#856404', 
                backgroundColor: '#fff3cd',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ffeaa7'
              }}>
                No Identity Registries found in deployment details
              </div>
            )}
          </div>
          
          {/* Available Claim Issuers - Show all regardless of IR selection */}
          {availableClaimIssuers.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Available Claim Issuers:
              </label>
              <select
                value={selectedTrustedIssuer}
                onChange={(e) => setSelectedTrustedIssuer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a Claim Issuer</option>
                {availableClaimIssuers.map((issuer, index) => (
                  <option key={index} value={issuer.address}>
                    {issuer.name || 'Unnamed Issuer'} - {issuer.timestamp ? new Date(issuer.timestamp).toLocaleString() : 'Unknown time'}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <Button
            onClick={registerIdentity}
            disabled={registeringUser || !selectedIR}
            style={{ backgroundColor: "#17a2b8", color: "white" }}
          >
            {registeringUser ? "Registering..." : "Register Identity"}
          </Button>
        </div>
      )}

      {/* Step 3: Add Claims */}
      {onchainIdAddress && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>Step 3: Add Claims</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Claim Topic:
              </label>
              <select
                value={claimTopic}
                onChange={(e) => setClaimTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a claim topic</option>
                {claimTopics.map(topic => (
                  <option key={topic.id} value={topic.name}>{topic.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Claim Value:
              </label>
              <select
                value={claimValue}
                onChange={(e) => setClaimValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a value</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
                Trusted Issuer:
              </label>
              <select
                value={selectedTrustedIssuer}
                onChange={(e) => setSelectedTrustedIssuer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  backgroundColor: 'white',
                  color: '#333'
                }}
              >
                <option value="">Select a Claim Issuer</option>
                {availableClaimIssuers.map(issuer => (
                  <option key={issuer.address} value={issuer.address}>
                    {issuer.name || 'Unnamed'} - {issuer.timestamp ? new Date(issuer.timestamp).toLocaleString() : 'Unknown time'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <Button
              onClick={addClaimIssuerKeysToOnchainID}
              disabled={addingClaim || !selectedTrustedIssuer}
              style={{ backgroundColor: "#28a745", color: "white" }}
            >
              {addingClaim ? "Adding Keys..." : "Add ClaimIssuer Keys to OnchainID"}
            </Button>
            
            <Button
              onClick={addClaimToIdentity}
              disabled={addingClaim || !claimTopic || !claimValue}
              style={{ backgroundColor: "#ffc107", color: "black" }}
            >
              {addingClaim ? "Adding Claim..." : "Add Claim"}
            </Button>
          </div>
        </div>
      )}

      {/* Actual Claims from Contract */}
      {selectedIdentity?.actualClaims && selectedIdentity.actualClaims.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          border: '1px solid #dee2e6',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{ color: '#1a237e', marginBottom: '1rem' }}>
            Claims on Contract ({selectedIdentity.actualClaims.length} total)
          </h4>
          
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {selectedIdentity.actualClaims.map((claim, index) => (
              <div key={index} style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '4px', 
                padding: '1rem', 
                marginBottom: '1rem',
                background: '#f8f9fa'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>Claim #{index + 1}</strong>
                    <span style={{ 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem' 
                    }}>
                      Topic {claim.topic}
                    </span>
                  </div>
                  <div><strong>Claim ID:</strong> {claim.id}</div>
                  <div><strong>Issuer:</strong> {claim.issuer}</div>
                  <div><strong>Data:</strong> {claim.data}</div>
                  <div><strong>Scheme:</strong> {claim.scheme}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: '#e7f3ff', 
            borderRadius: '4px', 
            fontSize: '0.8rem', 
            color: '#1a237e' 
          }}>
            <strong>Note:</strong> All claims shown above are directly from the OnchainID contract. 
            If you have claims from multiple issuers, they should all be displayed here.
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab; 