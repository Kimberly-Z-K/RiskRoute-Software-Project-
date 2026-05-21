import React, { useState, useEffect, useRef } from 'react';

const STATUS_COLOR = {
  ACTIVE: '#1E5EFF',
  PENDING: '#FBBF24',
  ALERT: '#EF4444',
  COMPLETED: '#22C55E',
};

// My own mock data
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

  // Initialize map
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if Leaflet is already loaded
    if (window.L && !mapRef.current && mapContainerRef.current) {
      initMap();
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
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
      // Don't remove scripts/styles to avoid issues
    };
  }, []);

  const initMap = () => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      // Initialize map centered on Johannesburg
      mapRef.current = window.L.map(mapContainerRef.current).setView([-26.20, 28.05], 13);

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapLoaded(false);
    }
  };

  // Update markers when locations or filter changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L) return;

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => {
      if (mapRef.current && marker) {
        mapRef.current.removeLayer(marker);
      }
    });
    markersRef.current = {};

    // Add new markers
    locations.forEach((loc) => {
      const driver = drivers.find((d) => d.driverId === loc.driverId);
      if (!driver) return;
      if (!filteredDriverIds.has(driver.driverId)) return;

      const status = getDriverStatus(driver.driverId);
      const hasActiveAlert = hasAlert(driver.driverId);
      const color = hasActiveAlert ? '#EF4444' : STATUS_COLOR[status];

      // Create custom icon
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

  // Simulate real-time updates
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
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-white">Real-Time Vehicle Tracking</h2>
          <div className="flex gap-2 text-xs flex-wrap">
            <button 
              onClick={() => setFilter('All')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'All' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              All ({drivers.length})
            </button>
            <button 
              onClick={() => setFilter('On Time')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'On Time' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              On Time ({drivers.filter(d => getDriverStatus(d.driverId) === 'ACTIVE').length})
            </button>
            <button 
              onClick={() => setFilter('Delayed')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'Delayed' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Delayed ({drivers.filter(d => getDriverStatus(d.driverId) === 'ALERT').length})
            </button>
            <button 
              onClick={() => setFilter('At Risk')}
              className={`px-2 py-1 rounded transition-colors ${
                filter === 'At Risk' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              At Risk ({drivers.filter(d => hasAlert(d.driverId)).length})
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative h-[500px] w-full bg-gray-100 dark:bg-gray-700">
        {/* Map Container */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full"
          style={{ background: '#e8eef4' }}
        />
        
        {/* Loading indicator */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
            </div>
          </div>
        )}

        {/* Selected Driver Info Panel */}
        {selectedDriver && selectedDriver.loc && (
          <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 min-w-[220px] z-[1000]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-gray-900 dark:text-white font-bold text-base">
                  {selectedDriver.name}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
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
                <span className="text-gray-500 dark:text-gray-400 text-xs">Status</span>
                <span 
                  className="text-xs font-bold"
                  style={{ color: STATUS_COLOR[selectedDriver.status] || '#94A3B8' }}
                >
                  {selectedDriver.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Speed</span>
                <span className="text-gray-900 dark:text-white text-xs font-semibold">
                  {selectedDriver.loc.speed} km/h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Location</span>
                <span className="text-gray-900 dark:text-white text-xs font-semibold">
                  {selectedDriver.loc.latitude.toFixed(4)}, {selectedDriver.loc.longitude.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Updated</span>
                <span className="text-gray-900 dark:text-white text-xs">
                  {new Date(selectedDriver.loc.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {hasAlert(selectedDriver.driverId) && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-red-600 dark:text-red-400 text-xs font-bold">
                    ⚠️ Active Alert - Immediate attention required
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs z-[1000]">
          <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#1E5EFF]"></div>
              <span className="text-gray-600 dark:text-gray-400">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FBBF24]"></div>
              <span className="text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
              <span className="text-gray-600 dark:text-gray-400">Alert/Delayed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#22C55E]"></div>
              <span className="text-gray-600 dark:text-gray-400">Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleTrackingMap;