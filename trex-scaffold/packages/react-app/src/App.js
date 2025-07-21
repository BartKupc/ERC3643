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
      {!account ? "Connect Wallet" : `${account.slice(0, 6)}...${account.slice(-4)}`}
    </Button>
  );
}

function App() {
  const [account, setAccount] = useState(null);

  // Check if MetaMask is installed
  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      // Check if we're authorized to access the user's wallet
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setAccount(account);
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0]);
      setAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  // Listen for account changes
  useEffect(() => {
    // Temporarily disabled to test input focus issue
    console.log('App useEffect disabled for testing');
    /*
    checkIfWalletIsConnected();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });
    }
    */
  }, []);

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
            <p>Connect your MetaMask wallet to access the dashboard</p>
          </div>
        ) : (
          <Dashboard account={account} />
        )}
      </Body>
    </Container>
  );
}

export default App;
