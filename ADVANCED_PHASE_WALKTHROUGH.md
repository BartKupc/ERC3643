# Advanced Phase - Complete Walkthrough

## Overview

The Advanced Phase gives you full control over the deployment and configuration of each T-REX contract. Unlike Easy Deploy, you deploy and connect each contract (ClaimTopicsRegistry, TrustedIssuersRegistry, IdentityRegistryStorage, IdentityRegistry, ModularCompliance, Token) one by one, allowing for custom setups and deep learning.

---

## 🎯 Recommended Order of Operations

**IMPORTANT:** Follow this order for a successful setup:

1. **Deploy Core Contracts**  
   - ClaimTopicsRegistry  
   - TrustedIssuersRegistry  
   - IdentityRegistryStorage  
   - IdentityRegistry  
   - ModularCompliance

2. **Initialize Contracts**  
   - Link contracts together (set registry addresses, compliance modules, etc.)

3. **Configure Identity Registry**  
   - Set up country codes, agent permissions, etc.

4. **Add Trusted Issuers**  
   - Register addresses/entities that can issue claims

5. **Add Claim Topics**  
   - Define which claims (KYC, AML, etc.) are required

6. **Agent Management**  
   - Assign agent roles for contract management

7. **User Management**  
   - Create OnchainIDs, register users, assign claims

8. **Token Management**  
   - Deploy the Token contract, link to registries and compliance, mint initial supply

---

## 📋 Step-by-Step Walkthrough

### Step 1: Deploy Core Contracts

- Deploy each contract individually using the UI:
  - **ClaimTopicsRegistry**
  - **TrustedIssuersRegistry**
  - **IdentityRegistryStorage**
  - **IdentityRegistry**
  - **ModularCompliance**
- **Record each contract address** as you deploy.

### Step 2: Initialize Contracts

- Use the UI to set up the relationships:
  - Set the addresses of registries in each contract as required.
  - Link IdentityRegistry to its storage, claim topics, and trusted issuers.
  - Link ModularCompliance to the IdentityRegistry.

### Step 3: Configure Identity Registry

- Set up country codes for allowed jurisdictions.
- Assign initial agents for the registry.

### Step 4: Add Trusted Issuers

- Register trusted issuer addresses/entities.
- Assign which claim topics each issuer can issue.

### Step 5: Add Claim Topics

- Add required claim topics (e.g., KYC, AML, Accredited Investor).

### Step 6: Agent Management

- Assign agent roles for each contract (minting, burning, compliance, etc.).

### Step 7: User Management

- Create OnchainID for each user.
- Register users in the IdentityRegistry.
- Assign claims to users via trusted issuers.

### Step 8: Token Management

- Deploy the Token contract.
- Link the token to the IdentityRegistry and ModularCompliance.
- Mint initial supply to desired addresses.

---

## 🔄 Workflow Summary

### Initial Setup (One-time):
1. Deploy all core contracts
2. Initialize and link contracts

### Regular Operations:
3. Add trusted issuers and claim topics
4. Manage agents and users
5. Deploy and manage tokens

### Verification (As needed):
6. Use the UI to verify contract links, agent roles, and user claims

---

## ⚠️ Common Pitfalls to Avoid

- **Don’t skip contract initialization**: Linking contracts is essential for compliance.
- **Don’t forget to add claim topics and trusted issuers**: Tokens and users require these for compliance.
- **Don’t mint tokens before all registries and compliance modules are set up**.

---

## 🎯 Success Checklist

- ✅ All core contracts deployed and addresses recorded
- ✅ Contracts initialized and linked
- ✅ Trusted issuers and claim topics configured
- ✅ Agents assigned
- ✅ Users registered and claims assigned
- ✅ Token deployed and linked to compliance modules
- ✅ Token operations (mint/transfer/burn) working

---

## 🆘 Troubleshooting

- **If a contract fails to deploy**: Check network, gas, and account balance.
- **If initialization fails**: Double-check addresses and contract links.
- **If compliance checks fail**: Ensure claim topics and trusted issuers are set up, and users have the required claims.

---

**Remember:** The Advanced Phase is for granular control and learning. Take your time to understand each contract’s role and how they connect! 