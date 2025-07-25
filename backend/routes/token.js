const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

const { createProvider, getContractArtifacts } = require('../utils/helpers');

// Pause/Unpause token
router.post('/pause', async (req, res) => {
  try {
    const { tokenAddress, paused } = req.body;
    console.log(`🎯 Pause/Unpause request for token: ${tokenAddress}, paused: ${paused}`);
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    console.log(`✅ Token contract instance created for ${tokenAddress}`);
    // Check if deployer is an agent
    const deployerAddress = await wallet.getAddress();
    const isAgent = await token.isAgent(deployerAddress);
    console.log(`🔍 Is deployer agent on token: ${isAgent}`);
    
    if (!isAgent) {
      throw new Error('Deployer is not an agent on this token');
    }
    
    // Pause or unpause the token
    const tx = paused ? await token.pause() : await token.unpause();
    console.log(`✅ Pause/Unpause transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Pause/Unpause transaction confirmed`);
    
    res.json({
      success: true,
      message: `Token ${paused ? 'paused' : 'unpaused'} successfully`,
      tokenAddress: tokenAddress,
      paused: paused,
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('❌ Error in pause/unpause:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token info
router.get('/token-info/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Getting token info for: ${tokenAddress}`);
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.owner()
    ]);
    
    // Handle BigNumber conversion properly
    const decimalsNumber = typeof decimals === 'object' && decimals.toNumber ? decimals.toNumber() : Number(decimals);
    
    const tokenInfo = {
      name,
      symbol,
      decimals: decimalsNumber,
      totalSupply: ethers.utils.formatUnits(totalSupply, decimalsNumber),
      owner,
      address: tokenAddress
    };
    
    console.log(`✅ Token info loaded: ${name} (${symbol})`);
    
    res.json({
      success: true,
      tokenInfo: tokenInfo
    });
  } catch (error) {
    console.error('❌ Error getting token info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get token status
router.get('/token-status/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    console.log(`🎯 Checking token status for: ${tokenAddress}`);
    if (!tokenAddress) throw new Error('Token address is required');
    const provider = createProvider();
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, provider);
    
    // Check if the contract has the paused function
    const hasPausedFunction = tokenArtifacts.abi.some(item => 
      item.type === 'function' && item.name === 'paused'
    );
    
    if (!hasPausedFunction) {
      res.json({
        success: true,
        status: '⚠️ No pause function found',
        hasPauseFunction: false
      });
      return;
    }
    
    const isPaused = await token.paused();
    const status = isPaused ? '⏸️ PAUSED' : '▶️ ACTIVE';
    
    console.log(`✅ Token status: ${status}`);
    
    res.json({
      success: true,
      status: status,
      isPaused: isPaused,
      hasPauseFunction: true
    });
  } catch (error) {
    console.error('❌ Error checking token status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify user
router.get('/verify-user/:tokenAddress/:userAddress', async (req, res) => {
  try {
    const { tokenAddress, userAddress } = req.params;
    console.log(`🎯 Checking verification for user: ${userAddress} on token: ${tokenAddress}`);
    
    if (!tokenAddress || !userAddress) {
      throw new Error('Token address and user address are required');
    }
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    
    // Get the Token contract
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    console.log(`✅ Token contract instance created for ${tokenAddress}`);
    
    // Get the Identity Registry from the token
    const identityRegistryAddress = await token.identityRegistry();
    console.log(`🔍 Identity Registry: ${identityRegistryAddress}`);
    
    const irArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/IdentityRegistry.json');
    console.log(`🔍 Looking for IR artifacts at: ${irArtifactsPath}`);
    if (!fs.existsSync(irArtifactsPath)) {
      console.log(`❌ IdentityRegistry artifacts not found at: ${irArtifactsPath}`);
      throw new Error('IdentityRegistry artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ IdentityRegistry artifacts found at: ${irArtifactsPath}`);
    const irArtifacts = JSON.parse(fs.readFileSync(irArtifactsPath, 'utf8'));
    const ir = new ethers.Contract(identityRegistryAddress, irArtifacts.abi, wallet);
    console.log(`✅ Identity Registry contract instance created for ${identityRegistryAddress}`);
    
    // Get user's OnchainID
    const onchainIdAddress = await ir.identity(userAddress);
    console.log(`🔍 User's OnchainID address: ${onchainIdAddress}`);
    
    if (onchainIdAddress === '0x0000000000000000000000000000000000000000') {
      res.json({
        success: true,
        verified: false,
        reason: 'User has no OnchainID registered',
        details: {
          userAddress: userAddress,
          onchainIdAddress: null,
          identityRegistry: identityRegistryAddress
        }
      });
      return;
    }
    
    // Check if user is verified
    const isVerified = await ir.isVerified(userAddress);
    console.log(`✅ Basic verification result: ${isVerified}`);
    
    // Get investor country
    const investorCountry = await ir.investorCountry(userAddress);
    console.log(`🔍 Investor country: ${investorCountry}`);
    
    // Get the TrustedIssuersRegistry
    const tirAddress = await ir.issuersRegistry();
    console.log(`🔍 TrustedIssuersRegistry: ${tirAddress}`);
    const tirArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/TrustedIssuersRegistry.json');
    console.log(`🔍 Looking for TIR artifacts at: ${tirArtifactsPath}`);
    if (!fs.existsSync(tirArtifactsPath)) {
      console.log(`❌ TrustedIssuersRegistry artifacts not found at: ${tirArtifactsPath}`);
      throw new Error('TrustedIssuersRegistry artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ TrustedIssuersRegistry artifacts found at: ${tirArtifactsPath}`);
    const tirArtifacts = JSON.parse(fs.readFileSync(tirArtifactsPath, 'utf8'));
    const tir = new ethers.Contract(tirAddress, tirArtifacts.abi, wallet);
    console.log(`✅ TrustedIssuersRegistry contract instance created for ${tirAddress}`);
    
    // Get the ClaimTopicsRegistry
    const ctrAddress = await ir.topicsRegistry();
    console.log(`🔍 ClaimTopicsRegistry: ${ctrAddress}`);
    const ctrArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/ClaimTopicsRegistry.json');
    console.log(`🔍 Looking for CTR artifacts at: ${ctrArtifactsPath}`);
    if (!fs.existsSync(ctrArtifactsPath)) {
      console.log(`❌ ClaimTopicsRegistry artifacts not found at: ${ctrArtifactsPath}`);
      throw new Error('ClaimTopicsRegistry artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ ClaimTopicsRegistry artifacts found at: ${ctrArtifactsPath}`);
    const ctrArtifacts = JSON.parse(fs.readFileSync(ctrArtifactsPath, 'utf8'));
    const ctr = new ethers.Contract(ctrAddress, ctrArtifacts.abi, wallet);
    console.log(`✅ ClaimTopicsRegistry contract instance created for ${ctrAddress}`);
    
    // Get required claim topics
    let requiredTopics = [];
    try {
      requiredTopics = await ctr.getClaimTopics();
      if (!Array.isArray(requiredTopics)) {
        requiredTopics = [];
      }
      console.log(`🔍 Required claim topics: ${requiredTopics.map(t => t.toString()).join(', ')}`);
    } catch (topicError) {
      console.log(`Warning: Could not get claim topics: ${topicError.message}`);
      requiredTopics = [];
    }
    
    // Load OnchainID artifacts
    const onchainIdArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Identity.json');
    console.log(`🔍 Looking for OnchainID artifacts at: ${onchainIdArtifactsPath}`);
    if (!fs.existsSync(onchainIdArtifactsPath)) {
      console.log(`❌ OnchainID artifacts not found at: ${onchainIdArtifactsPath}`);
      throw new Error('OnchainID artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ OnchainID artifacts found at: ${onchainIdArtifactsPath}`);
    const onchainIdArtifacts = JSON.parse(fs.readFileSync(onchainIdArtifactsPath, 'utf8'));
    
    // Get the OnchainID contract
    const onchainId = new ethers.Contract(onchainIdAddress, onchainIdArtifacts.abi, wallet);
    console.log(`✅ OnchainID contract instance created for ${onchainIdAddress}`);
    
    // Check each required topic
    let verificationDetails = [];
    for (const topicId of requiredTopics) {
      let topicNum;
      try {
        topicNum = typeof topicId === 'object' && topicId.toNumber ? topicId.toNumber() : Number(topicId);
      } catch (numError) {
        console.log(`Warning: Could not convert topic ID ${topicId}: ${numError.message}`);
        continue;
      }
      
      console.log(`🔍 Checking topic ${topicNum}...`);
      
      // Get trusted issuers for this topic
      let trustedIssuers = [];
      let trustedIssuerAddresses = [];
      try {
        trustedIssuers = await tir.getTrustedIssuersForClaimTopic(topicNum);
        trustedIssuerAddresses = trustedIssuers.map(issuer => issuer.toString());
        console.log(`🔍 Found ${trustedIssuerAddresses.length} trusted issuers for topic ${topicNum}: ${trustedIssuerAddresses.join(', ')}`);
      } catch (issuerError) {
        console.log(`Warning: Could not get trusted issuers for topic ${topicNum}: ${issuerError.message}`);
      }
      
      // Check if user has claims for this topic
      let claims = [];
      try {
        claims = await onchainId.getClaimIdsByTopic(topicNum);
        console.log(`🔍 Found ${claims.length} claims for topic ${topicNum}`);
        if (!Array.isArray(claims)) {
          claims = [];
        }
      } catch (claimsError) {
        console.log(`Warning: Could not get claims for topic ${topicNum}: ${claimsError.message}`);
      }
      
      let hasValidClaim = false;
      let claimDetails = [];
      
      if (claims.length > 0) {
        // Check each claim
        for (const claimId of claims) {
          try {
            const claim = await onchainId.getClaim(claimId);
            const claimIssuer = claim.issuer;
            console.log(`🔍 Claim ${claimId} issuer: ${claimIssuer}, trusted issuers: ${trustedIssuerAddresses.join(', ')}`);
            
            // Check if the claim issuer is trusted for this topic
            if (trustedIssuerAddresses.map(addr => addr.toLowerCase()).includes(claimIssuer.toLowerCase())) {
              hasValidClaim = true;
              let claimData = '';
              try {
                claimData = ethers.utils.toUtf8String(claim.data);
              } catch (e) {
                claimData = claim.data; // Keep as hex if not UTF8
              }
              
              claimDetails.push({
                claimId: claimId.toString(),
                issuer: claimIssuer,
                data: claimData,
                scheme: claim.scheme.toNumber()
              });
              console.log(`🔍 Claim ${claimId} is valid! Data: ${claimData}`);
            } else {
              console.log(`🔍 Claim ${claimId} issuer ${claimIssuer} is not trusted for topic ${topicNum}`);
            }
          } catch (claimError) {
            console.log(`Warning: Could not get claim ${claimId}: ${claimError.message}`);
          }
        }
      }
      
      // If no claims found on OnchainID, check with ClaimIssuer contracts
      if (!hasValidClaim && trustedIssuerAddresses.length > 0) {
        console.log(`🔍 No claims found on OnchainID for topic ${topicNum}, checking ClaimIssuer contracts...`);
        
        for (const issuerAddress of trustedIssuerAddresses) {
          try {
            // Load ClaimIssuer artifacts
            const claimIssuerArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/ClaimIssuer.json');
            if (fs.existsSync(claimIssuerArtifactsPath)) {
              const claimIssuerArtifacts = JSON.parse(fs.readFileSync(claimIssuerArtifactsPath, 'utf8'));
              const claimIssuer = new ethers.Contract(issuerAddress, claimIssuerArtifacts.abi, wallet);
              
              // Try to validate a claim with this issuer
              // We need to create a signature for the claim data
              const claimData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("YES")); // Default claim value
              const dataHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                  ['address', 'uint256', 'bytes'],
                  [onchainIdAddress, topicNum, claimData]
                )
              );
              const signature = await wallet.signMessage(ethers.utils.arrayify(dataHash));
              
              const isValid = await claimIssuer.isClaimValid(onchainIdAddress, topicNum, signature, claimData);
              console.log(`🔍 ClaimIssuer ${issuerAddress} validation for topic ${topicNum}: ${isValid}`);
              
              if (isValid) {
                hasValidClaim = true;
                claimDetails.push({
                  claimId: 'ClaimIssuer-validated',
                  issuer: issuerAddress,
                  data: 'YES',
                  scheme: 1,
                  validatedBy: 'ClaimIssuer'
                });
                console.log(`🔍 Claim validated by ClaimIssuer ${issuerAddress} for topic ${topicNum}`);
                break; // Found a valid claim, no need to check other issuers
              }
            }
          } catch (issuerError) {
            console.log(`🔍 Error checking ClaimIssuer ${issuerAddress}: ${issuerError.message}`);
          }
        }
      }
      
      verificationDetails.push({
        topic: topicNum,
        required: true,
        hasClaims: claims.length > 0,
        hasValidClaim: hasValidClaim,
        trustedIssuers: trustedIssuerAddresses,
        claims: claimDetails,
        claimSource: claims.length > 0 ? 'OnchainID' : (hasValidClaim ? 'ClaimIssuer' : 'None')
      });
    }
    
    // Determine overall verification status
    const allTopicsVerified = verificationDetails.every(detail => detail.hasValidClaim);
    const verified = isVerified && allTopicsVerified;
    
    console.log(`✅ Verification check completed for user: ${userAddress}`);
    console.log(`📊 Overall verification status: ${verified} (Basic: ${isVerified}, Topics: ${allTopicsVerified})`);
    
    res.json({
      success: true,
      verified: verified,
      reason: verified ? 'User is fully verified' : 'User verification incomplete',
      details: {
        userAddress: userAddress,
        onchainIdAddress: onchainIdAddress,
        identityRegistry: identityRegistryAddress,
        isVerified: isVerified,
        investorCountry: typeof investorCountry === 'object' && investorCountry.toNumber ? investorCountry.toNumber() : Number(investorCountry),
        requiredTopics: requiredTopics.map(t => typeof t === 'object' && t.toNumber ? t.toNumber() : Number(t)),
        verificationDetails: verificationDetails
      }
    });
  } catch (error) {
    console.error('❌ Error in verify user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mint tokens
router.post('/mint', async (req, res) => {
  try {
    const { tokenAddress, amount, recipient } = req.body;
    console.log(`🎯 Minting ${amount} tokens to ${recipient} on token: ${tokenAddress}`);
    
    if (!tokenAddress || !amount || !recipient) {
      throw new Error('Token address, amount, and recipient are required');
    }
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    
    console.log(`🔍 Using deployer address: ${deployerAddress}`);
    
    // Get the Token contract
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    console.log(`✅ Token contract instance created for ${tokenAddress}`);
    
    // Check if deployer is an agent
    const isAgent = await token.isAgent(deployerAddress);
    console.log(`🔍 Is deployer agent on token: ${isAgent}`);
    
    if (!isAgent) {
      throw new Error('Deployer is not an agent on this token');
    }
    
    // Convert amount to wei based on token decimals
    const amountInWei = amount;
    
    console.log(`🔍 Minting ${ethers.utils.formatEther(amountInWei)} tokens (${amountInWei} wei) to ${recipient}`);
    
    // Mint tokens
    const tx = await token.mint(recipient, amountInWei);
    console.log(`✅ Mint transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Mint transaction confirmed`);
    // Balance check after mint
    const recipientBalance = await token.balanceOf(recipient);
    const recipientBalanceFormatted = ethers.utils.formatEther(recipientBalance);
    console.log(`🔍 Balance of ${recipient} after mint: ${recipientBalanceFormatted} tokens`);
    
    console.log(`✅ Successfully minted ${amount} tokens to ${recipient}`);
    
    res.json({
      success: true,
      message: `Successfully minted ${amount} tokens to ${recipient}`,
      tokenAddress: tokenAddress,
      amount: amount,
      recipient: recipient,
      transactionHash: tx.hash,
      recipientBalance: recipientBalanceFormatted
    });
    
  } catch (error) {
    console.error('❌ Error minting tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Burn tokens
router.post('/burn', async (req, res) => {
  try {
    const { tokenAddress, amount, fromAddress } = req.body;
    console.log(`🎯 Burning ${amount} tokens from ${fromAddress} on token: ${tokenAddress}`);
    
    if (!tokenAddress || !amount || !fromAddress) {
      throw new Error('Token address, amount, and from address are required');
    }
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    
    console.log(`🔍 Using deployer address: ${deployerAddress}`);
    
    // Get the Token contract
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    console.log(`✅ Token contract instance created for ${tokenAddress}`);
    
    // Check if deployer is an agent
    const isAgent = await token.isAgent(deployerAddress);
    console.log(`🔍 Is deployer agent on token: ${isAgent}`);
    
    if (!isAgent) {
      throw new Error('Deployer is not an agent on this token');
    }
    
    // Convert amount to wei based on token decimals (using parseEther as per mint)
    const amountInWei = ethers.utils.parseEther(amount);
    
    console.log(`🔍 Burning ${ethers.utils.formatEther(amountInWei)} tokens (${amountInWei} wei) from ${fromAddress}`);
    
    // Burn tokens
    const tx = await token.burn(fromAddress, amountInWei);
    console.log(`✅ Burn transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Burn transaction confirmed`);
    // Balance check after burn
    const burnBalance = await token.balanceOf(fromAddress);
    const burnBalanceFormatted = ethers.utils.formatEther(burnBalance);
    console.log(`🔍 Balance of ${fromAddress} after burn: ${burnBalanceFormatted} tokens`);
    
    console.log(`✅ Successfully burned ${amount} tokens from ${fromAddress}`);
    
    res.json({
      success: true,
      message: `Successfully burned ${amount} tokens from ${fromAddress}`,
      tokenAddress: tokenAddress,
      amount: amount,
      fromAddress: fromAddress,
      transactionHash: tx.hash,
      fromAddressBalance: burnBalanceFormatted
    });
    
  } catch (error) {
    console.error('❌ Error burning tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Transfer tokens (from signer to recipient)
router.post('/transfer', async (req, res) => {
  try {
    const { tokenAddress, amount, toAddress } = req.body;
    console.log(`🎯 Transferring ${amount} tokens to ${toAddress} on token: ${tokenAddress}`);
    
    if (!tokenAddress || !amount || !toAddress) {
      throw new Error('Token address, amount, and to address are required');
    }
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    
    console.log(`🔍 Using deployer address: ${deployerAddress}`);
    
    // Get the Token contract
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    console.log(`🔍 Looking for Token artifacts at: ${tokenArtifactsPath}`);
    if (!fs.existsSync(tokenArtifactsPath)) {
      console.log(`❌ Token artifacts not found at: ${tokenArtifactsPath}`);
      throw new Error('Token artifacts not found. Please compile contracts first.');
    }
    console.log(`✅ Token artifacts found at: ${tokenArtifactsPath}`);
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    console.log(`✅ Token contract instance created for ${tokenAddress}`);
    
    // Convert amount to wei based on token decimals
    const amountInWei = amount;
    
    console.log(`🔍 Transferring ${ethers.utils.formatEther(amountInWei)} tokens (${amountInWei} wei) from ${deployerAddress} to ${toAddress}`);
    
    // Transfer tokens (from signer to recipient)
    const tx = await token.transfer(toAddress, amountInWei);
    console.log(`✅ Transfer transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Transfer transaction confirmed`);
    // Balance check after transfer
    const toBalance = await token.balanceOf(toAddress);
    const toBalanceFormatted = ethers.utils.formatEther(toBalance);
    console.log(`🔍 Balance of ${toAddress} after transfer: ${toBalanceFormatted} tokens`);
    
    console.log(`✅ Successfully transferred ${amount} tokens to ${toAddress}`);
    
    res.json({
      success: true,
      message: `Successfully transferred ${amount} tokens to ${toAddress}`,
      tokenAddress: tokenAddress,
      amount: amount,
      fromAddress: deployerAddress,
      toAddress: toAddress,
      transactionHash: tx.hash,
      toAddressBalance: toBalanceFormatted
    });
    
  } catch (error) {
    console.error('❌ Error transferring tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TransferFrom (admin/agent flow): forcedTransfer from source to agent, then transfer to destination
router.post('/transfer-from', async (req, res) => {
  try {
    const { tokenAddress, fromAddress, toAddress, amount } = req.body;
    console.log(`🎯 TransferFrom request: ${amount} tokens from ${fromAddress} to ${toAddress} on token: ${tokenAddress}`);
    
    if (!tokenAddress || !fromAddress || !toAddress || !amount) {
      return res.status(400).json({ success: false, error: 'tokenAddress, fromAddress, toAddress, and amount are required' });
    }
    
    const provider = createProvider();
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const agentAddress = await wallet.getAddress();
    console.log(`🔍 Agent address: ${agentAddress}`);
    
    const tokenArtifactsPath = path.join(__dirname, '../../trex-scaffold/packages/react-app/src/contracts/Token.json');
    if (!fs.existsSync(tokenArtifactsPath)) throw new Error('Token artifacts not found. Please compile contracts first.');
    const tokenArtifacts = JSON.parse(fs.readFileSync(tokenArtifactsPath, 'utf8'));
    const token = new ethers.Contract(tokenAddress, tokenArtifacts.abi, wallet);
    
    // Check if signer is an agent
    console.log(`🔍 Checking if ${agentAddress} is a token agent...`);
    const isAgent = await token.isAgent(agentAddress);
    console.log(`🔍 Is agent: ${isAgent}`);
    
    if (!isAgent) {
      throw new Error(`${agentAddress} is not a token agent. Add the agent to the token first.`);
    }
    
    // Get token decimals
    const amountBN = amount;
    
    // Check balances for all accounts
    const fromBalance = await token.balanceOf(fromAddress);
    const agentBalance = await token.balanceOf(agentAddress);
    const toBalance = await token.balanceOf(toAddress);
    
    console.log(`🔍 Balance check:`);
    console.log(`  From address (${fromAddress}): ${ethers.utils.formatEther(fromBalance)} tokens`);
    console.log(`  Agent (${agentAddress}): ${ethers.utils.formatEther(agentBalance)} tokens`);
    console.log(`  To address (${toAddress}): ${ethers.utils.formatEther(toBalance)} tokens`);
    console.log(`  Amount to transfer: ${ethers.utils.formatEther(amountBN)} tokens (${amountBN} wei)`);
    
    if (fromBalance.lt(amountBN)) {
      throw new Error(`Insufficient balance. Need ${amount} tokens, but ${fromAddress} only has ${ethers.utils.formatEther(fromBalance)}`);
    }
    
    console.log(`🔍 Step 1: forcedTransfer from ${fromAddress} to agent ${agentAddress}`);
    // Step 1: forcedTransfer from source to agent
    const tx1 = await token.forcedTransfer(fromAddress, agentAddress, amountBN);
    console.log(`✅ Step 1 transaction sent: ${tx1.hash}`);
    await tx1.wait();
    console.log(`✅ Step 1 transaction confirmed`);
    
    // After Step 1
    const fromBalanceAfterStep1 = await token.balanceOf(fromAddress);
    const agentBalanceAfterStep1 = await token.balanceOf(agentAddress);
    const fromBalanceAfterStep1Formatted = ethers.utils.formatEther(fromBalanceAfterStep1);
    const agentBalanceAfterStep1Formatted = ethers.utils.formatEther(agentBalanceAfterStep1);
    console.log(`🔍 Balance after Step 1:`);
    console.log(`  From address: ${fromBalanceAfterStep1Formatted} tokens`);
    console.log(`  Agent: ${agentBalanceAfterStep1Formatted} tokens`);

    // Step 2
    const tx2 = await token.transfer(toAddress, amountBN);
    console.log(`✅ Step 2 transaction sent: ${tx2.hash}`);
    await tx2.wait();
    console.log(`✅ Step 2 transaction confirmed`);
    // Balance check after transfer-from
    const toBalanceAfter = await token.balanceOf(toAddress);
    const toBalanceAfterFormatted = ethers.utils.formatEther(toBalanceAfter);
    console.log(`🔍 Balance of ${toAddress} after transfer-from: ${toBalanceAfterFormatted} tokens`);

    console.log(`✅ TransferFrom completed successfully`);
    res.json({ 
      success: true, 
      transactionHash1: tx1.hash, 
      transactionHash2: tx2.hash,
      message: `Successfully transferred ${ethers.utils.formatEther(amountBN)} tokens from ${fromAddress} to ${toAddress} via agent`,
      balances: {
        fromAddressAfterStep1: fromBalanceAfterStep1Formatted,
        agentAfterStep1: agentBalanceAfterStep1Formatted,
        toAddressAfterStep2: toBalanceAfterFormatted
      }
    });
  } catch (error) {
    console.error('❌ Error in transfer-from:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;