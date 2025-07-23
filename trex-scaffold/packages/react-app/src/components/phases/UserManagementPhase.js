import React, { useState } from 'react';
import UserManagementTab from './advanced/steps/UserManagementTab';
import { Button } from './shared';
import { createLoggingUtils } from './shared/loggingUtils';

const UserManagementPhase = ({ deployedContracts = {}, selectedContracts = {}, setSelectedContracts = () => {} }) => {
  const [logs, setLogs] = useState([]);
  const { addLog, clearLogs } = createLoggingUtils(setLogs);

  // Minimal state for orchestrator
  const [userIdentities, setUserIdentities] = useState([]);

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
      <h2>User Management Phase</h2>
      <p>Create and manage user identities with OnchainID</p>
      <Button onClick={clearLogs} style={{ backgroundColor: '#ffc107', color: 'white', marginBottom: '1rem' }}>
        Clear Logs
      </Button>
      <UserManagementTab
        deployedContracts={deployedContracts}
        selectedContracts={selectedContracts}
        setSelectedContracts={setSelectedContracts}
        userIdentities={userIdentities}
        setUserIdentities={setUserIdentities}
        addLog={addLog}
      />
      {/* Logs */}
      <div style={{ marginTop: '20px' }}>
        <h4>Logs:</h4>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          backgroundColor: '#f8f9fa', 
          padding: '10px', 
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: '5px',
              color: log.type === 'error' ? '#dc3545' : 
                     log.type === 'success' ? '#28a745' : 
                     log.type === 'warning' ? '#ffc107' : '#6c757d'
            }}>
              [{log.timestamp}] {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagementPhase; 