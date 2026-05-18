import React from 'react';

const PerformanceCharts = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
      <h3 className="font-semibold mb-3">Delivery Performance Trends</h3>
      <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-sm">[Interactive Delivery Statistics Chart]</div>
      <div className="mt-3 flex justify-between text-sm">
        <span>📊 On-time deliveries: 78%</span>
        <span>📉 Delay trend: -12%</span>
      </div>
    </div>
  );
};

export default PerformanceCharts;