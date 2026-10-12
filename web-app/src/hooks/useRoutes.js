
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'https://riskroute-server2.onrender.com';

export const useRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/routes`);

      if (!response.ok) {
        throw new Error(
          `Failed to load saved routes. Server returned ${response.status}.`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('The routes API did not return a JSON array.');
      }

      const mappedRoutes = data.map((route) => ({
        ...route,
        id: route.id ?? route.route_id,
        origin_name:
          route.origin_name ??
          route.start_point?.name ??
          route.start_point?.label ??
          'Unknown Origin',
        destination_name:
          route.destination_name ??
          route.stops?.at?.(-1)?.name ??
          route.stops?.at?.(-1)?.label ??
          'Unknown Destination',
        distance_km:
          route.distance_km ??
          route.result?.distanceKm ??
          route.result?.distance_km ??
          0,
        duration_min:
          route.duration_min ??
          route.result?.durationMin ??
          route.result?.duration_min ??
          0,
      }));

      console.log('Saved routes loaded from Render:', mappedRoutes);

      setRoutes(mappedRoutes);
    } catch (err) {
      console.error('Error fetching saved routes:', err);
      setError(err.message || 'Unable to load saved routes.');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return {
    routes,
    loading,
    error,
    refetch: fetchRoutes,
  };
};
