# 📋 Complete T-REX Deployment Flow Analysis

## Overview
This document outlines the complete deployment flow for the T-REX (Token for Regulated EXchanges) ecosystem, which implements ERC-3643 compliant security tokens with built-in identity verification and compliance enforcement.

## Step 1: Deploy Core Contracts
**Purpose**: Deploy all foundational contracts that form the T-REX ecosystem infrastructure.

**Contracts Deployed**:
- **ClaimTopicsRegistry** - Manages required claim topics for compliance verification
- **TrustedIssuersRegistry** - Manages trusted issuers who are authorized to issue claims
- **IdentityRegistryStorage** - Stores identity data and verification status
- **IdentityRegistry** - Main registry that coordinates identity verification
- **ModularCompliance** - Handles compliance rules and validation logic

**Actions**:
- Deploy each contract using Hardhat deployment scripts
- Store contract addresses in localStorage for persistence
- Verify successful deployment of all contracts
- No initialization performed yet - contracts are in raw state

**UI Features**:
- Auto-selects latest deployed contracts after each refresh
- "Refresh & Auto-Select" button for easy contract management
- Clear visual indicators for deployment status

---

## Step 2: Initialize Contracts
**Purpose**: Initialize all deployed contracts and establish their internal state.

**Contracts Initialized**:
- **ClaimTopicsRegistry.init()** - Sets up the registry with initial configuration
- **TrustedIssuersRegistry.init()** - Initializes trusted issuers management system
- **IdentityRegistryStorage.init()** - Sets up storage infrastructure for identity data
- **IdentityRegistry.init(trustedIssuers, claimTopics, storage)** - Links to other registries
- **ModularCompliance.init()** - Initializes compliance framework

**Actions**:
- Call init() function on each contract in proper sequence
- Establish connections between registries during initialization
- Verify initialization status for each contract
- Ensure proper linking between IdentityRegistry and its dependencies

**UI Features**:
- Auto-selects latest deployed contracts for initialization
- "Refresh & Auto-Select" button for contract selection
- Clear initialization status indicators

---

## Step 3: Configure Identity Registry
**Purpose**: Configure the Identity Registry with proper registry linkages and establish the complete verification framework.

**Contracts Involved**:
- **IdentityRegistry** (main contract)
- **TrustedIssuersRegistry** (linked)
- **ClaimTopicsRegistry** (linked)
- **IdentityRegistryStorage** (linked)

**Actions**:
- **setTrustedIssuersRegistry()** - Links IR to TIR for trusted issuer verification
- **setClaimTopicsRegistry()** - Links IR to CTR for required topics validation
- **setIdentityRegistryStorage()** - Links IR to IRS for data persistence
- **bindIdentityRegistry()** - Establishes bilateral binding between IR and IRS

**Configuration Flow**:
1. Set TrustedIssuersRegistry address in IdentityRegistry
2. Set ClaimTopicsRegistry address in IdentityRegistry
3. Set IdentityRegistryStorage address in IdentityRegistry
4. Bind IdentityRegistry to IdentityRegistryStorage (bidirectional)

**UI Features**:
- Auto-selects latest deployed contracts for configuration
- "Refresh & Auto-Select" button for easy contract selection
- Clear configuration status indicators

---

## Step 4: Add Agent
**Purpose**: Grant administrative privileges to the deployment signer for managing the T-REX ecosystem.

**Contracts Involved**:
- **IdentityRegistry**
- **IdentityRegistryStorage**

**Actions**:
- **addAgent(signerAddress)** on both contracts
- Gives signer (Account 0) agent privileges
- Allows signer to perform administrative functions across the ecosystem
- Enables signer to manage identities, claims, and compliance rules

**Agent Capabilities**:
- Register new user identities
- Manage claim topics and trusted issuers
- Configure compliance rules
- Perform administrative token operations

**UI Features**:
- Auto-selects latest deployed contracts
- "Refresh & Auto-Select" button for contract selection
- Clear agent addition status

---

## Step 5: Add Claim Topics
**Purpose**: Define the required claim topics that users must have to be considered compliant.

**Contracts Involved**:
- **ClaimTopicsRegistry**

**Actions**:
- **addClaimTopic(topicId)** for each required topic:
  - **Topic 1**: KYC (Know Your Customer) - Basic identity verification
  - **Topic 2**: AML (Anti-Money Laundering) - Anti-money laundering compliance
  - **Topic 3**: Accredited Investor - Investment qualification verification
  - **Topic 4**: EU Nationality Confirmed - European Union residency
  - **Topic 5**: US Nationality Confirmed - United States residency
  - **Topic 6**: Blacklist - Exclusion list verification

**Claim Topics Purpose**:
- Define compliance requirements for token transfers
- Enable granular compliance verification
- Support regulatory requirements across jurisdictions

**UI Features**:
- "Refresh Claim Topics" button to update current topics
- "Remove claim from registry" button for each topic
- Clear topic management interface

---

## Step 6: Add Trusted Issuer
**Purpose**: Deploy and configure a ClaimIssuer that is authorized to issue compliance claims to user identities.

**Contracts Involved**:
- **TrustedIssuersRegistry**
- **ClaimIssuer** (newly deployed)

**Actions**:
- **Deploy ClaimIssuer contract** - Specialized Identity contract for issuing claims
- **Add signer as management key** to ClaimIssuer
- **Add signing key** to ClaimIssuer for claim issuance
- **addTrustedIssuer(claimIssuerAddress, claimTopics)** in TIR
- Specify which claim topics this issuer can issue

