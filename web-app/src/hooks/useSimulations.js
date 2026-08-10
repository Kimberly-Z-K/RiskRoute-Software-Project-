import { useState, useEffect, useCallback } from 'react';
import { simulationService } from '../services/simulationService';

export const useSimulations = () => {
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all simulations
  const loadSimulations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await simulationService.getUserSimulations();
      
      if (error) throw error;
      
      setSimulations(data || []);
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a simulation
  const saveSimulation = useCallback(async (simulationData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await simulationService.saveSimulation(simulationData);
      
      if (error) throw error;
      
      // Update local state
      setSimulations(prev => [data, ...prev]);
      
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a simulation
  const deleteSimulation = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await simulationService.deleteSimulation(id);
      
      if (error) throw error;
      
      // Update local state
      setSimulations(prev => prev.filter(sim => sim.id !== id));
      
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single simulation by ID
  const getSimulation = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await simulationService.getSimulationById(id);
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  return {
    simulations,
    loading,
    error,
    loadSimulations,
    saveSimulation,
    deleteSimulation,
    getSimulation
  };
};