import React, { useState, useEffect, useRef } from 'react';


const STATUS_COLOR = {
  ACTIVE: '#1E5EFF',
  PENDING: '#FBBF24',
  ALERT: '#EF4444',
  COMPLETED: '#22C55E',
};


const INITIAL_DRIVERS = [
  { driverId: 'D1001', name: 'Michael van der Merwe' },
  { driverId: 'D1002', name: 'Thabo Nkosi' },
  { driverId: 'D1003', name: 'Priya Naidoo' },
  { driverId: 'D1004', name: 'Johan Botha' },
  { driverId: 'D1005', name: 'Lerato Molefe' },
  { driverId: 'D1006', name: 'David O\'Connor' },
];


const INITIAL_LOCATIONS = [
  { driverId: 'D1001', latitude: -26.195, longitude: 28.045, speed: 65, timestamp: new Date().toISOString() },
  { driverId: 'D1002', latitude: -26.185, longitude: 28.055, speed: 42, timestamp: new Date().toISOString() },
  { driverId: 'D1003', latitude: -26.205, longitude: 28.035, speed: 78, timestamp: new Date().toISOString() },
  { driverId: 'D1004', latitude: -26.175, longitude: 28.065, speed: 23, timestamp: new Date().toISOString() },
  { driverId: 'D1005', latitude: -26.215, longitude: 28.025, speed: 55, timestamp: new Date().toISOString() },
  { driverId: 'D1006', latitude: -26.190, longitude: 28.050, speed: 38, timestamp: new Date().toISOString() },
];


const INITIAL_TRIPS = [
  { driverId: 'D1001', status: 'ACTIVE' },
  { driverId: 'D1002', status: 'PENDING' },
  { driverId: 'D1003', status: 'ALERT' },
  { driverId: 'D1004', status: 'COMPLETED' },
  { driverId: 'D1005', status: 'ACTIVE' },
  { driverId: 'D1006', status: 'PENDING' },
];


const INITIAL_ALERTS = [
  { driverId: 'D1003', severity: 'HIGH', message: 'Speeding detected' },
];


