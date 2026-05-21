import React, { useState } from 'react';
import { Truck, MapPin, Clock, User, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, Navigation, Battery, Fuel, Gauge } from 'lucide-react';

const getStatusColor = (status) => {
  switch(status) {
    case 'on-time': return { bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle };
    case 'delayed': return { bg: 'bg-yellow-500', light: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: AlertCircle };
    case 'at-risk': return { bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertTriangle };
    default: return { bg: 'bg-gray-500', light: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', icon: Truck };
  }
};

const VehicleList = ({ vehicles, onSelectVehicle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Filter vehicles based on search and status
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vehicle.id.toString().includes(searchTerm) ||
                          vehicle.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const stats = {
    total: vehicles.length,
    onTime: vehicles.filter(v => v.status === 'on-time').length,
    delayed: vehicles.filter(v => v.status === 'delayed').length,
    atRisk: vehicles.filter(v => v.status === 'at-risk').length
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Active Fleet Vehicles
          </h3>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{stats.onTime}</span>
            </div>
            <div className="flex items-center gap-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{stats.delayed}</span>
            </div>
            <div className="flex items-center gap-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{stats.atRisk}</span>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by driver, vehicle ID, or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Truck className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 mt-3">
          {['all', 'on-time', 'delayed', 'at-risk'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 text-xs rounded-full transition-all ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'on-time' ? 'On Time' : filter === 'delayed' ? 'Delayed' : 'At Risk'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Vehicle List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No vehicles found</p>
          </div>
        ) : (
          filteredVehicles.map(vehicle => {
            const statusStyle = getStatusColor(vehicle.status);
            const StatusIcon = statusStyle.icon;
            
            return (
              <button
                key={vehicle.id}
                onClick={() => onSelectVehicle(vehicle)}
                className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusStyle.light} group-hover:scale-110 transition-transform`}>
                      <Truck className={`w-4 h-4 ${statusStyle.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          Vehicle {vehicle.id}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} text-white flex items-center gap-1`}>
                          <StatusIcon className="w-2 h-2" />
                          {vehicle.status === 'on-time' ? 'On Time' : vehicle.status === 'delayed' ? 'Delayed' : 'At Risk'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {vehicle.driver}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{vehicle.route?.split('→')[0]}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Navigation className="w-3 h-3" />
                    <span>{vehicle.route?.split('→')[1]}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>ETA: {vehicle.eta}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Gauge className="w-3 h-3" />
                    <span>{vehicle.speed} km/h</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Route Progress</span>
                    <span>{vehicle.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        vehicle.progress > 75 ? 'bg-green-500' : vehicle.progress > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${vehicle.progress}%` }}
                    />
                  </div>
                </div>
                
                {/* Additional Metrics */}
                <div className="flex gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{vehicle.fuelLevel || 85}% fuel</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Driver Score: {vehicle.driverScore || 85}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900/30 text-center text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
        {filteredVehicles.length} of {vehicles.length} vehicles displayed
      </div>
    </div>
  );
};

export default VehicleList;