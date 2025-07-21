# Easy Deploy Phase - Complete Walkthrough

## Overview

The Easy Deploy Phase provides a user-friendly interface for deploying and managing T-REX (Token for Regulated EXchanges) smart contracts. This walkthrough will guide you through the correct sequence to ensure full functionality.

## 🎯 Recommended Order of Operations

**IMPORTANT**: Follow this exact order for best results and to avoid errors:

1. **Factory Management** → Deploy your first factory
2. **Token Management** → Deploy tokens with compliance
3. **Claims Management** → Verify claim topics
4. **Trusted Issuer Management** → Check trusted issuers
5. **Agent Management** → Configure agents
6. **User Management** → Create user identities
7. **Token Operations** → Perform token transactions

---

## 📋 Step-by-Step Walkthrough

### Step 1: Factory Management Tab

#### What is it?
The Factory Management tab is your starting point. A T-REX Factory is the main contract that deploys and manages all other T-REX contracts (tokens, identity registries, etc.).

#### What happens during factory deployment?
1. **Contract Creation**: Deploys the TREXFactory smart contract
2. **Suite Deployment**: Automatically deploys the complete T-REX suite:
   - Identity Registry
   - Claim Topics Registry
   - Trusted Issuers Registry
   - Token Registry
3. **Configuration**: Sets up all registries with proper permissions
4. **Storage**: Saves factory address and deployment details

#### Steps to follow:
1. **Check Existing Factories**: Look at the dropdown to see if factories already exist
2. **Deploy New Factory**: Click "Deploy Factory" button
3. **Wait for Confirmation**: Watch the logs for deployment success
4. **Verify Selection**: Ensure the new factory is selected in the dropdown

#### Expected Results:
- ✅ Factory address displayed
- ✅ Deployment details loaded
- ✅ All registries deployed and configured
- ✅ Success message in logs

---

### Step 2: Token Management Tab

#### What is it?
The Token Management tab allows you to deploy security tokens with full compliance features. Each token is linked to a factory and includes identity verification, claim management, and transfer restrictions.

#### What happens during token deployment?
1. **Token Contract Creation**: Deploys the Token smart contract
2. **Compliance Setup**: Configures identity registry and claim topics
3. **Claim Issuer Integration**: Links the token to claim issuers
4. **Agent Configuration**: Sets up initial agents for token management
5. **Supply Allocation**: Mints initial token supply

#### Prerequisites:
- ✅ Factory must be deployed and selected
- ✅ Claim Issuer must be available (will be auto-deployed if needed)
- ✅ Claim topics must be selected

#### Steps to follow:
1. **Select Factory**: Choose the factory from the dropdown (should auto-select from previous step)
2. **Configure Token Details**:
   - **Name**: Your token's full name (e.g., "My Security Token")
   - **Symbol**: Short symbol (e.g., "MST")
   - **Decimals**: Usually 18 (standard for ERC20)
   - **Total Supply**: Initial token supply (e.g., "1000000")
3. **Deploy Claim Issuer** (if needed):
   - Click "Deploy Claim Issuer" if none exists
   - This creates a contract that can issue claims to users
4. **Select Claim Topics**: Choose from available topics:
   - **1**: KYC (Know Your Customer)
   - **2**: AML (Anti-Money Laundering)
   - **3**: Accredited Investor
5. **Deploy Token**: Click "Deploy Token" button
6. **Wait for Confirmation**: Monitor logs for deployment progress

#### Expected Results:
- ✅ Token contract deployed
- ✅ Token linked to identity registry
- ✅ Claim topics configured
- ✅ Initial supply minted
- ✅ Token appears in dropdown with timestamp

---

### Step 3: Claims Management Tab

#### What is it?
The Claims Management tab allows you to verify and manage claim topics for your deployed tokens. Claim topics define what types of claims can be issued to users (KYC, AML, etc.).

#### What happens during claim verification?
1. **On-chain Verification**: Checks if claim topics are properly registered
2. **Status Display**: Shows which topics are active
3. **Factory Independence**: Each tab can select different factories

#### Steps to follow:
1. **Select Factory**: Choose the factory containing your tokens
2. **Select Token**: Choose the specific token to check
3. **Review Claim Topics**: View the deployed claim topics
4. **Verify Status**: Check that all topics are properly registered

#### Expected Results:
- ✅ Claim topics displayed with status
- ✅ All topics showing as registered
- ✅ No error messages

---

### Step 4: Trusted Issuer Management Tab

#### What is it?
The Trusted Issuer Management tab manages which entities are authorized to issue claims for your tokens. Only trusted issuers can add claims to user identities.

#### What happens during trusted issuer verification?
1. **Issuer List**: Displays all trusted issuers for the selected token
2. **Claim Topic Mapping**: Shows which topics each issuer can issue
3. **Status Verification**: Confirms issuers are properly registered

#### Steps to follow:
1. **Select Factory**: Choose the factory containing your tokens
2. **Select Token**: Choose the specific token to check
3. **Review Trusted Issuers**: View all authorized issuers
4. **Verify Claim Topics**: Check issuer-topic mappings

#### Expected Results:
- ✅ Trusted issuers listed
- ✅ Claim topic mappings displayed
- ✅ All issuers showing as trusted

---

### Step 5: Agent Management Tab

#### What is it?
The Agent Management tab configures agents for tokens and identity registries. Agents have special privileges like minting, burning, and forced transfers.

