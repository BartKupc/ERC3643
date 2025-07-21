# T-REX Suite - ERC-3643 Token & Compliance Platform

A comprehensive full-stack ERC-3643 token and compliance suite with React frontend, Solidity contracts, backend API, and deployment scripts.

## 🏗️ Architecture

- **Frontend**: React.js with ethers.js for blockchain interaction
- **Backend**: Node.js/Express API for deployment orchestration
- **Smart Contracts**: Solidity contracts following ERC-3643 standard
- **Deployment**: Hardhat-based deployment scripts with local account management

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Hardhat
- Local blockchain (Hardhat Network)

### Installation

```bash
# Install dependencies
npm install

# Start local blockchain
npx hardhat node

# In another terminal, deploy the factory
npx hardhat run scripts/deploy_factory_enhanced.js --network localhost

# TREXGateway is now automatically deployed with the factory

# Start the backend server
cd backend && npm start

# Start the frontend
cd trex-scaffold/packages/react-app && npm start
```

## 📋 Complete T-REX Flow

This implementation follows the official T-REX deployment flow:

### 1. 🏭 Deploy Implementation Contracts (Once)

Deploy all implementation contracts that will be used by proxies:

```bash
npx hardhat run scripts/deploy_factory_enhanced.js --network localhost
```

This deploys:
- `ClaimTopicsRegistry.sol` (implementation)
- `TrustedIssuersRegistry.sol` (implementation)
- `IdentityRegistryStorage.sol` (implementation)
- `IdentityRegistry.sol` (implementation)
- `ModularCompliance.sol` (implementation)
- `Token.sol` (ERC3643 implementation)
- `TREXImplementationAuthority.sol`
- `TREXFactory.sol`
- `TREXGateway.sol` (automatically deployed for access control)

### 2. 🧠 Configure TREXImplementationAuthority

The factory deployment script automatically:
- Sets implementation addresses in the authority
- Configures version management
- Links all components together

### 3. 🏭 Deploy TREXFactory and TREXGateway

The factory deployment automatically:
- Deploys TREXFactory with TREXImplementationAuthority reference
- Deploys TREXGateway for access control and fee management
- Configures Identity Factory (for OnchainID creation)
- Sets up proper ownership and permissions
- Configures public deployment access
- Disables deployment fees by default

### 4. 🧱 Create Full Stack: Identity + Token

Use the factory to deploy a complete token suite:

```bash
npx hardhat run scripts/deploy_token_enhanced.js --network localhost
```

This creates:
- Identity Registry (proxy)
- Identity Registry Storage (proxy)
- Modular Compliance (proxy)
- Token (ERC3643 proxy)
- Links them properly
- Returns token address

### 5. 👮 Add Agents (New Feature)

After token creation, add agents to manage the contracts:

**Token Agents**: Can mint/burn tokens, pause/unpause transfers
**Identity Registry Agents**: Can register users, update user data, freeze/unfreeze users

Use the **Agent Management** tab in the Easy Deploy interface or call directly:

```javascript
// Add token agent
await tokenContract.addAgent(agentAddress);

// Add identity registry agent  
await identityRegistryContract.addAgent(agentAddress);
```

### 6. 📌 Add Claim Topics

Add required claim topics to the ClaimTopicsRegistry:

```javascript
await claimTopicsRegistry.addClaimTopic(1); // KYC
await claimTopicsRegistry.addClaimTopic(2); // AML
await claimTopicsRegistry.addClaimTopic(3); // Accredited Investor
```

### 7. ✅ Add Trusted Issuers

Create ClaimIssuer (OnchainID) and add to TrustedIssuersRegistry:

```javascript
await trustedIssuersRegistry.addTrustedIssuer(
  claimIssuerAddress,
  [1, 2, 3] // Topics it is trusted for
);
```

### 8. 🧾 Issue Claims and Register Users

Deploy OnchainID for users and register them:

