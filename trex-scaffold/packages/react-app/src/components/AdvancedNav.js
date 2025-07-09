import React from 'react';
import { Button } from './index';

const AdvancedNav = ({ advancedPhase, setAdvancedPhase, phaseComplete }) => {
  return (
    <div style={{ 
      display: "flex", 
      gap: "1rem", 
      marginBottom: "2rem",
      padding: "1rem",
      backgroundColor: "#f0f8ff",
      borderRadius: "8px",
      border: "1px solid #b3d9ff"
    }}>
      {[
        { id: "mainWalletSetup", label: "1. Main Wallet Setup" },
        { id: "components", label: "2. Deploy Components" },
        { id: "initialization", label: "3. Initialize Components" },
        { id: "agentManagement", label: "4. Agent Management" },
        { id: "claimTopics", label: "5. Claim Topics" },
        { id: "trustedIssuers", label: "6. Trusted Issuers" },
        { id: "claimIssuers", label: "7. ClaimIssuers" },
        { id: "users", label: "8. Manage Users" },
        { id: "token", label: "9. Deploy Token" },
        { id: "logs", label: "10. Logs" }
      ].map(phase => (
        <Button
          key={phase.id}
          onClick={() => setAdvancedPhase(phase.id)}
          style={{
            backgroundColor: advancedPhase === phase.id ? "#1a237e" : phaseComplete[phase.id] ? "#28a745" : "#6c757d",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem",
            position: "relative"
          }}
        >
          {phase.label}
          {phaseComplete[phase.id] && (
            <span style={{
              position: "absolute",
              right: 8,
              top: 8,
              fontSize: "1.2em",
              color: "#fff"
            }}>✅</span>
          )}
        </Button>
      ))}
    </div>
  );
};

export default AdvancedNav; 