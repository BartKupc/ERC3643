import React from 'react';

const TabNavigation = ({ activeTab, setActiveTab }) => (
  <div style={{ 
    display: 'flex', 
    borderBottom: '2px solid #e0e0e0', 
    marginBottom: '2rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px 8px 0 0',
    flexWrap: 'wrap'
  }}>
    <button
      onClick={() => setActiveTab('factory')}
      style={{
        flex: '1 1 16%',
        padding: '1rem 0.5rem',
        border: 'none',
        backgroundColor: activeTab === 'factory' ? '#1a237e' : 'transparent',
        color: activeTab === 'factory' ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: activeTab === 'factory' ? 'bold' : 'normal',
        borderRadius: activeTab === 'factory' ? '8px 8px 0 0' : '0',
        minWidth: '100px'
      }}
    >
      🏭 Factory
    </button>
    <button
      onClick={() => setActiveTab('token')}
      style={{
        flex: '1 1 16%',
        padding: '1rem 0.5rem',
        border: 'none',
        backgroundColor: activeTab === 'token' ? '#1a237e' : 'transparent',
        color: activeTab === 'token' ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: activeTab === 'token' ? 'bold' : 'normal',
        borderRadius: activeTab === 'token' ? '8px 8px 0 0' : '0',
        minWidth: '100px'
      }}
    >
      🎯 Token
    </button>
    <button
      onClick={() => setActiveTab('claims')}
      style={{
        flex: '1 1 16%',
        padding: '1rem 0.5rem',
        border: 'none',
        backgroundColor: activeTab === 'claims' ? '#1a237e' : 'transparent',
        color: activeTab === 'claims' ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: activeTab === 'claims' ? 'bold' : 'normal',
        borderRadius: activeTab === 'claims' ? '8px 8px 0 0' : '0',
        minWidth: '100px'
      }}
    >
      🏷️ Claims
    </button>
    <button
      onClick={() => setActiveTab('issuers')}
      style={{
        flex: '1 1 16%',
        padding: '1rem 0.5rem',
        border: 'none',
        backgroundColor: activeTab === 'issuers' ? '#1a237e' : 'transparent',
        color: activeTab === 'issuers' ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: activeTab === 'issuers' ? 'bold' : 'normal',
        borderRadius: activeTab === 'issuers' ? '8px 8px 0 0' : '0',
        minWidth: '100px'
      }}
    >
      🔐 Issuers
    </button>
    <button
      onClick={() => setActiveTab('agents')}
      style={{
        flex: '1 1 16%',
        padding: '1rem 0.5rem',
        border: 'none',
        backgroundColor: activeTab === 'agents' ? '#1a237e' : 'transparent',
        color: activeTab === 'agents' ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: activeTab === 'agents' ? 'bold' : 'normal',
        borderRadius: activeTab === 'agents' ? '8px 8px 0 0' : '0',
        minWidth: '100px'
      }}
    >
      👮 Agents
    </button>
    <button
      onClick={() => setActiveTab('users')}
      style={{
        flex: '1 1 14%',
        padding: '1rem 0.5rem',
        border: 'none',
        backgroundColor: activeTab === 'users' ? '#1a237e' : 'transparent',
        color: activeTab === 'users' ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: activeTab === 'users' ? 'bold' : 'normal',
        borderRadius: activeTab === 'users' ? '8px 8px 0 0' : '0',
        minWidth: '100px'
      }}
    >
      👥 Users
    </button>
    <button
      onClick={() => setActiveTab('operations')}
      style={{
        flex: '1 1 14%',
        padding: '1rem 0.5rem',
        border: 'none',
        backgroundColor: activeTab === 'operations' ? '#1a237e' : 'transparent',
        color: activeTab === 'operations' ? 'white' : '#666',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: activeTab === 'operations' ? 'bold' : 'normal',
        borderRadius: activeTab === 'operations' ? '8px 8px 0 0' : '0',
        minWidth: '100px'
      }}
    >
      💰 Operations
    </button>
  </div>
);

export default TabNavigation; 