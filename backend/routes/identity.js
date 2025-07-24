const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

const { createProvider, getContractArtifacts } = require('../utils/helpers');

// Create OnchainID using TREX Factory
router.post('/create-onchainid', async (req, res) => {
  try {
    const { userAddress, deploymentDetails } = req.body;
    console.log(`🎯 Creating OnchainID for user: ${userAddress}`);
    if (!userAddress) throw new Error('User address is required');
    if (!deploymentDetails || !deploymentDetails.factories || !deploymentDetails.factories.identityFactory) {
      throw new Error('Identity Factory not found in deployment details');
    }
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    let onchainIdAddress;
    let transactionHash = null;
    let isNewOnchainId = false;
    const identityFactoryAddress = deploymentDetails.factories.identityFactory;
    const iidFactoryArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/IIdFactory.json');
    if (!fs.existsSync(iidFactoryArtifactsPath)) {
      throw new Error('IIdFactory artifacts not found. Please compile contracts first.');
    }
    const iidFactoryArtifacts = JSON.parse(fs.readFileSync(iidFactoryArtifactsPath, 'utf8'));
    const identityFactory = new ethers.Contract(
      identityFactoryAddress,
      iidFactoryArtifacts.abi,
      wallet
    );
    let existingOnchainIdAddress;
    try {
      existingOnchainIdAddress = await identityFactory.getIdentity(userAddress);
      if (existingOnchainIdAddress && existingOnchainIdAddress !== '0x0000000000000000000000000000000000000000') {
        onchainIdAddress = existingOnchainIdAddress;
        isNewOnchainId = false;
      }
    } catch (error) {}
    if (!existingOnchainIdAddress || existingOnchainIdAddress === '0x0000000000000000000000000000000000000000') {
      const salt = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256'], 
          [userAddress, Date.now()]
        )
      );
      if (userAddress.toLowerCase() === deployerAddress.toLowerCase()) {
        const tx = await identityFactory.createIdentity(userAddress, salt);
        await tx.wait();
        transactionHash = tx.hash;
        isNewOnchainId = true;
        onchainIdAddress = await identityFactory.getIdentity(userAddress);
      } else {
        const deployerKeyHash = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address'], [deployerAddress])
        );
        const managementKeys = [deployerKeyHash];
        const tx = await identityFactory.createIdentityWithManagementKeys(userAddress, salt, managementKeys);
        await tx.wait();
        transactionHash = tx.hash;
        isNewOnchainId = true;
        onchainIdAddress = await identityFactory.getIdentity(userAddress);
      }
    }
    res.json({
      success: true,
      onchainIdAddress: onchainIdAddress,
      userAddress: userAddress,
      transactionHash: transactionHash,
      isNewOnchainId: isNewOnchainId
    });
  } catch (error) {
    console.error('❌ Error creating OnchainID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register identity in Identity Registry
router.post('/register-identity', async (req, res) => {
  try {
    const { userAddress, onchainIdAddress, userCountry, selectedIR } = req.body;
    if (!userAddress || !onchainIdAddress || !selectedIR) {
      throw new Error('User address, OnchainID address, and Identity Registry are required');
    }
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    const irArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/IdentityRegistry.json');
    if (!fs.existsSync(irArtifactsPath)) {
      throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
    }
    const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
    const registry = new ethers.Contract(selectedIR, irArtifacts.abi, wallet);
    const isAgentIR = await registry.isAgent(deployerAddress);
    if (!isAgentIR) {
      throw new Error('Deployer is not an agent on this Identity Registry');
    }
    const tx = await registry.registerIdentity(userAddress, onchainIdAddress, userCountry);
    await tx.wait();
    res.json({
      success: true,
      userAddress: userAddress,
      onchainIdAddress: onchainIdAddress,
      identityRegistry: selectedIR,
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('❌ Error registering identity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add claim issuer keys to OnchainID
router.post('/add-claim-issuer-keys', async (req, res) => {
  try {
    const { onchainIdAddress, finalIssuerAddress } = req.body;
    if (!onchainIdAddress || !finalIssuerAddress) {
      throw new Error('OnchainID address and ClaimIssuer address are required');
    }
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    const OnchainID = require('@onchain-id/solidity');
    const onchainId = new ethers.Contract(onchainIdAddress, OnchainID.contracts.Identity.abi, wallet);
    const signerKeyHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address'], [deployerAddress])
    );
    try {
      const signerKey = await onchainId.getKey(signerKeyHash);
      const hasManagementKey = signerKey.purposes.some(p => p.toNumber() === 1);
      if (!hasManagementKey) {
        const addManagementKeyTx = await onchainId.addKey(signerKeyHash, 1, 1);
        await addManagementKeyTx.wait();
      }
    } catch (e) {
      const addManagementKeyTx = await onchainId.addKey(signerKeyHash, 1, 1);
      await addManagementKeyTx.wait();
    }
    const claimIssuerKeyHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address'], [finalIssuerAddress])
    );
    try {
      const existingKey = await onchainId.getKey(claimIssuerKeyHash);
      if (existingKey.purposes.length > 0) {
        res.json({
          success: true,
          message: 'ClaimIssuer keys already exist on this OnchainID',
          onchainIdAddress: onchainIdAddress,
          claimIssuerAddress: finalIssuerAddress
        });
        return;
      }
    } catch (e) {}
    const addManagementKeyTx = await onchainId.addKey(claimIssuerKeyHash, 1, 1);
    await addManagementKeyTx.wait();
    const addSigningKeyTx = await onchainId.addKey(claimIssuerKeyHash, 3, 1);
    await addSigningKeyTx.wait();
    res.json({
      success: true,
      message: `Successfully added ClaimIssuer ${finalIssuerAddress} keys to OnchainID`,
      onchainIdAddress: onchainIdAddress,
      claimIssuerAddress: finalIssuerAddress,
      managementKeyTx: addManagementKeyTx.hash,
      signingKeyTx: addSigningKeyTx.hash
    });
  } catch (error) {
    console.error('❌ Error adding ClaimIssuer keys:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add claim to identity
router.post('/add-claim-to-identity', async (req, res) => {
  try {
    let { onchainIdAddress, claimTopic, claimValue, finalIssuerAddress, userAddress } = req.body;
    onchainIdAddress = onchainIdAddress && typeof onchainIdAddress === 'string' ? onchainIdAddress.toLowerCase() : onchainIdAddress;
    finalIssuerAddress = finalIssuerAddress && typeof finalIssuerAddress === 'string' ? finalIssuerAddress.toLowerCase() : finalIssuerAddress;
    userAddress = userAddress && typeof userAddress === 'string' ? userAddress.toLowerCase() : userAddress;
    const provider = createProvider();
    const code = await provider.getCode(finalIssuerAddress);
    if (code === '0x') throw new Error('No contract deployed at finalIssuerAddress');
    if (!onchainIdAddress || !claimTopic || !claimValue || !finalIssuerAddress || !userAddress) {
      throw new Error('OnchainID address, claim topic, claim value, issuer address, and user address are required');
    }
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const OnchainID = require('@onchain-id/solidity');
    const onchainId = new ethers.Contract(onchainIdAddress, OnchainID.contracts.Identity.abi, wallet);
    let topicId;
    if (claimTopic === 'KYC (Know Your Customer)') topicId = 1;
    else if (claimTopic === 'AML (Anti-Money Laundering)') topicId = 2;
    else if (claimTopic === 'Accredited Investor') topicId = 3;
    else if (claimTopic === 'EU Nationality Confirmed') topicId = 4;
    else if (claimTopic === 'US Nationality Confirmed') topicId = 5;
    else if (claimTopic === 'Blacklist') topicId = 6;
    else {
      const parsed = parseInt(claimTopic);
      topicId = isNaN(parsed) ? ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(claimTopic))) : parsed;
    }
    const claimData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(claimValue));
    const dataHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes'],
        [onchainIdAddress, topicId, claimData]
      )
    );
    const signature = await wallet.signMessage(ethers.utils.arrayify(dataHash));
    const issuerKeyHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address'], [finalIssuerAddress])
    );
    try {
      const existingKey = await onchainId.getKey(issuerKeyHash);
      const hasManagementKey = existingKey.purposes.some(p => p.toNumber() === 1);
      if (!hasManagementKey) {
        const addManagementKeyTx = await onchainId.addKey(issuerKeyHash, 1, 1);
        await addManagementKeyTx.wait();
      }
    } catch (e) {
      const addManagementKeyTx = await onchainId.addKey(issuerKeyHash, 1, 1);
      await addManagementKeyTx.wait();
    }
    const scheme = 1; // ECDSA
    const uri = "";
    const tx = await onchainId.addClaim(
      topicId,
      scheme,
      finalIssuerAddress,
      signature,
      claimData,
      uri
    );
    const receipt = await tx.wait();
    const recovered = ethers.utils.verifyMessage(ethers.utils.arrayify(dataHash), signature);
    if (recovered.toLowerCase() !== (await wallet.getAddress()).toLowerCase()) {
      throw new Error('Signature does not match deployer address!');
    }
    res.json({
      success: true,
      message: 'Successfully added claim to identity via ClaimIssuer',
      onchainIdAddress: onchainIdAddress,
      topic: topicId,
      value: claimValue,
      issuer: finalIssuerAddress,
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('❌ Error adding claim to identity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check OnchainID claims
router.get('/check-onchainid-claims/:onchainIdAddress', async (req, res) => {
  try {
    const { onchainIdAddress } = req.params;
    if (!onchainIdAddress) {
      throw new Error('OnchainID address is required');
    }
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const OnchainID = require('@onchain-id/solidity');
    const onchainId = new ethers.Contract(onchainIdAddress, OnchainID.contracts.Identity.abi, wallet);
    const commonTopics = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const claims = [];
    const processedClaimIds = new Set();
    for (const topicId of commonTopics) {
      try {
        const claimIds = await onchainId.getClaimIdsByTopic(topicId);
        if (claimIds.length > 0) {
          for (const claimId of claimIds) {
            const claimIdStr = claimId.toString();
            if (processedClaimIds.has(claimIdStr)) continue;
            try {
              const claim = await onchainId.getClaim(claimId);
              let claimData = '';
              try {
                claimData = ethers.utils.toUtf8String(claim.data);
              } catch (e) {
                claimData = claim.data;
              }
              claims.push({
                id: claimIdStr,
                topic: claim.topic.toNumber(),
                issuer: claim.issuer,
                data: claimData,
                scheme: claim.scheme.toNumber()
              });
              processedClaimIds.add(claimIdStr);
            } catch (claimError) {}
          }
        }
      } catch (topicError) {}
    }
    res.json({
      success: true,
      claims: claims,
      totalClaims: claims.length,
      onchainIdAddress: onchainIdAddress
    });
  } catch (error) {
    console.error('❌ Error checking OnchainID claims:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Create OnchainID directly (not via factory)
router.post('/create-onchainid-direct', async (req, res) => {
  try {
    const { userAddress, country } = req.body;
    if (!userAddress) {
      return res.status(400).json({ success: false, error: 'userAddress is required' });
    }
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const identityArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Identity.json');
    if (!fs.existsSync(identityArtifactsPath)) {
      throw new Error('Identity contract artifacts not found');
    }
    const identityArtifacts = JSON.parse(fs.readFileSync(identityArtifactsPath, 'utf8'));
    const identityFactory = new ethers.ContractFactory(identityArtifacts.abi, identityArtifacts.bytecode, wallet);
    // FIX: Pass both required constructor arguments: initialManagementKey and _isLibrary
    const identity = await identityFactory.deploy(wallet.address, false); // Deployer is initial owner, not a library
    await identity.deployed();
    const onchainIdAddress = identity.address;
    // Add user as management key (purpose=1, keyType=1) and action key (purpose=2, keyType=1) if not already present
    const userKeyHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [userAddress]));
    // Helper to check if key has purpose
    const keyHasPurpose = async (purpose) => {
      try {
        return await identity.keyHasPurpose(userKeyHash, purpose);
      } catch {
        return false;
      }
    };
    if (!(await keyHasPurpose(1))) {
      await identity.addKey(userKeyHash, 1, 1); // management key
    }
    if (!(await keyHasPurpose(2))) {
      await identity.addKey(userKeyHash, 2, 1); // action key
    }
    res.json({ success: true, onchainIdAddress });
  } catch (error) {
    console.error('❌ Error creating OnchainID (direct):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ... rest of the file ...
module.exports = router; 