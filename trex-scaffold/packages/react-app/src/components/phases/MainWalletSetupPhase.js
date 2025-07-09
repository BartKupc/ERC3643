import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const MainWalletSetupPhase = ({ account, onMainWalletSetupComplete }) => {
  const [mainWalletOnchainId, setMainWalletOnchainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);

  // Check if main wallet OnchainID already exists
  useEffect(() => {
    if (account) {
      checkMainWalletOnchainId();
    }
  }, [account]);

  const checkMainWalletOnchainId = async () => {
    try {
      const response = await axios.get(`/api/main-wallet/onchainid?walletAddress=${account}`);
      if (response.data.success && response.data.exists) {
        setMainWalletOnchainId(response.data.onchainIdAddress);
        setSetupComplete(true);
        setMessage("✅ Main wallet OnchainID already exists");
        if (onMainWalletSetupComplete) {
          onMainWalletSetupComplete(response.data.onchainIdAddress);
        }
      }
    } catch (error) {
      console.error('Error checking main wallet OnchainID:', error);
    }
  };

  const createMainWalletOnchainId = async () => {
    if (!account) {
      setMessage("Please connect your MetaMask wallet first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Step 1: Get main wallet OnchainID deployment data
      const response = await axios.post('/api/main-wallet/onchainid', {
        walletAddress: account
      });

      if (!response.data.success) {
        setMessage("Failed to prepare main wallet OnchainID deployment: " + response.data.error);
        return;
      }

      if (response.data.alreadyExists) {
        setMainWalletOnchainId(response.data.onchainIdAddress);
        setSetupComplete(true);
        setMessage("✅ Main wallet OnchainID already exists");
        if (onMainWalletSetupComplete) {
          onMainWalletSetupComplete(response.data.onchainIdAddress);
        }
        return;
      }

      // Step 2: Deploy main wallet OnchainID
      setMessage("Deploying main wallet OnchainID...");
      
      const { transactionData, from, gas, gasPrice } = response.data.onchainIdDeployment;
      
      // Verify we're signing with the correct wallet
      if (!account || typeof account !== 'string' || !from || typeof from !== 'string') {
        setMessage("Invalid wallet addresses detected");
        return;
      }
      
      if (account.toLowerCase() !== from.toLowerCase()) {
        setMessage(`Please sign with the correct wallet address: ${from}`);
        return;
      }

      // Deploy OnchainID using gas limits from backend
      console.log('Deploying OnchainID with params:', {
        data: transactionData,
        from: account,
        gas: gas,
        gasPrice: gasPrice
      });
      
      // First, try to estimate gas to see if the transaction would succeed
      let actualGas = gas;
      try {
        const gasEstimate = await window.ethereum.request({
          method: 'eth_estimateGas',
          params: [{
            data: transactionData,
            from: account
          }]
        });
        console.log('Gas estimate:', gasEstimate);
        // Use the estimated gas if it's higher than our limit
        const estimatedGasInt = parseInt(gasEstimate, 16);
        const providedGasInt = parseInt(gas, 16);
        if (estimatedGasInt > providedGasInt) {
          console.log(`Using estimated gas (${estimatedGasInt}) instead of provided gas (${providedGasInt})`);
          actualGas = gasEstimate;
        }
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);
        // Continue with the provided gas limit
        console.log('Using provided gas limit:', gas);
      }
      
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          data: transactionData,
          from: account,
          gas: actualGas, // Use estimated gas if available, otherwise use provided gas
          gasPrice: gasPrice // Use gas price from backend
        }]
      });

      console.log('Main wallet OnchainID deployment transaction sent:', tx);
      setMessage(`Main wallet OnchainID deployment transaction sent! Hash: ${tx}`);

      // Wait for deployment confirmation
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const receipt = await provider.waitForTransaction(tx);

      if (receipt.status === 1) {
        const onchainIdAddress = receipt.contractAddress;
        setMessage(`✅ Main wallet OnchainID deployed successfully at: ${onchainIdAddress}`);

        // Notify backend about successful deployment
        await axios.post('/api/main-wallet/onchainid/notify-deployed', {
          walletAddress: account,
          onchainIdAddress: onchainIdAddress
        });

        setMainWalletOnchainId(onchainIdAddress);
        setSetupComplete(true);
        
        if (onMainWalletSetupComplete) {
          onMainWalletSetupComplete(onchainIdAddress);
        }
      } else {
        setMessage(`❌ Main wallet OnchainID deployment failed! Hash: ${tx}`);
      }

    } catch (error) {
      console.error('Error creating main wallet OnchainID:', error);
      let errorMessage = "Failed to create main wallet OnchainID: ";
      
      if (error.code === 4001) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.code === -32603) {
        console.error('Internal JSON-RPC error details:', error);
        if (error.data) {
          errorMessage += error.data.message || error.message;
        } else {
          errorMessage += "Internal JSON-RPC error - check console for details";
        }
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Unknown error occurred";
      }
      
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="phase-container" style={{ padding: "2rem", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
        <h2 style={{ color: '#1a237e', marginBottom: "1rem" }}>🔑 Main Wallet Setup</h2>
        <p>Please connect your MetaMask wallet to continue.</p>
      </div>
    );
  }

  return (
    <div className="phase-container" style={{ padding: "2rem", backgroundColor: "#f0f8ff", borderRadius: "8px", border: "1px solid #b3d9ff" }}>
      <h2 style={{ color: '#1a237e', marginBottom: "1rem" }}>🔑 Main Wallet Setup</h2>
      <p style={{ marginBottom: "2rem", color: '#333' }}>
        This phase sets up your main wallet's OnchainID for management purposes. This OnchainID will be used 
        for administrative functions and can manage other user OnchainIDs.
      </p>
      
      <div className="wallet-info" style={{ 
        backgroundColor: "#fff", 
        padding: "1.5rem", 
        borderRadius: "6px", 
        border: "1px solid #ddd",
        marginBottom: "2rem"
      }}>
        <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Connected Wallet</h3>
        <p style={{ marginBottom: "0.5rem", color: '#333' }}><strong>Address:</strong> <span style={{ fontFamily: "monospace", color: '#666' }}>{account}</span></p>
        {mainWalletOnchainId && (
          <p style={{ marginBottom: "0.5rem", color: '#333' }}><strong>Main OnchainID:</strong> <span style={{ fontFamily: "monospace", color: '#666' }}>{mainWalletOnchainId}</span></p>
        )}
      </div>

      {!setupComplete ? (
        <div className="setup-section" style={{ 
          backgroundColor: "#fff", 
          padding: "1.5rem", 
          borderRadius: "6px", 
          border: "1px solid #ddd"
        }}>
          <h3 style={{ color: '#1a237e', marginBottom: "1rem" }}>Create Main Wallet OnchainID</h3>
          <p style={{ marginBottom: "1.5rem", color: '#333' }}>
            Your main wallet needs an OnchainID for management purposes. This OnchainID will be used 
            for administrative functions and can manage other user OnchainIDs.
          </p>
          
          <button 
            onClick={createMainWalletOnchainId} 
            disabled={loading}
            style={{
              backgroundColor: loading ? "#6c757d" : "#1a237e",
              color: "white",
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "bold"
            }}
          >
            {loading ? "Deploying..." : "Create Main Wallet OnchainID"}
          </button>
        </div>
      ) : (
        <div className="setup-complete" style={{ 
          backgroundColor: "#d4edda", 
          padding: "1.5rem", 
          borderRadius: "6px", 
          border: "1px solid #c3e6cb",
          color: "#155724"
        }}>
          <h3 style={{ marginBottom: "1rem" }}>✅ Setup Complete</h3>
          <p style={{ marginBottom: "0.5rem" }}>Your main wallet OnchainID has been created successfully!</p>
          <p>You can now proceed to create users and their individual OnchainIDs.</p>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default MainWalletSetupPhase; 