import React, { useState } from "react";
import { Container } from "./components";
import AdvancedDashboard from "./AdvancedDashboard";
import EasyDeployPhase from "./components/phases/EasyDeployPhase";

const Dashboard = ({ account }) => {
  const [activeMode, setActiveMode] = useState("easy"); // "easy" or "advanced"

  // Sidebar Component
  const Sidebar = () => (
    <div style={{
      width: "250px",
      backgroundColor: "#1a237e",
      color: "white",
      height: "100vh",
      padding: "2rem 0",
      position: "fixed",
      left: 0,
      top: 0
    }}>
      <div style={{ padding: "0 1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>T-REX Admin</h2>
      </div>
      <div style={{ padding: "0 1.5rem" }}>
        <div
          onClick={() => setActiveMode("easy")}
          style={{
            padding: "1rem",
            marginBottom: "0.5rem",
            cursor: "pointer",
            backgroundColor: activeMode === "easy" ? "#3949ab" : "transparent",
            borderRadius: "8px",
            transition: "background-color 0.2s"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Easy Deploy</h3>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", opacity: 0.8 }}>
            Quick factory and token deployment
          </p>
        </div>
        <div
          onClick={() => setActiveMode("advanced")}
          style={{
            padding: "1rem",
            cursor: "pointer",
            backgroundColor: activeMode === "advanced" ? "#3949ab" : "transparent",
            borderRadius: "8px",
            transition: "background-color 0.2s"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Advanced</h3>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", opacity: 0.8 }}>
            Component-first deployment workflow
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#f4f8fb", minHeight: "100vh", width: "100vw" }}>
      <Sidebar />
      <div style={{ marginLeft: "250px", minHeight: "100vh" }}>
        {activeMode === "easy" ? (
          <EasyDeployPhase />
        ) : (
          <AdvancedDashboard account={account} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;