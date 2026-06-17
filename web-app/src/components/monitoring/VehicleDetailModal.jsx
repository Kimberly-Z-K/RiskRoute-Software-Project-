import React from 'react';
import { X, Truck, MapPin, Clock, User, AlertTriangle, CheckCircle, Navigation, Phone, History, Fuel, Gauge, Shield } from 'lucide-react';


const getStatusColor = (status) => {
  switch(status) {
    case 'on-time': return { bg: 'bg-green-500', text: 'text-green-700', bgLight: 'bg-green-100' };
    case 'delayed': return { bg: 'bg-yellow-500', text: 'text-yellow-700', bgLight: 'bg-yellow-100' };
    case 'at-risk': return { bg: 'bg-red-500', text: 'text-red-700', bgLight: 'bg-red-100' };
    default: return { bg: 'bg-gray-500', text: 'text-gray-700', bgLight: 'bg-gray-100' };
  }
};


const VehicleDetailModal = ({ vehicle, onClose }) => {
  if (!vehicle) return null;
  
  const statusStyle = getStatusColor(vehicle.status);
  const statusText = vehicle.status === 'on-time' ? 'On Time' : vehicle.status === 'delayed' ? 'Delayed' : 'At Risk';
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full m-4 shadow-xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${statusStyle.bgLight} rounded-full`}>
              <Truck className={`w-5 h-5 ${statusStyle.text}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Vehicle {vehicle.id}</h3>
              <p className="text-sm text-gray-500">Trip Details</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4">
          {/* Driver */}
          <div className="flex items-center gap-3 mb-4">
            <User className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-0.5">Driver</p>
              <p className="font-medium text-gray-900">{vehicle.driver}</p>
            </div>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-0.5">Status</p>
              <span className={`inline-block px-3 py-1 ${statusStyle.bg} text-white text-sm rounded-md font-medium`}>
                {statusText}
              </span>
            </div>
          </div>
          
          {/* Route */}
          <div className="flex items-start gap-3 mb-4">
            <Navigation className="w-4 h-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-0.5">Current Route</p>
              <p className="font-medium text-gray-900">{vehicle.route}</p>
            </div>
          </div>
          
          {/* ETA & Speed - side by side */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 mb-0.5">ETA</p>
                <p className="font-medium text-gray-900">{vehicle.eta}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 mb-0.5">Speed</p>
                <p className="font-medium text-gray-900">{vehicle.speed || 65} km/h</p>
              </div>
            </div>
          </div>
          
          {/* Fuel */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">Fuel</p>
              <p className="font-medium text-gray-900 ml-auto">{vehicle.fuelLevel || vehicle.fuel || 85}%</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${vehicle.fuelLevel || vehicle.fuel || 85}%` }}
              />
            </div>
          </div>
          
          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">Route Progress</p>
              <p className="font-medium text-gray-900 ml-auto">{vehicle.progress || 65}%</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${vehicle.progress || 65}%` }}
              />
            </div>
          </div>
          
          {/* Alerts */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">Active Alerts</p>
            </div>
            {vehicle.alerts && vehicle.alerts.length ? (
              <div className="flex gap-2 flex-wrap">
                {vehicle.alerts.map((alert, idx) => (
                  <span key={idx} className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-md">
                    {alert}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm">No active alerts</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md font-medium transition-colors flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Driver
          </button>
          <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-md font-medium transition-colors flex items-center justify-center gap-2">
            <History className="w-4 h-4" />
            View History
          </button>
        </div>
      </div>
    </div>
  );
};


export default VehicleDetailModal;