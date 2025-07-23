import React, { useState, useEffect } from "react";
import { Button } from "./components";
import AdvancedPhase from "./components/phases/AdvancedPhase";

const AdvancedDashboard = ({ account, handleClearAddresses }) => {
  return (
    <div style={{ marginLeft: "250px", padding: "2rem" }}>
      <AdvancedPhase />
    </div>
  );
};

export default AdvancedDashboard;
