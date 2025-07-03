import erc20Abi from "./abis/erc20.json";
import ownableAbi from "./abis/ownable.json";

// T-REX Contract ABIs
import trexFactoryAbi from "./contracts/factory/TREXFactory.sol/TREXFactory.json";
import trexTokenAbi from "./contracts/token/Token.sol/Token.json";
import modularComplianceAbi from "./contracts/compliance/modular/ModularCompliance.sol/ModularCompliance.json";
import identityRegistryAbi from "./contracts/registry/implementation/IdentityRegistry.sol/IdentityRegistry.json";
import claimTopicsRegistryAbi from "./contracts/registry/implementation/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json";
import trustedIssuersRegistryAbi from "./contracts/registry/implementation/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json";

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
};

export default abis;
