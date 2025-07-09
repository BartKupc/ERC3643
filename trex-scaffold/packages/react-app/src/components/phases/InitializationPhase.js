import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const InitializationPhase = ({ deployedComponents, account, setMessage, onComplete }) => {
  const [initializationOrder, setInitializationOrder] = useState([]);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [initializing, setInitializing] = useState(false);
  const [initializationResults, setInitializationResults] = useState([]);

  // Define which components need initialization and their dependencies
  const componentConfig = {
    'IdentityRegistryStorage': {
      name: 'Identity Registry Storage',
      description: 'Storage contract for identity data',
      dependencies: [],
      action: 'Initialize with owner'
    },
    'ClaimTopicsRegistry': {
      name: 'Claim Topics Registry',
      description: 'Registry for claim topics',
      dependencies: [],
      action: 'Initialize with owner'
    },
    'TrustedIssuersRegistry': {
      name: 'Trusted Issuers Registry',
      description: 'Registry for trusted issuers',
      dependencies: [],
      action: 'Initialize with owner'
    },
    'IdentityRegistry': {
      name: 'Identity Registry',
      description: 'Main identity registry contract',
      dependencies: ['IdentityRegistryStorage', 'ClaimTopicsRegistry', 'TrustedIssuersRegistry'],
      action: 'Initialize with registry addresses'
    }
  };

  // Build available components list
  useEffect(() => {
    console.log('🔍 Deployed Components:', deployedComponents);
    const available = [];
    Object.keys(componentConfig).forEach(component => {
      // Check for exact match first
      if (deployedComponents[component]) {
        available.push({
          component,
          ...componentConfig[component],
          address: deployedComponents[component]
        });
      } else {
        // Check for numbered versions (e.g., IdentityRegistry_1, IdentityRegistry_2)
        const numberedVersions = Object.keys(deployedComponents).filter(key => 
          key.startsWith(component) && (key === component || key.match(new RegExp(`^${component}_\\d+$`)))
        );
        if (numberedVersions.length > 0) {
          // Use the latest numbered version
          const latestVersion = numberedVersions.sort().pop();
          available.push({
            component,
            ...componentConfig[component],
            address: deployedComponents[latestVersion]
          });
        }
      }
    });
    console.log('🔍 Available Components for Initialization:', available);
    setAvailableComponents(available);
  }, [deployedComponents, componentConfig]);

  // Add component to initialization order
  const addToOrder = (component) => {
    if (!initializationOrder.find(item => item.component === component.component)) {
      setInitializationOrder([...initializationOrder, {
        component: component.component,
        action: component.action,
        dependencies: component.dependencies
      }]);
    }
  };

  // Remove component from initialization order
  const removeFromOrder = (componentName) => {
    setInitializationOrder(initializationOrder.filter(item => item.component !== componentName));
  };

  // Move component up in order
  const moveUp = (index) => {
    if (index > 0) {
      const newOrder = [...initializationOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setInitializationOrder(newOrder);
    }
  };

  // Move component down in order
  const moveDown = (index) => {
    if (index < initializationOrder.length - 1) {
      const newOrder = [...initializationOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setInitializationOrder(newOrder);
    }
  };

  // Bind Identity Registry to Identity Registry Storage
  const handleBindIdentityRegistry = async () => {
    if (!account) {
      setMessage("Please connect your wallet first");
      return;
    }

    // Find Identity Registry and Identity Registry Storage addresses
    const identityRegistry = availableComponents.find(c => c.component === 'IdentityRegistry');
    const identityRegistryStorage = availableComponents.find(c => c.component === 'IdentityRegistryStorage');

    if (!identityRegistry || !identityRegistryStorage) {
      setMessage("Please deploy both Identity Registry and Identity Registry Storage first");
      return;
    }

    setInitializing(true);
    setMessage("");

    try {
      // Step 1: Get bind transaction data from backend
      const response = await axios.post('/api/prepare-bind-identity-registry', {
        identityRegistryAddress: identityRegistry.address,
        identityRegistryStorageAddress: identityRegistryStorage.address,
        deployerAddress: account
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to prepare bind transaction");
      }

      const { transactionData } = response.data;
      
      // Step 2: Send transaction via MetaMask
      setMessage("Binding Identity Registry with MetaMask...");
      
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionData]
      });
      
      console.log('Bind transaction sent:', tx);
      setMessage("Bind transaction sent! Hash: " + tx);
      
      // Step 3: Wait for transaction confirmation
      setMessage("Waiting for bind transaction confirmation...");
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const receipt = await provider.waitForTransaction(tx);
      
      if (receipt.status === 1) {
        setMessage("✅ Identity Registry bound to Identity Registry Storage successfully!");
      } else {
        setMessage("❌ Bind transaction failed! Hash: " + tx);
      }
    } catch (error) {
      console.error('Bind error:', error);
      
      // Handle different types of errors
      if (error.code === 4001) {
        setMessage("Bind transaction was rejected by user");
      } else if (error.code === -32603) {
        setMessage("Bind transaction failed on blockchain: " + (error.data?.message || error.message));
      } else if (error.response?.data?.error) {
        setMessage("Failed to bind Identity Registry: " + error.response.data.error);
      } else if (error.message) {
        setMessage("Failed to bind Identity Registry: " + error.message);
      } else {
        setMessage("Failed to bind Identity Registry: Unknown error occurred");
      }
    } finally {
      setInitializing(false);
    }
  };

  // Initialize components
  const initializeComponents = async () => {
    if (initializationOrder.length === 0) {
      setMessage("Please add components to the initialization order first");
      return;
    }

    setInitializing(true);
    setMessage("");

    try {
      // Step 1: Get initialization transactions from backend
      const response = await axios.post('/api/prepare-initialize-components', {
        initializationOrder,
        deployerAddress: account
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to prepare initialization");
      }

      const { initializationTransactions } = response.data;
      
      // Step 2: Execute each initialization transaction with MetaMask
      const results = [];
      
      for (const transaction of initializationTransactions) {
        if (transaction.status === 'ready' && transaction.transactionData) {
          setMessage(`Initializing ${transaction.component}...`);
          
          try {
            // Send transaction via MetaMask
            const tx = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [transaction.transactionData]
            });
            
            console.log(`${transaction.component} initialization transaction sent:`, tx);
            
            // Wait for transaction confirmation
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const receipt = await provider.waitForTransaction(tx);
            
            if (receipt.status === 1) {
              results.push({ 
                component: transaction.component, 
                action: transaction.action, 
                status: 'success', 
                address: transaction.address,
                transactionHash: tx
              });
              setMessage(`${transaction.component} initialized successfully!`);
            } else {
              results.push({ 
                component: transaction.component, 
                action: transaction.action, 
                status: 'failed', 
                reason: 'Transaction failed',
                transactionHash: tx
              });
              setMessage(`${transaction.component} initialization failed!`);
            }
          } catch (error) {
            console.error(`Error initializing ${transaction.component}:`, error);
            results.push({ 
              component: transaction.component, 
              action: transaction.action, 
              status: 'failed', 
              reason: error.message
            });
            setMessage(`Failed to initialize ${transaction.component}: ${error.message}`);
          }
        } else {
          // Handle skipped or failed transactions
          results.push(transaction);
        }
      }

      setInitializationResults(results);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;
      
      if (failedCount === 0) {
        setMessage(`✅ All components initialized successfully! (${successCount} components, ${skippedCount} skipped)`);
        // Mark phase as complete if all succeeded
        if (onComplete) {
          onComplete();
        }
      } else {
        setMessage(`⚠️ Initialization completed with ${successCount} successes, ${failedCount} failures, and ${skippedCount} skipped. Check results below.`);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      setMessage("Failed to initialize components: " + (error.response?.data?.error || error.message));
    } finally {
      setInitializing(false);
    }
  };

  // Check if component can be added (dependencies met)
  const canAddComponent = (component) => {
    if (component.dependencies.length === 0) return true;
    
    return component.dependencies.every(dep => 
      initializationOrder.find(item => item.component === dep)
    );
  };

  return (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "2rem" }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>Component Initialization</h2>
        <button
          onClick={handleBindIdentityRegistry}
          disabled={initializing}
          style={{ 
            backgroundColor: "#17a2b8", 
            color: "white", 
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.9rem"
          }}
        >
          {initializing ? "Binding..." : "Bind Identity Registry"}
        </button>
      </div>

      {/* Debug Info */}
      <div style={{ 
        backgroundColor: "#fff3cd", 
        padding: "1rem", 
        borderRadius: "8px",
        border: "1px solid #ffeaa7",
        marginBottom: "2rem",
        fontSize: "0.9rem"
      }}>
        <h4 style={{ color: '#856404', marginBottom: "0.5rem" }}>🔍 Debug Information</h4>
        <p style={{ margin: "0.25rem 0", color: '#856404' }}>
          <strong>Deployed Components Count:</strong> {Object.keys(deployedComponents).length}
        </p>
        <p style={{ margin: "0.25rem 0", color: '#856404' }}>
          <strong>Available for Initialization:</strong> {availableComponents.length}
        </p>
        <p style={{ margin: "0.25rem 0", color: '#856404' }}>
          <strong>Component Names in Storage:</strong> {Object.keys(deployedComponents).join(', ')}
        </p>
      </div>

      <div style={{ 
        backgroundColor: "#f0f8ff", 
        padding: "1rem", 
        borderRadius: "8px",
        border: "1px solid #b3d9ff",
        marginBottom: "2rem"
      }}>
        <h4 style={{ color: '#1a237e', marginBottom: "1rem" }}>📋 Instructions</h4>
        <p style={{ margin: "0.5rem 0", color: '#333' }}>
          <strong>Step 1:</strong> Add components to the initialization order (dependencies first)
        </p>
        <p style={{ margin: "0.5rem 0", color: '#333' }}>
          <strong>Step 2:</strong> Arrange the order if needed (drag up/down)
        </p>
        <p style={{ margin: "0.5rem 0", color: '#333' }}>
          <strong>Step 3:</strong> Click "Initialize Components" to execute
        </p>
        <p style={{ margin: "0.5rem 0", color: '#666', fontSize: "0.9rem" }}>
          <strong>💡 Tip:</strong> Identity Registry should be initialized last as it depends on other registries.
        </p>
      </div>

      {/* Available Components */}
      <div style={{ margin: "2rem 0" }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Available Components</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {availableComponents.map((component) => {
            const isInOrder = initializationOrder.find(item => item.component === component.component);
            const canAdd = canAddComponent(component);
            
            return (
              <div 
                key={component.component}
                style={{ 
                  backgroundColor: isInOrder ? "#e8f5e8" : "#fff",
                  padding: "1rem", 
                  borderRadius: "8px",
                  border: `2px solid ${isInOrder ? "#4caf50" : "#ddd"}`,
                  opacity: isInOrder ? 0.7 : 1
                }}
              >
                <h4 style={{ color: '#1a237e', margin: "0 0 0.5rem 0" }}>{component.name}</h4>
                <p style={{ margin: "0.5rem 0", fontSize: "0.9rem", color: '#666' }}>
                  {component.description}
                </p>
                <p style={{ margin: "0.5rem 0", fontSize: "0.8rem", color: '#888' }}>
                  <strong>Action:</strong> {component.action}
                </p>
                {component.dependencies.length > 0 && (
                  <p style={{ margin: "0.5rem 0", fontSize: "0.8rem", color: '#888' }}>
                    <strong>Dependencies:</strong> {component.dependencies.join(', ')}
                  </p>
                )}
                <p style={{ margin: "0.5rem 0", fontSize: "0.8rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {component.address}
                </p>
                
                {!isInOrder && canAdd && (
                  <button
                    onClick={() => addToOrder(component)}
                    style={{ 
                      backgroundColor: "#007bff", 
                      color: "white", 
                      padding: "0.5rem 1rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginTop: "0.5rem"
                    }}
                  >
                    + Add to Order
                  </button>
                )}
                
                {!isInOrder && !canAdd && (
                  <div style={{ 
                    backgroundColor: "#fff3cd", 
                    color: "#856404", 
                    padding: "0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    marginTop: "0.5rem"
                  }}>
                    ⚠️ Add dependencies first
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Initialization Order */}
      {initializationOrder.length > 0 && (
        <div style={{ margin: "2rem 0" }}>
          <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Initialization Order</h3>
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            padding: "1rem", 
            borderRadius: "8px",
            border: "1px solid #dee2e6"
          }}>
            {initializationOrder.map((item, index) => (
              <div 
                key={index}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  padding: "0.75rem",
                  backgroundColor: "#fff",
                  margin: "0.5rem 0",
                  borderRadius: "4px",
                  border: "1px solid #dee2e6"
                }}
              >
                <div style={{ 
                  backgroundColor: "#007bff", 
                  color: "white", 
                  width: "24px", 
                  height: "24px", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  marginRight: "1rem"
                }}>
                  {index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#1a237e' }}>{componentConfig[item.component]?.name || item.component}</strong>
                  <div style={{ fontSize: "0.8rem", color: '#666' }}>{item.action}</div>
                </div>
                
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    style={{ 
                      backgroundColor: "#6c757d", 
                      color: "white", 
                      padding: "0.25rem 0.5rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: index === 0 ? "not-allowed" : "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === initializationOrder.length - 1}
                    style={{ 
                      backgroundColor: "#6c757d", 
                      color: "white", 
                      padding: "0.25rem 0.5rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: index === initializationOrder.length - 1 ? "not-allowed" : "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFromOrder(item.component)}
                    style={{ 
                      backgroundColor: "#dc3545", 
                      color: "white", 
                      padding: "0.25rem 0.5rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                onClick={initializeComponents}
                disabled={initializing}
                style={{ 
                  backgroundColor: "#28a745", 
                  color: "white", 
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderRadius: "4px",
                  cursor: initializing ? "not-allowed" : "pointer",
                  fontSize: "1rem"
                }}
              >
                {initializing ? "Initializing..." : "Initialize Components"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initialization Results */}
      {initializationResults.length > 0 && (
        <div style={{ margin: "2rem 0" }}>
          <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Initialization Results</h3>
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            padding: "1rem", 
            borderRadius: "8px",
            border: "1px solid #dee2e6"
          }}>
            {initializationResults.map((result, index) => (
              <div 
                key={index}
                style={{ 
                  padding: "0.75rem",
                  backgroundColor: "#fff",
                  margin: "0.5rem 0",
                  borderRadius: "4px",
                  border: "1px solid #dee2e6",
                  borderLeft: `4px solid ${
                    result.status === 'success' ? '#28a745' : 
                    result.status === 'skipped' ? '#ffc107' : '#dc3545'
                  }`
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <strong style={{ color: '#1a237e' }}>
                      {componentConfig[result.component]?.name || result.component}
                    </strong>
                    <div style={{ fontSize: "0.9rem", color: '#666' }}>
                      Status: <span style={{ 
                        color: result.status === 'success' ? '#28a745' : 
                               result.status === 'skipped' ? '#ffc107' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {result.status.toUpperCase()}
                      </span>
                    </div>
                    {result.reason && (
                      <div style={{ fontSize: "0.8rem", color: '#666', marginTop: "0.25rem" }}>
                        Reason: {result.reason}
                      </div>
                    )}
                    {result.address && (
                      <div style={{ fontSize: "0.8rem", fontFamily: "monospace", color: '#666', marginTop: "0.25rem" }}>
                        Address: {result.address}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: "1.5rem",
                    color: result.status === 'success' ? '#28a745' : 
                           result.status === 'skipped' ? '#ffc107' : '#dc3545'
                  }}>
                    {result.status === 'success' ? '✅' : 
                     result.status === 'skipped' ? '⚠️' : '❌'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InitializationPhase;