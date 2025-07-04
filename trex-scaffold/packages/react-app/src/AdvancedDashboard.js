import React, { useState, useEffect } from "react";
import { Button, AdvancedNav, StatusMessage, ComponentsPhase, ClaimTopicsPhase, TrustedIssuersPhase, UsersPhase, TokenPhase, LogsPhase } from "./components";
import { useDeployedComponents } from "./hooks/useDeployedComponents";
import { useDeployedRegistries } from "./hooks/useDeployedRegistries";
import axios from "axios";

const AdvancedDashboard = ({ account, handleClearAddresses }) => {
  // Core state
  const [advancedPhase, setAdvancedPhase] = useState("components");
  const [phaseComplete, setPhaseComplete] = useState({ components: false, users: false, token: false, logs: false });
  
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
      const response = await axios.post('/api/claim-topics', { 
        topic: newClaimTopic, 
        registryAddress: selectedClaimTopicsRegistry,
        deployerAddress: account
      });
      setClaimTopics([...claimTopics, response.data.topic]);
      setNewClaimTopic("");
    } catch (e) { 
      if (e.response?.data?.error) {
        setMessage(e.response.data.error);
      } else {
        setMessage("Failed to add claim topic");
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
      const response = await axios.post('/api/trusted-issuers', { 
        address: newIssuer.address, 
        topics,
        registryAddress: selectedTrustedIssuersRegistry,
        deployerAddress: account
      });
      setTrustedIssuers([...trustedIssuers, response.data.issuer]);
      setNewIssuer({ address: "", topics: "" });
    } catch (e) { 
      if (e.response?.data?.error) {
        setMessage(e.response.data.error);
      } else {
        setMessage("Failed to add trusted issuer");
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

  return (
    <div style={{ padding: "2rem", marginLeft: "250px" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: "2rem" }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>Advanced Workflow</h2>
        <Button 
          onClick={handleClearAddresses}
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
      
      {advancedPhase === "users" && <UsersPhase />}
      {advancedPhase === "token" && <TokenPhase />}
      {advancedPhase === "logs" && <LogsPhase />}
    </div>
  );
};

export default AdvancedDashboard;
