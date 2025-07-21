# Advanced Phase - Complete Walkthrough

## Overview

The Advanced Phase provides granular control over T-REX smart contracts, allowing you to deploy and configure each component individually. This phase is for users who need custom configurations or want to understand the underlying contract interactions.

## 🎯 Recommended Order of Operations

**IMPORTANT**: Follow this exact order for best results and to avoid errors:

1. **Factory Deployment** → Deploy the main factory contract
2. **Suite Deployment** → Deploy the complete T-REX suite
3. **Token Deployment** → Deploy individual tokens
4. **Claim Issuer Setup** → Deploy and configure claim issuers
5. **User Identity Creation** → Create OnchainIDs and register users
6. **Claim Management** → Add claims to user identities
7. **Agent Configuration** → Set up agents for tokens and registries
8. **Token Operations** → Perform advanced token transactions

---

## 📋 Step-by-Step Walkthrough

### Step 1: Factory Deployment

#### What is it?
The Factory Deployment section deploys the main TREXFactory contract, which is the central coordinator for all T-REX operations.

#### What happens during factory deployment?
1. **Contract Compilation**: Compiles the TREXFactory contract
2. **Deployment**: Deploys the factory to the blockchain
3. **Address Storage**: Saves the factory address for future use
4. **State Update**: Updates the UI to show the deployed factory

#### Steps to follow:
1. **Check Network**: Ensure you're connected to the correct network
2. **Deploy Factory**: Click "Deploy Factory" button
3. **Wait for Transaction**: Monitor the transaction in your wallet
4. **Confirm Deployment**: Verify the factory address is displayed
5. **Save Address**: Copy the factory address for reference

#### Expected Results:
- ✅ Factory contract deployed
- ✅ Factory address displayed
- ✅ Deployment transaction confirmed
- ✅ UI updated to show factory details

---

### Step 2: Suite Deployment

#### What is it?
The Suite Deployment section deploys the complete T-REX infrastructure including Identity Registry, Claim Topics Registry, Trusted Issuers Registry, and Token Registry.

#### What happens during suite deployment?
1. **Registry Deployment**: Deploys all four core registries
2. **Factory Integration**: Links all registries to the factory
3. **Permission Setup**: Configures proper access controls
4. **Initial Configuration**: Sets up default claim topics and issuers

#### Prerequisites:
- ✅ Factory must be deployed first
- ✅ Factory address must be available

#### Steps to follow:
1. **Enter Factory Address**: Paste the factory address from Step 1
2. **Deploy Suite**: Click "Deploy Suite" button
3. **Monitor Progress**: Watch the deployment logs
4. **Verify Registries**: Check that all registries are deployed
5. **Save Addresses**: Copy all registry addresses

#### Expected Results:
- ✅ Identity Registry deployed
- ✅ Claim Topics Registry deployed
- ✅ Trusted Issuers Registry deployed
- ✅ Token Registry deployed
- ✅ All registries linked to factory
- ✅ Default claim topics configured

---

### Step 3: Token Deployment

#### What is it?
The Token Deployment section allows you to deploy individual security tokens with custom configurations and compliance features.

#### What happens during token deployment?
1. **Token Contract Creation**: Deploys the Token smart contract
2. **Compliance Integration**: Links token to identity registry
3. **Claim Topic Setup**: Configures required claim topics
4. **Agent Assignment**: Sets up initial agents
5. **Supply Initialization**: Mints initial token supply

#### Prerequisites:
- ✅ Factory and suite must be deployed
- ✅ All registry addresses must be available

#### Steps to follow:
1. **Enter Factory Address**: Paste the factory address
2. **Configure Token Details**:
   - **Name**: Full token name (e.g., "My Security Token")
   - **Symbol**: Token symbol (e.g., "MST")
   - **Decimals**: Token precision (usually 18)
   - **Total Supply**: Initial token supply
3. **Set Claim Topics**: Choose required claim topics (KYC, AML, etc.)
4. **Configure Agents**: Set initial agent addresses
5. **Deploy Token**: Click "Deploy Token" button
6. **Monitor Deployment**: Watch the deployment process

#### Expected Results:
- ✅ Token contract deployed
- ✅ Token linked to identity registry
- ✅ Claim topics configured
- ✅ Agents assigned
- ✅ Initial supply minted
- ✅ Token address displayed

---

### Step 4: Claim Issuer Setup

#### What is it?
The Claim Issuer Setup section deploys and configures ClaimIssuer contracts that are authorized to issue claims to user identities.

