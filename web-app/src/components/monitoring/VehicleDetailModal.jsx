import React from 'react';
import { X } from 'lucide-react';

const getStatusColor = (status) => {
  switch(status) {
    case 'on-time': return 'bg-green-500';
    case 'delayed': return 'bg-yellow-500';
    case 'at-risk': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const VehicleDetailModal = ({ vehicle, onClose }) => {
  if (!vehicle) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{vehicle.id} - Trip Details</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Driver:</span><span className="font-medium">{vehicle.driver}</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Status:</span><span className={`px-2 py-0.5 rounded-full text-white text-xs ${getStatusColor(vehicle.status)}`}>{vehicle.status}</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Current Route:</span><span>{vehicle.route}</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">ETA:</span><span>{vehicle.eta}</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Speed:</span><span>{vehicle.speed} mph</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Fuel:</span><span>{vehicle.fuel}%</span></div>
          <div className="py-2">
            <span className="text-gray-500">Active Alerts:</span>
            <div className="mt-1">
              {vehicle.alerts.length ? vehicle.alerts.map(a => <span key={a} className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded mr-1 mt-1">{a}</span>) : <span className="text-green-600 text-sm">No active alerts</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Contact Driver</button>
          <button className="flex-1 border border-gray-300 py-2 rounded-lg">View History</button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailModal;