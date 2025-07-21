import { ethers } from 'ethers';
import { getContractArtifacts } from '../../../hooks/compiledContracts';

// Get MetaMask signer
export const getSigner = async () => {
  const { ethereum } = window;
  if (!ethereum) {
    throw new Error("MetaMask is not installed");
  }
  
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  
  // Request account access
  await ethereum.request({ method: 'eth_requestAccounts' });
  
  return signer;
};

// Check if a contract is initialized
export const isContractInitialized = async (contractName, address) => {
  try {
    const signer = await getSigner();
    const artifacts = getContractArtifacts();
    
    if (!artifacts[contractName]) {
      throw new Error(`Contract artifacts not found for ${contractName}`);
    }
    
    const contract = new ethers.Contract(address, artifacts[contractName].abi, signer);
    
    // Check initialization based on contract type
    switch (contractName) {
      case 'ClaimTopicsRegistry':
        // Check if there are any claim topics
        const topicCount = await contract.getClaimTopicsCount();
        return topicCount.gt(0);
        
      case 'TrustedIssuersRegistry':
        // Check if there are any trusted issuers
        const issuerCount = await contract.getTrustedIssuersCount();
        return issuerCount.gt(0);
        
      case 'IdentityRegistryStorage':
        // Check if there are any identities
        const identityCount = await contract.getIdentityCount();
        return identityCount.gt(0);
        
      case 'IdentityRegistry':
        // Check if it's connected to other registries
        const trustedIssuersRegistry = await contract.getTrustedIssuersRegistry();
        const claimTopicsRegistry = await contract.getClaimTopicsRegistry();
          return trustedIssuersRegistry !== ethers.constants.AddressZero &&
    claimTopicsRegistry !== ethers.constants.AddressZero;
        
      case 'ModularCompliance':
        // Check if it has any modules
        const moduleCount = await contract.getModulesCount();
        return moduleCount.gt(0);
        
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking initialization for ${contractName}:`, error);
    return false;
  }
};

// Get contract instance
export const getContractInstance = async (contractName, address) => {
  const signer = await getSigner();
  const artifacts = getContractArtifacts();
  
  if (!artifacts[contractName]) {
    throw new Error(`Contract artifacts not found for ${contractName}`);
  }
  
  return new ethers.Contract(address, artifacts[contractName].abi, signer);
};

// Deploy a contract
export const deployContractHelper = async (contractName, constructorArgs = []) => {
  try {
    const signer = await getSigner();
    const artifacts = getContractArtifacts();
    
    if (!artifacts[contractName]) {
      throw new Error(`Contract artifacts not found for ${contractName}`);
    }
    
    const contractFactory = new ethers.ContractFactory(
      artifacts[contractName].abi,
      artifacts[contractName].bytecode,
      signer
    );
    
    const contract = await contractFactory.deploy(...constructorArgs);
    await contract.waitForDeployment();
    
    return {
      address: await contract.getAddress(),
      contract
    };
  } catch (error) {
    throw new Error(`Failed to deploy ${contractName}: ${error.message}`);
  }
}; 