#### What happens during claim issuer setup?
1. **ClaimIssuer Deployment**: Deploys the ClaimIssuer contract
2. **Key Management**: Sets up signing keys for claim issuance
3. **Trusted Issuer Registration**: Registers the issuer as trusted
4. **Claim Topic Assignment**: Assigns claim topics to the issuer

#### Prerequisites:
- ✅ Factory and suite must be deployed
- ✅ Trusted Issuers Registry must be available

#### Steps to follow:
1. **Deploy Claim Issuer**: Click "Deploy Claim Issuer" button
2. **Configure Keys**: Set up signing keys for the issuer
3. **Register as Trusted**: Add issuer to trusted issuers registry
4. **Assign Claim Topics**: Choose which topics this issuer can issue
5. **Verify Setup**: Confirm issuer is properly configured

#### Expected Results:
- ✅ ClaimIssuer contract deployed
- ✅ Signing keys configured
- ✅ Issuer registered as trusted
- ✅ Claim topics assigned
- ✅ Issuer ready to issue claims

---

### Step 5: User Identity Creation

#### What is it?
The User Identity Creation section creates OnchainID contracts for users and registers them in the identity registry.

#### What happens during user identity creation?
1. **OnchainID Deployment**: Deploys OnchainID contract for the user
2. **Identity Registration**: Registers user in identity registry
3. **Claim Issuer Integration**: Links claim issuers to the OnchainID
4. **Key Management**: Sets up user's identity keys

#### Prerequisites:
- ✅ Factory and suite must be deployed
- ✅ Identity Registry must be available
- ✅ Claim issuers must be deployed

#### Steps to follow:
1. **Enter User Address**: Provide the user's Ethereum address
2. **Set Country Code**: Choose the user's country (e.g., "840" for USA)
3. **Create OnchainID**: Click "Create OnchainID" button
4. **Register Identity**: Register the OnchainID in the identity registry
5. **Add Claim Issuer**: Link a claim issuer to the OnchainID
6. **Verify Registration**: Confirm user is properly registered

#### Expected Results:
- ✅ OnchainID contract deployed
- ✅ User registered in identity registry
- ✅ Claim issuer linked to OnchainID
- ✅ Identity keys configured
- ✅ User ready for claim issuance

---

### Step 6: Claim Management

#### What is it?
The Claim Management section adds specific claims to user identities, enabling compliance verification for token transfers.

#### What happens during claim management?
1. **Claim Verification**: Verifies the claim issuer is authorized
2. **Claim Addition**: Adds the claim to the user's OnchainID
3. **On-chain Storage**: Stores the claim on the blockchain
4. **Compliance Update**: Updates compliance status for the user

#### Prerequisites:
- ✅ User identities must be created
- ✅ Claim issuers must be configured
- ✅ Claim topics must be defined

#### Steps to follow:
1. **Select User**: Choose the user's OnchainID
2. **Select Claim Issuer**: Choose the authorized claim issuer
3. **Choose Claim Topic**: Select the type of claim (KYC, AML, etc.)
4. **Set Claim Value**: Enter the claim value (e.g., "1" for verified)
5. **Add Claim**: Click "Add Claim" button
6. **Verify Claim**: Confirm the claim is properly added

#### Expected Results:
- ✅ Claim added to user's OnchainID
- ✅ Claim stored on blockchain
- ✅ Compliance status updated
- ✅ User can now transfer tokens (if compliant)

---

### Step 7: Agent Configuration

#### What is it?
The Agent Configuration section sets up agents for tokens and identity registries, granting them special privileges.

#### What happens during agent configuration?
1. **Permission Assignment**: Grants specific permissions to agents
2. **Role Definition**: Defines what operations agents can perform
3. **Access Control**: Sets up proper access controls
4. **Verification**: Confirms agent permissions are active

#### Prerequisites:
- ✅ Tokens must be deployed
- ✅ Identity registries must be available
- ✅ Agent addresses must be known

#### Steps to follow:
1. **Select Contract**: Choose token or identity registry
2. **Enter Agent Address**: Provide the agent's Ethereum address
3. **Set Permissions**: Choose what the agent can do
4. **Add Agent**: Click "Add Agent" button
5. **Verify Permissions**: Confirm agent has proper access

#### Expected Results:
- ✅ Agent added to contract
- ✅ Permissions granted
- ✅ Access controls configured
- ✅ Agent can perform authorized operations

---

### Step 8: Token Operations

#### What is it?
The Token Operations section allows you to perform advanced token transactions with full compliance verification.

#### What happens during token operations?
1. **Compliance Check**: Verifies user identities and claims
2. **Permission Validation**: Checks agent permissions
3. **Transaction Execution**: Performs the blockchain transaction
4. **Status Update**: Updates balances and compliance status

