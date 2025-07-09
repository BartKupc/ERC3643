import React from 'react';
import { Button } from '../index';

const ComponentsPhase = ({ 
  deployedComponents, 
  deployingComponents, 
  deployComponent, 
  addLog 
}) => {
  return (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deploy Components</h3>
      
      <div style={{ 
        backgroundColor: "#e8f5e8", 
        padding: "1rem", 
        borderRadius: "8px", 
        border: "1px solid #4caf50",
        marginBottom: "1rem"
      }}>
        <h4 style={{ color: '#2e7d32', marginBottom: "0.5rem" }}>🔐 MetaMask Deployment</h4>
        <p style={{ margin: "0.25rem 0", color: '#2e7d32' }}>
          <strong>Important:</strong> All contracts are now deployed using your MetaMask wallet, ensuring you own all deployed contracts.
        </p>
        <p style={{ margin: "0.25rem 0", color: '#2e7d32', fontSize: "0.9rem" }}>
          This means you'll be the owner of all contracts and can add agents, manage users, and control the entire system.
        </p>
        <p style={{ margin: "0.25rem 0", color: '#d32f2f', fontSize: "0.9rem", fontWeight: "bold" }}>
          ⚠️ Note: If you have existing deployments from before, they are owned by the backend wallet. You may need to redeploy them with MetaMask.
        </p>
      </div>
      
      {/* Deployment Status grid updates live */}
      <div style={{ 
        backgroundColor: "#f0f8ff", 
        padding: "1rem", 
        borderRadius: "8px", 
        border: "1px solid #b3d9ff",
        marginBottom: "2rem"
      }}>
        <h4 style={{ color: '#1a237e', margin: "0 0 1rem 0" }}>Deployment Status</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1rem" }}>
          {[
            "Identity Registry",
            "Identity Registry Storage", 
            "Claim Topics Registry",
            "Trusted Issuers Registry",
            "Modular Compliance",
            "OnchainID"
          ].map(component => {
            // Count deployed instances of this exact component type
            const deployedInstances = Object.entries(deployedComponents)
              .filter(([name, address]) => {
                // Map display names to actual component names
                const componentMap = {
                  "Identity Registry": "IdentityRegistry",
                  "Identity Registry Storage": "IdentityRegistryStorage",
                  "Claim Topics Registry": "ClaimTopicsRegistry",
                  "Trusted Issuers Registry": "TrustedIssuersRegistry",
                  "Modular Compliance": "ModularCompliance",
                  "OnchainID": "OnchainID"
                };
                const actualComponentName = componentMap[component];
                
                // Exact match for base component name, or numbered versions
                return name === actualComponentName || name.match(new RegExp(`^${actualComponentName}_\\d+$`));
              });
            
            return (
              <div key={component} style={{
                padding: "0.75rem",
                backgroundColor: deployedInstances.length > 0 ? "#d4edda" : "#f8d7da",
                borderRadius: "4px",
                textAlign: "center",
                minHeight: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <span style={{ 
                  color: deployedInstances.length > 0 ? "#155724" : "#721c24",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  lineHeight: "1.2",
                  wordBreak: "break-word"
                }}>
                  {deployedInstances.length > 0 ? "✅" : "❌"} {component}
                  {deployedInstances.length > 1 && ` (${deployedInstances.length})`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Individual Component Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          {
            name: "IdentityRegistry",
            displayName: "Identity Registry",
            description: "Manages user identities and their verification status",
            dependencies: []
          },
          {
            name: "IdentityRegistryStorage",
            displayName: "Identity Registry Storage", 
            description: "Stores identity data and user information",
            dependencies: []
          },
          {
            name: "ClaimTopicsRegistry",
            displayName: "Claim Topics Registry",
            description: "Manages claim topics for identity verification",
            dependencies: []
          },
          {
            name: "TrustedIssuersRegistry",
            displayName: "Trusted Issuers Registry",
            description: "Stores trusted issuers who can verify identities",
            dependencies: []
          },
          {
            name: "ModularCompliance",
            displayName: "Modular Compliance",
            description: "Handles compliance rules and transfer restrictions",
            dependencies: []
          },
          {
            name: "OnchainID",
            displayName: "OnchainID",
            description: "Identity contract for user verification and claims management",
            dependencies: []
          }
        ].map(component => {
          // Find all deployed instances of this component type (exact match or numbered versions)
          const deployedInstances = Object.entries(deployedComponents)
            .filter(([name, address]) => {
              // Exact match for base component name, or numbered versions
              return name === component.name || name.match(new RegExp(`^${component.name}_\\d+$`));
            })
            .sort((a, b) => a[0].localeCompare(b[0]));
          
          return (
            <div key={component.name} style={{
              padding: "1.5rem",
              border: "1px solid #b3d9ff",
              borderRadius: "8px",
              backgroundColor: "#fafbff"
            }}>
              <h4 style={{ color: '#1a237e', margin: "0 0 0.5rem 0" }}>{component.displayName}</h4>
              <p style={{ color: '#666', fontSize: "0.9rem", margin: "0 0 1rem 0" }}>
                {component.description}
              </p>
              
              {deployedInstances.length > 0 ? (
                <div>
                  <div style={{ 
                    backgroundColor: "#d4edda", 
                    color: "#155724", 
                    padding: "0.5rem", 
                    borderRadius: "4px",
                    marginBottom: "1rem",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "0.85rem"
                  }}>
                    ✅ Deployed ({deployedInstances.length} instance{deployedInstances.length > 1 ? 's' : ''})
                  </div>
                  
                  {deployedInstances.map(([instanceName, address], index) => (
                    <div key={instanceName} style={{ marginBottom: index < deployedInstances.length - 1 ? "1rem" : "0" }}>
                      <label style={{ color: '#1a237e', fontWeight: 'bold', fontSize: "0.9rem" }}>
                        {instanceName}:
                      </label>
                      <div style={{ 
                        fontFamily: "monospace", 
                        fontSize: "0.8rem", 
                        color: '#666',
                        backgroundColor: "#f8f9fa",
                        padding: "0.5rem",
                        borderRadius: "4px",
                        wordBreak: "break-all",
                        marginTop: "0.25rem"
                      }}>
                        {address}
                      </div>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(address);
                          addLog(`${instanceName} address copied to clipboard`, "info");
                        }}
                        style={{ 
                          backgroundColor: "#6c757d", 
                          color: "white",
                          fontSize: "0.8rem",
                          padding: "0.2rem 0.5rem",
                          marginTop: "0.5rem"
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  ))}
                  
                  {/* Deploy Additional Instance Button */}
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #dee2e6" }}>
                    <Button
                      onClick={() => deployComponent(component.name)}
                      disabled={deployingComponents[component.name]}
                      style={{ 
                        backgroundColor: "#28a745", 
                        color: "white",
                        width: "100%",
                        padding: "0.75rem"
                      }}
                    >
                      {deployingComponents[component.name] ? "Deploying..." : `Deploy Another ${component.displayName}`}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    backgroundColor: "#f8d7da", 
                    color: "#721c24", 
                    padding: "0.5rem", 
                    borderRadius: "4px",
                    marginBottom: "1rem",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "0.85rem"
                  }}>
                    ❌ Not Deployed
                  </div>
                  <Button
                    onClick={() => deployComponent(component.name)}
                    disabled={deployingComponents[component.name]}
                    style={{ 
                      backgroundColor: "#007bff", 
                      color: "white",
                      width: "100%",
                      padding: "0.75rem"
                    }}
                  >
                    {deployingComponents[component.name] ? "Deploying..." : `Deploy ${component.displayName}`}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Deployed Instances Summary */}
      {Object.keys(deployedComponents).length > 0 && (
        <div>
          <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deployed Instances Summary</h4>
          <div style={{ backgroundColor: "#f0f8ff", padding: "1rem", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {Object.entries(deployedComponents).map(([name, address]) => (
                <div key={name} style={{ 
                  backgroundColor: "white", 
                  padding: "0.75rem", 
                  borderRadius: "4px",
                  border: "1px solid #dee2e6"
                }}>
                  <strong style={{ color: '#1a237e', fontSize: "0.9rem" }}>{name}:</strong> 
                  <div style={{ 
                    fontFamily: "monospace", 
                    fontSize: "0.8rem", 
                    color: '#666',
                    wordBreak: "break-all",
                    marginTop: "0.25rem"
                  }}>
                    {address}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <Button
                onClick={() => {
                  const summary = Object.entries(deployedComponents)
                    .map(([name, addr]) => `${name}: ${addr}`)
                    .join('\n');
                  navigator.clipboard.writeText(summary);
                  addLog("All component addresses copied to clipboard", "info");
                }}
                style={{ 
                  backgroundColor: "#28a745", 
                  color: "white",
                  fontSize: "0.9rem"
                }}
              >
                Copy All Addresses
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentsPhase; 