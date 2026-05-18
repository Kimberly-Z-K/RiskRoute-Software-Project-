import React from 'react';
import { Map, Maximize2, Compass, Wifi, CloudRain, Activity } from 'lucide-react';
import { riskZones } from '../../data/mockData';

const VehicleMarker = ({ vehicle, onClick, isSelected }) => {
  const statusColors = {
    'on-time': 'border-green-500 bg-green-500',
    'delayed': 'border-yellow-500 bg-yellow-500',
    'at-risk': 'border-red-500 bg-red-500'
  };
  
  return (
    <button
      onClick={() => onClick(vehicle)}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 group focus:outline-none transition-all ${isSelected ? 'scale-125 z-10' : 'scale-100'}`}
      style={{ left: `${((vehicle.lng + 74.06) / 0.15) * 100}%`, top: `${((40.85 - vehicle.lat) / 0.25) * 100}%` }}
    >
      <div className={`w-4 h-4 rounded-full ${statusColors[vehicle.status]} ring-2 ring-white dark:ring-gray-800 shadow-lg`} />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
        {vehicle.id} - {vehicle.driver}
      </div>
    </button>
  );
};

const LiveFleetMap = ({ vehicles, onSelectVehicle, selectedVehicle }) => {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
        <h2 className="font-semibold flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-600" /> Live Fleet Map
        </h2>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> On Time</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Delayed</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> At Risk</span>
        </div>
      </div>
      <div className="relative h-[450px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#888" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Risk Zones */}
          {riskZones.map(zone => (
            <div 
              key={zone.id}
              className="absolute border-2 border-red-400 bg-red-400/20 rounded-full animate-pulse"
              style={{
                left: `${((zone.lng + 74.06) / 0.15) * 100}%`,
                top: `${((40.85 - zone.lat) / 0.25) * 100}%`,
                width: '50px',
                height: '50px',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-bold text-red-600 dark:text-red-400">
                ⚠️ {zone.name}
              </div>
            </div>
          ))}
          
          {/* Vehicle Markers */}
          {vehicles.slice(0, 15).map(vehicle => (
            <VehicleMarker 
              key={vehicle.id} 
              vehicle={vehicle} 
              onClick={onSelectVehicle}
              isSelected={selectedVehicle?.id === vehicle.id}
            />
          ))}
          
          {/* Map Controls Overlay */}
          <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded"><Maximize2 className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-gray-100 rounded"><Compass className="w-4 h-4" /></button>
          </div>
          
          <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 text-xs">
            <p className="font-semibold">📍 {vehicles.length} vehicles displayed</p>
            <p className="text-gray-500">⚠️ {riskZones.length} high-risk zones active</p>
          </div>
        </div>
      </div>
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-xs">
        <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-green-600" /> Live tracking active</span>
        <span className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-blue-600" /> Weather overlay loaded</span>
        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-purple-600" /> Real-time updates: 8s</span>
      </div>
    </div>
  );
};

export default LiveFleetMap;