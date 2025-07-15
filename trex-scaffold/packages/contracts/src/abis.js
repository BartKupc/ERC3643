import erc20Abi from "./abis/erc20.json";
import ownableAbi from "./abis/ownable.json";

// T-REX Contract ABIs
import trexFactoryAbi from "./contracts/factory/TREXFactory.sol/TREXFactory.json";
import trexTokenAbi from "./contracts/token/Token.sol/Token.json";
import modularComplianceAbi from "./contracts/compliance/modular/ModularCompliance.sol/ModularCompliance.json";
import identityRegistryAbi from "./contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json";
import claimTopicsRegistryAbi from "./contracts/registry/implementation/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json";
import trustedIssuersRegistryAbi from "./contracts/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json";

// OnchainID Contract ABIs
import identityAbi from "./@onchain-id/solidity/contracts/Identity.sol/Identity.json";
import implementationAuthorityAbi from "./@onchain-id/solidity/contracts/ImplementationAuthority.sol/ImplementationAuthority.json";
import factoryAbi from "./@onchain-id/solidity/contracts/Factory.sol/Factory.json";

const abis = {
  erc20: erc20Abi,
  ownable: ownableAbi,
  // T-REX ABIs
  TREXFactory: trexFactoryAbi.abi,
  Token: trexTokenAbi.abi,
  ModularCompliance: modularComplianceAbi.abi,
  IdentityRegistry: identityRegistryAbi.abi,
  ClaimTopicsRegistry: claimTopicsRegistryAbi.abi,
  TrustedIssuersRegistry: trustedIssuersRegistryAbi.abi,
  // OnchainID ABIs
  Identity: identityAbi.abi,
  ImplementationAuthority: implementationAuthorityAbi.abi,
  Factory: factoryAbi.abi,
};

// Full contract artifacts with bytecode
export const contractArtifacts = {
  // T-REX Contracts
  TREXFactory: {
    abi: trexFactoryAbi.abi,
    bytecode: trexFactoryAbi.bytecode,
    contractName: trexFactoryAbi.contractName
  },
  Token: {
    abi: trexTokenAbi.abi,
    bytecode: trexTokenAbi.bytecode,
    contractName: trexTokenAbi.contractName
  },
  ModularCompliance: {
    abi: modularComplianceAbi.abi,
    bytecode: modularComplianceAbi.bytecode,
    contractName: modularComplianceAbi.contractName
  },
  IdentityRegistry: {
    abi: identityRegistryAbi.abi,
    bytecode: identityRegistryAbi.bytecode,
    contractName: identityRegistryAbi.contractName
  },
  ClaimTopicsRegistry: {
    abi: claimTopicsRegistryAbi.abi,
    bytecode: claimTopicsRegistryAbi.bytecode,
    contractName: claimTopicsRegistryAbi.contractName
  },
  TrustedIssuersRegistry: {
    abi: trustedIssuersRegistryAbi.abi,
    bytecode: trustedIssuersRegistryAbi.bytecode,
    contractName: trustedIssuersRegistryAbi.contractName
  },
  // OnchainID Contracts
  Identity: {
    abi: identityAbi.abi,
    bytecode: identityAbi.bytecode,
    contractName: identityAbi.contractName
  },
  ImplementationAuthority: {
    abi: implementationAuthorityAbi.abi,
    bytecode: implementationAuthorityAbi.bytecode,
    contractName: implementationAuthorityAbi.contractName
  },
  Factory: {
    abi: factoryAbi.abi,
    bytecode: factoryAbi.bytecode,
    contractName: factoryAbi.contractName
  }
};

// Helper function to get contract artifacts by name
export const getContractArtifacts = (contractName) => {
  const contract = contractArtifacts[contractName];
  if (!contract) {
    throw new Error(`Contract artifacts not found for: ${contractName}`);
  }
  return contract;
};

// Helper function to get ABI only
export const getContractABI = (contractName) => {
  return getContractArtifacts(contractName).abi;
};

// Helper function to get bytecode only
export const getContractBytecode = (contractName) => {
  return getContractArtifacts(contractName).bytecode;
};

export default abis;
