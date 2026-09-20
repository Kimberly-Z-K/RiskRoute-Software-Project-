import React, { useEffect, useState } from 'react';
import { Shield, Search, RefreshCw, Eye, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const AdminAuditLog = ({ user }) => {

  console.log('🔍 AUDIT USER:', user);
  console.log('🔍 AUDIT USER ROLE:', user?.role);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState('');

  // =========================================================
  // ADMIN CHECK
  // =========================================================

  const userRole = user?.role?.toLowerCase() || '';

  const isAdmin =
    userRole === 'admin' ||
    userRole === 'administrator' ||
    userRole.startsWith('admin');

  console.log('🔍 IS ADMIN:', isAdmin);

  // =========================================================
  // GET PLATFORM
  // =========================================================

  const getPlatform = (log) => {

    const platform =
      log?.details?.platform ||
      (log?.url === null ? 'mobile' : 'web');

    return platform.toLowerCase();
  };

  // =========================================================
  // FETCH AUDIT LOGS
  // =========================================================

  const fetchAuditLogs = async () => {

    try {

      setLoading(true);
      setError('');

      console.log('🔍 FETCHING AUDIT LOGS...');

      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) {

        console.error(
          '❌ AUDIT FETCH ERROR:',
          fetchError
        );

        throw fetchError;
      }

      console.log(
        '✅ AUDIT LOGS RECEIVED:',
        data
      );

      console.log(
        '📊 NUMBER OF AUDIT LOGS:',
        data?.length || 0
      );

      // Make sure every record has a platform.
      const normalizedLogs = (data || []).map((log) => ({
        ...log,
        _platform: getPlatform(log),
      }));

      setLogs(normalizedLogs);

    } catch (err) {

      console.error(
        '❌ Failed to load audit logs:',
        err
      );

      setError(
        'Unable to load the system audit log.'
      );

    } finally {

      setLoading(false);
    }
  };

  // =========================================================
  // LOAD + REALTIME
  // =========================================================

  useEffect(() => {

    console.log(
      '🔍 ADMIN CHECK:',
      isAdmin
    );

    if (!isAdmin) {

      console.log(
        '⚠️ AUDIT LOG BLOCKED — USER IS NOT ADMIN'
      );

      setLoading(false);

      return;
    }

    console.log(
      '✅ USER IS ADMIN — LOADING AUDIT LOGS'
    );

    fetchAuditLogs();

    const channel = supabase
      .channel('admin-audit-log')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {

          console.log(
            '🔔 NEW AUDIT EVENT:',
            payload.new
          );

          const newLog = {
            ...payload.new,
            _platform: getPlatform(payload.new),
          };

          setLogs((previousLogs) => {

            const alreadyExists =
              previousLogs.some(
                (log) =>
                  log.id === payload.new.id
              );

            if (alreadyExists) {
              return previousLogs;
            }

            return [
              newLog,
              ...previousLogs,
            ].slice(0, 200);

          });
        }
      )
      .subscribe((status) => {

        console.log(
          '📡 AUDIT REALTIME:',
          status
        );

      });

    return () => {

      supabase.removeChannel(channel);

    };

  }, [isAdmin]);

  // =========================================================
  // ADMIN VISIBILITY
  // =========================================================

  if (!isAdmin) {
    return null;
  }

  // =========================================================
  // FILTER LOGS
  // =========================================================

  const filteredLogs = logs.filter((log) => {

    // -----------------------------
    // ACTION FILTER
    // -----------------------------

    const matchesAction =
      actionFilter === 'ALL' ||
      log.action === actionFilter;

    // -----------------------------
    // PLATFORM FILTER
    // -----------------------------

    const platform =
      log._platform ||
      getPlatform(log);

    const matchesPlatform =
      platformFilter === 'ALL' ||
      platform === platformFilter.toLowerCase();

    // -----------------------------
    // SEARCH
    // -----------------------------

    const searchText =
      search.toLowerCase().trim();

    const matchesSearch =
      !search ||
      log.user_name
        ?.toLowerCase()
        .includes(searchText) ||
      log.user_email
        ?.toLowerCase()
        .includes(searchText) ||
      log.action
        ?.toLowerCase()
        .includes(searchText) ||
      log.description
        ?.toLowerCase()
        .includes(searchText) ||
      log.page
        ?.toLowerCase()
        .includes(searchText) ||
      log.target_name
        ?.toLowerCase()
        .includes(searchText) ||
      platform
        ?.toLowerCase()
        .includes(searchText);

    return (
      matchesAction &&
      matchesPlatform &&
      matchesSearch
    );
  });

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {

    if (!date) {
      return 'Unknown';
    }

    return new Date(date).toLocaleString(
      'en-ZA',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    );
  };

  // =========================================================
  // ACTION LIST
  // =========================================================

  const actions = [
    ...new Set(
      logs
        .map((log) => log.action)
        .filter(Boolean)
    ),
  ];

  // =========================================================
  // PLATFORM COUNTS
  // =========================================================

  const mobileCount = logs.filter(
    (log) => getPlatform(log) === 'mobile'
  ).length;

  const webCount = logs.filter(
    (log) => getPlatform(log) === 'web'
  ).length;

  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="p-6 border-b border-gray-200 dark:border-gray-700">

        <div className="flex items-start justify-between gap-4">

          <div>

            <div className="flex items-center gap-2">

              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">

                <Shield className="w-5 h-5" />

              </div>

              <div>

                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  System Audit Log
                </h2>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Administrator view of RiskRoute activity.
                </p>

              </div>

            </div>

          </div>

          <button
            onClick={fetchAuditLogs}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Refresh audit log"
          >

            <RefreshCw className="w-4 h-4 text-gray-500" />

          </button>

        </div>

        {/* =================================================
            PLATFORM SUMMARY
        ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">

            <p className="text-xs text-gray-500">
              All Activity
            </p>

            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {logs.length}
            </p>

          </div>

          <div className="rounded-lg border border-green-200 dark:border-gray-700 p-3">

            <p className="text-xs text-gray-500">
              Mobile Activity
            </p>

            <p className="text-xl font-semibold text-green-600">
              {mobileCount}
            </p>

          </div>

          <div className="rounded-lg border border-purple-200 dark:border-gray-700 p-3">

            <p className="text-xs text-gray-500">
              Web Activity
            </p>

            <p className="text-xl font-semibold text-purple-600">
              {webCount}
            </p>

          </div>

        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="mt-5 flex flex-col md:flex-row gap-3">

          {/* SEARCH */}

          <div className="relative flex-1">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search user, action, page or activity..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* PLATFORM FILTER */}

          <select
            value={platformFilter}
            onChange={(event) =>
              setPlatformFilter(event.target.value)
            }
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          >

            <option value="ALL">
              All Platforms
            </option>

            <option value="WEB">
              Web Only
            </option>

            <option value="MOBILE">
              Mobile Only
            </option>

          </select>

          {/* ACTION FILTER */}

          <select
            value={actionFilter}
            onChange={(event) =>
              setActionFilter(event.target.value)
            }
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          >

            <option value="ALL">
              All Actions
            </option>

            {actions.map((action) => (

              <option
                key={action}
                value={action}
              >
                {action.replace(/_/g, ' ')}
              </option>

            ))}

          </select>

        </div>

      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="p-6">

        {loading && (

          <div className="flex justify-center py-10">

            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />

          </div>

        )}

        {!loading && error && (

          <div className="p-4 rounded-lg bg-red-50 text-red-700">

            {error}

          </div>

        )}

        {!loading &&
          !error &&
          filteredLogs.length === 0 && (

            <div className="text-center py-10">

              <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />

              <p className="font-medium text-gray-700 dark:text-gray-300">
                No audit records found.
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Try changing the platform or action filter.
              </p>

            </div>

          )}

        {!loading &&
          !error &&
          filteredLogs.length > 0 && (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">

                    <th className="pb-3 pr-4 font-semibold text-gray-500">
                      Date
                    </th>

                    <th className="pb-3 pr-4 font-semibold text-gray-500">
                      User
                    </th>

                    <th className="pb-3 pr-4 font-semibold text-gray-500">
                      Action
                    </th>

                    <th className="pb-3 pr-4 font-semibold text-gray-500">
                      Page
                    </th>

                    <th className="pb-3 pr-4 font-semibold text-gray-500">
                      Platform
                    </th>

                    <th className="pb-3 font-semibold text-gray-500">
                      Details
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredLogs.map((log) => {

                    const platform =
                      log._platform ||
                      getPlatform(log);

                    return (

                      <tr
                        key={log.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      >

                        {/* DATE */}

                        <td className="py-4 pr-4 text-gray-500 whitespace-nowrap">

                          {formatDate(
                            log.created_at ||
                            log.details?.timestamp
                          )}

                        </td>

                        {/* USER */}

                        <td className="py-4 pr-4">

                          <p className="font-medium text-gray-900 dark:text-white">

                            {log.user_name || log.user_email || '—'}

                          </p>

                          <p className="text-xs text-gray-500">

                            {log.user_role ||
                              'User'}

                          </p>

                          <p className="text-xs text-gray-400">

                            {log.user_email || ''}

                          </p>

                        </td>

                        {/* ACTION */}

                        <td className="py-4 pr-4">

                          <span className="inline-flex px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">

                            {log.action?.replace(
                              /_/g,
                              ' '
                            )}

                          </span>

                        </td>

                        {/* PAGE */}

                        <td className="py-4 pr-4 text-gray-600 dark:text-gray-400">

                          {log.page || '-'}

                        </td>

                        {/* PLATFORM */}

                        <td className="py-4 pr-4">

                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              platform === 'mobile'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >

                            {platform === 'mobile'
                              ? '📱 Mobile'
                              : '🖥️ Web'}

                          </span>

                        </td>

                        {/* DETAILS */}

                        <td className="py-4">

                          <button
                            onClick={() =>
                              setSelectedLog(log)
                            }
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                          >

                            <Eye className="w-4 h-4" />

                            View

                          </button>

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

          )}

      </div>

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selectedLog && (

        <AuditDetailsModal
          log={selectedLog}
          onClose={() =>
            setSelectedLog(null)
          }
        />

      )}

    </div>
  );
};


/* =========================================================
   AUDIT DETAILS MODAL
========================================================= */

const AuditDetailsModal = ({
  log,
  onClose
}) => {

  const formatDate = (date) => {

    if (!date) {
      return 'Unknown';
    }

    return new Date(date).toLocaleString(
      'en-ZA',
      {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }
    );
  };

  const platform =
    log?.details?.platform ||
    (log?.url === null
      ? 'mobile'
      : 'web');

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* HEADER */}

        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">

          <div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Audit Event Details
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Detailed information about this system event.
            </p>

          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >

            <X className="w-5 h-5 text-gray-500" />

          </button>

        </div>

        {/* DETAILS */}

        <div className="p-6 space-y-5">

          <Detail
            label="User"
            value={log.user_name}
          />

          <Detail
            label="Email"
            value={log.user_email}
          />

          <Detail
            label="Role"
            value={log.user_role}
          />

          <Detail
            label="Action"
            value={log.action?.replace(
              /_/g,
              ' '
            )}
          />

          <Detail
            label="Page"
            value={log.page}
          />

          <Detail
            label="Platform"
            value={
              platform === 'mobile'
                ? '📱 Mobile App'
                : '🖥️ Web Application'
            }
          />

          <Detail
            label="Date"
            value={formatDate(
              log.created_at ||
              log.details?.timestamp
            )}
          />

          <Detail
            label="Target"
            value={log.target_name}
          />

          <Detail
            label="Before"
            value={log.before_value}
          />

          <Detail
            label="After"
            value={log.after_value}
          />

          {/* DESCRIPTION */}

          <div>

            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
              Description
            </p>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">

              {log.description ||
                'No description available.'}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};


/* =========================================================
   DETAIL COMPONENT
========================================================= */

const Detail = ({
  label,
  value
}) => {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  return (

    <div>

      <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
        {label}
      </p>

      <p className="text-sm text-gray-900 dark:text-white">
        {String(value)}
      </p>

    </div>

  );
};


export default AdminAuditLog;