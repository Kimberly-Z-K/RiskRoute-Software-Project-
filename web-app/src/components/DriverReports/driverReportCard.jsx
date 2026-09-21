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
  ChevronRight
} from 'lucide-react';


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


const DriverReportCard = ({
  report,
  onCall,
  onResolve
}) => {

  const ReportIcon = getReportIcon(report.type);

  const isCritical = report.severity === 'critical';
  const isWarning = report.severity === 'warning';


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


          {/* =================================================
              ICON
          ================================================= */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconContainer}`}
          >
            <ReportIcon className="w-5 h-5" />
          </div>


          {/* =================================================
              REPORT CONTENT
          ================================================= */}
          <div className="flex-1 min-w-0">

            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">

              <div>

                <div className="flex items-center gap-2 flex-wrap">

                  <h3 className="text-sm font-bold text-slate-900">
                    {report.title}
                  </h3>

                  {isCritical && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide">
                      <AlertTriangle className="w-3 h-3" />
                      Critical
                    </span>
                  )}

                </div>


                {/* Driver */}
                <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">

                  <User className="w-3.5 h-3.5" />

                  <span className="font-medium text-slate-700">
                    {report.driver}
                  </span>

                  <span className="text-slate-300">
                    •
                  </span>

                  <Truck className="w-3.5 h-3.5" />

                  <span>
                    {report.truck}
                  </span>

                </div>

              </div>


              {/* Type */}
              <span
                className={`self-start px-2.5 py-1 rounded-md border text-[10px] font-bold tracking-wide whitespace-nowrap ${typeBadge}`}
              >
                {getTypeLabel(report.type)}
              </span>

            </div>


            {/* =================================================
                MESSAGE
            ================================================= */}
            <div
              className={`mt-3 rounded-lg px-3.5 py-3 ${
                isCritical
                  ? 'bg-red-50/60'
                  : 'bg-slate-50'
              }`}
            >

              <p className="text-sm text-slate-600 leading-relaxed">
                {report.message}
              </p>

            </div>


            {/* =================================================
                DETAILS
            ================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3">

              {/* Location */}
              <div className="flex items-center gap-2 min-w-0">

                <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="min-w-0">

                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                    Location
                  </p>

                  <p className="text-xs font-medium text-slate-700 truncate">
                    {report.location}
                  </p>

                </div>

              </div>


              {/* Route */}
              <div className="flex items-center gap-2 min-w-0">

                <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="min-w-0">

                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                    Route
                  </p>

                  <p className="text-xs font-medium text-slate-700 truncate">
                    {report.route}
                  </p>

                </div>

              </div>


              {/* Time */}
              <div className="flex items-center gap-2">

                <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div>

                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
                    Reported
                  </p>

                  <p className="text-xs font-medium text-slate-700">
                    {report.time}
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


          {/* Status */}
          <div className="flex items-center gap-2">

            <span
              className={`w-2 h-2 rounded-full ${
                isCritical
                  ? 'bg-red-500'
                  : isWarning
                  ? 'bg-amber-500'
                  : report.status === 'Completed'
                  ? 'bg-slate-400'
                  : 'bg-green-500'
              }`}
            />

            <span
              className={`text-xs font-semibold ${
                isCritical
                  ? 'text-red-700'
                  : isWarning
                  ? 'text-amber-700'
                  : report.status === 'Completed'
                  ? 'text-slate-500'
                  : 'text-green-700'
              }`}
            >
              {report.status}
            </span>

          </div>


          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Call */}
            {isCritical && (
              <button
                onClick={() => onCall(report)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Driver
              </button>
            )}


            {/* Location */}
            <button
              onClick={() => {
                alert(`Location: ${report.location}`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              Location
            </button>


            {/* Driver */}
            <button
              onClick={() => {
                alert(`Driver: ${report.driver}`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
            >
              <User className="w-3.5 h-3.5" />
              Driver
            </button>


            {/* Resolve */}
            {isCritical && (
              <button
                onClick={() => onResolve(report)}
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