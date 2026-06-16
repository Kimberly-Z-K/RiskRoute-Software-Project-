import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';


const RiskHeatmap = () => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const regions = [
    { 
      id: 1,
      name: 'Johannesburg', 
      lat: -26.2041, 
      lng: 28.0473, 
      risk: 85, 
      incidents: 45, 
      trend: '+12%'
    },
    { 
      id: 2,
      name: 'Cape Town', 
      lat: -33.9249, 
      lng: 18.4241, 
      risk: 72, 
      incidents: 32, 
      trend: '+5%'
    },
    { 
      id: 3,
      name: 'Durban', 
      lat: -29.8587, 
      lng: 31.0218, 
      risk: 68, 
      incidents: 28, 
      trend: '-3%'
    },
    { 
      id: 4,
      name: 'Pretoria', 
      lat: -25.7479, 
      lng: 28.2293, 
      risk: 58, 
      incidents: 22, 
      trend: '+8%'
    },
    { 
      id: 5,
      name: 'Port Elizabeth', 
      lat: -33.9608, 
      lng: 25.6022, 
      risk: 52, 
      incidents: 19, 
      trend: '+3%'
    },
    { 
      id: 6,
      name: 'Nelspruit', 
      lat: -25.4657, 
      lng: 30.9807, 
      risk: 45, 
      incidents: 16, 
      trend: '-5%'
    },
    { 
      id: 7,
      name: 'Bloemfontein', 
      lat: -29.0852, 
      lng: 26.1596, 
      risk: 38, 
      incidents: 12, 
      trend: '-2%'
    }
  ];

  const getRiskColor = (risk) => {
    if (risk >= 70) return '#EF4444';
    if (risk >= 50) return '#F97316';
    if (risk >= 30) return '#EAB308';
    return '#22C55E';
  };

  const getRiskTextColor = (risk) => {
    if (risk >= 70) return 'text-red-700';
    if (risk >= 50) return 'text-orange-700';
    if (risk >= 30) return 'text-yellow-700';
    return 'text-green-700';
  };

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
      mapRef.current = window.L.map(mapContainerRef.current).setView([-29.0, 25.0], 5);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: false
      }).addTo(mapRef.current);

      setMapLoaded(true);

      regions.forEach((region) => {
        const color = getRiskColor(region.risk);
        
        const iconHtml = `
          <div style="
            width: 24px;
            height: 24px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${region.risk >= 70 ? '<div style="position: absolute; width: 32px; height: 32px; border: 2px solid rgba(239, 68, 68, 0.6); border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ''}
          </div>
        `;

        const customIcon = window.L.divIcon({
          html: iconHtml,
          className: 'custom-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        window.L.marker([region.lat, region.lng], { icon: customIcon })
          .addTo(mapRef.current)
          .on('click', () => {
            setSelectedRegion(region);
          });
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapLoaded(false);
    }
  };

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L) return;

    mapRef.current.eachLayer((layer) => {
      if (layer instanceof window.L.Marker) {
        mapRef.current.removeLayer(layer);
      }
    });

    regions.forEach((region) => {
      const color = getRiskColor(region.risk);
      
      const iconHtml = `
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      window.L.marker([region.lat, region.lng], { icon: customIcon })
        .addTo(mapRef.current)
        .on('click', () => {
          setSelectedRegion(region);
        });
    });
  }, [mapLoaded, regions]);

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900">Risk Heatmap</h3>
        <p className="text-xs text-gray-500">{regions.length} locations</p>
      </div>

      <div 
        ref={mapContainerRef} 
        className="rounded-lg overflow-hidden border border-gray-200"
        style={{ height: '450px' }}
      />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
        </div>
      )}

      <div className="mt-3 flex justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Critical (70+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-gray-600">High (50-69)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">Medium (30-49)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Low (&lt;30)</span>
        </div>
      </div>

      {selectedRegion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" onClick={() => setSelectedRegion(null)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-bold text-gray-900">{selectedRegion.name}</h4>
              <button onClick={() => setSelectedRegion(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Risk Score</span>
                  <span className={`text-xl font-bold ${getRiskTextColor(selectedRegion.risk)}`}>
                    {selectedRegion.risk}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getRiskColor(selectedRegion.risk).replace('#', '')}`}
                    style={{ width: `${selectedRegion.risk}%` }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Incidents</p>
                  <p className="font-bold text-lg">{selectedRegion.incidents}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Trend</p>
                  <p className={`font-bold ${selectedRegion.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedRegion.trend}
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedRegion(null)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


export default RiskHeatmap;