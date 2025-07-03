import React from "react";
import { useEthers } from "@usedapp/core";
import { Body, Button, Container, Header } from "./components";
import Dashboard from "./Dashboard";

function WalletButton() {
  const { account, activateBrowserWallet, deactivate, error } = useEthers();

  React.useEffect(() => {
    if (error) {
      console.error("Error while connecting wallet:", error.message);
    }
  }, [error]);

  return (
    <Button
      onClick={() => {
        if (!account) {
          activateBrowserWallet();
        } else {
          deactivate();
        }
      }}
    >
      {!account ? "Connect Wallet" : `${account.slice(0, 6)}...${account.slice(-4)}`}
    </Button>
  );
}

function App() {
  const { account } = useEthers();

  return (
    <Container>
      <Header>
        <h1>T-REX Token Dashboard</h1>
        <WalletButton />
      </Header>
      <Body>
        {!account ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2>Welcome to T-REX Token Solution</h2>
            <p>Connect your wallet to access the dashboard</p>
          </div>
        ) : (
          <Dashboard />
        )}
      </Body>
    </Container>
  );
}

export default App;
