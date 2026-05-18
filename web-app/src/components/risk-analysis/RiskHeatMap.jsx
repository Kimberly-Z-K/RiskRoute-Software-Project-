import React from 'react';
import { Map } from 'lucide-react';

const RiskHeatmap = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
      <h3 className="font-semibold mb-3">Interactive Risk Heatmap</h3>
      <div className="h-64 bg-gradient-to-br from-red-100 via-yellow-100 to-green-100 dark:from-red-900/30 dark:via-yellow-900/20 rounded-lg relative">
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <Map className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-sm">[Interactive Heatmap - High-risk regions in red]</p>
            <div className="flex gap-2 mt-3 justify-center text-xs">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div> High</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div> Medium</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskHeatmap;