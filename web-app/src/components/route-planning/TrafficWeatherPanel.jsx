import React from 'react';
import { Navigation } from 'lucide-react';

const TrafficWeatherPanel = () => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
      <h3 className="font-semibold flex items-center gap-2"><Navigation className="w-4 h-4" /> Traffic & Weather Analysis</h3>
      <div className="mt-2 space-y-1 text-sm">
        <p>🚦 Current congestion: Moderate on I-278, +12 min delay expected</p>
        <p>🌧️ Weather impact: Light rain reducing visibility, safe driving recommended</p>
        <p>📊 Estimated fuel consumption: 4.2 gal for selected route</p>
      </div>
    </div>
  );
};

export default TrafficWeatherPanel;