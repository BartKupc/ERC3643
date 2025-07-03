import React, { useState, useEffect } from "react";
import { Button } from "./components";
import axios from "axios";

const AdvancedDashboard = ({ account, handleClearAddresses }) => {
  // All advanced state and logic here
  const [advancedPhase, setAdvancedPhase] = useState("components");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState([]);
  const [deployedComponents, setDeployedComponents] = useState({});
  const [deployingComponents, setDeployingComponents] = useState({});
  const [componentDetails, setComponentDetails] = useState({});
  const [phaseComplete, setPhaseComplete] = useState({ components: false, users: false, token: false, logs: false });

  // Helper to fetch contract info (simulate for now)
  const fetchContractInfo = async (address) => {
    // TODO: Replace with real backend call if available
    // For now, just return dummy data
    return {
      address,
      deployer: account,
      txHash: '0x123...',
      blockNumber: 123,
      gasUsed: 1545748,
      timestamp: new Date().toLocaleString(),
    };
  };

  // Update phase completion when all components are deployed
  useEffect(() => {
    const allDeployed = [
      'IdentityRegistry',
      'IdentityRegistryStorage',
      'ClaimTopicsRegistry',
      'TrustedIssuersRegistry',
      'ModularCompliance',
    ].every((c) => deployedComponents[c]);
    setPhaseComplete((prev) => ({ ...prev, components: allDeployed }));
  }, [deployedComponents]);

  // Add log entry
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    setLogs(prev => [...prev, logEntry]);
  };

  // Deploy component logic
  const deployComponent = async (componentName) => {
    if (!account) {
      setMessage("Please connect your wallet first");
      return;
    }
    if (deployingComponents[componentName]) {
      setMessage(`${componentName} deployment is already in progress`);
      return;
    }
    setMessage(`Deploying ${componentName}...`);
    setDeployingComponents(prev => ({ ...prev, [componentName]: true }));
    try {
      const response = await axios.post('/api/deploy/component', {
        component: componentName,
        deployer: account
      });
      if (response.data.success) {
        const deployedAddress = response.data.address;
        setDeployedComponents(prev => ({ ...prev, [componentName]: deployedAddress }));
        setMessage(`${componentName} deployed successfully at ${deployedAddress}`);
        addLog(`${componentName} deployed successfully at ${deployedAddress}`, "success");
        // Save to localStorage
        const savedComponents = JSON.parse(localStorage.getItem("trexDeployedComponents") || "{}");
        savedComponents[componentName] = deployedAddress;
        localStorage.setItem("trexDeployedComponents", JSON.stringify(savedComponents));
      } else {
        throw new Error(response.data.error || "Deployment failed");
      }
    } catch (error) {
      setMessage(`Failed to deploy ${componentName}: ${error.message}`);
      addLog(`Failed to deploy ${componentName}: ${error.message}`, "error");
    } finally {
      setDeployingComponents(prev => ({ ...prev, [componentName]: false }));
    }
  };

  // Load deployed components from localStorage on mount
  useEffect(() => {
    const savedComponents = localStorage.getItem("trexDeployedComponents");
    if (savedComponents) {
      try {
        setDeployedComponents(JSON.parse(savedComponents));
      } catch (error) {
        console.error("Error loading saved components:", error);
      }
    }
  }, []);

  // Status/Message Window
  const StatusMessage = () => (
    message && (
      <div style={{
        padding: "1rem",
        marginBottom: "1.5rem",
        backgroundColor: /fail|error|not found/i.test(message) ? "#f8d7da" : "#d4edda",
        color: /fail|error|not found/i.test(message) ? "#721c24" : "#155724",
        border: `1px solid ${/fail|error|not found/i.test(message) ? "#f5c6cb" : "#c3e6cb"}`,
        borderRadius: "4px",
        fontWeight: 500
      }}>
        {message}
      </div>
    )
  );

  // AdvancedNav with completion indicators
  const AdvancedNav = () => (
    <div style={{ 
      display: "flex", 
      gap: "1rem", 
      marginBottom: "2rem",
      padding: "1rem",
      backgroundColor: "#f0f8ff",
      borderRadius: "8px",
      border: "1px solid #b3d9ff"
    }}>
      {[
        { id: "components", label: "1. Deploy Components" },
        { id: "users", label: "2. Manage Users" },
        { id: "token", label: "3. Deploy Token" },
        { id: "logs", label: "4. Logs" }
      ].map(phase => (
        <Button
          key={phase.id}
          onClick={() => setAdvancedPhase(phase.id)}
          style={{
            backgroundColor: advancedPhase === phase.id ? "#1a237e" : phaseComplete[phase.id] ? "#28a745" : "#6c757d",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem",
            position: "relative"
          }}
        >
          {phase.label}
          {phaseComplete[phase.id] && (
            <span style={{
              position: "absolute",
              right: 8,
              top: 8,
              fontSize: "1.2em",
              color: "#fff"
            }}>✅</span>
          )}
        </Button>
      ))}
    </div>
  );

  // ComponentsPhase (only, for brevity)
  const ComponentsPhase = () => (
    <div>
      <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Deploy Components</h3>
      {/* Deployment Status grid updates live */}
      <div style={{ 
        backgroundColor: "#f0f8ff", 
        padding: "1rem", 
        borderRadius: "8px", 
        border: "1px solid #b3d9ff",
        marginBottom: "2rem"
      }}>
        <h4 style={{ color: '#1a237e', margin: "0 0 1rem 0" }}>Deployment Status</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            "IdentityRegistry",
            "IdentityRegistryStorage", 
            "ClaimTopicsRegistry",
            "TrustedIssuersRegistry",
            "ModularCompliance"
          ].map(component => (
            <div key={component} style={{
              padding: "0.5rem",
              backgroundColor: deployedComponents[component] ? "#d4edda" : "#f8d7da",
              borderRadius: "4px",
              textAlign: "center"
            }}>
              <span style={{ 
                color: deployedComponents[component] ? "#155724" : "#721c24",
                fontWeight: "bold"
              }}>
                {deployedComponents[component] ? "✅" : "❌"} {component}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Individual Component Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          {
            name: "IdentityRegistry",
            description: "Manages user identities and their verification status",
            dependencies: []
          },
          {
            name: "IdentityRegistryStorage", 
            description: "Stores identity data and user information",
            dependencies: []
          },
          {
            name: "ClaimTopicsRegistry",
            description: "Manages claim topics for identity verification",
            dependencies: []
          },
          {
            name: "TrustedIssuersRegistry",
            description: "Stores trusted issuers who can verify identities",
            dependencies: []
          },
          {
            name: "ModularCompliance",
            description: "Handles compliance rules and transfer restrictions",
            dependencies: []
          }
        ].map(component => (
          <div key={component.name} style={{
            padding: "1.5rem",
            border: "1px solid #b3d9ff",
            borderRadius: "8px",
            backgroundColor: "#fafbff"
          }}>
            <h4 style={{ color: '#1a237e', margin: "0 0 0.5rem 0" }}>{component.name}</h4>
            <p style={{ color: '#666', fontSize: "0.9rem", margin: "0 0 1rem 0" }}>
              {component.description}
            </p>
            {deployedComponents[component.name] ? (
              <div>
                <div style={{ 
                  backgroundColor: "#d4edda", 
                  color: "#155724", 
                  padding: "0.5rem", 
                  borderRadius: "4px",
                  marginBottom: "1rem",
                  textAlign: "center",
                  fontWeight: "bold"
                }}>
                  ✅ Deployed Successfully
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ color: '#1a237e', fontWeight: 'bold', fontSize: "0.9rem" }}>Contract Address:</label>
                  <div style={{ 
                    fontFamily: "monospace", 
                    fontSize: "0.8rem", 
                    color: '#666',
                    backgroundColor: "#f8f9fa",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    wordBreak: "break-all"
                  }}>
                    {deployedComponents[component.name]}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(deployedComponents[component.name]);
                      addLog(`${component.name} address copied to clipboard`, "info");
                    }}
                    style={{ 
                      backgroundColor: "#6c757d", 
                      color: "white",
                      fontSize: "0.8rem",
                      padding: "0.5rem 1rem"
                    }}
                  >
                    Copy Address
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
                  fontWeight: "bold"
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
                  {deployingComponents[component.name] ? "Deploying..." : `Deploy ${component.name}`}
                </Button>
              </div>
            )}
          </div>
        ))}
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

  // Placeholder for other phases
  const UsersPhase = () => <div><h3>Users Phase (Coming Soon)</h3></div>;
  const TokenPhase = () => <div><h3>Token Phase (Coming Soon)</h3></div>;
  const LogsPhase = () => <div><h3>Logs Phase (Coming Soon)</h3></div>;

  return (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "2rem" }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>Advanced Workflow</h2>
        <Button 
          onClick={handleClearAddresses}
          style={{ backgroundColor: "#dc3545", color: "white" }}
        >
          Clear All
        </Button>
      </div>
      <StatusMessage />
      <p style={{ color: '#666', marginBottom: "2rem" }}>Connected: {account}</p>
      <AdvancedNav />
      {advancedPhase === "components" && <ComponentsPhase />}
      {advancedPhase === "users" && <UsersPhase />}
      {advancedPhase === "token" && <TokenPhase />}
      {advancedPhase === "logs" && <LogsPhase />}
    </div>
  );
};

export default AdvancedDashboard;
