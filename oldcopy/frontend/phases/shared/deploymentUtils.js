// Shared deployment utilities for state management

const STORAGE_KEY = 'trex_deployment_state';

// Load deployment state from localStorage
export const loadDeploymentState = () => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
    return { contracts: {}, tokens: [] };
  } catch (error) {
    console.error("Error loading deployment state:", error);
    return { contracts: {}, tokens: [] };
  }
};

// Save deployment state to localStorage
export const saveDeploymentState = (contracts, tokens) => {
  try {
    const unifiedState = { contracts, tokens };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unifiedState));
  } catch (error) {
    console.error("Error saving deployment state:", error);
  }
};

// Clear deployment state
export const clearDeploymentState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing deployment state:", error);
  }
};

// Auto-select latest deployed contracts
export const autoSelectLatestContracts = (deployedContracts) => {
  const newSelectedContracts = {};
  
  // For each contract type, select the latest deployed (first in array)
  Object.keys(deployedContracts).forEach(contractType => {
    if (deployedContracts[contractType] && deployedContracts[contractType].length > 0) {
      newSelectedContracts[contractType] = deployedContracts[contractType][0];
    }
  });
  
  return newSelectedContracts;
};

// Save deployed contract
export const saveDeployedContract = (deployedContracts, deployedTokens, name, address) => {
  const updatedContracts = {
    ...deployedContracts,
    [name]: Array.isArray(deployedContracts[name]) ? [address, ...deployedContracts[name]] : [address]
  };
  
  // Save to unified storage
  saveDeploymentState(updatedContracts, deployedTokens);
  
  return updatedContracts;
};

// Save deployed token
export const saveDeployedToken = (deployedContracts, deployedTokens, tokenDetails) => {
  const updatedTokens = [...deployedTokens, tokenDetails];
  
  // Save to unified storage
  saveDeploymentState(deployedContracts, updatedTokens);
  
  return updatedTokens;
}; 