#### Prerequisites:
- ✅ Tokens must be deployed
- ✅ Users must have proper identities and claims
- ✅ Agents must be configured (if needed)

#### Steps to follow:
1. **Select Token**: Choose the token for operations
2. **Choose Operation**:
   - **Mint**: Create new tokens (requires minting permissions)
   - **Burn**: Destroy tokens (requires burning permissions)
   - **Transfer**: Transfer tokens between addresses
   - **Forced Transfer**: Agent-based transfers with compliance
3. **Enter Parameters**: Provide amount, addresses, etc.
4. **Execute Transaction**: Click the operation button
5. **Monitor Results**: Watch for transaction confirmation

#### Expected Results:
- ✅ Transaction executed successfully
- ✅ Compliance checks passed
- ✅ Balances updated
- ✅ Transaction confirmed on blockchain

---

## 🔄 Workflow Summary

### Initial Setup (One-time):
1. **Factory Deployment** → Deploy main factory
2. **Suite Deployment** → Deploy all registries
3. **Token Deployment** → Deploy security tokens

### Infrastructure Setup:
4. **Claim Issuer Setup** → Deploy and configure issuers
5. **Agent Configuration** → Set up agents and permissions

### User Management:
6. **User Identity Creation** → Create user identities
7. **Claim Management** → Add claims to users

### Operations:
8. **Token Operations** → Perform transactions

---

## ⚠️ Common Pitfalls to Avoid

### ❌ Don't Deploy Out of Order
- **Problem**: Deploying tokens before factory and suite
- **Solution**: Always follow the deployment order

### ❌ Don't Skip Registry Setup
- **Problem**: Missing identity or claim registries
- **Solution**: Complete suite deployment before token deployment

### ❌ Don't Forget Claim Issuers
- **Problem**: No way to issue claims to users
- **Solution**: Deploy claim issuers before user management

### ❌ Don't Ignore Agent Permissions
- **Problem**: Agents can't perform required operations
- **Solution**: Configure agents with proper permissions

### ❌ Don't Skip Compliance
- **Problem**: Users can't transfer tokens due to missing claims
- **Solution**: Always add proper claims to user identities

---

## 🎯 Success Checklist

After completing all steps, verify:

- ✅ [ ] Factory deployed and configured
- ✅ [ ] All registries deployed and linked
- ✅ [ ] Tokens deployed with compliance features
- ✅ [ ] Claim issuers deployed and trusted
- ✅ [ ] User identities created and registered
- ✅ [ ] Claims added to user identities
- ✅ [ ] Agents configured with proper permissions
- ✅ [ ] Token operations working correctly

---

## 🔧 Advanced Configuration Options

### Custom Claim Topics
- Define custom claim topics beyond the standard KYC/AML
- Configure topic-specific requirements
- Set up topic hierarchies

### Multi-Token Setup
- Deploy multiple tokens with different configurations
- Configure cross-token compliance rules
- Set up token-specific agents

### Advanced Agent Roles
- Configure different agent types (minting, burning, transfer)
- Set up role-based access controls
- Implement multi-signature requirements

### Compliance Rules
- Define custom compliance requirements
- Set up automated compliance checks
- Configure compliance reporting

---

## 🆘 Troubleshooting

### If Factory Deployment Fails:
- Check network connection
- Verify account has sufficient ETH
- Check contract compilation
- Review deployment logs

### If Suite Deployment Fails:
- Ensure factory is properly deployed
- Check factory address is correct
- Verify all registry contracts compile
- Monitor gas limits

### If Token Deployment Fails:
- Ensure factory and suite are deployed
- Check all registry addresses
- Verify token parameters
- Review claim topic configuration

### If User Creation Fails:
- Ensure identity registry is deployed
- Check user address format
- Verify claim issuer is configured
- Review identity registration process

### If Claims Fail:
- Verify claim issuer is trusted
- Check user has proper OnchainID
- Ensure claim topic is authorized
- Review claim value format

### If Token Operations Fail:
- Check user compliance status
- Verify agent permissions
- Ensure sufficient token balance
- Review transaction parameters

---

## 📊 Monitoring and Verification

### On-chain Verification
- Use blockchain explorers to verify deployments
- Check contract interactions
- Monitor transaction logs
- Verify state changes

### Compliance Monitoring
- Track user claim status
- Monitor token transfer compliance
- Check agent activity
- Review access controls

### Performance Monitoring
- Monitor gas usage
- Track transaction success rates
- Check contract efficiency
- Review user experience

---

**Remember**: The Advanced Phase gives you full control over T-REX contracts but requires careful attention to detail. Always verify each step before proceeding to the next, and use the monitoring tools to ensure everything is working correctly. 