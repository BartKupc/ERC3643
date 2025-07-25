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


### 4. Start Local Blockchain

Open a new terminal and start a local Hardhat node:

```bash
npx hardhat node --hostname 0.0.0.0
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

The platform will be available at [http://localhost:3000] or [http://IP-ADDRESS:3000]

## 🎓 Learning Paths

### Walkthrough Guides
- **[Easy Deploy Walkthrough](./EASY_DEPLOY_WALKTHROUGH.md)**: Step-by-step guide for beginners
- **[Advanced Phase Walkthrough](./ADVANCED_PHASE_WALKTHROUGH.md)**: Detailed guide for advanced users

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

**Key Concepts**:
- **Granular Control**: Deploy each component individually
- **Custom Configuration**: Set up custom claim topics and rules
- **Advanced Agents**: Configure specialized agent roles
- **Compliance Rules**: Define custom compliance requirements


## 🤝 Contributing

This platform is designed for educational purposes. Contributions are welcome:

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
