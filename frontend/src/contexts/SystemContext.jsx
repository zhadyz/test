import React, { createContext, useContext, useState, useEffect } from 'react';

const SystemContext = createContext();

export { SystemContext };

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};

export const SystemProvider = ({ children }) => {
  const [currentSystem, setCurrentSystem] = useState(null);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [selectedBaseline, setSelectedBaseline] = useState('Moderate');

  // Load systems and set default system on mount
  useEffect(() => {
    fetchSystems();
  }, []);

  // Load cached system selection on mount
  useEffect(() => {
    const cachedSystemId = localStorage.getItem('selectedSystemId');
    if (cachedSystemId && systems.length > 0) {
      const cachedSystem = systems.find(s => s.system_id === cachedSystemId);
      if (cachedSystem) {
        setCurrentSystem(cachedSystem);
      } else if (systems.length > 0) {
        // If cached system doesn't exist, select first available
        setCurrentSystem(systems[0]);
        localStorage.setItem('selectedSystemId', systems[0].system_id);
      }
    } else if (systems.length > 0 && !currentSystem) {
      // No cached system, select first available
      setCurrentSystem(systems[0]);
      localStorage.setItem('selectedSystemId', systems[0].system_id);
    }
  }, [systems, currentSystem]);

  const fetchSystems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/systems');
      const data = await response.json();
      if (data.success) {
        setSystems(data.data);
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectSystem = (system) => {
    setCurrentSystem(system);
    localStorage.setItem('selectedSystemId', system.system_id);
  };

  const refreshSystems = async () => {
    await fetchSystems();
  };

  const createSystem = async (systemData) => {
    try {
      const response = await fetch('/api/systems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemData),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchSystems();
        // Auto-select the newly created system
        setCurrentSystem(data.data);
        localStorage.setItem('selectedSystemId', data.data.system_id);
        return data.data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error creating system:', error);
      throw error;
    }
  };

  const updateSystem = async (systemId, systemData) => {
    try {
      const response = await fetch(`/api/systems/${systemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemData),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchSystems();
        // Update current system if it was the one being edited
        if (currentSystem && currentSystem.system_id === systemId) {
          setCurrentSystem(data.data);
        }
        return data.data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error updating system:', error);
      throw error;
    }
  };

  const deleteSystem = async (systemId) => {
    try {
      const response = await fetch(`/api/systems/${systemId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchSystems();
        // If the deleted system was selected, clear selection
        if (currentSystem && currentSystem.system_id === systemId) {
          setCurrentSystem(null);
          localStorage.removeItem('selectedSystemId');
        }
        return true;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error deleting system:', error);
      throw error;
    }
  };

  const value = {
    currentSystem,
    systems,
    loading,
    selectSystem,
    refreshSystems,
    createSystem,
    updateSystem,
    deleteSystem,
    hasSystem: !!currentSystem,
    systemId: currentSystem?.system_id || null,
    systemName: currentSystem?.name || null,
    selectedSystem,
    setSelectedSystem,
    selectedBaseline,
    setSelectedBaseline
  };

  return (
    <SystemContext.Provider value={value}>
      {children}
    </SystemContext.Provider>
  );
}; 