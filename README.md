# T-REX: ERC-3643 Token and Compliance Suite

A comprehensive full-stack solution for deploying and managing ERC-3643 compliant security tokens with built-in compliance features.

## 🏗️ Project Structure

```
T-REX/
├── backend/                 # Express.js API server
│   ├── server.js           # Main server with deployment endpoints
│   ├── package.json        # Backend dependencies
│   └── package-lock.json   # Locked dependencies
├── contracts/              # Solidity smart contracts
│   ├── token/             # ERC-3643 token implementation
│   ├── compliance/        # Modular compliance system
│   ├── registry/          # Identity and claim registries
│   ├── factory/           # TREXFactory for token deployment
│   ├── proxy/             # Upgradeable proxy contracts
│   └── roles/             # Access control and permissions
├── scripts/               # Deployment and utility scripts
│   ├── deploy_factory_enhanced.js    # Factory deployment
│   ├── deploy_token_enhanced.js      # Token deployment
│   ├── deploy_*.js        # Individual contract deployments
│   └── startup.js         # Development environment setup
├── test/                  # Comprehensive test suite
│   ├── compliance.test.ts # Compliance module tests
│   ├── token/             # Token functionality tests
│   └── registries/        # Registry tests
├── trex-scaffold/         # React frontend application
│   ├── packages/
│   │   ├── contracts/     # Contract artifacts and ABIs
│   │   ├── react-app/     # React frontend
│   │   └── subgraph/      # The Graph subgraph (optional)
└── docs/                  # Documentation and whitepaper
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Hardhat development environment
- Local blockchain (Hardhat node)

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../trex-scaffold/packages/react-app
npm install
```

### 2. Start Development Environment

```bash
# Start local blockchain (in one terminal)
npx hardhat node

# Start backend server (in another terminal)
cd backend
npm start

# Start frontend (in another terminal)
cd trex-scaffold/packages/react-app
npm start
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Blockchain**: http://localhost:8545

**Note**: The application uses Hardhat's local accounts. Click "Connect Local Account" to access the dashboard.

## 🎯 Deployment Workflows

### Easy Deploy (Recommended for Beginners)

The Easy Deploy interface provides a streamlined workflow for deploying T-REX tokens:

1. **Deploy Factory**: Creates the TREXFactory and all implementation contracts
2. **Configure Token**: Set token name, symbol, decimals, and total supply
3. **Deploy Token**: Deploy the complete token suite with compliance

**Features:**
- One-click factory deployment
- Simple token configuration
- Real-time deployment logs
- Automatic contract selection
- Deployment history tracking

### Advanced Deploy (For Power Users)

The Advanced interface provides granular control over the deployment process:

1. **Individual Contract Deployment**: Deploy contracts one by one
2. **Contract Initialization**: Initialize deployed contracts
3. **Comprehensive Verification**: Run diagnostics and tests
4. **User Management**: Add agents and configure permissions
5. **Token Operations**: Mint, burn, transfer, and approve tokens

**Features:**
- Step-by-step deployment control
- Detailed verification diagnostics
- Real-time logging and error reporting
- Contract state inspection
- Advanced testing capabilities

## 🔧 Backend API Endpoints

### Health and Status
- `GET /api/health` - Server health check
- `GET /api/test-network` - Test blockchain connection

### Deployment Management
- `GET /api/factories` - List deployed factories
- `GET /api/deployments` - List all deployments
- `GET /api/deployments/:id` - Get specific deployment details
- `POST /api/deploy/factory` - Deploy new factory
- `POST /api/deploy/token` - Deploy new token

### Address Management
- `GET /api/addresses` - Get deployed addresses
- `POST /api/addresses` - Update deployed addresses
- `DELETE /api/addresses` - Clear all addresses

## 📋 Contract Architecture

### Core Components

1. **TREXFactory**: Main deployment contract that creates token suites
2. **Token**: ERC-3643 compliant security token
3. **ModularCompliance**: Configurable compliance rules
4. **IdentityRegistry**: Manages user identities and verification
5. **ClaimTopicsRegistry**: Manages claim topics for identity verification
6. **TrustedIssuersRegistry**: Manages trusted claim issuers

### Proxy Pattern

All contracts use the OpenZeppelin proxy pattern for upgradeability:
- Implementation contracts contain the logic
- Proxy contracts delegate calls to implementations
- Storage contracts maintain state across upgrades

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Compliance tests
npm run test:compliance

# Token tests
npm run test:token

# Registry tests
npm run test:registries
```

### Test Coverage
```bash
npm run test:coverage
```

## 📚 Scripts Usage

### Deployment Scripts

```bash
# Deploy factory and all implementations
npm run deploy:factory

# Deploy token using existing factory
npm run deploy:token

# Deploy individual contracts
npm run deploy:compliance
npm run deploy:registry
npm run deploy:storage
```

### Utility Scripts

```bash
# Start development environment
npm run start:dev

# Clean deployment data
npm run clean

# Flatten contracts for verification
npm run flatten
```

## 🔐 Security Features

### Access Control
- Role-based permissions (Owner, Agent, TokenAgent)
- Upgradeable access control
- Granular permission management

### Compliance
- Modular compliance system
- Country restrictions and whitelisting
- Transfer approval workflows
- Conditional transfer rules

### Identity Verification
- OnchainID integration
- Claim-based verification
- Trusted issuer management
- Multi-topic verification

## 🌐 Network Support

### Development
- Hardhat Network (localhost:8545)
- Anvil (Foundry)
- Ganache

### Production
- Ethereum Mainnet
- Polygon
- Arbitrum
- Optimism
- Other EVM-compatible networks

## 📖 Documentation

- **Whitepaper**: `docs/TREX-WhitePaper.pdf`
- **Component Diagrams**: `docs/img/`
- **API Documentation**: See backend endpoints above
- **Contract Documentation**: Inline comments in Solidity files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines

- Follow Solidity best practices
- Write comprehensive tests
- Update documentation
- Use conventional commits
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information
- Join the community discussions

## 🔄 Version History

- **v4.0.0**: Current version with enhanced deployment workflows
- **v3.5.2**: Legacy version support
- **v3.0.0**: Modular compliance system
- **v2.0.0**: Initial release

---

**Note**: This is a development version. For production use, ensure proper security audits and testing.
