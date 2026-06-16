import React from 'react';
import { Map, FileText, Shield, Play } from 'lucide-react';

const QuickActions = () => {
  return (
    <div className="bg-[#EEF2F7] rounded-2xl overflow-hidden flex flex-col p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          <span>Quick Actions</span>
        </h3>
      </div>

      {/* Action buttons grid */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-white rounded-2xl border border-gray-100 p-4 text-sm font-medium hover:bg-gray-50 transition-colors flex flex-col items-center gap-2 text-gray-700">
          <div className="p-2 bg-gray-50 rounded-xl">
            <Map className="w-5 h-5 text-gray-600" />
          </div>
          <span>Assign Route</span>
        </button>

        <button className="bg-white rounded-2xl border border-gray-100 p-4 text-sm font-medium hover:bg-gray-50 transition-colors flex flex-col items-center gap-2 text-gray-700">
          <div className="p-2 bg-gray-50 rounded-xl">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <span>Generate Report</span>
        </button>

        <button className="bg-white rounded-2xl border border-gray-100 p-4 text-sm font-medium hover:bg-gray-50 transition-colors flex flex-col items-center gap-2 text-gray-700">
          <div className="p-2 bg-gray-50 rounded-xl">
            <Shield className="w-5 h-5 text-gray-600" />
          </div>
          <span>Safety Check</span>
        </button>

        <button className="bg-white rounded-2xl border border-gray-100 p-4 text-sm font-medium hover:bg-gray-50 transition-colors flex flex-col items-center gap-2 text-gray-700">
          <div className="p-2 bg-gray-50 rounded-xl">
            <Play className="w-5 h-5 text-gray-600" />
          </div>
          <span>Run Simulation</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;