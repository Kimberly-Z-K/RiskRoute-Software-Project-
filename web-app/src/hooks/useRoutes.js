// src/hooks/useRoutes.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export const useRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('optimized_routes')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        console.log('Routes loaded from Supabase:', data);
        setRoutes(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching optimized routes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  return { routes, loading, error, refetch: fetchRoutes };
};