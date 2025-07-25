import React, { useState } from 'react';
import axios from 'axios';

const AgentManagementTab = ({ deployedContracts = {}, selectedContracts = {}, setSelectedContracts = () => {}, addLog = () => {} }) => {
  const [agentAddress, setAgentAddress] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [irAgentStatus, setIrAgentStatus] = useState(null);
  const [irsAgentStatus, setIrsAgentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Clear message when component mounts or when key props change
  React.useEffect(() => {
    setMessage('');
  }, [deployedContracts, selectedContracts]);

  // Helper to get the current admin address (from backend wallet)
  const fetchAdminAddress = async () => {
    try {
      const res = await axios.get('/api/diagnostics/health');
      setAdminAddress(res.data.backendWallet);
      setAgentAddress(res.data.backendWallet); // Default to backend wallet, but allow editing
    } catch (e) {
      setMessage('Could not fetch backend wallet address');
    }
  };

  React.useEffect(() => {
    fetchAdminAddress();
  }, []);

  // Check agent status for IR and IRS
  const checkAgentStatus = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (!selectedContracts.IdentityRegistry || !selectedContracts.IdentityRegistryStorage) {
        setMessage('Please select both Identity Registry and Identity Registry Storage');
        setLoading(false);
        return;
      }
      // Check IR
      const irRes = await axios.post('/api/contracts/interaction', {
        action: 'call',
        contractName: 'IdentityRegistry',
        contractAddress: selectedContracts.IdentityRegistry,
        method: 'isAgent',
        params: [agentAddress]
      });
      setIrAgentStatus(irRes.data.result);
      // Check IRS
      const irsRes = await axios.post('/api/contracts/interaction', {
        action: 'call',
        contractName: 'IdentityRegistryStorage',
        contractAddress: selectedContracts.IdentityRegistryStorage,
        method: 'isAgent',
        params: [agentAddress]
      });
      setIrsAgentStatus(irsRes.data.result);
      setMessage('Checked agent status.');
    } catch (e) {
      setMessage('Error checking agent status: ' + (e.response?.data?.error || e.message));
    }
    setLoading(false);
  };

  // Add agent to both IR and IRS
  const handleAddAgentToBoth = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (!selectedContracts.IdentityRegistry || !selectedContracts.IdentityRegistryStorage) {
        setMessage('Please select both Identity Registry and Identity Registry Storage');
        setLoading(false);
        return;
      }
      // Add to IR if not already
      if (!irAgentStatus) {
        await axios.post('/api/contracts/interaction', {
          action: 'send',
          contractName: 'IdentityRegistry',
          contractAddress: selectedContracts.IdentityRegistry,
          method: 'addAgent',
          params: [agentAddress]
        });
        addLog('Agent added to Identity Registry', 'success');
      }
      // Add to IRS if not already
      if (!irsAgentStatus) {
        await axios.post('/api/contracts/interaction', {
          action: 'send',
          contractName: 'IdentityRegistryStorage',
          contractAddress: selectedContracts.IdentityRegistryStorage,
          method: 'addAgent',
          params: [agentAddress]
        });
        addLog('Agent added to Identity Registry Storage', 'success');
      }
      setMessage('Agent added to both contracts (if not already present).');
      // Re-check status
      await checkAgentStatus();
    } catch (e) {
      setMessage('Error adding agent: ' + (e.response?.data?.error || e.message));
    }
    setLoading(false);
  };

  // Contract selector UI
  const ContractSelector = ({ contractType, contracts, selectedAddress, onSelect, title, description }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontWeight: 'bold', color: '#333' }}>{title}</label>
      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>{description}</div>
      <select
        value={selectedAddress || ''}
        onChange={e => onSelect(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }}
      >
        <option value=''>-- Select {contractType} --</option>
        {(contracts[contractType] || []).map((address, idx) => (
          <option key={address} value={address}>
            {idx === 0 ? 'Latest' : `#${idx + 1}`}: {address.slice(0, 8)}...{address.slice(-6)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 20px' }}>
      <h3 style={{ color: '#1a237e', marginBottom: '1rem' }}>Agent Management</h3>
      <p>Add any address as an agent to both Identity Registry and Identity Registry Storage.</p>
      <div style={{ marginBottom: '1rem', background: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196f3', padding: '1rem' }}>
        <strong>Backend Wallet (default):</strong> <span style={{ fontFamily: 'monospace' }}>{adminAddress}</span>
        <div style={{ marginTop: '0.5rem' }}>
          <label>Agent Address to Add/Check:</label>
          <input
            type="text"
            value={agentAddress}
            onChange={e => setAgentAddress(e.target.value)}
            placeholder="0x..."
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da', marginTop: '0.25rem' }}
          />
        </div>
      </div>
      <ContractSelector
        contractType="IdentityRegistry"
        contracts={deployedContracts}
        selectedAddress={selectedContracts.IdentityRegistry}
        onSelect={address => setSelectedContracts(prev => ({ ...prev, IdentityRegistry: address }))}
        title="Identity Registry"
        description="Select which Identity Registry to add agent to"
      />
      <ContractSelector
        contractType="IdentityRegistryStorage"
        contracts={deployedContracts}
        selectedAddress={selectedContracts.IdentityRegistryStorage}
        onSelect={address => setSelectedContracts(prev => ({ ...prev, IdentityRegistryStorage: address }))}
        title="Identity Registry Storage"
        description="Select which Identity Registry Storage to add agent to"
      />
      <button
        onClick={checkAgentStatus}
        disabled={loading || !selectedContracts.IdentityRegistry || !selectedContracts.IdentityRegistryStorage}
        style={{ backgroundColor: '#007bff', color: 'white', padding: '0.5rem 1.5rem', border: 'none', borderRadius: '4px', marginRight: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? 'Checking...' : 'Check Agent Status'}
      </button>
      <button
        onClick={handleAddAgentToBoth}
        disabled={loading || !selectedContracts.IdentityRegistry || !selectedContracts.IdentityRegistryStorage}
        style={{ backgroundColor: '#28a745', color: 'white', padding: '0.5rem 1.5rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? 'Adding...' : 'Add Agent to Both'}
      </button>
      {message && <div style={{ marginTop: '1rem', color: message.includes('Error') ? '#721c24' : '#155724', backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${message.includes('Error') ? '#f5c6cb' : '#c3e6cb'}` }}>{message}</div>}
      <div style={{ marginTop: '1.5rem' }}>
        <strong>Current Agent Status:</strong>
        <ul>
          <li>Identity Registry: {irAgentStatus === null ? 'Not checked' : irAgentStatus ? <span style={{ color: '#28a745' }}>✓ Agent</span> : <span style={{ color: '#dc3545' }}>Not Agent</span>}</li>
          <li>Identity Registry Storage: {irsAgentStatus === null ? 'Not checked' : irsAgentStatus ? <span style={{ color: '#28a745' }}>✓ Agent</span> : <span style={{ color: '#dc3545' }}>Not Agent</span>}</li>
        </ul>
      </div>
    </div>
  );
};

export default AgentManagementTab; 