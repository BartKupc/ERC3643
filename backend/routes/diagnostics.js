const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const fetch = require('node-fetch');
const { createProvider, getContractArtifacts } = require('../utils/helpers');

// Health check
router.get('/health', (req, res) => {
  const provider = createProvider();
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  res.json({ 
    status: 'OK', 
    message: 'T-REX API Server is running',
    backendWallet: wallet.address
  });
});

// Test network connection
router.get('/test-network', async (req, res) => {
  try {
    const provider = createProvider();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    res.json({ 
      success: true, 
      network: network.name, 
      chainId: network.chainId,
      blockNumber: blockNumber.toString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Network connection failed'
    });
  }
});

// Hardhat interaction
router.post('/hardhat-interaction', async (req, res) => {
  try {
    const { action, contractName, contractAddress, method, params, value, privateKey } = req.body;
    const provider = createProvider();
    const wallet = new ethers.Wallet(privateKey || process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
    const deployerAddress = await wallet.getAddress();
    let result = {};
    switch (action) {
      case 'deploy':
        if (!contractName) throw new Error('Contract name is required for deployment');
        const artifacts = getContractArtifacts(contractName);
        const contractFactory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);
        const contract = await contractFactory.deploy(...(params || []));
        await contract.deployed();
        result = {
          success: true,
          action: 'deploy',
          contractName,
          contractAddress: contract.address,
          deployerAddress,
          transactionHash: contract.deployTransaction.hash
        };
        break;
      case 'call':
        if (!contractAddress || !method) throw new Error('Contract address and method are required for contract calls');
        const callArtifacts = getContractArtifacts(contractName);
        const callContract = new ethers.Contract(contractAddress, callArtifacts.abi, wallet);
        const callResult = await callContract[method](...(params || []));
        result = {
          success: true,
          action: 'call',
          contractAddress,
          method,
          result: callResult
        };
        break;
      case 'send':
        if (!contractAddress || !method) throw new Error('Contract address and method are required for contract transactions');
        const sendArtifacts = getContractArtifacts(contractName);
        const sendContract = new ethers.Contract(contractAddress, sendArtifacts.abi, wallet);
        const txOptions = {};
        if (value) txOptions.value = ethers.utils.parseEther(value);
        const tx = await sendContract[method](...(params || []), txOptions);
        await tx.wait();
        result = {
          success: true,
          action: 'send',
          contractAddress,
          method,
          transactionHash: tx.hash
        };
        break;
      case 'rpc':
        if (!method) throw new Error('Method is required for RPC calls');
        const rpcResponse = await fetch('http://13.250.2.49:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method, params: params || [], id: Date.now() })
        });
        const rpcData = await rpcResponse.json();
        if (rpcData.error) throw new Error(rpcData.error.message || 'RPC error');
        result = {
          success: true,
          action: 'rpc',
          method,
          result: rpcData.result
        };
        break;
      default:
        throw new Error(`Unknown action: ${action}. Supported actions: deploy, call, send, rpc`);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hardhat proxy
router.post('/hardhat', async (req, res) => {
  try {
    const { method, params, id } = req.body;
    const response = await fetch('http://13.250.2.49:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params: params || [], id: id || 1 })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message },
      id: req.body.id || 1
    });
  }
});

module.exports = router; 