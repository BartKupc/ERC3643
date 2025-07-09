# T-REX Production dApp Setup Guide (Hardhat Development)

This guide provides comprehensive instructions for setting up a production-ready T-REX dApp with ClaimIssuer functionality for ERC-3643 identity and claim management on Hardhat development networks.

## 🏗️ Architecture Overview

The T-REX dApp implements the ERC-3643 standard with the following components:

### Core Components
- **Token**: ERC-3643 compliant security token
- **IdentityRegistry**: Manages user identities and OnchainID links
- **IdentityRegistryStorage**: Stores user identity data
- **ModularCompliance**: Handles compliance rules and transfer restrictions
- **ClaimTopicsRegistry**: Manages claim topic definitions
- **TrustedIssuersRegistry**: Manages trusted claim issuers
- **TREXFactory**: Factory contract for deploying new tokens

### ClaimIssuer System
- **ClaimIssuer Contracts**: Specialized contracts that issue claims to users
- **Trusted Issuer Registration**: ClaimIssuers are registered as trusted issuers
- **Claim Validation**: Claims are validated by OnchainID contracts

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Hardhat development environment
- MetaMask or compatible wallet
- Local Hardhat network (no external network required)

> **Note**: This setup is designed for Hardhat development networks only. For production deployments on public networks, additional security measures and configuration would be required.

### 1. Installation
```bash
cd T-REX
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory (optional for Hardhat):
```env
# Deployer private key (optional for Hardhat, uses default accounts)
PRIVATE_KEY=your_private_key_here

# Optional: For contract verification if needed
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Production Deployment
Run the automated production setup script:
```bash
# For Hardhat localhost
node scripts/setup-production-dapp.js localhost

# For Hardhat network
node scripts/setup-production-dapp.js hardhat
```

## 📋 Usage

### Quick Commands
```bash
# Setup production environment on Hardhat
npm run setup:production

# Test ClaimIssuer functionality
npm run test:claim-issuer

# Deploy individual ClaimIssuer
npm run deploy:claim-issuer

# Start the frontend
npm run dev:frontend
```

## 📋 Manual Setup Steps

If you prefer to deploy components manually, follow these steps:

### Step 1: Deploy Core Components
```bash
# Deploy implementation contracts
npx hardhat run scripts/deploy_components.js --network localhost

# Deploy proxy contracts
npx hardhat run scripts/deploy_proxies.js --network localhost

# Deploy factory
npx hardhat run scripts/deploy_factory.js --network localhost
```

### Step 2: Initialize Components
```bash
# Initialize all components
npx hardhat run scripts/initialize_components.js --network localhost
```

### Step 3: Deploy ClaimIssuer Contracts
```bash
# Deploy ClaimIssuer contracts
npx hardhat run scripts/deploy_claim_issuer.js --network localhost
```

### Step 4: Configure ClaimIssuers
```bash
# Register ClaimIssuers as trusted issuers
npx hardhat run scripts/register_trusted_issuers.js --network localhost

# Add claim topics
npx hardhat run scripts/add_claim_topics.js --network localhost
```

## 🏛️ ClaimIssuer System

### What are ClaimIssuers?
ClaimIssuer contracts are specialized smart contracts that:
- Issue claims to users' OnchainID contracts
- Are registered as trusted issuers in the TrustedIssuersRegistry
- Can only issue claims for specific claim topics
- Provide a secure, auditable way to issue claims

### Default ClaimIssuers
The production setup deploys three default ClaimIssuers:

1. **KYC Provider**
   - Purpose: Official KYC verification
   - Claim Topics: KYC (1)
   - Use Case: Identity verification

2. **Accreditation Service**
   - Purpose: Accredited investor verification
   - Claim Topics: ACCREDITED (2)
   - Use Case: Investor qualification

3. **Compliance Officer**
   - Purpose: Internal compliance management
   - Claim Topics: All topics (1, 2, 3, 4)
   - Use Case: Internal compliance operations

### Using ClaimIssuers
```javascript
// Example: Issue a KYC claim to a user
const kycProvider = await ethers.getContractAt("ClaimIssuer", kycProviderAddress);
await kycProvider.issueClaim(
  userOnchainIdAddress,
  claimTopicId,
  claimData,
  claimExpiry
);
```

