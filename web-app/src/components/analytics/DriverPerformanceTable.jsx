import React from 'react';
import { driverPerformanceData } from '../../data/mockData';

const DriverPerformanceTable = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
      <h3 className="font-semibold mb-3">Driver Performance Analysis</h3>
      <div className="space-y-3">
        {driverPerformanceData.map(driver => (
          <div key={driver.name}>
            <div className="flex justify-between text-sm">
              <span>{driver.name}</span>
              <span className="font-bold">{driver.score}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${driver.score}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverPerformanceTable;