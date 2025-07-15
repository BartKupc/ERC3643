// Import contract artifacts directly from the local contracts directory
// These are the compiled artifacts copied from the T-REX project
import TREXFactoryArtifact from '../contracts/TREXFactory.json';
import TokenArtifact from '../contracts/Token.json';
import ModularComplianceArtifact from '../contracts/ModularCompliance.json';
import IdentityRegistryArtifact from '../contracts/IdentityRegistry.json';
import IdentityRegistryStorageArtifact from '../contracts/IdentityRegistryStorage.json';
import ClaimTopicsRegistryArtifact from '../contracts/ClaimTopicsRegistry.json';
import TrustedIssuersRegistryArtifact from '../contracts/TrustedIssuersRegistry.json';
import IAFactoryArtifact from '../contracts/IAFactory.json';
import TokenProxyArtifact from '../contracts/TokenProxy.json';
import ModularComplianceProxyArtifact from '../contracts/ModularComplianceProxy.json';
import TREXImplementationAuthorityArtifact from '../contracts/TREXImplementationAuthority.json';

// Import OnchainID contract artifacts
import IdentityArtifact from '../contracts/Identity.json';
import IImplementationAuthorityArtifact from '../contracts/IImplementationAuthority.json';
import IIdFactoryArtifact from '../contracts/IIdFactory.json';
import ClaimIssuerArtifact from '../contracts/ClaimIssuer.json';

// T-REX Contract Artifacts
export const TREXContracts = {
  TREXFactory: {
    abi: TREXFactoryArtifact.abi,
    bytecode: TREXFactoryArtifact.bytecode,
    contractName: TREXFactoryArtifact.contractName
  },
  Token: {
    abi: TokenArtifact.abi,
    bytecode: TokenArtifact.bytecode,
    contractName: TokenArtifact.contractName
  },
  ModularCompliance: {
    abi: ModularComplianceArtifact.abi,
    bytecode: ModularComplianceArtifact.bytecode,
    contractName: ModularComplianceArtifact.contractName
  },
  IdentityRegistry: {
    abi: IdentityRegistryArtifact.abi,
    bytecode: IdentityRegistryArtifact.bytecode,
    contractName: IdentityRegistryArtifact.contractName
  },
  IdentityRegistryStorage: {
    abi: IdentityRegistryStorageArtifact.abi,
    bytecode: IdentityRegistryStorageArtifact.bytecode,
    contractName: IdentityRegistryStorageArtifact.contractName
  },
  ClaimTopicsRegistry: {
    abi: ClaimTopicsRegistryArtifact.abi,
    bytecode: ClaimTopicsRegistryArtifact.bytecode,
    contractName: ClaimTopicsRegistryArtifact.contractName
  },
  TrustedIssuersRegistry: {
    abi: TrustedIssuersRegistryArtifact.abi,
    bytecode: TrustedIssuersRegistryArtifact.bytecode,
    contractName: TrustedIssuersRegistryArtifact.contractName
  },
  IAFactory: {
    abi: IAFactoryArtifact.abi,
    bytecode: IAFactoryArtifact.bytecode,
    contractName: IAFactoryArtifact.contractName
  },
  TokenProxy: {
    abi: TokenProxyArtifact.abi,
    bytecode: TokenProxyArtifact.bytecode,
    contractName: TokenProxyArtifact.contractName
  },
  ModularComplianceProxy: {
    abi: ModularComplianceProxyArtifact.abi,
    bytecode: ModularComplianceProxyArtifact.bytecode,
    contractName: ModularComplianceProxyArtifact.contractName
  },
  TREXImplementationAuthority: {
    abi: TREXImplementationAuthorityArtifact.abi,
    bytecode: TREXImplementationAuthorityArtifact.bytecode,
    contractName: TREXImplementationAuthorityArtifact.contractName
  }
};

// OnchainID Contract Artifacts
export const OnchainIDContracts = {
  Identity: {
    abi: IdentityArtifact.abi,
    bytecode: IdentityArtifact.bytecode,
    contractName: IdentityArtifact.contractName
  },
  IImplementationAuthority: {
    abi: IImplementationAuthorityArtifact.abi,
    bytecode: IImplementationAuthorityArtifact.bytecode,
    contractName: IImplementationAuthorityArtifact.contractName
  },
  IIdFactory: {
    abi: IIdFactoryArtifact.abi,
    bytecode: IIdFactoryArtifact.bytecode,
    contractName: IIdFactoryArtifact.contractName
  },
  ClaimIssuer: {
    abi: ClaimIssuerArtifact.abi,
    bytecode: ClaimIssuerArtifact.bytecode,
    contractName: ClaimIssuerArtifact.contractName
  }
};

// All contracts combined
export const AllContracts = {
  ...TREXContracts,
  ...OnchainIDContracts
};

// Helper function to get contract artifacts by name
export const getContractArtifacts = (contractName) => {
  const contract = AllContracts[contractName];
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

// Log available contracts
console.log('📋 Available Contract Artifacts:');
console.log('T-REX Contracts:', Object.keys(TREXContracts).join(', '));
console.log('OnchainID Contracts:', Object.keys(OnchainIDContracts).join(', ')); 