import React, { useState } from 'react';
import DeployCoreContractsTab from './advanced/steps/DeployCoreContractsTab';
import InitializeContractsTab from './advanced/steps/InitializeContractsTab';
import ConfigureIdentityRegistryTab from './advanced/steps/ConfigureIdentityRegistryTab';
import AddClaimTopicsTab from './advanced/steps/AddClaimTopicsTab';
import UserManagementTab from './advanced/steps/UserManagementTab';
import TokenManagementTab from './advanced/steps/TokenManagementTab';
import { Button } from './shared/uiComponents';
import { createLoggingUtils } from './shared/loggingUtils';

const STORAGE_KEY = 'trex_deployment_state';

const DeploymentPhase = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [logs, setLogs] = useState([]);
  const { addLog, clearLogs } = createLoggingUtils(setLogs);

  // Minimal state for orchestrator
  const [deployedContracts, setDeployedContracts] = useState({});
  const [selectedContracts, setSelectedContracts] = useState({});

  // Steps definition
  const steps = [
    {
      id: 1,
      title: 'Deploy Core Contracts',
      content: (
        <DeployCoreContractsTab
          deployedContracts={deployedContracts}
          setDeployedContracts={setDeployedContracts}
          addLog={addLog}
        />
      )
    },
    {
      id: 2,
      title: 'Initialize Contracts',
      content: (
        <InitializeContractsTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          addLog={addLog}
        />
      )
    },
    {
      id: 3,
      title: 'Configure Identity Registry',
      content: (
        <ConfigureIdentityRegistryTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          addLog={addLog}
        />
      )
    },
    {
      id: 4,
      title: 'Add Claim Topics',
      content: (
        <AddClaimTopicsTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          addLog={addLog}
        />
      )
    },
    {
      id: 5,
      title: 'User Management',
      content: (
        <UserManagementTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          addLog={addLog}
        />
      )
    },
    {
      id: 6,
      title: 'Token Management',
      content: (
        <TokenManagementTab
          deployedContracts={deployedContracts}
          selectedContracts={selectedContracts}
          setSelectedContracts={setSelectedContracts}
          addLog={addLog}
        />
      )
    }
  ];

  return (
    <div style={{ backgroundColor: 'white', color: 'black' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: 'black' }}>T-REX Deployment</h2>
        <Button onClick={clearLogs} style={{ backgroundColor: '#ffc107', color: 'white' }}>
          Clear Logs
        </Button>
      </div>
      {/* Progress indicator */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: currentStep === step.id ? '#007bff' : '#f8f9fa',
                color: currentStep === step.id ? 'white' : 'black',
                marginRight: index < steps.length - 1 ? '0.5rem' : 0,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => setCurrentStep(step.id)}
            >
              <div style={{ fontWeight: 'bold' }}>Step {step.id}</div>
              <div style={{ fontSize: '0.9rem' }}>{step.title}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Current step content */}
      <div style={{ marginBottom: '2rem' }}>
        {steps.find(step => step.id === currentStep)?.content}
      </div>
      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          style={{ backgroundColor: '#6c757d', color: 'white' }}
        >
          Previous
        </Button>
        <Button
          onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
          disabled={currentStep === steps.length}
          style={{ backgroundColor: '#28a745', color: 'white' }}
        >
          Next
        </Button>
      </div>
      {/* Logs */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', maxHeight: '300px', overflow: 'auto' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: 'black' }}>Deployment Logs</h4>
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', fontSize: '0.9rem' }}>
            <span style={{ color: '#666' }}>[{log.timestamp}]</span>
            <span style={{ color: log.type === 'error' ? '#dc3545' : log.type === 'success' ? '#28a745' : '#007bff', marginLeft: '0.5rem' }}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeploymentPhase; 