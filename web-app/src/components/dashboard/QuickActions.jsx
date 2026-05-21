import React from 'react';
import { Map, FileText, Shield, Play } from 'lucide-react';

const QuickActions = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
      <h3 className="font-semibold mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <button className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 text-sm font-medium hover:bg-blue-100 transition flex items-center justify-center gap-2">
          <Map className="w-4 h-4" />
          Assign Route
        </button>
        <button className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 text-sm font-medium hover:bg-green-100 transition flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
        <button className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-700 text-sm font-medium hover:bg-purple-100 transition flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Safety Check
        </button>
        <button className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-700 text-sm font-medium hover:bg-orange-100 transition flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          Run Simulation
        </button>
      </div>
    </div>
  );
};

export default QuickActions;