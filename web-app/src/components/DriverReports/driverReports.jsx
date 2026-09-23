import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Coffee,
  MessageSquare,
  Search,
  Truck,
  Utensils,
  X,
} from 'lucide-react';

import { supabase } from '../../../lib/supabase';

import DriverReportCard from './driverReportCard';
import CallDriverModal from './callDriverModal';

// =========================================================
// HELPER FUNCTIONS
// =========================================================

const getReportType = (report) => {
  const category = (report.category || '').toLowerCase();

  if (['rest', 'resting'].includes(category)) {
    return 'rest';
  }

  if (category === 'lunch') {
    return 'lunch';
  }

  if (category === 'vehicle') {
    return 'vehicle';
  }

  if (category === 'route') {
    return 'route';
  }

  const text = `${report.title || ''} ${report.description || ''}`.toLowerCase();

  if (text.includes('lunch') || text.includes('meal')) {
    return 'lunch';
  }

  if (
    text.includes('resting') ||
    text.includes('rest break')
  ) {
    return 'rest';
  }

  if (
    text.includes('tire') ||
    text.includes('tyre') ||
    text.includes('engine') ||
    text.includes('vehicle')
  ) {
    return 'vehicle';
  }

  if (
    text.includes('accident') ||
    text.includes('traffic') ||
    text.includes('road')
  ) {
    return 'route';
  }

  return 'other';
};

const formatReport = (report) => {
  const priority = String(
    report.priority || ''
  ).toLowerCase();

  const severity = ['critical', 'high'].includes(priority)
    ? 'critical'
    : priority === 'normal'
      ? 'info'
      : 'warning';

  const status = String(
    report.status || 'active'
  ).toLowerCase();

  let displayStatus = 'Active';

  if (
    status === 'resolved' ||
    status === 'completed' ||
    status === 'closed'
  ) {
    displayStatus = 'Completed';
  } else if (
    status === 'in_progress' ||
    status === 'in progress' ||
    status === 'processing'
  ) {
    displayStatus = 'In Progress';
  }

  return {
    ...report,

    id: report.id,

    driver_id:
      report.driver_id || null,

    user_id:
      report.user_id || null,

    trip_id:
      report.trip_id || null,

    vehicle_id:
      report.vehicle_id || null,

    // Driver information comes from:
    // user_reports.user_id -> drivers.driver_id
    driver:
      report.driver ||
      report.driver_name ||
      'Unknown Driver',

    phone:
      report.phone ||
      '',

    truck:
      report.truck ||
      report.truck_number ||
      report.vehicle_number ||
      'Vehicle unavailable',

    type: getReportType(report),

    title:
      report.title ||
      'Driver Report',

    message:
      report.description ||
      report.message ||
      'No additional details provided.',

    location:
      report.location ||
      (
        report.latitude != null &&
        report.longitude != null
          ? `${report.latitude}, ${report.longitude}`
          : 'Location unavailable'
      ),

    route:
      report.route ||
      report.route_name ||
      'Route unavailable',

    time:
      report.created_at
        ? new Date(
            report.created_at
          ).toLocaleString()
        : 'Time unavailable',

    severity,

    status,

    displayStatus,
  };
};

// =========================================================
// MAIN COMPONENT
// =========================================================

