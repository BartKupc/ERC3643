const express = require('express');
const router = express.Router();
const { createProvider, getContractArtifacts } = require('../utils/helpers');

let deployedAddresses = {};

// Get deployed addresses
router.get('/addresses', (req, res) => {
  res.json(deployedAddresses);
});

// Update deployed addresses
router.post('/addresses', (req, res) => {
  const { addresses } = req.body;
  deployedAddresses = { ...deployedAddresses, ...addresses };
  res.json({ success: true, addresses: deployedAddresses });
});

// Delete deployed addresses
router.delete('/addresses', (req, res) => {
  deployedAddresses = {};
  res.json({ success: true, addresses: deployedAddresses });
});

module.exports = router; 