## 🔧 Frontend Configuration

### 1. Update Configuration
After deployment, update your frontend configuration with the deployed addresses:

```javascript
// src/config/contracts.js
export const CONTRACT_ADDRESSES = {
  token: "0x...",
  identityRegistry: "0x...",
  identityRegistryStorage: "0x...",
  modularCompliance: "0x...",
  claimTopicsRegistry: "0x...",
  trustedIssuersRegistry: "0x...",
  factory: "0x...",
  claimIssuers: {
    kycProvider: "0x...",
    accreditationService: "0x...",
    complianceOfficer: "0x..."
  }
};
```

### 2. Start the Frontend
```bash
cd trex-scaffold/packages/react-app
npm start
```

### 3. Access the dApp
Open your browser to `http://localhost:3000` and follow the workflow:

1. **Main Wallet Setup**: Connect your wallet and deploy OnchainID
2. **Deploy Components**: Deploy all core contracts
3. **Initialize Components**: Initialize the deployed contracts
4. **Agent Management**: Add agents to the Identity Registry
5. **Claim Topics**: Add claim topic definitions
6. **Trusted Issuers**: Register ClaimIssuers as trusted issuers
7. **ClaimIssuers**: Deploy and manage ClaimIssuer contracts
8. **Manage Users**: Register users and link OnchainIDs
9. **Deploy Token**: Deploy your security token
10. **Logs**: View deployment and transaction logs

## 🔐 Security Considerations

### Private Key Management
- Never commit private keys to version control
- Use environment variables for sensitive data
- For Hardhat development, default accounts are used
- Implement proper key rotation procedures for production

### Access Control
- ClaimIssuers should only be controlled by authorized parties
- Implement proper role-based access control
- Regularly audit ClaimIssuer permissions
- Monitor for unauthorized claim issuances

### Compliance
- Ensure ClaimIssuers comply with relevant regulations
- Implement proper KYC/AML procedures
- Maintain audit trails for all claim issuances
- Regular compliance reviews and updates

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "ClaimIssuer"
npm test -- --grep "Token"
npm test -- --grep "IdentityRegistry"
```

### Integration Tests
```bash
# Test complete workflow
npm run test:integration

# Test ClaimIssuer functionality
npm run test:claim-issuer
```

### Manual Testing
1. Deploy to local network
2. Test complete user registration flow
3. Test claim issuance via ClaimIssuers
4. Test token transfer with compliance rules
5. Verify all claims are properly validated

## 📊 Monitoring and Analytics

### Contract Events
Monitor these key events:
- `UserRegistered`: New user registration
- `ClaimIssued`: New claim issuance
- `TokenTransfer`: Token transfers
- `ComplianceRuleTriggered`: Compliance rule activations

### Health Checks
Implement regular health checks:
- Contract accessibility
- ClaimIssuer functionality
- User registration status
- Token transfer capabilities

## 🚨 Troubleshooting

### Common Issues

#### "Internal JSON-RPC error"
- Check if OnchainID is deployed as library contract
- Ensure caller is the management key
- Verify contract addresses are correct

#### "Transaction failed"
- Check gas limits and prices
- Verify signer has sufficient funds
- Ensure signer has proper permissions

#### "ClaimIssuer not registered"
- Register ClaimIssuer in TrustedIssuersRegistry
- Verify ClaimIssuer address is correct
- Check claim topic permissions

### Debug Commands
```bash
# Check contract deployment status
npx hardhat run scripts/check_deployment.js --network localhost

# Verify ClaimIssuer registration
npx hardhat run scripts/verify_claim_issuer.js --network localhost

# Test claim issuance
npx hardhat run scripts/test_claim_issuance.js --network localhost
```

## 📚 Additional Resources

- [ERC-3643 Specification](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-3643.md)
- [OnchainID Documentation](https://onchainid.com/)
- [T-REX Documentation](https://docs.trex.com/)
- [Hardhat Documentation](https://hardhat.org/docs)

## 🤝 Support

For technical support:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the test cases for examples
- Consult the ERC-3643 specification

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 