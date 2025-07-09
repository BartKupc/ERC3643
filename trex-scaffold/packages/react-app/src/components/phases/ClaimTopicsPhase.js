import React from 'react';
import { Button } from '../index';

const ClaimTopicsPhase = ({
  selectedClaimTopicsRegistry,
  setSelectedClaimTopicsRegistry,
  deployedRegistries,
  newClaimTopic,
  setNewClaimTopic,
  claimTopics,
  claimTopicsLoading,
  addClaimTopic,
  removeClaimTopic
}) => {
  return (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Manage Claim Topics</h3>
      
      {/* Registry Selection */}
      <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #dee2e6" }}>
        <label style={{ color: '#1a237e', fontWeight: 'bold', marginRight: "1rem" }}>Select Registry:</label>
        <select
          value={selectedClaimTopicsRegistry}
          onChange={(e) => setSelectedClaimTopicsRegistry(e.target.value)}
          style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ced4da", minWidth: "300px" }}
        >
          <option value="">-- Select Claim Topics Registry --</option>
          {deployedRegistries.claimTopicsRegistries.map((registry, index) => (
            <option key={index} value={registry.address}>
              {registry.name} ({registry.address})
            </option>
          ))}
        </select>
        {deployedRegistries.claimTopicsRegistries.length === 0 && (
          <div style={{ color: "#dc3545", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            No Claim Topics Registries deployed. Deploy one in Phase 1 first.
          </div>
        )}
      </div>
      
      {/* Claim Topics Legend */}
      <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#e3f2fd", borderRadius: "6px", border: "1px solid #2196f3" }}>
        <h4 style={{ color: '#1a237e', margin: "0 0 0.5rem 0", fontSize: "1rem" }}>📋 Claim Topics Legend</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", fontSize: "0.85rem", color: "#000" }}>
          <div><strong>1:</strong> KYC (Know Your Customer)</div>
          <div><strong>2:</strong> AML (Anti-Money Laundering)</div>
          <div><strong>3:</strong> Accredited Investor</div>
          <div><strong>4:</strong> EU Nationality Confirmed</div>
          <div><strong>5:</strong> US Nationality Confirmed</div>
          <div><strong>6:</strong> Blacklist</div>
        </div>
      </div>
      
      {selectedClaimTopicsRegistry && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          {/* Add Claim Topics Section */}
          <div style={{ background: "#f0f8ff", padding: "1rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
            <h4 style={{ color: '#1a237e', margin: "0 0 1rem 0" }}>Add Claim Topic</h4>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ color: '#1a237e', fontWeight: 'bold' }}>Claim Topic ID:</label>
              <input
                key="claim-topic-input"
                type="number"
                value={newClaimTopic}
                onChange={e => setNewClaimTopic(e.target.value)}
                placeholder="e.g. 1"
                style={{ width: 120, marginRight: 8, padding: "0.5rem" }}
              />
              <Button
                onClick={addClaimTopic}
                disabled={claimTopicsLoading || !newClaimTopic}
                style={{ backgroundColor: "#28a745", color: "white" }}
              >
                {claimTopicsLoading ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
          
          {/* Console Instructions */}
          <div style={{ padding: "1rem", backgroundColor: "#fff3e0", borderRadius: "6px", border: "1px solid #ff9800" }}>
            <h4 style={{ color: '#e65100', margin: "0 0 0.5rem 0", fontSize: "1rem" }}>🖥️ Check Claim Topics in Console</h4>
            <div style={{ fontSize: "0.85rem", fontFamily: "monospace", backgroundColor: "#fafafa", padding: "0.75rem", borderRadius: "4px", border: "1px solid #ddd", color: "#000" }}>
              <div style={{ marginBottom: "0.5rem" }}><strong>1.</strong> npx hardhat console --network localhost</div>
              <div style={{ marginBottom: "0.5rem" }}><strong>2.</strong> const address = "{selectedClaimTopicsRegistry}"</div>
              <div style={{ marginBottom: "0.5rem" }}><strong>3.</strong> const abi = ["function getClaimTopics() view returns (uint256[])"]</div>
              <div style={{ marginBottom: "0.5rem" }}><strong>4.</strong> const contract = await ethers.getContractAt(abi, address)</div>
              <div style={{ marginBottom: "0.5rem" }}><strong>5.</strong> const topics = await contract.getClaimTopics()</div>
              <div style={{ marginBottom: "0.5rem" }}><strong>6.</strong> topics.map(t =&gt; t.toString())</div>
              <div style={{ marginTop: "1rem", padding: "0.5rem", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "3px", fontSize: "0.8rem" }}>
                <strong>💡 Tip:</strong> After adding topics in UI, refresh with: <br/>
                <code>contract = await ethers.getContractAt(abi, address)</code><br/>
                <code>topics = await contract.getClaimTopics()</code><br/>
                <code>topics.map(t =&gt; t.toString())</code><br/>
                <em>Note: Use without 'const' to reassign existing variables</em>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Current Claim Topics List */}
      {selectedClaimTopicsRegistry && (
        <div style={{ background: "#f0f8ff", padding: "1rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
          <h4 style={{ color: '#1a237e', margin: "0 0 1rem 0" }}>Current Claim Topics:</h4>
          {claimTopicsLoading ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>Loading...</div>
          ) : (
            <ul>
              {claimTopics.map((topic, index) => (
                <li key={`${topic.id}-${index}`} style={{ marginBottom: 8, padding: "0.5rem", backgroundColor: "white", borderRadius: "4px", border: "1px solid #dee2e6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", color: '#1a237e' }}>{topic.name}</div>
                      <div style={{ fontSize: "0.9rem", color: '#666', marginTop: "0.25rem" }}>{topic.description}</div>
                      <div style={{ fontSize: "0.8rem", color: '#999', marginTop: "0.25rem" }}>ID: {topic.id}</div>
                    </div>
                    <Button
                      onClick={() => removeClaimTopic(topic.id)}
                      disabled={claimTopicsLoading}
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
      )}
    </div>
  );
};

export default ClaimTopicsPhase;