import { supabase } from '../components/supabaseClientforLogin';

export const simulationService = {
  // Save a simulation result
  async saveSimulation(simulationData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be logged in to save simulations');
      }

      const { data, error } = await supabase
        .from('simulation_results')
        .insert({
          user_id: user.id,
          simulation_id: simulationData.id,
          route_name: simulationData.routeName,
          route_id: simulationData.routeId || null,
          parameters: simulationData.params,
          current_route: simulationData.current,
          optimal_route: simulationData.optimal,
          alternatives: simulationData.alternatives || []
        })
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error saving simulation:', error);
      return { data: null, error };
    }
  },

  // Get all simulations for the current user
  async getUserSimulations() {
    try {
      const { data, error } = await supabase
        .from('simulation_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching simulations:', error);
      return { data: null, error };
    }
  },

  // Get a single simulation by ID
  async getSimulationById(id) {
    try {
      const { data, error } = await supabase
        .from('simulation_results')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching simulation:', error);
      return { data: null, error };
    }
  },

  // Update a simulation
  async updateSimulation(id, updates) {
    try {
      const { data, error } = await supabase
        .from('simulation_results')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error('Error updating simulation:', error);
      return { data: null, error };
    }
  },

  // Delete a simulation
  async deleteSimulation(id) {
    try {
      const { error } = await supabase
        .from('simulation_results')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error deleting simulation:', error);
      return { error };
    }
  }
};