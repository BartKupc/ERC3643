import React, { useState, useEffect } from "react";
import { Button, AdvancedNav, StatusMessage, ComponentsPhase, ClaimTopicsPhase, TrustedIssuersPhase, UsersPhase, TokenPhase, LogsPhase } from "./components";
import InitializationPhase from "./components/phases/InitializationPhase";
import AgentManagementPhase from "./components/phases/AgentManagementPhase";
import MainWalletSetupPhase from "./components/phases/MainWalletSetupPhase";
import ClaimIssuerPhase from "./components/phases/ClaimIssuerPhase";
import { useDeployedComponents } from "./hooks/useDeployedComponents";
import { useDeployedRegistries } from "./hooks/useDeployedRegistries";
import axios from "axios";
import { ethers } from "ethers";

const AdvancedDashboard = ({ account, handleClearAddresses }) => {
  // Core state
  const [advancedPhase, setAdvancedPhase] = useState("mainWalletSetup");
  const [phaseComplete, setPhaseComplete] = useState({ mainWalletSetup: false, components: false, initialization: false, agentManagement: false, users: false, token: false, logs: false });
  const [mainWalletOnchainId, setMainWalletOnchainId] = useState(null);
  
  // Custom hooks for state management
  const {
    deployedComponents,
    deployingComponents,
    message,
    logs,
    deployComponent,
    addLog,
    setMessage
  } = useDeployedComponents(account);

  const {
    deployedRegistries,
    selectedClaimTopicsRegistry,
    selectedTrustedIssuersRegistry,
    setSelectedClaimTopicsRegistry,
    setSelectedTrustedIssuersRegistry,
    loadDeployedRegistries
  } = useDeployedRegistries(deployedComponents);

  // Claim Topics state
  const [claimTopics, setClaimTopics] = useState([]);
  const [newClaimTopic, setNewClaimTopic] = useState("");
  const [claimTopicsLoading, setClaimTopicsLoading] = useState(false);

  // Trusted Issuers state
  const [trustedIssuers, setTrustedIssuers] = useState([]);
  const [newIssuer, setNewIssuer] = useState({ address: "", topics: "" });
  const [trustedIssuersLoading, setTrustedIssuersLoading] = useState(false);

  // Update phase completion when all components are deployed
  useEffect(() => {
    const allDeployed = [
      'IdentityRegistry',
      'IdentityRegistryStorage',
      'ClaimTopicsRegistry',
      'TrustedIssuersRegistry',
      'ModularCompliance',
    ].every((c) => deployedComponents[c]);
    setPhaseComplete((prev) => ({ ...prev, components: allDeployed }));
  }, [deployedComponents]);

  // Update initialization phase completion (for now, we'll set it manually when user completes initialization)
  // This could be enhanced to check actual initialization status on contracts

  // Load registries when component mounts or when advanced phase changes (only initial load)
  useEffect(() => {
    if ((advancedPhase === "claimTopics" || advancedPhase === "trustedIssuers") && 
        deployedRegistries.claimTopicsRegistries.length === 0 && 
        deployedRegistries.trustedIssuersRegistries.length === 0) {
      loadDeployedRegistries();
    }
  }, [advancedPhase, deployedRegistries.claimTopicsRegistries.length, deployedRegistries.trustedIssuersRegistries.length, loadDeployedRegistries]);

  // Load claim topics when phase changes or registry is selected
  useEffect(() => {
    if (advancedPhase === "claimTopics" && selectedClaimTopicsRegistry) {
      setClaimTopicsLoading(true);
      axios.get(`/api/claim-topics?registryAddress=${selectedClaimTopicsRegistry}`)
        .then(res => setClaimTopics(res.data))
        .catch((error) => {
          console.error('Error loading claim topics:', error);
          setClaimTopics([]);
          setMessage(error.response?.data?.error || "Failed to load claim topics");
        })
        .finally(() => setClaimTopicsLoading(false));
    }
  }, [advancedPhase, selectedClaimTopicsRegistry, setMessage]);

  // Load trusted issuers when phase changes or registry is selected
  useEffect(() => {
    if (advancedPhase === "trustedIssuers" && selectedTrustedIssuersRegistry) {
      setTrustedIssuersLoading(true);
      axios.get(`/api/trusted-issuers?registryAddress=${selectedTrustedIssuersRegistry}`)
        .then(res => setTrustedIssuers(res.data))
        .catch((error) => {
          console.error('Error loading trusted issuers:', error);
          setTrustedIssuers([]);
          setMessage(error.response?.data?.error || "Failed to load trusted issuers");
        })
        .finally(() => setTrustedIssuersLoading(false));
    }
  }, [advancedPhase, selectedTrustedIssuersRegistry, setMessage]);

  // Claim Topics functions
  const addClaimTopic = async () => {
    if (!selectedClaimTopicsRegistry) {
      setMessage("Please select a Claim Topics Registry first");
      return;
    }
    setClaimTopicsLoading(true);
    try {
      // Step 1: Get transaction data from backend
      const response = await axios.post('/api/claim-topics', { 
        topic: newClaimTopic, 
        registryAddress: selectedClaimTopicsRegistry,
        deployerAddress: account
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to prepare claim topic addition");
      }
      
      // Step 2: Sign transaction with MetaMask
      const { transactionData } = response.data;
      
      // Request MetaMask to sign the transaction
      const signerAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signerAddress = signerAccounts[0];
      
      if (signerAddress.toLowerCase() !== transactionData.from.toLowerCase()) {
        setMessage(`Please sign with the contract owner address: ${transactionData.from}`);
        return;
      }
      
      // Send the transaction
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionData]
      });
      
      setMessage(`Claim topic addition transaction sent! Hash: ${tx}`);
      
      // Wait for transaction confirmation
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const receipt = await provider.waitForTransaction(tx);
      
      if (receipt.status === 1) {
        setMessage(`Claim topic added successfully! Transaction: ${tx}`);
        setClaimTopics([...claimTopics, response.data.topic]);
        setNewClaimTopic("");
      } else {
        setMessage(`Transaction failed! Hash: ${tx}`);
      }
    } catch (e) { 
      console.error('Error adding claim topic:', e);
      if (e.code === 4001) {
        setMessage("Transaction was rejected by user");
      } else if (e.code === -32603) {
        setMessage("Transaction failed on blockchain: " + (e.data?.message || e.message));
      } else if (e.response?.data?.error) {
        setMessage(e.response.data.error);
      } else if (e.message) {
        setMessage("Failed to add claim topic: " + e.message);
      } else {
        setMessage("Failed to add claim topic: Unknown error occurred");
      }
    }
    setClaimTopicsLoading(false);
  };

  const removeClaimTopic = async (topicId) => {
    if (!selectedClaimTopicsRegistry) {
      setMessage("Please select a Claim Topics Registry first");
      return;
    }
    setClaimTopicsLoading(true);
    try {
      await axios.delete(`/api/claim-topics/${topicId}?registryAddress=${selectedClaimTopicsRegistry}`);
      setClaimTopics(claimTopics.filter(t => t.id !== topicId));
    } catch (e) { 
      if (e.response?.data?.error) {
        setMessage(e.response.data.error);
      } else {
        setMessage("Failed to remove claim topic");
      }
    }
    setClaimTopicsLoading(false);
  };

  // Trusted Issuers functions
  const addTrustedIssuer = async () => {
    if (!selectedTrustedIssuersRegistry) {
      setMessage("Please select a Trusted Issuers Registry first");
      return;
    }
    setTrustedIssuersLoading(true);
    try {
      const topics = newIssuer.topics.split(",").map(t => Number(t.trim())).filter(Boolean);
      
      // Step 1: Get transaction data from backend
      const response = await axios.post('/api/trusted-issuers', { 
        address: newIssuer.address, 
        topics,
        registryAddress: selectedTrustedIssuersRegistry,
        deployerAddress: account
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to prepare trusted issuer addition");
      }
      
      // Step 2: Sign transaction with MetaMask
      const { transactionData } = response.data;
      
      // Request MetaMask to sign the transaction
      const signerAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signerAddress = signerAccounts[0];
      
      if (signerAddress.toLowerCase() !== transactionData.from.toLowerCase()) {
        setMessage(`Please sign with the contract owner address: ${transactionData.from}`);
        return;
      }
      
      // Send the transaction
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionData]
      });
      
      setMessage(`Trusted issuer addition transaction sent! Hash: ${tx}`);
      
      // Wait for transaction confirmation
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const receipt = await provider.waitForTransaction(tx);
      
      if (receipt.status === 1) {
        setMessage(`Trusted issuer added successfully! Transaction: ${tx}`);
        setTrustedIssuers([...trustedIssuers, response.data.issuer]);
        setNewIssuer({ address: "", topics: "" });
      } else {
        setMessage(`Transaction failed! Hash: ${tx}`);
      }
    } catch (e) { 
      console.error('Error adding trusted issuer:', e);
      if (e.code === 4001) {
        setMessage("Transaction was rejected by user");
      } else if (e.code === -32603) {
        setMessage("Transaction failed on blockchain: " + (e.data?.message || e.message));
      } else if (e.response?.data?.error) {
        setMessage(e.response.data.error);
      } else if (e.message) {
        setMessage("Failed to add trusted issuer: " + e.message);
      } else {
        setMessage("Failed to add trusted issuer: Unknown error occurred");
      }
    }
    setTrustedIssuersLoading(false);
  };

  const removeTrustedIssuer = async (address) => {
    if (!selectedTrustedIssuersRegistry) {
      setMessage("Please select a Trusted Issuers Registry first");
      return;
    }
    setTrustedIssuersLoading(true);
    try {
      await axios.delete(`/api/trusted-issuers/${address}?registryAddress=${selectedTrustedIssuersRegistry}`);
      setTrustedIssuers(trustedIssuers.filter(i => i.address !== address));
    } catch (e) { 
      if (e.response?.data?.error) {
        setMessage(e.response.data.error);
      } else {
        setMessage("Failed to remove trusted issuer");
      }
    }
    setTrustedIssuersLoading(false);
  };

  // Clear addresses function
  const handleClearAddressesLocal = async () => {
    if (window.confirm("Are you sure you want to clear all deployed addresses?")) {
      try {
        console.log('Clearing addresses...');
        const response = await axios.delete('/api/addresses');
        console.log('Clear addresses response:', response.data);
        
        // Clear local state
        setClaimTopics([]);
        setTrustedIssuers([]);
        setMainWalletOnchainId(null);
        setPhaseComplete({ mainWalletSetup: false, components: false, initialization: false, agentManagement: false, users: false, token: false, logs: false });
        
        // Clear localStorage
        localStorage.removeItem("trexDeployedComponents");
        
        setMessage(response.data.message || "Addresses cleared successfully!");
        
        // Reload the page to reset everything
        window.location.reload();
      } catch (error) {
        console.error('Error clearing addresses:', error);
        setMessage("Failed to clear addresses: " + (error.response?.data?.error || error.message));
      }
    }
  };

  return (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "2rem" }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>Advanced Workflow</h2>
        <Button 
          onClick={handleClearAddressesLocal}
          style={{ backgroundColor: "#dc3545", color: "white" }}
        >
          Clear All
        </Button>
      </div>
      
      <StatusMessage message={message} />
      <AdvancedNav 
        advancedPhase={advancedPhase} 
        setAdvancedPhase={setAdvancedPhase} 
        phaseComplete={phaseComplete} 
      />
      
      {advancedPhase === "mainWalletSetup" && (
        <MainWalletSetupPhase 
          account={account}
          onMainWalletSetupComplete={(onchainIdAddress) => {
            setMainWalletOnchainId(onchainIdAddress);
            setPhaseComplete(prev => ({ ...prev, mainWalletSetup: true }));
            setAdvancedPhase("components"); // Auto-advance to next phase
          }}
        />
      )}
      
      {advancedPhase === "components" && (
        <ComponentsPhase 
          deployedComponents={deployedComponents}
          deployingComponents={deployingComponents}
          deployComponent={deployComponent}
          addLog={addLog}
        />
      )}
      
      {advancedPhase === "claimTopics" && (
        <ClaimTopicsPhase
          selectedClaimTopicsRegistry={selectedClaimTopicsRegistry}
          setSelectedClaimTopicsRegistry={setSelectedClaimTopicsRegistry}
          deployedRegistries={deployedRegistries}
          newClaimTopic={newClaimTopic}
          setNewClaimTopic={setNewClaimTopic}
          claimTopics={claimTopics}
          claimTopicsLoading={claimTopicsLoading}
          addClaimTopic={addClaimTopic}
          removeClaimTopic={removeClaimTopic}
        />
      )}
      
      {advancedPhase === "trustedIssuers" && (
        <TrustedIssuersPhase
          selectedTrustedIssuersRegistry={selectedTrustedIssuersRegistry}
          setSelectedTrustedIssuersRegistry={setSelectedTrustedIssuersRegistry}
          deployedRegistries={deployedRegistries}
          newIssuer={newIssuer}
          setNewIssuer={setNewIssuer}
          trustedIssuers={trustedIssuers}
          trustedIssuersLoading={trustedIssuersLoading}
          addTrustedIssuer={addTrustedIssuer}
          removeTrustedIssuer={removeTrustedIssuer}
        />
      )}
      
      {advancedPhase === "claimIssuers" && (
        <ClaimIssuerPhase
          deployedComponents={deployedComponents}
          account={account}
        />
      )}
      
      {advancedPhase === "initialization" && (
        <>
          {console.log('🔍 AdvancedDashboard - deployedComponents:', deployedComponents)}
          <InitializationPhase 
            deployedComponents={deployedComponents} 
            account={account} 
            setMessage={setMessage}
            onComplete={() => setPhaseComplete(prev => ({ ...prev, initialization: true }))}
          />
        </>
      )}
      {advancedPhase === "agentManagement" && (
        <AgentManagementPhase
          deployedComponents={deployedComponents}
          setMessage={setMessage}
        />
      )}
      {advancedPhase === "users" && <UsersPhase deployedComponents={deployedComponents} />}
      {advancedPhase === "token" && <TokenPhase />}
      {advancedPhase === "logs" && <LogsPhase />}
    </div>
  );
};

export default AdvancedDashboard;