#### What happens during agent verification?
1. **Agent List**: Displays current agents for the token
2. **Permission Check**: Shows what operations each agent can perform
3. **Identity Registry Agents**: Lists agents for user identity management

#### Steps to follow:
1. **Select Factory**: Choose the factory containing your tokens
2. **Select Token**: Choose the specific token to check
3. **Review Token Agents**: View current token agents
4. **Review IR Agents**: Check identity registry agents

#### Expected Results:
- ✅ Token agents listed
- ✅ Identity registry agents listed
- ✅ Agent permissions displayed

---

### Step 6: User Management Tab

#### What is it?
The User Management tab creates and manages user identities (OnchainIDs) and their associated claims. This is essential for compliance and token transfers.

#### What happens during user identity creation?
1. **OnchainID Creation**: Deploys an OnchainID contract for the user
2. **Identity Registration**: Registers the user in the identity registry
3. **Claim Issuer Setup**: Adds claim issuer keys to the OnchainID
4. **Claim Addition**: Adds specific claims to the user identity

#### Prerequisites:
- ✅ Factory deployed with identity registry
- ✅ Claim issuer available
- ✅ Token deployed

#### Steps to follow:
1. **Create User Identity**:
   - Enter user's Ethereum address
   - Select country code (e.g., "840" for USA)
   - Click "Create User Identity"
2. **Register in Identity Registry**:
   - Select the user's OnchainID
   - Click "Register Identity"
3. **Add Claim Issuer**:
   - Select the OnchainID
   - Select a claim issuer
   - Click "Add Claim Issuer to OnchainID"
4. **Add Claims**:
   - Select the OnchainID
   - Select claim topic (e.g., KYC)
   - Enter claim value (e.g., "1" for verified)
   - Click "Add Claim Topic to OnchainID"

#### Expected Results:
- ✅ OnchainID created and displayed
- ✅ User registered in identity registry
- ✅ Claim issuer added to OnchainID
- ✅ Claims added and verified

---

### Step 7: Token Operations Tab

#### What is it?
The Token Operations tab allows you to perform actual token transactions (mint, burn, transfer) with full compliance checks.

#### What happens during token operations?
1. **Compliance Verification**: Checks user identities and claims
2. **Permission Validation**: Ensures proper agent permissions
3. **Transaction Execution**: Performs the actual blockchain transaction
4. **Status Update**: Updates token balances and compliance status

#### Prerequisites:
- ✅ Token deployed
- ✅ Users with proper identities and claims
- ✅ Agent permissions configured

#### Steps to follow:
1. **Select Token**: Choose the token for operations
2. **Mint Tokens** (if you have minting permissions):
   - Enter amount to mint
   - Enter recipient address
   - Click "Mint Tokens"
3. **Transfer Tokens**:
   - Enter amount to transfer
   - Enter recipient address
   - Click "Transfer Tokens"
4. **Burn Tokens** (if you have burning permissions):
   - Enter amount to burn
   - Enter address to burn from
   - Click "Burn Tokens"

#### Expected Results:
- ✅ Transactions executed successfully
- ✅ Compliance checks passed
- ✅ Balance updates reflected
- ✅ Success messages in logs

---

## 🔄 Workflow Summary

### Initial Setup (One-time):
1. **Factory Management** → Deploy factory
2. **Token Management** → Deploy token with compliance

### Regular Operations:
3. **User Management** → Create user identities
4. **Token Operations** → Perform transactions

### Verification (As needed):
5. **Claims Management** → Verify claim topics
6. **Trusted Issuer Management** → Check issuers
7. **Agent Management** → Verify agents

---

## ⚠️ Common Pitfalls to Avoid

### ❌ Don't Skip Steps
- **Problem**: Trying to deploy tokens without a factory
- **Solution**: Always start with Factory Management

### ❌ Don't Ignore Prerequisites
- **Problem**: Creating users without deployed tokens
- **Solution**: Deploy tokens before user management

### ❌ Don't Forget Claims
- **Problem**: Users can't transfer tokens due to missing claims
- **Solution**: Always add proper claims to user identities

### ❌ Don't Skip Verification
- **Problem**: Assuming everything works without checking
- **Solution**: Use verification tabs to confirm setup

---

## 🎯 Success Checklist

After completing all steps, verify:

- ✅ [ ] Factory deployed and selected
- ✅ [ ] Token deployed with compliance features
- ✅ [ ] Claim topics properly configured
- ✅ [ ] Trusted issuers registered
- ✅ [ ] Agents configured with proper permissions
- ✅ [ ] User identities created with claims
- ✅ [ ] Token operations working (mint/transfer/burn)

---

## 🆘 Troubleshooting

### If Factory Deployment Fails:
- Check Hardhat node is running
- Verify account has sufficient ETH
- Check network configuration

### If Token Deployment Fails:
- Ensure factory is selected
- Verify claim issuer is available
- Check claim topics are selected

### If User Creation Fails:
- Ensure token is deployed
- Verify identity registry is working
- Check claim issuer is properly configured

### If Token Operations Fail:
- Verify user has proper identity and claims
- Check agent permissions
- Ensure compliance requirements are met

---

**Remember**: The Easy Deploy Phase is designed to handle the complexity of T-REX contracts automatically. Follow the order, check the logs, and verify each step before proceeding to the next. 