import React from 'react';
import { Button } from '../index';

const TrustedIssuersPhase = ({
  selectedTrustedIssuersRegistry,
  setSelectedTrustedIssuersRegistry,
  deployedRegistries,
  newIssuer,
  setNewIssuer,
  trustedIssuers,
  trustedIssuersLoading,
  addTrustedIssuer,
  removeTrustedIssuer
}) => {
  return (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Manage Trusted Issuers</h3>
      
      {/* Registry Selection */}
      <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #dee2e6" }}>
        <label style={{ color: '#1a237e', fontWeight: 'bold', marginRight: "1rem" }}>Select Registry:</label>
        <select
          value={selectedTrustedIssuersRegistry}
          onChange={(e) => setSelectedTrustedIssuersRegistry(e.target.value)}
          style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ced4da", minWidth: "300px" }}
        >
          <option value="">-- Select Trusted Issuers Registry --</option>
          {deployedRegistries.trustedIssuersRegistries.map((registry, index) => (
            <option key={index} value={registry.address}>
              {registry.name} ({registry.address})
            </option>
          ))}
        </select>
        {deployedRegistries.trustedIssuersRegistries.length === 0 && (
          <div style={{ color: "#dc3545", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            No Trusted Issuers Registries deployed. Deploy one in Phase 1 first.
          </div>
        )}
      </div>
      
      {selectedTrustedIssuersRegistry && (
        <div style={{ background: "#f0f8ff", padding: "2rem 2.5rem", borderRadius: "12px", border: "1px solid #b3d9ff", width: "100%", boxSizing: "border-box", marginBottom: "2rem" }}>
          {/* 2x2 grid layout: Left (actions/results), Right (instructions/console) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start", marginBottom: "2rem" }}>
            {/* Left column: Add Trusted Issuer + Current Trusted Issuers */}
            <div>
              {/* Add Trusted Issuer Form */}
              <div style={{ background: "#fff", border: "1px solid #dee2e6", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
                <label style={{ color: '#1a237e', fontWeight: 'bold', display: 'block', marginBottom: 8 }}>Add Trusted Issuer:</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    key="issuer-address-input"
                    type="text"
                    value={newIssuer.address}
                    onChange={e => setNewIssuer({ ...newIssuer, address: e.target.value })}
                    placeholder="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
                    style={{ width: "100%", padding: "0.5rem" }}
                  />
                  <input
                    key="issuer-topics-input"
                    type="text"
                    value={newIssuer.topics}
                    onChange={e => setNewIssuer({ ...newIssuer, topics: e.target.value })}
                    placeholder="1,2,3"
                    style={{ width: "100%", padding: "0.5rem" }}
                  />
                  <Button
                    onClick={addTrustedIssuer}
                    disabled={trustedIssuersLoading || !newIssuer.address || !newIssuer.topics}
                    style={{ backgroundColor: "#28a745", color: "white", width: "100%", marginTop: 4 }}
                  >
                    {trustedIssuersLoading ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
              {/* Current Trusted Issuers List */}
              <div>
                <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Current Trusted Issuers:</h4>
                {trustedIssuersLoading ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>Loading...</div>
                ) : (
                  <ul style={{ padding: 0, listStyle: 'none' }}>
                    {trustedIssuers.map((issuer, idx) => (
                      <li key={issuer.address + idx} style={{ marginBottom: 8, padding: "0.5rem", backgroundColor: "white", borderRadius: "4px", border: "1px solid #dee2e6" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "bold", color: '#1a237e' }}>{issuer.name}</div>
                            <div style={{ fontSize: "0.9rem", color: '#666', marginTop: "0.25rem" }}>{issuer.description}</div>
                            <div style={{ fontSize: "0.8rem", color: '#999', marginTop: "0.25rem" }}>
                              Address: <span style={{ fontFamily: "monospace" }}>{issuer.address}</span>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: '#999', marginTop: "0.25rem" }}>
                              Topics: {issuer.topics.join(", ")}
                            </div>
                          </div>
                          <Button
                            onClick={() => removeTrustedIssuer(issuer.address)}
                            disabled={trustedIssuersLoading}
                            style={{ backgroundColor: "#dc3545", color: "white", fontSize: "0.8rem", padding: "0.2rem 0.7rem", marginLeft: 8 }}
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Right column: Instructions & Sample Data + Check in Console */}
            <div>
              {/* Instructions & Sample Data */}
              <div style={{ padding: "1rem", backgroundColor: "#e3f2fd", borderRadius: "8px", border: "1px solid #2196f3", marginBottom: "1.5rem" }}>
                <h4 style={{ color: '#1a237e', margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>📝 Instructions & Sample Data</h4>
                <div style={{ fontSize: "0.85rem", color: "#000" }}>
                  <div><strong>✅ Valid Addresses:</strong></div>
                  <div style={{ marginLeft: "1rem" }}>
                    • 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Hardhat Account #0)<br/>
                    • 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Hardhat Account #1)<br/>
                    • 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Hardhat Account #2)
                  </div>
                  <div style={{ marginTop: "0.5rem" }}><strong>💡 Tip:</strong> External addresses (not on localhost) are also valid for trusted issuers</div>
                </div>
              </div>
              {/* Check in Console */}
              <div style={{ padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "8px", border: "1px solid #ffeaa7" }}>
                <h4 style={{ color: '#856404', margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>🔍 Check Trusted Issuers in Console</h4>
                <div style={{ fontSize: "0.85rem", color: "#856404" }}>
                  <div style={{ marginBottom: "0.5rem" }}><strong>Step 1:</strong> Open Hardhat console</div>
                  <div style={{ fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: "0.25rem", borderRadius: "2px", marginBottom: "0.5rem" }}>
                    npx hardhat console --network localhost
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}><strong>Step 2:</strong> Get contract instance</div>
                  <div style={{ fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: "0.25rem", borderRadius: "2px", marginBottom: "0.5rem" }}>
                    const registry = await ethers.getContractAt("TrustedIssuersRegistry", "{selectedTrustedIssuersRegistry}")
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}><strong>Step 3:</strong> Get all trusted issuers</div>
                  <div style={{ fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: "0.25rem", borderRadius: "2px", marginBottom: "0.5rem" }}>
                    const issuers = await registry.getTrustedIssuers()
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}><strong>Step 4:</strong> Get topics for an issuer</div>
                  <div style={{ fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: "0.25rem", borderRadius: "2px", marginBottom: "0.5rem" }}>
                    const topics = await registry.getTrustedIssuerClaimTopics(issuers[0])
                  </div>
                  <div style={{ fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: "0.25rem", borderRadius: "2px" }}>
                    console.log(topics.map(t =&gt; t.toString()))
                  </div>
                </div>
                <div style={{ marginTop: "1rem", padding: "0.5rem", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "3px", fontSize: "0.8rem", color: "#222" }}>
                  <strong>💡 Tip:</strong> After adding or removing issuers in UI, refresh with: <br/>
                  <code>contract = await ethers.getContractAt("TrustedIssuersRegistry", "{selectedTrustedIssuersRegistry}")</code><br/>
                  <code>issuers = await contract.getTrustedIssuers()</code><br/>
                  <code>topics = await contract.getTrustedIssuerClaimTopics(issuers[0])</code><br/>
                  <code>console.log(topics.map(t =&gt; t.toString()))</code><br/>
                  <em>Note: Use without 'const' to reassign existing variables</em>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustedIssuersPhase; 