const DriverReports = () => {
  // =======================================================
  // STATE
  // =======================================================

  const [reports, setReports] = useState([]);

  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [activeFilter, setActiveFilter] =
    useState('all');

  const [search, setSearch] = useState('');

  const [selectedDriver, setSelectedDriver] =
    useState(null);

  const [showResolvedMessage, setShowResolvedMessage] =
    useState(false);

  // =======================================================
  // FETCH REPORTS + DRIVERS
  // =======================================================

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get reports and drivers.
      const [
        reportsResponse,
        driversResponse,
      ] = await Promise.all([
        supabase
          .from('user_reports')
          .select('*')
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('drivers')
          .select(
            'driver_id, driver_username, phone, license_number, email'
          ),
      ]);

      if (reportsResponse.error) {
        throw reportsResponse.error;
      }

      if (driversResponse.error) {
        throw driversResponse.error;
      }

      const reportRows =
        reportsResponse.data || [];

      const driverRows =
        driversResponse.data || [];

      setDrivers(driverRows);

      console.log(
        'REPORTS FROM SUPABASE:',
        reportRows
      );

      console.log(
        'DRIVERS FROM SUPABASE:',
        driverRows
      );

      // =====================================================
      // MATCH EACH REPORT TO A DRIVER
      //
      // IMPORTANT:
      // user_reports.user_id
      //        ↓
      // drivers.driver_id
      // =====================================================

      const formattedReports =
        reportRows.map((report) => {
          const matchedDriver =
            report.user_id
              ? driverRows.find(
                  (driver) =>
                    String(
                      driver.driver_id
                    ) ===
                    String(
                      report.user_id
                    )
                )
              : null;

          // =================================================
          // BUILD REPORT WITH ACTUAL DRIVER INFORMATION
          // =================================================

          const reportWithDriver = {
            ...report,

            // Use the matched driver's actual ID.
            driver_id:
              matchedDriver?.driver_id ||
              null,

            // Get the real driver name.
            driver:
              matchedDriver?.driver_username ||
              'Unknown Driver',

            // Get the real driver phone number.
            phone:
              matchedDriver?.phone ||
              '',

            // Additional driver information.
            license_number:
              matchedDriver?.license_number ||
              '',

            email:
              matchedDriver?.email ||
              '',

            // Keep the original user_reports.user_id.
            user_id:
              report.user_id ||
              null,

            // Useful for debugging.
            matched_driver_id:
              matchedDriver?.driver_id ||
              null,
          };

          // =================================================
          // DEBUGGING
          // =================================================

          console.log(
            'REPORT DRIVER MATCH:',
            {
              reportId: report.id,

              reportUserId:
                report.user_id,

              matchedDriverId:
                matchedDriver?.driver_id ||
                null,

              driverName:
                matchedDriver?.driver_username ||
                null,

              phone:
                matchedDriver?.phone ||
                null,
            }
          );

          return formatReport(
            reportWithDriver
          );
        });

      setReports(formattedReports);
    } catch (fetchError) {
      console.error(
        'Error fetching reports:',
        fetchError
      );

      setError(
        fetchError.message ||
          'Failed to load driver reports.'
      );

      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // =======================================================
  // INITIAL LOAD + REALTIME
  // =======================================================

  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel('driver-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_reports',
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  // =======================================================
  // REPORT COUNTS
  // =======================================================

  const criticalReports = reports.filter(
    (report) =>
      report.severity === 'critical' &&
      report.status !== 'resolved'
  );

  const restingCount = reports.filter(
    (report) =>
      report.type === 'rest' &&
      report.status !== 'resolved'
  ).length;

  const lunchCount = reports.filter(
    (report) =>
      report.type === 'lunch' &&
      report.status !== 'resolved'
  ).length;

  const vehicleIssueCount = reports.filter(
    (report) =>
      report.type === 'vehicle' &&
      report.status !== 'resolved'
  ).length;

  // =======================================================
  // FILTER + SEARCH
  // =======================================================

  const filteredReports = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return reports.filter((report) => {
      const matchesFilter =
        activeFilter === 'all' ||
        report.type === activeFilter;

      const matchesSearch =
        !searchText ||
        (report.driver || '')
          .toLowerCase()
          .includes(searchText) ||
        (report.truck || '')
          .toLowerCase()
          .includes(searchText) ||
        (report.location || '')
          .toLowerCase()
          .includes(searchText) ||
        (report.title || '')
          .toLowerCase()
          .includes(searchText) ||
        (report.route || '')
          .toLowerCase()
          .includes(searchText) ||
        (report.message || '')
          .toLowerCase()
          .includes(searchText);

      return (
        matchesFilter &&
        matchesSearch
      );
    });
  }, [
    reports,
    activeFilter,
    search,
  ]);

  // =======================================================
  // CALL DRIVER
  // =======================================================

  const handleCall = (report) => {
    console.log(
      'CALL DRIVER REPORT:',
      report
    );

    setSelectedDriver(report);
  };

  // =======================================================
  // RESOLVE REPORT
  // =======================================================

  const handleResolve = async (report) => {
    if (!report?.id) {
      return;
    }

    const resolvedAt =
      new Date().toISOString();

    const { error } = await supabase
      .from('user_reports')
      .update({
        status: 'resolved',
        resolved_at: resolvedAt,
        admin_notes:
          'Resolved by administrator',
        updated_at: resolvedAt,
      })
      .eq('id', report.id);

    if (error) {
      console.error(
        'Error resolving report:',
        error
      );

      setError(error.message);

      return;
    }

    setReports(
      (currentReports) =>
        currentReports.map(
          (item) =>
            item.id === report.id
              ? {
                  ...item,
                  status: 'resolved',
                  resolved_at:
                    resolvedAt,
                  displayStatus:
                    'Completed',
                }
              : item
        )
    );

    setSelectedDriver(null);

    setShowResolvedMessage(true);

    setTimeout(() => {
      setShowResolvedMessage(false);
    }, 3000);
  };

  // =======================================================
  // SEARCH
  // =======================================================

  const clearSearch = () => {
    setSearch('');
  };

  const clearFilters = () => {
    setSearch('');
    setActiveFilter('all');
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-full bg-slate-50">

      {/* HEADER */}

      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-5">

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>

              <div>

                <div className="flex items-center gap-3">

                  <h1 className="text-2xl font-bold text-slate-900">
                    Driver Reports
                  </h1>

                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">

                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />

                    LIVE

                  </span>

                </div>

                <p className="text-sm text-slate-500 mt-1">
                  Monitor driver updates, incidents and road conditions
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">

                <Truck className="w-4 h-4 text-slate-500" />

                <div>

                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                    Fleet Status
                  </p>

                  <p className="text-sm font-semibold text-slate-800">
                    {drivers.length} active drivers
                  </p>

                </div>

              </div>

              {criticalReports.length > 0 && (

                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg">

                  <AlertTriangle className="w-4 h-4 text-red-600" />

                  <div>

                    <p className="text-[10px] uppercase tracking-wide text-red-400 font-semibold">
                      Attention
                    </p>

                    <p className="text-sm font-semibold text-red-700">
                      {criticalReports.length} critical
                    </p>

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>
      </div>

      {/* MAIN */}

      <div className="p-6">

        {loading && (

          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mb-6">

            <p className="text-sm text-slate-500">
              Loading driver reports...
            </p>

          </div>

        )}

        {error && !loading && (

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">

            <p className="text-sm font-semibold text-red-700">
              Unable to load driver reports
            </p>

            <p className="text-sm text-red-600 mt-1">
              {error}
            </p>

            <button
              onClick={fetchReports}
              className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold"
            >
              Try Again
            </button>

          </div>

        )}

        {!loading && !error && (

          <>

            {/* FLEET OVERVIEW */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

              <div className="bg-white border border-slate-200 rounded-xl p-4">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Resting
                    </p>

                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {restingCount}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Drivers on rest break
                    </p>

                  </div>

                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-blue-600" />
                  </div>

                </div>

              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Lunch Breaks
                    </p>

                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {lunchCount}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Drivers stopped
                    </p>

                  </div>

                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-orange-600" />
                  </div>

                </div>

              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Vehicle Issues
                    </p>

                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {vehicleIssueCount}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Active reports from drivers
                    </p>

                  </div>

                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>

                </div>

              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Active Drivers
                    </p>

                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {drivers.length}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Currently on trips
                    </p>

                  </div>

                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-green-600" />
                  </div>

                </div>

              </div>

            </div>

            {/* CRITICAL REPORTS */}

            {criticalReports.length > 0 && (

              <div className="bg-white border border-red-200 rounded-xl mb-6 overflow-hidden">

                <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>

                    <div>

                      <h2 className="text-sm font-bold text-slate-900">
                        Needs Attention
                      </h2>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Critical driver reports requiring action
                      </p>

                    </div>

                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                    {criticalReports.length}
                  </span>

                </div>

                <div className="p-4 space-y-3">

                  {criticalReports.map(
                    (report) => (

                      <DriverReportCard
                        key={report.id}
                        report={report}
                        onCall={handleCall}
                        onResolve={handleResolve}
                      />

                    )
                  )}

                </div>

              </div>

            )}

            {/* ACTIVITY */}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

              <div className="px-5 py-4 border-b border-slate-200">

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                  <div>

                    <div className="flex items-center gap-2">

                      <h2 className="text-lg font-bold text-slate-900">
                        Driver Activity
                      </h2>

                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                        {filteredReports.length}
                      </span>

                    </div>

                    <p className="text-sm text-slate-500 mt-1">
                      Recent updates submitted by drivers
                    </p>

                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">

                    <span className="w-2 h-2 rounded-full bg-green-500" />

                    Live feed

                  </div>

                </div>

              </div>

              {/* SEARCH */}

              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">

                <div className="flex flex-col xl:flex-row gap-3">

                  <div className="relative flex-1">

                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search driver, truck, route or location..."
                      className="w-full h-10 pl-10 pr-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />

                    {search && (

                      <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>

                    )}

                  </div>

                  {/* FILTERS */}

                  <div className="flex items-center gap-2 overflow-x-auto">

                    {[
                      {
                        id: 'all',
                        label: 'All Reports',
                      },
                      {
                        id: 'rest',
                        label: 'Resting',
                      },
                      {
                        id: 'lunch',
                        label: 'Lunch',
                      },
                      {
                        id: 'route',
                        label: 'Route Issues',
                      },
                      {
                        id: 'vehicle',
                        label: 'Vehicle Issues',
                      },
                    ].map((filter) => (

                      <button
                        key={filter.id}
                        onClick={() =>
                          setActiveFilter(
                            filter.id
                          )
                        }
                        className={`px-3.5 h-10 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                          activeFilter ===
                          filter.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {filter.label}
                      </button>

                    ))}

                  </div>

                </div>

              </div>

              {/* REPORT LIST */}

              <div className="p-5">

                {filteredReports.length > 0 ? (

                  <div className="space-y-3">

                    {filteredReports.map(
                      (report) => (

                        <DriverReportCard
                          key={report.id}
                          report={report}
                          onCall={handleCall}
                          onResolve={handleResolve}
                        />

                      )
                    )}

                  </div>

                ) : (

                  <div className="py-16 text-center">

                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>

                    <h3 className="font-semibold text-slate-900">
                      No reports found
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      Try changing your search or filter.
                    </p>

                    {(search ||
                      activeFilter !==
                        'all') && (

                      <button
                        onClick={
                          clearFilters
                        }
                        className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Clear filters
                      </button>

                    )}

                  </div>

                )}

              </div>

            </div>

          </>

        )}

      </div>

      {/* CALL DRIVER MODAL */}

      <CallDriverModal
        driver={selectedDriver}
        onClose={() =>
          setSelectedDriver(null)
        }
      />

      {/* RESOLVED TOAST */}

      {showResolvedMessage && (

        <div className="fixed bottom-6 right-6 z-50">

          <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl">

            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">

              <CheckCircle2 className="w-4 h-4 text-green-400" />

            </div>

            <div>

              <p className="text-sm font-semibold">
                Report resolved
              </p>

              <p className="text-xs text-slate-400">
                Driver report has been marked as resolved.
              </p>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default DriverReports;