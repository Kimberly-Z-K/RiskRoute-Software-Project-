import React from 'react';

import {
  CheckCircle2,
  Clock3,
  Coffee,
  MapPin,
  Navigation,
  Phone,
  Truck,
  User,
  Utensils,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';


// =====================================================
// REPORT ICON
// =====================================================

const getReportIcon = (type) => {
  switch (type) {
    case 'rest':
      return Coffee;

    case 'lunch':
      return Utensils;

    case 'vehicle':
      return Truck;

    case 'route':
      return Navigation;

    default:
      return User;
  }
};


// =====================================================
// REPORT TYPE LABEL
// =====================================================

const getTypeLabel = (type) => {
  switch (type) {
    case 'rest':
      return 'REST BREAK';

    case 'lunch':
      return 'LUNCH BREAK';

    case 'vehicle':
      return 'VEHICLE ISSUE';

    case 'route':
      return 'ROUTE ISSUE';

    default:
      return 'DRIVER REPORT';
  }
};


// =====================================================
// STATUS HELPERS
// =====================================================

const getDisplayStatus = (report) => {
  if (report?.displayStatus) {
    return report.displayStatus;
  }

  const status = String(report?.status || 'active').toLowerCase();

  if (
    status === 'resolved' ||
    status === 'completed' ||
    status === 'closed'
  ) {
    return 'Completed';
  }

  if (
    status === 'in_progress' ||
    status === 'in progress' ||
    status === 'processing'
  ) {
    return 'In Progress';
  }

  return 'Active';
};


const isReportResolved = (report) => {
  const status = String(report?.status || '').toLowerCase();

  return (
    status === 'resolved' ||
    status === 'completed' ||
    status === 'closed' ||
    report?.displayStatus === 'Completed'
  );
};


// =====================================================
// DRIVER REPORT CARD
// =====================================================

const DriverReportCard = ({
  report = {},
  onCall,
  onResolve,
}) => {
  const ReportIcon = getReportIcon(report.type);

  const isCritical = report.severity === 'critical';
  const isWarning = report.severity === 'warning';

  const displayStatus = getDisplayStatus(report);
  const isResolved = isReportResolved(report);

  // Driver information comes from:
  // user_reports.user_id -> drivers.driver_id
  const driverName =
    report.driver ||
    report.driver_username ||
    'Unknown Driver';

  const driverPhone =
    report.phone ||
    '';

  const truckName =
    report.truck ||
    'Vehicle unavailable';

  const reportTitle =
    report.title ||
    'Driver Report';

  const reportMessage =
    report.message ||
    'No additional details provided.';

  const reportLocation =
    report.location ||
    'Location unavailable';

  const reportRoute =
    report.route ||
    'Route unavailable';

  const reportTime =
    report.time ||
    'Time unavailable';

  const iconContainer = isCritical
    ? 'bg-red-50 text-red-600'
    : isWarning
    ? 'bg-amber-50 text-amber-600'
    : 'bg-blue-50 text-blue-600';

  const typeBadge = isCritical
    ? 'bg-red-50 text-red-700 border-red-100'
    : isWarning
    ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-slate-50 text-slate-600 border-slate-200';


  return (
    <div
      className={`group bg-white border rounded-xl transition-all duration-200 hover:shadow-md ${
        isCritical
          ? 'border-red-200'
          : 'border-slate-200 hover:border-blue-200'
      }`}
    >

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="p-4">

        <div className="flex flex-col lg:flex-row lg:items-start gap-4">

          {/* REPORT ICON */}

          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconContainer}`}
          >
            <ReportIcon className="w-5 h-5" />
          </div>


          {/* REPORT CONTENT */}

          <div className="flex-1 min-w-0">

            {/* TITLE ROW */}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">

              <div>

                <div className="flex items-center gap-2 flex-wrap">

                  <h3 className="text-sm font-bold text-slate-900">
                    {reportTitle}
                  </h3>

                  {isCritical && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide">
                      <AlertTriangle className="w-3 h-3" />
                      Critical
                    </span>
                  )}

                </div>


                {/* DRIVER */}

                <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">

                  <User className="w-3.5 h-3.5" />

                  <span className="font-medium text-slate-700">
                    {driverName}
                  </span>

                  <span className="text-slate-300">
                    •
                  </span>

                  <Truck className="w-3.5 h-3.5" />

                  <span>
                    {truckName}
                  </span>

                </div>

              </div>


              {/* TYPE */}

              <span
                className={`self-start px-2.5 py-1 rounded-md border text-[10px] font-bold tracking-wide whitespace-nowrap ${typeBadge}`}
              >
                {getTypeLabel(report.type)}
              </span>

            </div>


            {/* MESSAGE */}

            <div
              className={`mt-3 rounded-lg px-3.5 py-3 ${
                isCritical
                  ? 'bg-red-50/60'
                  : 'bg-slate-50'
              }`}
            >

              <p className="text-sm text-slate-600 leading-relaxed">
                {reportMessage}
              </p>

            </div>


            {/* DETAILS */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3">

              {/* LOCATION */}

              <div className="flex items-center gap-2 min-w-0">

                <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="min-w-0">

                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                    Location
                  </p>

                  <p
                    className="text-xs font-medium text-slate-700 truncate"
                    title={reportLocation}
                  >
                    {reportLocation}
                  </p>

                </div>

              </div>


              {/* ROUTE */}

              <div className="flex items-center gap-2 min-w-0">

                <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="min-w-0">

                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                    Route
                  </p>

                  <p
                    className="text-xs font-medium text-slate-700 truncate"
                    title={reportRoute}
                  >
                    {reportRoute}
                  </p>

                </div>

              </div>


              {/* TIME */}

              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div>

                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                    Reported
                  </p>

                  <p className="text-xs font-medium text-slate-700">
                    {reportTime}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          FOOTER / ACTIONS
      ===================================================== */}

      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* STATUS */}

          <div className="flex items-center gap-2">

            <span
              className={`w-2 h-2 rounded-full ${
                isCritical && !isResolved
                  ? 'bg-red-500'
                  : isWarning && !isResolved
                  ? 'bg-amber-500'
                  : isResolved
                  ? 'bg-slate-400'
                  : 'bg-green-500'
              }`}
            />

            <span
              className={`text-xs font-semibold ${
                isCritical && !isResolved
                  ? 'text-red-700'
                  : isWarning && !isResolved
                  ? 'text-amber-700'
                  : isResolved
                  ? 'text-slate-500'
                  : 'text-green-700'
              }`}
            >
              {displayStatus}
            </span>

          </div>


          {/* ACTIONS */}

          <div className="flex items-center gap-2 flex-wrap">

            {/* =================================================
                CALL DRIVER
            ================================================= */}

            <button
              type="button"
              onClick={() => onCall?.(report)}
              title={
                driverPhone
                  ? `Call ${driverName} - ${driverPhone}`
                  : `No phone number available for ${driverName}`
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition"
            >
              <Phone className="w-3.5 h-3.5" />
              Call Driver
            </button>


            {/* LOCATION */}

            <button
              type="button"
              onClick={() => {
                alert(`Location: ${reportLocation}`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              Location
            </button>


            {/* DRIVER */}

            <button
              type="button"
              onClick={() => {
                alert(
                  `Driver: ${driverName}${
                    driverPhone
                      ? `\nPhone: ${driverPhone}`
                      : '\nPhone: No phone number available'
                  }`
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
            >
              <User className="w-3.5 h-3.5" />
              Driver
            </button>


            {/* RESOLVE */}

            {!isResolved && (
              <button
                type="button"
                onClick={() => onResolve?.(report)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 text-xs font-semibold transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolve
              </button>
            )}


            <ChevronRight className="hidden sm:block w-4 h-4 text-slate-300 ml-1" />

          </div>

        </div>

      </div>

    </div>
  );
};


export default DriverReportCard;