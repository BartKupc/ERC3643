const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const { runDeploymentScript, getLatestDeployment } = require('../utils/helpers');

// Get factories
router.get('/', (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../../deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      return res.json([]);
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const factoryDeployments = deployments
      .filter(d => d.factory && d.factory.address)
      .map(d => ({
        deploymentId: d.deploymentId,
        address: d.factory.address,
        owner: d.factory.owner,
        timestamp: d.timestamp,
        network: d.network,
        deployer: d.deployer
      }));
    res.json(factoryDeployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route to verify mounting
router.get('/deployments/test', (req, res) => {
  console.log('🧪 Test route called');
  res.json({ message: 'Deployments route is working' });
});

// Get specific deployment by ID
router.get('/deployments/:deploymentId', (req, res) => {
  console.log('🔍 Deployment details requested for:', req.params.deploymentId);
  try {
    const { deploymentId } = req.params;
    const deploymentsPath = path.join(__dirname, '../../deployments.json');
    console.log('📁 Looking for deployments at:', deploymentsPath);
    if (!fs.existsSync(deploymentsPath)) {
      console.log('❌ Deployments file not found');
      return res.status(404).json({ error: 'No deployments found' });
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    console.log('📋 Found', deployments.length, 'deployments');
    const deployment = deployments.find(d => d.deploymentId === deploymentId);
    if (!deployment) {
      console.log('❌ Deployment not found:', deploymentId);
      return res.status(404).json({ error: 'Deployment not found' });
    }
    console.log('✅ Found deployment:', deploymentId);
    if (deployment.factory && deployment.tokens && deployment.tokens.length > 0) {
      const latestToken = deployment.tokens[deployment.tokens.length - 1];
      if (latestToken.suite) {
        deployment.suite = latestToken.suite;
      }
      deployment.latestToken = latestToken;
    }
    res.json(deployment);
  } catch (error) {
    console.log('❌ Error in deployment route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all deployments
router.get('/deployments', (req, res) => {
  try {
    const deploymentsPath = path.join(__dirname, '../../deployments.json');
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      res.json(deployments);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy Factory
router.post('/deploy/factory', async (req, res) => {
  try {
    const output = await runDeploymentScript('deploy_factory_enhanced.js');
    const latestDeployment = getLatestDeployment();
    if (!latestDeployment || !latestDeployment.factory) {
      throw new Error('Factory deployment failed - no deployment data found');
    }
    res.json({
      success: true,
      message: 'Factory deployed successfully',
      deployment: latestDeployment,
      factoryAddress: latestDeployment.factory.address
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, details: 'Factory deployment failed' });
  }
});

// Deploy Token
router.post('/deploy/token', async (req, res) => {
  // TODO: Move logic from deployment.js if not already moved
  res.json({ message: 'Deploy token endpoint (to be implemented)' });
});

// Deploy ClaimIssuer
router.post('/deploy/claim-issuer', async (req, res) => {
  // TODO: Move logic from deployment.js if not already moved
  res.json({ message: 'Deploy claim issuer endpoint (to be implemented)' });
});

// Save deployment
router.post('/save-deployment', (req, res) => {
  try {
    const { deployment } = req.body;
    if (!deployment) {
      return res.status(400).json({ error: 'Deployment data is required' });
    }
    const deploymentsPath = path.join(__dirname, '../deployments.json');
    let deployments = [];
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }
    deployments.push(deployment);
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    res.json({ success: true, deployment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 