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
  const backendProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, '../backend'),
    stdio: 'inherit',
    shell: true,
  });
  return backendProcess;
}

// Function to start frontend
function startFrontend() {
  console.log('🌐 Starting frontend...');
  const frontendProcess = spawn('npm', ['start'], {
    cwd: path.join(__dirname, '../trex-scaffold/packages/react-app'),
    stdio: 'inherit',
    shell: true
  });
  return frontendProcess;
}

// Function to handle graceful shutdown
function handleShutdown(serverProcess, frontendProcess) {
  const shutdown = () => {
    console.log('\n🛑 Shutting down T-REX Development Environment...');
    if (serverProcess) serverProcess.kill('SIGTERM');
    if (frontendProcess) frontendProcess.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Main execution
async function main() {
  try {
    await killExistingProcesses();
    clearAddresses();

    // Start backend and wait a bit for it to initialize
    const serverProcess = startServer();
    setTimeout(() => {
      const frontendProcess = startFrontend();
      handleShutdown(serverProcess, frontendProcess);
    }, 3000);

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

main(); 