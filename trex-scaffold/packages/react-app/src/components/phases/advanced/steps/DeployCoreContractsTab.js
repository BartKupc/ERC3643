import React from 'react';
import { Button } from '../../shared';

const DeployCoreContractsTab = ({
  deploying,
  deployContract
}) => (
  <div>
    <h3>Step 1: Deploy Core Contracts</h3>
    <p>Deploy the essential T-REX contracts in the correct order.</p>
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <Button
        onClick={() => deployContract('ClaimTopicsRegistry')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Deploy ClaimTopicsRegistry
      </Button>
      <Button
        onClick={() => deployContract('TrustedIssuersRegistry')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Deploy TrustedIssuersRegistry
      </Button>
      <Button
        onClick={() => deployContract('IdentityRegistryStorage')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Deploy IdentityRegistryStorage
      </Button>
      <Button
        onClick={() => deployContract('IdentityRegistry')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Deploy IdentityRegistry
      </Button>
      <Button
        onClick={() => deployContract('ModularCompliance')}
        disabled={deploying}
        style={{ backgroundColor: '#007bff', color: 'white' }}
      >
        Deploy ModularCompliance
      </Button>
    </div>
  </div>
);

export default DeployCoreContractsTab; 