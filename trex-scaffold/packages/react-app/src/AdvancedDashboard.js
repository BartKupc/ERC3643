import React, { useState, useEffect } from "react";
import { Button } from "./components";
import DeploymentPhase from "./components/phases/DeploymentPhase";

const AdvancedDashboard = ({ account, handleClearAddresses }) => {
  return (
    <div style={{ marginLeft: "250px", padding: "2rem" }}>
      <DeploymentPhase />
    </div>
  );
};

export default AdvancedDashboard;
