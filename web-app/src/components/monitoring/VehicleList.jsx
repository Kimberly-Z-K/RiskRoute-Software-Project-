import React from 'react';
import { Truck } from 'lucide-react';

const getStatusColor = (status) => {
  switch(status) {
    case 'on-time': return 'bg-green-500';
    case 'delayed': return 'bg-yellow-500';
    case 'at-risk': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const VehicleList = ({ vehicles, onSelectVehicle }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> Active Vehicles</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {vehicles.slice(0, 8).map(vehicle => (
          <button
            key={vehicle.id}
            onClick={() => onSelectVehicle(vehicle)}
            className="w-full text-left p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{vehicle.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getStatusColor(vehicle.status)}`}>{vehicle.status}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Driver: {vehicle.driver} • ETA: {vehicle.eta}</p>
            <p className="text-xs text-gray-400">{vehicle.route}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VehicleList;