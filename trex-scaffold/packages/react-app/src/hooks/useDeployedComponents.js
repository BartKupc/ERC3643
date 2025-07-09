import { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

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

  // Deploy component logic using MetaMask
  const deployComponent = async (componentName) => {
    if (!account) {
      setMessage("Please connect your wallet first");
      return;
    }
    if (deployingComponents[componentName]) {
      setMessage(`${componentName} deployment is already in progress`);
      return;
    }
    setMessage(`Preparing ${componentName} deployment...`);
    setDeployingComponents(prev => ({ ...prev, [componentName]: true }));
    
    try {
      // Step 1: Get deployment transaction data from backend
      const response = await axios.post('/api/prepare-deploy/component', {
        component: componentName,
        deployerAddress: account
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to prepare deployment");
      }
      
      const { transactionData } = response.data;
      
      // Step 2: Send transaction via MetaMask
      setMessage(`Deploying ${componentName} with MetaMask...`);
      
      console.log('Sending deployment transaction:', transactionData);
      
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionData]
      });
      
      console.log('Deployment transaction sent:', tx);
      setMessage(`Deployment transaction sent! Hash: ${tx}`);
      
      // Step 3: Wait for transaction confirmation
      setMessage("Waiting for deployment confirmation...");
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const receipt = await provider.waitForTransaction(tx);
      
      if (receipt.status === 1) {
        // Extract deployed address from transaction receipt
        const deployedAddress = receipt.contractAddress;
        
        // Determine component name (handle numbered versions)
        const savedComponents = JSON.parse(localStorage.getItem("trexDeployedComponents") || "{}");
        const baseComponentExists = Object.keys(savedComponents).some(key => 
          key === componentName || key.startsWith(`${componentName}_`)
        );
        
        let actualComponentName;
        if (baseComponentExists) {
          const numberedVersions = Object.keys(savedComponents).filter(key => 
            key.startsWith(`${componentName}_`)
          );
          const nextNumber = numberedVersions.length + 1;
          actualComponentName = `${componentName}_${nextNumber}`;
        } else {
          actualComponentName = componentName;
        }
        
        setDeployedComponents(prev => ({ ...prev, [actualComponentName]: deployedAddress }));
        setMessage(`${actualComponentName} deployed successfully at ${deployedAddress}`);
        addLog(`${actualComponentName} deployed successfully at ${deployedAddress}`, "success");
        
        // Save to localStorage
        savedComponents[actualComponentName] = deployedAddress;
        localStorage.setItem("trexDeployedComponents", JSON.stringify(savedComponents));

        // --- NEW: POST to backend to update deployments.json ---
        try {
          await axios.post('/api/deployments', {
            component: actualComponentName,
            address: deployedAddress,
            deployer: account,
            network: 'localhost'
          });
        } catch (err) {
          console.error('Failed to sync deployment with backend:', err);
        }
        // --- END NEW ---
      } else {
        setMessage(`Deployment failed! Transaction: ${tx}`);
        addLog(`Deployment failed! Transaction: ${tx}`, "error");
      }
    } catch (error) {
      console.error('Deployment error:', error);
      
      // Handle different types of errors
      if (error.code === 4001) {
        setMessage(`Deployment cancelled by user`);
        addLog(`Deployment cancelled by user`, "warning");
      } else if (error.code === -32603) {
        setMessage(`Deployment failed on blockchain: ${error.data?.message || error.message}`);
        addLog(`Deployment failed on blockchain: ${error.data?.message || error.message}`, "error");
      } else if (error.message) {
        setMessage(`Failed to deploy ${componentName}: ${error.message}`);
        addLog(`Failed to deploy ${componentName}: ${error.message}`, "error");
      } else {
        setMessage(`Failed to deploy ${componentName}: Unknown error occurred`);
        addLog(`Failed to deploy ${componentName}: Unknown error occurred`, "error");
      }
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