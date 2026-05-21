import React from 'react';
import { X, Truck, MapPin, Clock, User, AlertTriangle, CheckCircle, Navigation, Phone, History, Fuel, Gauge, Shield } from 'lucide-react';

const getStatusColor = (status) => {
  switch(status) {
    case 'on-time': return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100 dark:bg-green-900/30' };
    case 'delayed': return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100 dark:bg-yellow-900/30' };
    case 'at-risk': return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100 dark:bg-red-900/30' };
    default: return { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-100 dark:bg-gray-700' };
  }
};

const VehicleDetailModal = ({ vehicle, onClose }) => {
  if (!vehicle) return null;
  
  const statusStyle = getStatusColor(vehicle.status);
  
  return (
    // Fixed overlay with high z-index
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      {/* Modal Container */}
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 m-4 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusStyle.light}`}>
              <Truck className={`w-5 h-5 ${statusStyle.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Vehicle {vehicle.id}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Trip Details</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Driver */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              Driver:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">{vehicle.driver}</span>
          </div>
          
          {/* Status */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Status:
            </span>
            <span className={`px-2 py-0.5 rounded-full text-white text-xs ${statusStyle.bg}`}>
              {vehicle.status === 'on-time' ? 'On Time' : vehicle.status === 'delayed' ? 'Delayed' : 'At Risk'}
            </span>
          </div>
          
          {/* Route */}
          <div className="py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-2 mb-1">
              <Navigation className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Current Route:</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white ml-6">{vehicle.route}</p>
          </div>
          
          {/* ETA */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              ETA:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">{vehicle.eta}</span>
          </div>
          
          {/* Speed */}
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Speed:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">{vehicle.speed || 65} km/h</span>
          </div>
          
          {/* Fuel */}
          <div className="py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Fuel className="w-4 h-4" />
                Fuel:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">{vehicle.fuelLevel || vehicle.fuel || 85}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${vehicle.fuelLevel || vehicle.fuel || 85}%` }}
              />
            </div>
          </div>
          
          {/* Progress */}
          <div className="py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Route Progress:
              </span>
              <span className="font-medium text-gray-900 dark:text-white">{vehicle.progress || 65}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${vehicle.progress || 65}%` }}
              />
            </div>
          </div>
          
          {/* Alerts */}
          <div className="py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Active Alerts:
            </span>
            <div className="mt-1">
              {vehicle.alerts && vehicle.alerts.length ? (
                vehicle.alerts.map((alert, idx) => (
                  <span key={idx} className="inline-block bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs px-2 py-1 rounded mr-1 mt-1">
                    {alert}
                  </span>
                ))
              ) : (
                <span className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  No active alerts
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2 mt-5 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Driver
          </button>
          <button className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
            <History className="w-4 h-4" />
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailModal;