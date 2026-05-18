import React from 'react';
import { Shield } from 'lucide-react';

const RiskAnalysisPanel = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200">
      <h2 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-red-500" /> Route Risk Analysis</h2>
      <div className="space-y-4">
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="font-bold">Route Risk Score: 68/100 (Medium-High)</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="bg-red-500 h-2 rounded-full w-[68%]"></div></div>
          <p className="text-xs mt-2 text-gray-600">Based on historical incidents, weather, and traffic patterns</p>
        </div>
        <div>
          <p className="font-medium mb-2">⚠️ High-Risk Zones on Route:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded"><span>Downtown Theft Hotspot</span><span className="text-red-600 text-xs">Theft prob: 32%</span></li>
            <li className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded"><span>Industrial Accident Zone</span><span className="text-yellow-600 text-xs">Accident rate: high</span></li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-2">📊 Historical Incident Trends (Last 30 days)</p>
          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-sm">[Accident frequency trend chart - down 15%]</div>
        </div>
        <button className="w-full border border-blue-600 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition">View Detailed Risk Report</button>
      </div>
    </div>
  );
};

export default RiskAnalysisPanel;