import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ClaimIssuerPhase = ({ deployedComponents, account }) => {
  // State management
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [availableClaimTopics, setAvailableClaimTopics] = useState([]);
  const [selectedClaimTopicsRegistry, setSelectedClaimTopicsRegistry] = useState("");
  const [selectedTrustedIssuersRegistry, setSelectedTrustedIssuersRegistry] = useState("");

  // New state for creating a trusted issuer
  const [newIssuerAddress, setNewIssuerAddress] = useState("");
  const [newIssuerTopics, setNewIssuerTopics] = useState([]);
  const [registering, setRegistering] = useState(false);

  // Load available claim topics when component mounts
  useEffect(() => {
    if (deployedComponents.ClaimTopicsRegistry) {
      loadClaimTopics();
      setSelectedClaimTopicsRegistry(deployedComponents.ClaimTopicsRegistry);
    }
    if (deployedComponents.TrustedIssuersRegistry) {
      setSelectedTrustedIssuersRegistry(deployedComponents.TrustedIssuersRegistry);
    }
  }, [deployedComponents]);

  // Load trusted issuers when registries are selected
  useEffect(() => {
    if (selectedClaimTopicsRegistry && selectedTrustedIssuersRegistry) {
      loadTrustedIssuers();
    }
  }, [selectedClaimTopicsRegistry, selectedTrustedIssuersRegistry]);

  const loadClaimTopics = async () => {
    try {
      const response = await axios.get(`/api/claim-topics?registryAddress=${deployedComponents.ClaimTopicsRegistry}`);
      setAvailableClaimTopics(response.data);
    } catch (error) {
      console.error('Error loading claim topics:', error);
      setMessage("Failed to load claim topics: " + (error.response?.data?.error || error.message));
    }
  };

  const loadTrustedIssuers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/trusted-issuers?registryAddress=${selectedTrustedIssuersRegistry}`);
      setTrustedIssuers(response.data);
    } catch (error) {
      console.error('Error loading trusted issuers:', error);
      setMessage("Failed to load trusted issuers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: handle topic selection
  const handleTopicToggle = (topicId) => {
    setNewIssuerTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  // Helper: generate a new random address (for demo, not secure for production)
  const generateNewAddress = () => {
    // In production, you would use a secure wallet or MetaMask
    // Here, we just generate a random address for demo
    const random = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
    setNewIssuerAddress(random);
  };

  // Register the trusted issuer in the registry
  const handleRegisterIssuer = async () => {
    if (!newIssuerAddress || newIssuerTopics.length === 0) {
      setMessage("Please provide an issuer address and select at least one claim topic.");
      return;
    }
    setRegistering(true);
    setMessage("");
    try {
      // Get owner account from MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const ownerAddress = accounts[0];
      if (!ownerAddress) {
        setMessage("Please connect your MetaMask wallet as the registry owner.");
        setRegistering(false);
        return;
      }
      // Prepare backend call to get transaction data
      const response = await axios.post('/api/trusted-issuers', {
        registryAddress: selectedTrustedIssuersRegistry,
        address: newIssuerAddress,
        topics: newIssuerTopics,
        deployerAddress: ownerAddress
      });
      if (!response.data.success) {
        setMessage("Failed to prepare registration: " + response.data.error);
        setRegistering(false);
        return;
      }
      // Send transaction via MetaMask
      const { transactionData } = response.data;
      await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          to: transactionData.to,
          data: transactionData.data,
          from: transactionData.from,
          gas: transactionData.gas,
          gasPrice: transactionData.gasPrice
        }]
      });
      setMessage("Trusted issuer registered successfully!");
      setNewIssuerAddress("");
      setNewIssuerTopics([]);
      loadTrustedIssuers();
    } catch (err) {
      setMessage("Error registering trusted issuer: " + (err?.message || err));
    } finally {
      setRegistering(false);
    }
  };

  // Note: Registration and deletion functions removed - these are managed through the TrustedIssuersRegistry

  return (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <h2 style={{ color: '#1a237e', marginBottom: '2rem' }}>Trusted Issuers Management</h2>

      {/* Status Messages */}
      {message && (
        <div style={{ 
          padding: "1rem", 
          margin: "1rem 0", 
          backgroundColor: /fail|error|not found/i.test(message) ? "#d32f2f" : "#c8e6c9",
          color: /fail|error|not found/i.test(message) ? "#fff" : "#222",
          border: `1px solid ${/fail|error|not found/i.test(message) ? "#b71c1c" : "#388e3c"}`,
          borderRadius: "4px"
        }}>
          {message}
        </div>
      )}

      {/* Registry Selection */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Registry Configuration</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Claim Topics Registry:</label>
            <input
              type="text"
              value={selectedClaimTopicsRegistry}
              onChange={(e) => setSelectedClaimTopicsRegistry(e.target.value)}
              placeholder="0x..."
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </div>
          <div>
            <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Trusted Issuers Registry:</label>
            <input
              type="text"
              value={selectedTrustedIssuersRegistry}
              onChange={(e) => setSelectedTrustedIssuersRegistry(e.target.value)}
              placeholder="0x..."
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </div>
        </div>
      </div>

      {/* Trusted Issuer Registration Form */}
      <div style={{ margin: "2rem 0", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #dee2e6" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Register New Trusted Issuer</h3>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Issuer Address:</label>
          <input
            type="text"
            value={newIssuerAddress}
            onChange={e => setNewIssuerAddress(e.target.value)}
            placeholder="0x... (or generate new)"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
          <button onClick={generateNewAddress} style={{ marginTop: "0.5rem", backgroundColor: '#1565c0', color: '#fff', padding: '0.25rem 1rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Generate New Address
          </button>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Claim Topics:</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {availableClaimTopics.map(topic => (
              <label key={topic.id} style={{ display: 'flex', alignItems: 'center', background: newIssuerTopics.includes(topic.id) ? '#e3f2fd' : '#fff', border: '1px solid #b3d9ff', borderRadius: '4px', padding: '0.25rem 0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newIssuerTopics.includes(topic.id)}
                  onChange={() => handleTopicToggle(topic.id)}
                  style={{ marginRight: '0.5rem' }}
                />
                {topic.name || `Topic ${topic.id}`}
              </label>
            ))}
          </div>
        </div>
        <button onClick={handleRegisterIssuer} disabled={registering} style={{ backgroundColor: registering ? '#6c757d' : '#28a745', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: registering ? 'not-allowed' : 'pointer', opacity: registering ? 0.6 : 1 }}>
          {registering ? 'Registering...' : 'Register Trusted Issuer'}
        </button>
      </div>

      {/* Trusted Issuers List */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Trusted Issuers</h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Loading Trusted Issuers...</div>
        ) : trustedIssuers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6c757d" }}>
            No trusted issuers found in the registry.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {trustedIssuers.map((issuer, idx) => (
              <div key={issuer.address || idx} style={{ 
                padding: "1rem", 
                backgroundColor: "#f8f9fa", 
                borderRadius: "8px", 
                border: "1px solid #dee2e6",
                position: "relative"
              }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong style={{ color: '#1a237e' }}>Address:</strong> 
                  <span style={{ fontFamily: "monospace", fontSize: "0.9rem", wordBreak: "break-all", color: "#000" }}>
                    {issuer.address}
                  </span>
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong style={{ color: '#1a237e' }}>Claim Topics:</strong>
                  <div style={{ marginTop: "0.25rem" }}>
                    {issuer.topics && issuer.topics.length > 0 ? (
                      issuer.topics.map(topicId => {
                        const topic = availableClaimTopics.find(t => t.id === topicId);
                        return (
                          <span key={topicId} style={{
                            display: "inline-block",
                            backgroundColor: "#e3f2fd",
                            color: "#1565c0",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            margin: "0.25rem",
                            fontSize: "0.8rem",
                            fontWeight: "bold"
                          }}>
                            {topic ? `${topic.name} (${topicId})` : `Topic ${topicId}`}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ color: "#666" }}>No topics</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimIssuerPhase; 