const { exec } = require('child_process');

console.log('🛑 Stopping T-REX Development Environment...\n');

// Function to kill processes by pattern
function killProcesses(pattern, description) {
  return new Promise((resolve) => {
    console.log(`🔪 Killing ${description}...`);
    
    exec(`pkill -f "${pattern}"`, (error, stdout, stderr) => {
      if (error) {
        // pkill returns error if no processes found, which is fine
        console.log(`✅ No ${description} running`);
      } else {
        console.log(`✅ Killed ${description}`);
      }
      resolve();
    });
  });
}

// Function to kill processes by port
function killProcessesByPort(port, description) {
  return new Promise((resolve) => {
    console.log(`🔪 Killing processes on port ${port} (${description})...`);
    
    exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, (error, stdout, stderr) => {
      if (error) {
        console.log(`✅ No processes on port ${port}`);
      } else {
        console.log(`✅ Killed processes on port ${port}`);
      }
      resolve();
    });
  });
}

// Main execution
async function main() {
  try {
    // Kill all T-REX related processes
    await killProcesses('node server.js', 'backend server');
    await killProcesses('nodemon', 'nodemon processes');
    await killProcesses('react-scripts', 'React development server');
    await killProcesses('startup.js', 'startup script');
    
    // Kill processes on specific ports
    await killProcessesByPort(3000, 'frontend');
    await killProcessesByPort(3001, 'backend');
    
    console.log('\n✅ T-REX Development Environment stopped successfully!');
    console.log('🚀 Run "npm run dev" to start again');
    
  } catch (error) {
    console.error('❌ Error stopping development environment:', error.message);
    process.exit(1);
  }
}

// Run the stop script
main(); 