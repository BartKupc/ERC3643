# T-REX (ERC3643) Learning Platform

A comprehensive web application for learning and experimenting with T-REX (Token for Regulated EXchanges) - the ERC3643 standard for compliant security tokens. This platform provides an intuitive UI to understand and deploy T-REX smart contracts on a local Hardhat blockchain.

## 🎯 What is T-REX (ERC3643)?

T-REX is an open-source standard for compliant security tokens on Ethereum. It provides:

- **Identity Management**: OnchainID for user identity verification
- **Compliance Engine**: Built-in compliance checks for token transfers
- **Claim System**: Verifiable claims (KYC, AML, etc.) for regulatory compliance
- **Agent System**: Specialized roles for token management
- **Transfer Restrictions**: Automated compliance enforcement

## 🚀 Why Use This Platform?

### For Developers Learning ERC3643:
- **Visual Learning**: See how T-REX contracts interact through an intuitive UI
- **Step-by-Step Deployment**: Understand the deployment process for each component
- **Real-time Feedback**: Watch transactions and compliance checks in action
- **Local Testing**: Experiment safely on a local Hardhat blockchain

### For Compliance Officers:
- **Compliance Visualization**: See how identity verification and claims work
- **Transfer Monitoring**: Understand how compliance rules are enforced
- **User Management**: Learn how to manage user identities and claims

### For Token Issuers:
- **Complete Workflow**: From factory deployment to token operations
- **Compliance Setup**: Configure claim topics and trusted issuers
- **User Onboarding**: Create and manage user identities with claims

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Git**

### Installing Node.js

You need Node.js version 16 or higher. Here are installation methods:

#### Method 1: Using apt (Ubuntu/Debian - may be older version)
```bash
sudo apt update
sudo apt install nodejs npm
```

#### Verify Installation
After installation, verify Node.js is installed:
```bash
node --version
npm --version
```

### Installing Yarn

If you don't have Yarn installed, you can install it using one of these methods:

#### Method 1: Using npm (if you have Node.js)
```bash
sudo npm install --global yarn
```

#### Verify Installation
After installation, verify Yarn is installed:
```bash
yarn --version
```

## 🛠️ Quick Start Guide

### 1. Clone the Repository

```bash
git clone https://github.com/BartKupc/ERC3643.git
cd ERC3643
```

### 2. Install Dependencies

**Use npm instead of yarn:**
```bash
npm install --legacy-peer-deps

npm audit fix
#or
npm audit fix --force

# Install required development dependencies
npm install --save-dev @openzeppelin/hardhat-upgrades
npm install --save-dev @xyrusworx/hardhat-solidity-json
npm install --save-dev @nomiclabs/hardhat-solhint
npm install --save-dev @primitivefi/hardhat-dodoc
npm install --save-dev ts-node
npm install --save-dev @types/node

# Install runtime dependencies for environment variables
npm install dotenv
```
### 3. Configure Environment

Create and configure your environment file:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file to set your RPC URL
nano .env

# Example .env file:
# RPC_URL=http://127.0.0.1:8545

# Generate configuration files from environment variables
npm run config:generate
```

**Environment Variables:**
- `RPC_URL`: Your blockchain node URL (default: http://127.0.0.1:8545)

> **Advanced:**
> You may also set `PRIVATE_KEY` (for backend wallet) and `PORT` (for backend server) in `.env` if you need to customize these, but they are not required for normal operation.

### 4. Start Local Blockchain

Open a new terminal and start a local Hardhat node:

```bash
npx hardhat node --hostname 0.0.0.0
```


**If you get TypeChain dependency conflicts, use:**
```bash
npm install --force
```

### 2b. Install Missing Runtime Dependencies 

#### For nodemon (backend):
```bash
cd backend
npm install --save-dev nodemon
cd ..
```

#### For react-scripts (frontend):
```bash
cd trex-scaffold/packages/react-app
npm install
cd ../../../..
```

After installing these, try running your start script again from the project root:
```bash
npm run start
```


This starts a local blockchain on `http://127.0.0.1:8545` with pre-funded accounts.