**ClaimIssuer Configuration**:
- Management keys: Signer address for administrative control
- Action keys: Signer address for claim issuance operations
- Trusted issuer registration: Authorized for specific claim topics

**UI Features**:
- Auto-selects latest deployed contracts
- "Refresh & Auto-Select" button for contract selection
- Clear trusted issuer configuration status

---

## Step 7: User Management
**Purpose**: Create and manage user identities with OnchainIDs and compliance claims.

**Contracts Involved**:
- **Identity** (OnchainID contracts)
- **IdentityRegistry**
- **ClaimIssuer**
- **Token**

### Section 1: OnchainID Creation
**Actions**:
- **Create OnchainID**: Deploy Identity contract for each user
- **Register Identity**: Link user address to OnchainID in IdentityRegistry
- **Add User Keys**: Give user address management and action key permissions

### Section 2: OnchainID Management
**Actions**:
- **Select OnchainID**: Choose from dropdown of created OnchainIDs
- **Register in Identity Registry**: Link selected OnchainID to user address with country code
- **Add Claims**: Issue compliance claims (KYC, AML, etc.) using ClaimIssuer
- **Verify Users**: Check if users meet compliance requirements

**Detailed Flow**:
1. Deploy Identity contract with signer as owner
2. Add user address as management and action keys to OnchainID
3. Register identity in IdentityRegistry with country code
4. Issue claims using ClaimIssuer (KYC, AML, etc.)
5. Verify user compliance for token operations

**UI Features**:
- Two-section navigation: Creation and Management
- Auto-selects latest Identity Registry
- Dropdown selection for OnchainID management
- Automatic user address and country setting
- Claims issued by selected trusted ClaimIssuer

---

## Step 8: Token Management
**Purpose**: Deploy and configure the ERC-3643 compliant token with full compliance integration.

**Contracts Involved**:
- **Token** (ERC-3643 compliant)
- **IdentityRegistry** (linked)
- **ModularCompliance** (linked)

**Actions**:
- **Deploy Token** with:
  - **init(identityRegistry, compliance, name, symbol, decimals, onchainID)**
- **Add signer as token agent**: addAgent(signerAddress)
- **Configure token settings** (pause/unpause, etc.)
- **Mint tokens** to test addresses
- **Test transfers** with compliance validation

**Sub-steps**:
- **Deploy Token**: Create ERC-3643 token with compliance integration
- **Role Management**: Manage agent roles and permissions
- **Function Management**: Test token functions (mint, burn, transfer)

**UI Features**:
- Auto-selects latest deployed contracts
- "Refresh & Auto-Select" button for contract selection
- Clear token deployment and configuration status

---

## Step 9: Claim/Token Check
**Purpose**: Comprehensive verification and testing of the complete T-REX ecosystem.

**Contracts Involved**:
- **Token**
- **IdentityRegistry**
- **TrustedIssuersRegistry**
- **ClaimTopicsRegistry**
- **User OnchainIDs**

**Actions**:
- **Comprehensive Verification**: Single button to run complete diagnostics
- **User Address Check**: Verify specific user address (defaults to account 0 if empty)
- **Complete System Validation**: Check all components and relationships

**Diagnostic Checks**:
1. **Token's Identity Registry**: Verify correct IR linkage
2. **Identity Registry's Trusted Issuers Registry**: Verify TIR linkage
3. **Identity Registry's Claim Topics Registry**: Verify CTR linkage
4. **User's OnchainID**: Verify user identity exists
5. **Claim Topics Registry**: Verify required topics configuration
6. **OnchainID Claims Analysis**: Verify valid claims from trusted issuers
7. **Final Verification Status**: Overall compliance verification
8. **Registry Configuration Check**: Verify all registry linkages
9. **Recommendations**: Actionable fixes if issues found

**UI Features**:
- Empty input box with placeholder (uses account 0 if empty)
- Single "Run Comprehensive Verification" button
- Detailed diagnostic output with clear status indicators
- Actionable recommendations for any issues

---

## Key Contract Relationships

```
Token
├── IdentityRegistry (verification)
└── ModularCompliance (rules)

IdentityRegistry
├── TrustedIssuersRegistry (trusted issuers)
├── ClaimTopicsRegistry (required topics)
└── IdentityRegistryStorage (data storage)

User OnchainID
├── Management Keys (user address)
├── Action Keys (user address)
└── ClaimIssuer Keys (for claim issuance)

ClaimIssuer
├── Management Keys (signer)
├── Action Keys (signer)
└── Trusted Issuer Registration
```

## Testing Flow

1. **Mint tokens** to test addresses
2. **Create user identities** with OnchainIDs
3. **Add compliance claims** (KYC, AML, etc.) using ClaimIssuer
4. **Test transfers** with compliance validation
5. **Verify compliance enforcement** through comprehensive diagnostics

## Key Improvements Made

1. **Auto-Selection**: All steps now auto-select latest deployed contracts
2. **Refresh Buttons**: Consistent "Refresh & Auto-Select" buttons across all steps
3. **User Management Restructure**: Split into Creation and Management sections
4. **Claim Issuance**: Claims are issued by ClaimIssuer, not OnchainID
5. **Comprehensive Verification**: Single diagnostic button with detailed analysis
6. **Error Handling**: Improved error handling and user feedback
7. **UI Consistency**: Standardized interface across all phases

This flow establishes a complete ERC-3643 compliant token ecosystem with proper identity verification, claim management, and compliance enforcement, optimized for ease of use and comprehensive testing. 