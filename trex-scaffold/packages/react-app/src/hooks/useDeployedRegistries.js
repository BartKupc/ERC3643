import { useState, useEffect } from 'react';
import axios from 'axios';

export const useDeployedRegistries = (deployedComponents) => {
  const [deployedRegistries, setDeployedRegistries] = useState({
    claimTopicsRegistries: [],
    trustedIssuersRegistries: []
  });
  const [selectedClaimTopicsRegistry, setSelectedClaimTopicsRegistry] = useState("");
  const [selectedTrustedIssuersRegistry, setSelectedTrustedIssuersRegistry] = useState("");

  // Track deployed registries for selection (updated to handle numbered versions)
  useEffect(() => {
    const claimTopicsRegistries = [];
    const trustedIssuersRegistries = [];
    
    // Check for multiple deployed registries (including numbered versions)
    Object.entries(deployedComponents).forEach(([name, address]) => {
      // Handle ClaimTopicsRegistry and ClaimTopicsRegistry_2, ClaimTopicsRegistry_3, etc.
      if ((name === "ClaimTopicsRegistry" || name.match(/^ClaimTopicsRegistry_\d+$/)) && address) {
        const displayName = name === "ClaimTopicsRegistry" ? "ClaimTopicsRegistry" : name;
        claimTopicsRegistries.push({ name: displayName, address });
      }
      // Handle TrustedIssuersRegistry and TrustedIssuersRegistry_2, TrustedIssuersRegistry_3, etc.
      if ((name === "TrustedIssuersRegistry" || name.match(/^TrustedIssuersRegistry_\d+$/)) && address) {
        const displayName = name === "TrustedIssuersRegistry" ? "TrustedIssuersRegistry" : name;
        trustedIssuersRegistries.push({ name: displayName, address });
      }
    });
    
    // Sort registries by name for consistent ordering
    claimTopicsRegistries.sort((a, b) => a.name.localeCompare(b.name));
    trustedIssuersRegistries.sort((a, b) => a.name.localeCompare(b.name));
    
    setDeployedRegistries({ claimTopicsRegistries, trustedIssuersRegistries });
    
    // Auto-select first registry if none selected
    if (claimTopicsRegistries.length > 0 && !selectedClaimTopicsRegistry) {
      setSelectedClaimTopicsRegistry(claimTopicsRegistries[0].address);
    }
    if (trustedIssuersRegistries.length > 0 && !selectedTrustedIssuersRegistry) {
      setSelectedTrustedIssuersRegistry(trustedIssuersRegistries[0].address);
    }
  }, [deployedComponents, selectedClaimTopicsRegistry, selectedTrustedIssuersRegistry]);

  // Load deployed registries from backend (only for initial load, not for switching)
  const loadDeployedRegistries = async () => {
    try {
      const response = await axios.get('/api/registries');
      // Only set registries if we don't already have them from frontend
      if (deployedRegistries.claimTopicsRegistries.length === 0 && 
          deployedRegistries.trustedIssuersRegistries.length === 0) {
        setDeployedRegistries(response.data);
      }
      
      // Auto-select first registry if none selected
      if (response.data.claimTopicsRegistries.length > 0 && !selectedClaimTopicsRegistry) {
        setSelectedClaimTopicsRegistry(response.data.claimTopicsRegistries[0].address);
      }
      if (response.data.trustedIssuersRegistries.length > 0 && !selectedTrustedIssuersRegistry) {
        setSelectedTrustedIssuersRegistry(response.data.trustedIssuersRegistries[0].address);
      }
    } catch (error) {
      console.error('Error loading deployed registries:', error);
    }
  };

  return {
    deployedRegistries,
    selectedClaimTopicsRegistry,
    selectedTrustedIssuersRegistry,
    setSelectedClaimTopicsRegistry,
    setSelectedTrustedIssuersRegistry,
    loadDeployedRegistries
  };
}; 