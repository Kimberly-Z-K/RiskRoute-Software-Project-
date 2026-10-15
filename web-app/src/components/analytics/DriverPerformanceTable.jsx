
import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const DriverPerformanceTable = () => {
  const [drivers, setDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDrivers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [driverResult, reportResult, panicResult] = await Promise.all([
        supabase
          .from('drivers')
          .select('driver_id, driver_username, email')
          .order('driver_username', { ascending: true }),

        supabase
          .from('user_reports')
          .select('driver_id, created_at, title, status'),

        supabase
          .from('panic_alerts')
          .select('driver_id, triggered_at, status'),
      ]);

      if (driverResult.error) throw driverResult.error;
      if (reportResult.error) throw reportResult.error;
      if (panicResult.error) throw panicResult.error;

      const reportsByDriver = new Map();
      const panicsByDriver = new Map();
      const latestActivityByDriver = new Map();

      (reportResult.data || []).forEach((report) => {
        if (!report.driver_id) return;

        const key = report.driver_id;
        reportsByDriver.set(key, (reportsByDriver.get(key) || 0) + 1);

        const previous = latestActivityByDriver.get(key);
        if (
          report.created_at &&
          (!previous || new Date(report.created_at) > new Date(previous))
        ) {
          latestActivityByDriver.set(key, report.created_at);
        }
      });

      (panicResult.data || []).forEach((alert) => {
        if (!alert.driver_id) return;

        const key = alert.driver_id;
        panicsByDriver.set(key, (panicsByDriver.get(key) || 0) + 1);

        const previous = latestActivityByDriver.get(key);
        if (
          alert.triggered_at &&
          (!previous || new Date(alert.triggered_at) > new Date(previous))
        ) {
          latestActivityByDriver.set(key, alert.triggered_at);
        }
      });

      const rows = (driverResult.data || []).map((driver) => ({
        id: driver.driver_id,
        name: driver.driver_username || driver.email || 'Unnamed driver',
        email: driver.email || '',
        reports: reportsByDriver.get(driver.driver_id) || 0,
        panicAlerts: panicsByDriver.get(driver.driver_id) || 0,
        latestActivity: latestActivityByDriver.get(driver.driver_id) || null,
      }));

      setDrivers(rows);
    } catch (err) {
      console.error('Failed to load driver activity:', err);
      setError(
        err.message ||
          'Unable to load driver data. Check your Supabase permissions and table names.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();

    const channel = supabase
      .channel('analytics-driver-activity')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_reports' },
        () => loadDrivers(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'panic_alerts' },
        () => loadDrivers(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => loadDrivers(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDrivers]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredDrivers = drivers
    .filter((driver) =>
      `${driver.name} ${driver.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let result = 0;

      if (sortBy === 'name') result = a.name.localeCompare(b.name);
      if (sortBy === 'reports') result = a.reports - b.reports;
      if (sortBy === 'panicAlerts') result = a.panicAlerts - b.panicAlerts;

      return sortOrder === 'asc' ? result : -result;
    });

  const formatDateTime = (date) => {
    if (!date) return 'No recorded activity';

    return new Date(date).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Driver Activity
          </h3>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-gray-100 rounded-md text-center">
              <p className="text-xs text-gray-500">Registered drivers</p>
              <p className="text-lg font-bold text-gray-900">{drivers.length}</p>
            </div>

            <button
              type="button"
              onClick={() => loadDrivers(true)}
              disabled={refreshing}
              aria-label="Refresh driver activity"
              className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search driver name or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Report and panic-alert totals are counts of records linked to each driver.
          They are not driver performance scores.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm">
          {error}
          <button
            type="button"
            onClick={() => loadDrivers(true)}
            className="ml-2 underline font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 font-semibold"
                >
                  Driver
                  {sortBy === 'name' &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </button>
              </th>

              <th className="text-center px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort('reports')}
                  className="inline-flex items-center gap-1 font-semibold"
                >
                  Reports
                  {sortBy === 'reports' &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </button>
              </th>

              <th className="text-center px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort('panicAlerts')}
                  className="inline-flex items-center gap-1 font-semibold"
                >
                  Panic alerts
                  {sortBy === 'panicAlerts' &&
                    (sortOrder === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </button>
              </th>

              <th className="text-left px-4 py-3">Latest recorded activity</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  {drivers.length === 0
                    ? 'No driver records are available.'
                    : 'No drivers match your search.'}
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.email || 'No email recorded'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {driver.reports}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        driver.panicAlerts > 0 ? 'text-red-700' : 'text-green-700'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {driver.panicAlerts}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {formatDateTime(driver.latestActivity)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex justify-between">
        <span>Showing {filteredDrivers.length} of {drivers.length} drivers</span>
      </div>
    </div>
  );
};

export default DriverPerformanceTable;
