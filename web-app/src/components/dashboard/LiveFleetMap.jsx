import React, { useState } from 'react';
import { Map, Maximize2, Compass, Wifi, CloudRain, Activity, MapPin, AlertTriangle, Navigation, Clock } from 'lucide-react';
import { riskZones } from '../../data/mockData';

const LiveFleetMap = ({ vehicles, onSelectVehicle, selectedVehicle }) => {
  const statusColors = {
    'on-time': 'border-green-500 bg-green-500',
    'delayed': 'border-yellow-500 bg-yellow-500',
    'at-risk': 'border-red-500 bg-red-500'
  };

  // Calculate center of all vehicles
  const getMapCenter = () => {
    if (!vehicles || vehicles.length === 0) {
      return { lat: -26.20, lng: 28.05 }; // Default to Johannesburg
    }
    
    let sumLat = 0;
    let sumLng = 0;
    vehicles.forEach(v => {
      sumLat += v.lat;
      sumLng += v.lng;
    });
    
    return {
      lat: sumLat / vehicles.length,
      lng: sumLng / vehicles.length
    };
  };

  const center = getMapCenter();
  
  // OpenStreetMap iframe URL that shows an ACTUAL map
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.1},${center.lat - 0.1},${center.lng + 0.1},${center.lat + 0.1}&layer=mapnik&marker=${center.lat},${center.lng}`;

  const handleVehicleClick = (vehicle) => {
    if (onSelectVehicle) {
      onSelectVehicle(vehicle);
    }
  };

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
      
      <div className="relative h-[450px] w-full">
        {/* ACTUAL MAP - OpenStreetMap iframe */}
        <iframe
          title="Live Fleet Map"
          src={mapUrl}
          className="w-full h-full"
          style={{ border: 0 }}
          allowFullScreen
        />
        
        {/* Overlay markers on top of the map */}
        <div className="absolute inset-0 pointer-events-none">
          {vehicles.slice(0, 15).map((vehicle) => {
            // Convert lat/lng to percentage for overlay positioning
            const bounds = { 
              minLat: center.lat - 0.1, 
              maxLat: center.lat + 0.1, 
              minLng: center.lng - 0.1, 
              maxLng: center.lng + 0.1 
            };
            const x = ((vehicle.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
            const y = ((bounds.maxLat - vehicle.lat) / (bounds.maxLat - bounds.minLat)) * 100;
            const isSelected = selectedVehicle?.id === vehicle.id;
            
            if (x < 0 || x > 100 || y < 0 || y > 100) return null;
            
            return (
              <div
                key={vehicle.id}
                className="absolute cursor-pointer pointer-events-auto"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                onClick={() => handleVehicleClick(vehicle)}
              >
                <div className="relative group">
                  {isSelected && (
                    <div className="absolute -inset-2 rounded-full bg-blue-500 animate-ping opacity-75"></div>
                  )}
                  <div className={`w-4 h-4 rounded-full ${statusColors[vehicle.status]} ring-2 ring-white dark:ring-gray-800 shadow-lg relative z-10`} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition bg-black/85 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                    <div className="font-bold">{vehicle.id}</div>
                    <div className="text-gray-300">Driver: {vehicle.driver}</div>
                    <div className="text-gray-300">Status: {vehicle.status}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
                      {vehicle.id} - {vehicle.driver}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Risk Zones Overlay */}
          {riskZones.map(zone => {
            const bounds = { 
              minLat: center.lat - 0.1, 
              maxLat: center.lat + 0.1, 
              minLng: center.lng - 0.1, 
              maxLng: center.lng + 0.1 
            };
            const x = ((zone.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
            const y = ((bounds.maxLat - zone.lat) / (bounds.maxLat - bounds.minLat)) * 100;
            
            if (x < 0 || x > 100 || y < 0 || y > 100) return null;
            
            return (
              <div
                key={zone.id}
                className="absolute pointer-events-none"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-red-500 bg-red-500/20 animate-pulse">
                    <div className="absolute inset-0 rounded-full border border-red-500 animate-ping"></div>
                  </div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-bold text-red-600 dark:text-red-400 bg-white/80 dark:bg-gray-800/80 px-1 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {zone.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Map Controls */}
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex gap-2 z-10">
          <button 
            onClick={() => window.open(mapUrl, '_blank')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Open in full map"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Info Panel */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 text-xs z-10">
          <p className="font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {vehicles.length} vehicles active
          </p>
          <p className="text-gray-500 flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" /> {riskZones.length} risk zones
          </p>
          <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
            <Navigation className="w-3 h-3" /> Click on vehicles for details
          </p>
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