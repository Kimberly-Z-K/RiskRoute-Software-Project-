
import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Clock, ShieldAlert } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getMetric = (route, key) => toNumber(route?.[key]);

const average = (values) => {
  const valid = values.filter((value) => value !== null && value !== undefined);
  if (!valid.length) return null;

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const formatMinutes = (value) =>
  value === null ? '—' : `${value.toFixed(1)} min`;

const formatDate = (value) => {
  if (!value) return 'Unknown date';

  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const PerformanceCharts = () => {
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSimulations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const { data, error: queryError } = await supabase
        .from('simulation_results')
        .select('id, name, route_name, created_at, current_route, optimal_route')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setSimulations(data || []);
    } catch (err) {
      console.error('Failed to load route simulation analytics:', err);
      setError(err.message || 'Unable to load simulation analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSimulations();

    // Refresh when a new simulation is added or an existing one changes.
    const channel = supabase
      .channel('analytics-simulation-results')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'simulation_results' },
        () => loadSimulations(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentDurations = simulations
    .map((item) => getMetric(item.current_route, 'duration'))
    .filter((value) => value !== null);

  const optimizedDurations = simulations
    .map((item) => getMetric(item.optimal_route, 'duration'))
    .filter((value) => value !== null);

  const currentDelays = simulations
    .map((item) => getMetric(item.current_route, 'delay'))
    .filter((value) => value !== null);

  const currentRiskScores = simulations
    .map((item) => getMetric(item.current_route, 'riskScore'))
    .filter((value) => value !== null);

  const avgCurrentDuration = average(currentDurations);
  const avgOptimizedDuration = average(optimizedDurations);
  const avgDelay = average(currentDelays);
  const avgRisk = average(currentRiskScores);

  const timeSaved =
    avgCurrentDuration !== null && avgOptimizedDuration !== null
      ? avgCurrentDuration - avgOptimizedDuration
      : null;

  const reductionPercent =
    timeSaved !== null && avgCurrentDuration > 0
      ? (timeSaved / avgCurrentDuration) * 100
      : null;

  const recentSimulations = simulations.slice(0, 7);
  const maxDuration = Math.max(
    1,
    ...recentSimulations.flatMap((item) => [
      getMetric(item.current_route, 'duration') || 0,
      getMetric(item.optimal_route, 'duration') || 0,
    ])
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-sm text-gray-500">Loading route simulation analytics…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex justify-between items-center gap-3 mb-5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Route Simulation Analytics
        </h3>

        <button
          type="button"
          onClick={() => loadSimulations(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs border rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
          <button
            type="button"
            onClick={() => loadSimulations(true)}
            className="ml-2 underline font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Total simulations</p>
          <p className="text-2xl font-bold text-gray-900">{simulations.length}</p>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600">Avg. current duration</p>
          <p className="text-xl font-bold text-blue-800">
            {formatMinutes(average(currentDurations))}
          </p>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-600">Avg. optimized duration</p>
          <p className="text-xl font-bold text-green-800">
            {formatMinutes(average(optimizedDurations))}
          </p>
        </div>

        <div className="p-3 bg-orange-50 rounded-lg">
          <p className="text-xs text-gray-600">Avg. current delay</p>
          <p className="text-xl font-bold text-orange-800">
            {formatMinutes(average(currentDelays))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Estimated time difference</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {timeSaved === null ? '—' : `${timeSaved.toFixed(1)} min`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {reductionPercent === null
              ? 'Not enough duration data to compare.'
              : `${reductionPercent.toFixed(1)}% lower average simulated duration for optimized routes.`}
          </p>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm font-semibold">Avg. current-route risk score</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {avgRisk === null ? '—' : `${avgRisk.toFixed(1)} / 100`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on risk scores stored in the simulation records.
          </p>
        </div>
      </div>

      <div className="mb-5">
        <h4 className="font-semibold text-sm text-gray-900 mb-3">
          Latest simulations: current vs optimized duration
        </h4>

        {recentSimulations.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No route simulations have been recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {recentSimulations.map((item) => {
              const current = getMetric(item.current_route, 'duration');
              const optimized = getMetric(item.optimal_route, 'duration');

              return (
                <div key={item.id}>
                  <div className="flex justify-between gap-3 text-xs mb-2">
                    <span className="font-medium text-gray-700 truncate">
                      {item.route_name || item.name || 'Unnamed simulation'}
                    </span>
                    <span className="text-gray-500 shrink-0">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-xs text-gray-500">Current</span>
                      <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded"
                          style={{
                            width: `${current === null ? 0 : (current / maxDuration) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs text-gray-700">
                        {formatMinutes(current)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-20 text-xs text-gray-500">Optimized</span>
                      <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                        <div
                          className="bg-green-600 h-full rounded"
                          style={{
                            width: `${optimized === null ? 0 : (optimized / maxDuration) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs text-gray-700">
                        {formatMinutes(optimized)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 border-t pt-3">
        Source: Supabase simulation_results. These are simulated estimates, not verified
        real-world delivery outcomes.
        {avgDelay !== null && ` Average recorded current-route delay: ${avgDelay.toFixed(1)} minutes.`}
      </p>
    </div>
  );
};

export default PerformanceCharts;
