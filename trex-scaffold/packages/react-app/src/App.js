import React, { useState, useEffect } from "react";
import { Body, Button, Container, Header } from "./components";
import Dashboard from "./Dashboard";

function WalletButton({ account, onConnect, onDisconnect }) {
  return (
    <Button
      onClick={() => {
        if (!account) {
          onConnect();
        } else {
          onDisconnect();
        }
      }}
    >
      {!account ? "Connect Local Account" : `${account.slice(0, 6)}...${account.slice(-4)}`}
    </Button>
  );
}

function App() {
  const [account, setAccount] = useState(null);

  // Clear any existing connection on mount
  useEffect(() => {
    setAccount(null);
  }, []);

  const connectWallet = async () => {
    try {
      // For now, use a mock account since we're using Hardhat local accounts
      // In a real implementation, you would connect to Hardhat's local network
      setAccount('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'); // Hardhat account 0
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  return (
    <Container>
      <Header>
        <h1>T-REX Token Dashboard</h1>
        <WalletButton 
          account={account} 
          onConnect={connectWallet} 
          onDisconnect={disconnectWallet} 
        />
      </Header>
      <Body>
        {!account ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2>Welcome to T-REX Token Solution</h2>
            <p>Connect to local Hardhat account to access the dashboard</p>
          </div>
        ) : (
          <Dashboard account={account} />
        )}
      </Body>
    </Container>
  );
}

export default App;
