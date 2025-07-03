# T-REX : Token for Regulated EXchanges

![GitHub](https://img.shields.io/github/license/TokenySolutions/T-REX?color=green) 
![GitHub release (latest by date)](https://img.shields.io/github/v/release/TokenySolutions/T-REX)
![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/TokenySolutions/T-REX/publish-release.yml)
![GitHub repo size](https://img.shields.io/github/repo-size/TokenySolutions/T-REX)
![GitHub Release Date](https://img.shields.io/github/release-date/TokenySolutions/T-REX)

----

<br><br>

<p align="center">
  <a href="https://tokeny.com/erc3643-whitepaper/">
  <img src="./docs/img/T-REX.png" width="150" title="t-rex">
  </a>
</p>


## Overview

The T-REX (Token for Regulated EXchanges) protocol is a comprehensive suite of Solidity smart contracts, 
implementing the [ERC-3643 standard](https://eips.ethereum.org/EIPS/eip-3643) and designed to enable the issuance, management, and transfer of security 
tokens in 
compliance with regulations. It ensures secure and compliant transactions for all parties involved in the token exchange.

## Prerequisites

- Node.js >= 18
- npm >= 8
- (Optional, for cross-origin setups) Install CORS in backend:
  cd T-REX/trex-scaffold/packages/react-app
  npm install cors

## Setup Instructions

1. **Install dependencies:**
   ```bash
   cd T-REX
   npm install
   cd trex-scaffold
   npm install
   cd ../backend
   npm install
   ```

2. **Start a local Hardhat node (required for contract deployment/testing):**
   Open a new terminal and run:
   ```bash
   cd T-REX
   npx hardhat node --hostname 0.0.0.0
   ```
   This will start a local Ethereum blockchain at http://localhost:8545 (accessible from all interfaces).

3. **Start the development environment (backend and frontend):**
   In a separate terminal, run:
   ```bash
   cd T-REX
   npm run dev
   ```

4. **Access the dashboard:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

5. **Deploy contracts:**
   - Use the dashboard's Deploy Factory and Deploy Token buttons.
   - Or run deployment scripts manually:
     ```bash
     npm run deploy:factory
     npm run deploy:token
     ```

## Notes
- The Hardhat node must be running for contract deployment and interaction.
- If you restart your Hardhat node, you may need to redeploy contracts.
- For troubleshooting, check backend logs and ensure all services are running in the correct directories.

## 🛠️ Available Scripts

- `npm run dev` - Start everything (kill existing + start fresh)
- `npm run stop` - Stop all T-REX processes
- `npm run restart` - Stop and restart everything
- `npm run clean` - Clear deployed addresses only

----

<div style="padding: 16px;">
   <a href="https://tokeny.com/wp-content/uploads/2023/04/Tokeny_TREX-v4_SC_Audit_Report.pdf" target="_blank">
       <img src="https://hacken.io/wp-content/uploads/2023/02/ColorWBTypeSmartContractAuditBackFilled.png" alt="Proofed by Hacken - Smart contract audit" style="width: 258px; height: 100px;">
   </a>
</div>

----
