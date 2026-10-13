
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const numberFromRoute = (route, key) => {
  const value = Number(route?.[key]);
  return route?.[key] !== null &&
    route?.[key] !== undefined &&
    route?.[key] !== '' &&
    Number.isFinite(value)
    ? value
    : null;
};

const average = (values) => {
  const valid = values.filter((value) => value !== null);
  return valid.length
    ? valid.reduce((sum, value) => sum + value, 0) / valid.length
    : null;
};

export default function useAnalyticsKPIs() {
  const [metrics, setMetrics] = useState({
    simulations: 0,
    avgCurrentDuration: null,
    avgOptimizedDuration: null,
    avgRiskScore: null,
    reports: 0,
    panicAlerts: 0,
    drivers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');

    try {
      const [
        simulationsResult,
        reportsResult,
        alertsResult,
        driversResult,
      ] = await Promise.all([
        supabase
          .from('simulation_results')
          .select('current_route, optimal_route'),

        supabase
          .from('user_reports')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('panic_alerts')
          .select('id', { count: 'exact', head: true }),

        supabase
          .from('drivers')
          .select('driver_id', { count: 'exact', head: true }),
      ]);

      const results = [
        simulationsResult,
        reportsResult,
        alertsResult,
        driversResult,
      ];

      const failed = results.find((result) => result.error);
      if (failed) throw failed.error;

      const simulations = simulationsResult.data || [];

      const currentDurations = simulations.map((row) =>
        numberFromRoute(row.current_route, 'duration')
      );

      const optimizedDurations = simulations.map((row) =>
        numberFromRoute(row.optimal_route, 'duration')
      );

      const riskScores = simulations.map((row) =>
        numberFromRoute(row.current_route, 'riskScore')
      );

      setMetrics({
        simulations: simulations.length,
        avgCurrentDuration: average(currentDurations),
        avgOptimizedDuration: average(optimizedDurations),
        avgRiskScore: average(riskScores),
        reports: reportsResult.count || 0,
        panicAlerts: alertsResult.count || 0,
        drivers: driversResult.count || 0,
      });
    } catch (err) {
      console.error('Analytics KPI query failed:', err);
      setError(err.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('analytics-kpi-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'simulation_results' },
        refresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_reports' },
        refresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'panic_alerts' },
        refresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        refresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { metrics, loading, error, refresh };
}
