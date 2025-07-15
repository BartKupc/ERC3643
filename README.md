# T-REX: ERC-3643 Token & Compliance Suite

Welcome to the T-REX monorepo! This project provides a full-stack, modular, and extensible platform for deploying, managing, and testing ERC-3643 (T-REX) compliant security tokens, including identity, compliance, and claim management.

---

## Monorepo Structure

```
T-REX/
  trex-scaffold/
    packages/
      contracts/    # Solidity smart contracts (Hardhat)
      react-app/    # Frontend React app (deployment, management UI)
      subgraph/     # (Dependency only, not used directly)
  backend/          # Express.js backend API server
  scripts/          # Deployment and utility scripts (core to setup)
```

---

## Prerequisites

- **Node.js** (v16+ recommended)
- **Yarn** (classic) or npm
- **Hardhat** (for contract development)
- **A local Ethereum node** (e.g., Hardhat node, or Ganache)

---

## 1. Clone the Repository

```sh
git clone <repo-url>
cd T-REX
```

---

## 2. Install All Dependencies

You must install dependencies in each package:

### Install Contracts Dependencies

```sh
cd trex-scaffold/packages/contracts
yarn install
# or
npm install
```

### Install Frontend Dependencies

```sh
cd ../react-app
yarn install
# or
npm install
```

### (Optional) Install Subgraph Dependencies

> **Note:** The subgraph package is present for dependency reasons only. You do not need to run or configure The Graph for normal operation.

```sh
cd ../subgraph
yarn install
# or
npm install
```

### Install Backend Dependencies

```sh
cd ../../../backend
yarn install
# or
npm install
```

---

## 3. Using the Scripts Folder

The `/scripts` directory contains essential deployment and utility scripts for setting up and managing your T-REX contracts and environment.  
**Common scripts include:**
- `deploy_factory_enhanced.js`, `deploy_token_enhanced.js`, `deploy_token.js`, etc.: Deploy core contracts.
- `deploy_identity_registry.js`, `deploy_modular_compliance.js`, etc.: Deploy and initialize specific modules.
- `startup.js`, `stop.js`: Start and stop the full stack.
- `clean-addresses.js`: Clean up deployment artifacts.
- `flatten.js`: Flatten contracts for verification.
- **Usage:**  
  Run scripts with Hardhat or Node, e.g.:
  ```sh
  npx hardhat run scripts/deploy_token_enhanced.js --network localhost
  node scripts/startup.js
  ```

---

## 4. Compile & Deploy Smart Contracts

From the `contracts` directory:

```sh
npx hardhat compile
# To deploy contracts (customize scripts as needed):
npx hardhat run scripts/deploy_token_enhanced.js --network localhost
# or use other scripts in /scripts for different modules
```

- Make sure your local Ethereum node (e.g., Hardhat node) is running:
  ```sh
  npx hardhat node
  ```

---

## 5. Start the Backend API Server

From the `backend` directory:

```sh
yarn start
# or
npm start
```

- The backend server will run on [http://localhost:3001](http://localhost:3001)
- Provides API endpoints for health checks, network status, and deployment management
- Used as a proxy/API for the frontend

---

## 6. Start the Frontend App

From the `react-app` directory:

```sh
yarn start
# or
npm start
```

- The app will be available at [http://localhost:3000](http://localhost:3000)
- The frontend expects contracts to be deployed on your local node (default: `http://127.0.0.1:8545`)
- The frontend proxies API requests to the backend server at port 3001

---

## 7. Using the App

- The **DeploymentPhase** UI guides you through:
  - Deploying and initializing all core contracts
  - Configuring registries and compliance
  - Adding agents, claim topics, trusted issuers
  - Managing users and OnchainIDs
  - Deploying and managing tokens
  - Running comprehensive compliance diagnostics

- All steps are automated and provide clear feedback/logs.

---

## 8. Troubleshooting

- If you encounter missing contract addresses or ABI errors, ensure contracts are compiled and deployed before starting the frontend.
- For any dependency issues, try deleting `node_modules` and reinstalling.
- The backend server logs health and network status at startup.

---

## 9. Useful Scripts

- **Contracts**
  - `npx hardhat compile` — Compile contracts
  - `npx hardhat test` — Run contract tests
  - `npx hardhat run scripts/deploy_token_enhanced.js --network localhost` — Deploy contracts

- **Frontend**
  - `yarn start` — Start React app
  - `yarn build` — Build for production

- **Backend**
  - `yarn start` — Start backend API server (uses nodemon for hot reload)

- **Scripts**
  - `node scripts/startup.js` — Start the full stack
  - `node scripts/stop.js` — Stop the full stack
  - `node scripts/clean-addresses.js` — Clean up deployment artifacts

---

## 10. Documentation

- See `DEPLOYMENT_FLOW.md` in the frontend for a detailed walkthrough of the deployment and management process.

---

**You're ready to launch and explore the T-REX platform!**
