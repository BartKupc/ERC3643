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

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd T-REX
   ```

2. **Install dependencies**
   ```bash
   npm ci
   ```

3. **Compile the contracts**
   ```bash
   cd trex-scaffold/packages/contracts
   npx hardhat compile
   ```

4. **Start the development environment**
   ```bash
   cd ../..
   npm run dev
   ```
   
   This will:
   - Kill any existing processes
   - Clear deployed addresses
   - Start the backend API server (port 3001)
   - Start the frontend React app (port 3000)

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
