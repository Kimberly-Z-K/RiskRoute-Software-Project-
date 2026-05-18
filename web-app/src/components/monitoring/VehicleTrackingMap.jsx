import React from 'react';
import { Map } from 'lucide-react';

const VehicleTrackingMap = () => {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Real-Time Vehicle Tracking</h2>
          <div className="flex gap-2 text-xs">
            <button className="px-2 py-1 bg-blue-100 text-blue-700 rounded">All</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded">On Time</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded">Delayed</button>
            <button className="px-2 py-1 hover:bg-gray-100 rounded">At Risk</button>
          </div>
        </div>
      </div>
      <div className="relative h-[500px] bg-gray-100 dark:bg-gray-700">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Map className="w-16 h-16 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">Interactive Map with Live GPS Tracking</p>
            <p className="text-xs text-gray-400 mt-1">24 active vehicles • Real-time positions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleTrackingMap;