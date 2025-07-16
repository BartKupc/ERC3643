import { ethers } from 'ethers';

// Shared logging utilities for deployment phases
export const createLoggingUtils = (setLogs) => {
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return {
    addLog,
    clearLogs
  };
};

// Extract clean error message from verbose ethers.js errors
export const extractCleanError = (error) => {
  try {
    // Debug: Log the error structure to understand what we're working with
    console.log("Error structure:", JSON.stringify(error, null, 2));
    
    // First, check if this is a gas estimation error that might contain the real revert reason
    if (error.message && error.message.includes('cannot estimate gas')) {
      console.log("Detected gas estimation error, looking for revert reason...");
      
      // Check error.error.reason first (this is where the actual error is)
      if (error.error && error.error.reason) {
        console.log("Found error.error.reason:", error.error.reason);
        if (error.error.reason.includes('reverted with reason string')) {
          const match = error.error.reason.match(/reverted with reason string '([^']+)'/);
          if (match) {
            console.log("Found revert reason:", match[1]);
            return match[1]; // Return the clean error message
          }
        }
        return error.error.reason;
      }
      
      // Look for the encoded revert reason in error.error.error.data.data
      if (error.error && error.error.error && error.error.error.data && error.error.error.data.data) {
        try {
          // The revert reason is hex-encoded, starting with 0x08c379a0 (Error(string) selector)
          const hexData = error.error.error.data.data;
          console.log("Hex data:", hexData);
          
          // Remove the function selector (first 4 bytes = 8 hex chars)
          const revertData = hexData.slice(10); // Skip 0x08c379a0
          
          // Decode the string from the remaining hex data
          const decoded = ethers.utils.toUtf8String('0x' + revertData);
          console.log("Decoded revert reason:", decoded);
          
          if (decoded && decoded.length > 0) {
            return decoded;
          }
        } catch (e) {
          console.log("Failed to decode hex data:", e.message);
        }
      }
      
      // Also check the message field for revert reason in error.error.error.data.message
      if (error.error && error.error.error && error.error.error.data && error.error.error.data.message) {
        const dataMessage = error.error.error.data.message;
        console.log("Data message:", dataMessage);
        if (dataMessage.includes('reverted with reason string')) {
          const match = dataMessage.match(/reverted with reason string '([^']+)'/);
          if (match) {
            console.log("Found revert reason:", match[1]);
            return match[1]; // Return the clean error message
          }
        }
        // If no reason string found, return the data message
        return dataMessage;
      }
      
      // For gas estimation errors, provide a more helpful message
      return "Transaction would fail - check contract state and permissions";
    }
    
    // Try to extract the actual error message from the verbose error object
    if (error.error && error.error.data && error.error.data.message) {
      // Look for the actual revert reason in the data
      const dataMessage = error.error.data.message;
      if (dataMessage.includes('reverted with reason string')) {
        const match = dataMessage.match(/reverted with reason string '([^']+)'/);
        if (match) {
          return match[1]; // Return the clean error message
        }
      }
      return dataMessage;
    }
    
    // Fallback to error.reason if available
    if (error.reason) {
      return error.reason;
    }
    
    // Fallback to error.message
    if (error.message) {
      return error.message;
    }
    
    // Last resort: return the whole error as string
    return error.toString();
  } catch (e) {
    // If all else fails, return the original error message
    return error.message || error.toString();
  }
}; 