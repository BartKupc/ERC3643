import { useState, useEffect } from 'react';
import axios from 'axios';

export const useDeployedComponents = (account) => {
  const [deployedComponents, setDeployedComponents] = useState({});
  const [deployingComponents, setDeployingComponents] = useState({});
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState([]);

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
        const actualComponentName = response.data.componentName || componentName;
        
        setDeployedComponents(prev => ({ ...prev, [actualComponentName]: deployedAddress }));
        setMessage(`${actualComponentName} deployed successfully at ${deployedAddress}`);
        addLog(`${actualComponentName} deployed successfully at ${deployedAddress}`, "success");
        
        // Save to localStorage with the actual component name (which may include _2, _3, etc.)
        const savedComponents = JSON.parse(localStorage.getItem("trexDeployedComponents") || "{}");
        savedComponents[actualComponentName] = deployedAddress;
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

  return {
    deployedComponents,
    deployingComponents,
    message,
    logs,
    deployComponent,
    addLog,
    setMessage
  };
}; 