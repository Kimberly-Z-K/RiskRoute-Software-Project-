import React from 'react';
import { Map, Maximize2, Wifi, CloudRain, Activity, MapPin, AlertTriangle, Navigation } from 'lucide-react';
import { riskZones } from '../../data/mockData';

const LiveFleetMap = ({ vehicles, onSelectVehicle, selectedVehicle }) => {
  const statusColors = {
    'on-time': 'bg-green-500',
    'delayed': 'bg-yellow-400',
    'at-risk': 'bg-red-500',
  };

  const getMapCenter = () => {
    if (!vehicles || vehicles.length === 0) return { lat: -26.20, lng: 28.05 };
    let sumLat = 0, sumLng = 0;
    vehicles.forEach(v => { sumLat += v.lat; sumLng += v.lng; });
    return { lat: sumLat / vehicles.length, lng: sumLng / vehicles.length };
  };

  const center = getMapCenter();
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.1},${center.lat - 0.1},${center.lng + 0.1},${center.lat + 0.1}&layer=mapnik&marker=${center.lat},${center.lng}`;

  const bounds = {
    minLat: center.lat - 0.1,
    maxLat: center.lat + 0.1,
    minLng: center.lng - 0.1,
    maxLng: center.lng + 0.1,
  };

  const toXY = (lat, lng) => ({
    x: ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
    y: ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100,
  });

  return (
    <div className="lg:col-span-2 bg-[#EEF2F7] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex justify-between items-center flex-wrap gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          <Map className="w-4 h-4" /> Live Fleet Map
        </p>
        <div className="flex gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> On Time
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Delayed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> At Risk
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[450px] w-full rounded-2xl overflow-hidden mx-0">
        <iframe
          title="Live Fleet Map"
          src={mapUrl}
          className="w-full h-full"
          style={{ border: 0 }}
          allowFullScreen
        />

        {/* Markers overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {vehicles.slice(0, 15).map(vehicle => {
            const { x, y } = toXY(vehicle.lat, vehicle.lng);
            if (x < 0 || x > 100 || y < 0 || y > 100) return null;
            const isSelected = selectedVehicle?.id === vehicle.id;

            return (
              <div
                key={vehicle.id}
                className="absolute cursor-pointer pointer-events-auto"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                onClick={() => onSelectVehicle?.(vehicle)}
              >
                <div className="relative group">
                  {isSelected && (
                    <div className="absolute -inset-2 rounded-full bg-blue-400 animate-ping opacity-60" />
                  )}
                  <div className={`w-4 h-4 rounded-full ${statusColors[vehicle.status]} ring-2 ring-white shadow-md relative z-10`} />
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-100 rounded-xl shadow-md text-xs px-3 py-2 whitespace-nowrap pointer-events-none z-20">
                    <div className="font-semibold text-gray-800">{vehicle.id}</div>
                    <div className="text-gray-400 mt-0.5">Driver: {vehicle.driver}</div>
                    <div className="text-gray-400">Status: {vehicle.status}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-20 font-medium">
                      {vehicle.id} — {vehicle.driver}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Risk zones */}
          {riskZones.map(zone => {
            const { x, y } = toXY(zone.lat, zone.lng);
            if (x < 0 || x > 100 || y < 0 || y > 100) return null;

            return (
              <div
                key={zone.id}
                className="absolute pointer-events-none"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-red-500 bg-red-500/20 animate-pulse">
                    <div className="absolute inset-0 rounded-full border border-red-400 animate-ping" />
                  </div>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-red-500 bg-white/90 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-red-100">
                    <AlertTriangle className="w-3 h-3" />
                    {zone.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand button */}
        <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 z-10">
          <button
            onClick={() => window.open(mapUrl, '_blank')}
            className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
            title="Open full map"
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Info pill */}
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 text-xs z-10 space-y-1">
          <p className="font-semibold text-gray-700 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gray-400" /> {vehicles.length} vehicles active
          </p>
          <p className="text-gray-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> {riskZones.length} risk zones
          </p>
          <p className="text-gray-400 flex items-center gap-1.5">
            <Navigation className="w-3 h-3" /> Click a vehicle for details
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-green-500" /> Live tracking active
        </span>
        <span className="flex items-center gap-1.5">
          <CloudRain className="w-3 h-3 text-blue-400" /> Weather overlay loaded
        </span>
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-purple-400" /> Real-time updates: 8s
        </span>
      </div>
    </div>
  );
};

export default LiveFleetMap;