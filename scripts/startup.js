const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting T-REX Development Environment...\n');

// Function to kill existing processes
function killExistingProcesses() {
  return new Promise((resolve) => {
    console.log('🔪 Killing existing processes...');
    
    exec('pkill -f "node server.js" && pkill -f "nodemon" && pkill -f "react-scripts" 2>/dev/null || true', (error, stdout, stderr) => {
      console.log('✅ Existing processes cleared');
      resolve();
    });
  });
}

// Get the project root directory (where package.json is located)
const projectRoot = path.resolve(__dirname, '..');
console.log('📁 Project root:', projectRoot);

// Function to clear addresses.js
function clearAddresses() {
  console.log('📝 Clearing deployed addresses...');
  
  const addressesPath = path.join(projectRoot, 'trex-scaffold/packages/contracts/src/addresses.js');
  
  const defaultAddresses = `// T-REX Contract Addresses
// These will be populated after deployment
const addresses = {
  ceaErc20: "0xa6dF0C88916f3e2831A329CE46566dDfBe9E74b7",
  // T-REX Addresses (to be filled after deployment)
  TREXFactory: "0x0000000000000000000000000000000000000000",
  Token: "0x0000000000000000000000000000000000000000",
  ModularCompliance: "0x0000000000000000000000000000000000000000",
  IdentityRegistry: "0x0000000000000000000000000000000000000000",
  ClaimTopicsRegistry: "0x0000000000000000000000000000000000000000",
  TrustedIssuersRegistry: "0x0000000000000000000000000000000000000000",
};
export default addresses;
`;

  try {
    fs.writeFileSync(addressesPath, defaultAddresses);
    console.log('✅ Addresses cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing addresses:', error.message);
  }
}

// Function to start server
function startServer() {
  console.log('🔧 Starting backend server...');
  
  const serverProcess = spawn('npm', ['run', 'dev:server'], {
    cwd: path.join(projectRoot, 'trex-scaffold/packages/react-app'),
    stdio: 'pipe',
    shell: true
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.log(`[Server Error] ${data.toString().trim()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`[Server] Process exited with code ${code}`);
  });

  return serverProcess;
}

// Function to start frontend
function startFrontend() {
  console.log('🌐 Starting frontend...');
  
  // Wait a bit for server to start
  setTimeout(() => {
    const frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(projectRoot, 'trex-scaffold/packages/react-app'),
      stdio: 'pipe',
      shell: true
    });

    frontendProcess.stdout.on('data', (data) => {
      console.log(`[Frontend] ${data.toString().trim()}`);
    });

    frontendProcess.stderr.on('data', (data) => {
      console.log(`[Frontend Error] ${data.toString().trim()}`);
    });

    frontendProcess.on('close', (code) => {
      console.log(`[Frontend] Process exited with code ${code}`);
    });

    return frontendProcess;
  }, 3000); // Wait 3 seconds for server to start
}

// Function to handle graceful shutdown
function handleShutdown(serverProcess, frontendProcess) {
  const shutdown = () => {
    console.log('\n🛑 Shutting down T-REX Development Environment...');
    
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    
    if (frontendProcess) {
      frontendProcess.kill('SIGTERM');
    }
    
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Main execution
async function main() {
  try {
    // Step 1: Kill existing processes
    await killExistingProcesses();
    
    // Step 2: Clear addresses
    clearAddresses();
    
    // Step 3: Start server
    const serverProcess = startServer();
    
    // Step 4: Start frontend
    const frontendProcess = startFrontend();
    
    // Step 5: Setup graceful shutdown
    handleShutdown(serverProcess, frontendProcess);
    
    console.log('\n🎉 T-REX Development Environment is starting...');
    console.log('📊 Backend API: http://localhost:3001');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('📋 Health Check: http://localhost:3001/api/health');
    console.log('\nPress Ctrl+C to stop all services\n');
    
  } catch (error) {
    console.error('❌ Error starting development environment:', error.message);
    process.exit(1);
  }
}

// Run the startup script
main(); 