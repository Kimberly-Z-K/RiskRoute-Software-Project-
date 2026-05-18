import React from 'react';

const RiskTrends = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
      <h3 className="font-semibold mb-3">Risk Trend Analysis</h3>
      <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-sm">[Risk incident frequency graph - downward trend]</div>
      <div className="mt-3 text-sm">
        <p className="flex justify-between"><span>Previous month:</span><span>23 incidents</span></p>
        <p className="flex justify-between"><span>Current month:</span><span>14 incidents (-39%)</span></p>
      </div>
    </div>
  );
};

export default RiskTrends;