### 5. Start the Learning Platform

```bash
npm run start
```

The platform will be available at [http://localhost:3000](http://localhost:3000).

## 🎓 Learning Paths

### 🟢 Beginner: Easy Deploy Phase

**Perfect for**: First-time users, understanding basic T-REX concepts

**What you'll learn**:
- How T-REX factories work
- Token deployment with compliance
- User identity creation and management
- Basic token operations

**Follow the walkthrough**: [Easy Deploy Walkthrough](./EASY_DEPLOY_WALKTHROUGH.md)

**Key Concepts**:
- **Factory Management**: Central coordinator for T-REX operations
- **Token Deployment**: Creating compliant security tokens
- **User Management**: Creating OnchainIDs and managing identities
- **Claim System**: Adding KYC, AML, and other compliance claims
- **Token Operations**: Minting, burning, and transferring tokens

### 🔵 Advanced: Advanced Phase

**Perfect for**: Developers, custom configurations, deep understanding

**What you'll learn**:
- Individual contract deployment
- Custom claim topic configuration
- Advanced agent management
- Detailed compliance setup

**Follow the walkthrough**: [Advanced Phase Walkthrough](./ADVANCED_PHASE_WALKTHROUGH.md)

**Key Concepts**:
- **Granular Control**: Deploy each component individually
- **Custom Configuration**: Set up custom claim topics and rules
- **Advanced Agents**: Configure specialized agent roles
- **Compliance Rules**: Define custom compliance requirements

## 🏗️ Architecture Overview

### Core Components

```
T-REX Factory
├── Identity Registry (OnchainID management)
├── Claim Topics Registry (KYC, AML, etc.)
├── Trusted Issuers Registry (Authorized claim issuers)
├── Token Registry (Token management)
└── Security Tokens (ERC3643 compliant tokens)
```

### Key Contracts

- **TREXFactory**: Main coordinator contract
- **Token**: ERC3643 compliant security token
- **IdentityRegistry**: Manages user identities
- **ClaimIssuer**: Issues verifiable claims
- **OnchainID**: User identity contract

## 🎯 Learning Objectives

### Understanding ERC3643 Compliance

1. **Identity Verification**: Learn how OnchainID works
2. **Claim Management**: Understand KYC, AML, and other claims
3. **Transfer Restrictions**: See compliance enforcement in action
4. **Agent System**: Understand specialized roles and permissions

### Practical Skills

1. **Contract Deployment**: Deploy T-REX contracts step-by-step
2. **User Onboarding**: Create and manage user identities
3. **Compliance Setup**: Configure claim topics and issuers
4. **Token Operations**: Perform compliant token transactions

## 📚 Educational Resources

### Walkthrough Guides
- **[Easy Deploy Walkthrough](./EASY_DEPLOY_WALKTHROUGH.md)**: Step-by-step guide for beginners
- **[Advanced Phase Walkthrough](./ADVANCED_PHASE_WALKTHROUGH.md)**: Detailed guide for advanced users

### Key Concepts to Explore

#### Identity Management
- **OnchainID**: Self-sovereign identity contracts
- **Identity Registration**: Linking users to the system
- **Claim Integration**: Adding compliance claims to identities

#### Compliance Engine
- **Claim Topics**: Types of compliance claims (KYC, AML, etc.)
- **Trusted Issuers**: Authorized entities that can issue claims
- **Transfer Restrictions**: Automatic compliance enforcement

#### Token Operations
- **Minting**: Creating new tokens with compliance checks
- **Burning**: Destroying tokens with proper permissions
- **Transferring**: Moving tokens with identity verification

## 🔧 Configuration Examples

### Basic Token Setup
```javascript
// Token configuration
{
  name: "My Security Token",
  symbol: "MST",
  decimals: 18,
  totalSupply: "1000000",
  claimTopics: [1, 2, 3] // KYC, AML, Accredited
}
```

### User Identity Creation
```javascript
// User setup
{
  address: "0x...",
  country: "840", // USA
  claims: {
    kyc: "1",     // Verified
    aml: "1",     // Compliant
    accredited: "1" // Accredited investor
  }
}
```

## 🐛 Common Learning Scenarios

### Scenario 1: Understanding Compliance
1. Deploy a token with KYC requirements
2. Create a user without KYC claims
3. Try to transfer tokens → See compliance failure
4. Add KYC claim to user
5. Try transfer again → See successful compliance

### Scenario 2: Agent Permissions
1. Deploy token with specific agents
2. Try operations without agent permissions → See failure
3. Add yourself as an agent
4. Perform operations → See success

### Scenario 3: Claim Management
1. Deploy claim issuer
2. Create user identity
3. Add claims to user
4. Verify claims on-chain
5. Perform compliant transfers

## ⚙️ Configuration Management

### Environment Variables

The platform uses environment variables for configuration. The main configuration file is `.env` in the root directory:

```bash
# T-REX Configuration
RPC_URL=http://127.0.0.1:8545
```

> **Advanced:**
> You may also set `PRIVATE_KEY` and `PORT` in `.env` if you need to customize backend wallet or server port, but these are not required for most users.

### Updating Configuration

To change the RPC URL or other settings:

1. **Edit the `.env` file:**
   ```bash
   nano .env
   ```

2. **Regenerate configuration files:**
   ```bash
   npm run config:generate
   ```

3. **Restart the application:**
   ```bash
   npm run start
   ```

### Configuration Files

The following files are automatically generated from environment variables:
- `config.json` (root directory)
- `trex-scaffold/packages/react-app/src/config.json`
- `hardhat.config.ts` (uses RPC_URL directly)

### Documentation Generation

The project includes automatic documentation generation using dodoc:

```bash
# Generate documentation
npm run generate:doc

# Documentation will be created in the ./docgen directory
```

### Example Configurations

**Local Development:**
```bash
RPC_URL=http://127.0.0.1:8545
```

**Remote Node:**
```bash
RPC_URL=http://54.255.237.252:8545
```

## 🆘 Troubleshooting

### Common Issues

1. **"No factories found"**
   - Ensure Hardhat node is running
   - Check if contracts are deployed
   - Verify network configuration

2. **"Transaction failed"**
   - Check account balance
   - Verify gas settings
   - Ensure proper permissions

3. **"Compliance check failed"**
   - Verify user has proper identity
   - Check required claims are present
   - Ensure claim issuer is trusted

4. **"Cannot find module" errors during compilation**
   - Run `npm install` to ensure all dependencies are installed
   - Clear cache: `rm -rf cache && npx hardhat compile`
   - Check that all required dev dependencies are installed (see installation section)

5. **TypeScript compilation errors**
   - Ensure `@types/node` is installed: `npm install --save-dev @types/node`
   - Check that `dotenv` is installed: `npm install dotenv`

### Debug Mode
- Check browser console for detailed logs
- Monitor transaction logs in Hardhat
- Use the logging panel in the UI

## 🤝 Contributing

This platform is designed for educational purposes. Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the walkthrough guides
- Review the browser console logs
- Refer to T-REX documentation
- Open an issue on GitHub

## 🔗 Additional Resources

- **[T-REX Documentation](https://docs.trex.technology/)**: Official T-REX documentation
- **[ERC3643 Standard](https://eips.ethereum.org/EIPS/eip-3643)**: Ethereum Improvement Proposal
- **[OnchainID](https://onchainid.com/)**: Self-sovereign identity solution

---

**Note**: This platform is designed for educational and development purposes. For production use, ensure proper security measures and audit procedures are in place.

**Happy Learning! 🚀**
