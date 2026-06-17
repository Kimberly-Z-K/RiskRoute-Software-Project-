import React, { useState } from 'react';
import { Truck, MapPin, Clock, User, ChevronRight, AlertCircle, CheckCircle, AlertTriangle, Navigation, Battery, Fuel, Gauge } from 'lucide-react';


const getStatusColor = (status) => {
  switch(status) {
    case 'on-time': return { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
    case 'delayed': return { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle };
    case 'at-risk': return { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle };
    default: return { bg: 'bg-gray-500', light: 'bg-gray-100', text: 'text-gray-700', icon: Truck };
  }
};


const VehicleList = ({ vehicles, onSelectVehicle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          vehicle.id.toString().includes(searchTerm) ||
                          vehicle.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vehicles.length,
    onTime: vehicles.filter(v => v.status === 'on-time').length,
    delayed: vehicles.filter(v => v.status === 'delayed').length,
    atRisk: vehicles.filter(v => v.status === 'at-risk').length
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Active Fleet Vehicles
          </h3>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 text-sm bg-green-100 px-2.5 py-1 rounded-md">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">{stats.onTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm bg-yellow-100 px-2.5 py-1 rounded-md">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-700 font-medium">{stats.delayed}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm bg-red-100 px-2.5 py-1 rounded-md">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-700 font-medium">{stats.atRisk}</span>
            </div>
          </div>
        </div>
        
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search by driver, vehicle ID, or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Truck className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
        
        <div className="flex gap-1.5">
          {['all', 'on-time', 'delayed', 'at-risk'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'on-time' ? 'On Time' : filter === 'delayed' ? 'Delayed' : 'At Risk'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Vehicle List */}
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
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
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${statusStyle.light} rounded-lg`}>
                      <Truck className={`w-4 h-4 ${statusStyle.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          Vehicle {vehicle.id}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} text-white flex items-center gap-1`}>
                          <StatusIcon className="w-2 h-2" />
                          {statusStyle.bg === 'bg-green-500' ? 'On Time' : statusStyle.bg === 'bg-yellow-500' ? 'Delayed' : 'At Risk'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {vehicle.driver}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{vehicle.route?.split('→')[0]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Navigation className="w-3.5 h-3.5 text-gray-400" />
                    <span>{vehicle.route?.split('→')[1]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>ETA: {vehicle.eta}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Gauge className="w-3.5 h-3.5 text-gray-400" />
                    <span>{vehicle.speed} km/h</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-500 mb-1.5">
                    <span>Route Progress</span>
                    <span>{vehicle.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        vehicle.progress > 75 ? 'bg-green-500' : vehicle.progress > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${vehicle.progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 mt-2.5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600">{vehicle.fuelLevel || 85}% fuel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Battery className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600">Score: {vehicle.driverScore || 85}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      
      <div className="px-5 py-2.5 bg-gray-50 text-center text-sm text-gray-500 border-t border-gray-200">
        {filteredVehicles.length} of {vehicles.length} vehicles
      </div>
    </div>
  );
};


export default VehicleList;