```javascript
// Deploy user OnchainID
const userIdentity = await identityFactory.createIdentity(userAddress, salt);

// Register in IdentityRegistry
await identityRegistry.registerIdentity(userAddress, userIdentity, countryCode);

// Issue claims using ClaimIssuer
await claimIssuer.addClaim(topic, scheme, issuer, signature, data, uri);
```

## 🎯 Easy Deploy Interface

The React frontend provides an intuitive interface for the complete T-REX flow:

### Tabs Overview

1. **🏭 Factory Management**
   - Deploy new factories
   - Select existing factories
   - View deployment details

2. **🎯 Token Management**
   - Deploy token suites
   - Configure token parameters
   - View deployed tokens

3. **🏷️ Claims Management**
   - Add claim topics to CTR
   - View existing claim topics
   - Manage claim requirements

4. **🔐 Trusted Issuer Management**
   - Deploy claim issuers
   - Add trusted issuers to TIR
   - Configure issuer permissions

5. **👮 Agent Management** *(New)*
   - Add agents to Token contracts
   - Add agents to Identity Registry
   - Manage agent permissions
   - Quick-add common Hardhat accounts

6. **👥 User Management**
   - Create user OnchainIDs
   - Register users in Identity Registry
   - Issue claims to users

### Flow Sequence

The recommended flow follows the official T-REX pattern:

```
Factory Management → Token Management → Claims Management → 
Trusted Issuer Management → Agent Management → User Management
```

## 🔧 Backend API

The backend provides REST endpoints for deployment orchestration:

### Endpoints

- `POST /api/deploy/factory` - Deploy new factory
- `POST /api/deploy/token` - Deploy token suite
- `GET /api/deployments` - Get deployment history

### Usage

```bash
# Start backend
cd backend && npm start

# Deploy factory via API
curl -X POST http://localhost:3001/api/deploy/factory

# Deploy token via API
curl -X POST http://localhost:3001/api/deploy/token \
  -H "Content-Type: application/json" \
  -d '{"factoryAddress":"0x...","tokenDetails":{"name":"MyToken","symbol":"MTK","decimals":18}}'
```

## 📁 Project Structure

```
T-REX/
├── contracts/                 # Solidity smart contracts
│   ├── factory/              # Factory contracts
│   ├── token/                # Token contracts
│   ├── registry/             # Registry contracts
│   ├── compliance/           # Compliance contracts
│   └── proxy/                # Proxy contracts
├── scripts/                  # Deployment scripts
│   ├── deploy_factory_enhanced.js
│   ├── deploy_token_enhanced.js
│   └── deploy_gateway.js
├── backend/                  # Node.js API server
│   └── server.js
├── trex-scaffold/           # React frontend
│   └── packages/
│       └── react-app/
└── test/                    # Test files
```

## 🔐 Security Features

- **Access Control**: Agent-based permissions for token and registry operations
- **Compliance**: Modular compliance system with configurable rules
- **Identity Management**: OnchainID-based identity verification
- **Claim System**: Flexible claim issuance and verification
- **Proxy Pattern**: Upgradeable contracts with implementation authority

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/token/token-transfer.test.ts

# Run with coverage
npx hardhat coverage
```

## 📚 Key Features

### Agent Management
- **Token Agents**: Mint/burn tokens, pause/unpause transfers
- **Identity Registry Agents**: Register users, update data, freeze/unfreeze
- **Quick Setup**: Pre-configured Hardhat accounts for testing
- **Visual Interface**: Easy-to-use tab in the deployment interface

### Factory Pattern
- **CREATE2 Deployment**: Deterministic contract addresses
- **Suite Deployment**: Single transaction deploys entire token stack
- **Version Management**: Implementation authority for upgrades
- **Access Control**: Gateway for deployment permissions

### Compliance System
- **Modular Design**: Pluggable compliance modules
- **Flexible Rules**: Configurable transfer restrictions
- **Country Codes**: Geographic compliance support
- **Claim Integration**: KYC/AML claim verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Resources

- [ERC-3643 Standard](https://eips.ethereum.org/EIPS/eip-3643)
- [T-REX Documentation](https://docs.trex.technology/)
- [OnchainID](https://onchainid.com/)