const VehicleTrackingMap = () => {
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [trips, setTrips] = useState(INITIAL_TRIPS);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filter, setFilter] = useState('All');
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});


  const getDriverStatus = (driverId) => {
    const trip = trips.find((t) => t.driverId === driverId);
    return trip?.status || 'PENDING';
  };


  const hasAlert = (driverId) => alerts.some((a) => a.driverId === driverId && a.severity === 'HIGH');


  const getFilteredDrivers = () => {
    if (filter === 'All') return drivers;
    if (filter === 'On Time') return drivers.filter(d => getDriverStatus(d.driverId) === 'ACTIVE');
    if (filter === 'Delayed') return drivers.filter(d => getDriverStatus(d.driverId) === 'ALERT');
    if (filter === 'At Risk') return drivers.filter(d => hasAlert(d.driverId));
    return drivers;
  };


  const filteredDrivers = getFilteredDrivers();
  const filteredDriverIds = new Set(filteredDrivers.map(d => d.driverId));


  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L && !mapRef.current && mapContainerRef.current) {
      initMap();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      initMap();
    };
    script.onerror = () => {
      console.error('Failed to load Leaflet');
      setMapLoaded(false);
    };
    document.body.appendChild(script);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);


  const initMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      mapRef.current = window.L.map(mapContainerRef.current).setView([-26.20, 28.05], 13);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapLoaded(false);
    }
  };


  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L) return;

    Object.values(markersRef.current).forEach(marker => {
      if (mapRef.current && marker) {
        mapRef.current.removeLayer(marker);
      }
    });
    markersRef.current = {};

    locations.forEach((loc) => {
      const driver = drivers.find((d) => d.driverId === loc.driverId);
      if (!driver) return;
      if (!filteredDriverIds.has(driver.driverId)) return;

      const status = getDriverStatus(driver.driverId);
      const hasActiveAlert = hasAlert(driver.driverId);
      const color = hasActiveAlert ? '#EF4444' : STATUS_COLOR[status];

      const iconHtml = `
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
        ">
          ${driver.name.charAt(0)}
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });

      const marker = window.L.marker([loc.latitude, loc.longitude], { icon: customIcon })
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="min-width: 150px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${driver.name}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 8px;">${driver.driverId}</div>
            <div style="font-size: 12px; margin-bottom: 4px;">Speed: <strong>${loc.speed} km/h</strong></div>
            <div style="font-size: 12px; margin-bottom: 4px;">Status: <span style="color: ${color}">${status}</span></div>
            ${hasActiveAlert ? '<div style="font-size: 12px; color: red; margin-top: 8px;">⚠️ Active Alert</div>' : ''}
          </div>
        `);

      marker.on('click', () => {
        setSelectedDriver({ ...driver, loc, status });
      });

      markersRef.current[driver.driverId] = marker;
    });
  }, [locations, drivers, filteredDriverIds, mapLoaded]);


  useEffect(() => {
    const interval = setInterval(() => {
      setLocations(prevLocations => 
        prevLocations.map(loc => ({
          ...loc,
          latitude: Math.max(-26.23, Math.min(-26.17, loc.latitude + (Math.random() - 0.5) * 0.002)),
          longitude: Math.max(28.02, Math.min(28.07, loc.longitude + (Math.random() - 0.5) * 0.002)),
          speed: Math.max(20, Math.min(120, loc.speed + (Math.random() - 0.5) * 10)),
          timestamp: new Date().toISOString(),
        }))
      );
      
      if (Math.random() < 0.1) {
        setTrips(prevTrips =>
          prevTrips.map(trip => ({
            ...trip,
            status: Math.random() < 0.3 
              ? ['ACTIVE', 'PENDING', 'ALERT', 'COMPLETED'][Math.floor(Math.random() * 4)]
              : trip.status
          }))
        );
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);


  return (
    <div className="lg:col-span-2 bg-[#EEF2F7] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex justify-between items-center flex-wrap gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          Real-Time Vehicle Tracking
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
      <div className="relative h-[500px] w-full rounded-2xl overflow-hidden mx-0">
        <div 
          ref={mapContainerRef} 
          className="w-full h-full"
          style={{ background: '#e8eef4' }}
        />
        
        {/* Loading indicator */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EEF2F7]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-sm text-gray-400">Loading map...</p>
            </div>
          </div>
        )}

        {/* Selected Driver Info Panel */}
        {selectedDriver && selectedDriver.loc && (
          <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-w-[220px] z-[1000]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-gray-800 text-base">
                  {selectedDriver.name}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">
                  {selectedDriver.driverId}
                </div>
              </div>
              <button 
                onClick={() => setSelectedDriver(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Status</span>
                <span 
                  className="text-xs font-semibold"
                  style={{ color: STATUS_COLOR[selectedDriver.status] || '#94A3B8' }}
                >
                  {selectedDriver.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Speed</span>
                <span className="text-gray-800 text-xs font-semibold">
                  {selectedDriver.loc.speed} km/h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Location</span>
                <span className="text-gray-800 text-xs font-semibold">
                  {selectedDriver.loc.latitude.toFixed(4)}, {selectedDriver.loc.longitude.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Updated</span>
                <span className="text-gray-800 text-xs">
                  {new Date(selectedDriver.loc.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {hasAlert(selectedDriver.driverId) && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="text-red-500 text-xs font-semibold">
                    ⚠️ Active Alert
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 text-xs z-[1000]">
          <div className="font-semibold mb-1 text-gray-700">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#1E5EFF]"></div>
              <span className="text-gray-400">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FBBF24]"></div>
              <span className="text-gray-400">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
              <span className="text-gray-400">Alert</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#22C55E]"></div>
              <span className="text-gray-400">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500"></span> Live tracking active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span> 6 drivers monitoring
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span> Real-time updates: 5s
        </span>
      </div>
    </div>
  );
};


export default VehicleTrackingMap;