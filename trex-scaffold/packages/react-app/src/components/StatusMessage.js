import React from 'react';

const StatusMessage = ({ message }) => {
  if (!message) return null;
  
  return (
    <div style={{
      padding: "1rem",
      marginBottom: "1.5rem",
      backgroundColor: /fail|error|not found/i.test(message) ? "#f8d7da" : "#d4edda",
      color: /fail|error|not found/i.test(message) ? "#721c24" : "#155724",
      border: `1px solid ${/fail|error|not found/i.test(message) ? "#f5c6cb" : "#c3e6cb"}`,
      borderRadius: "4px",
      fontWeight: 500
    }}>
      {message}
    </div>
  );
};

export default StatusMessage; 