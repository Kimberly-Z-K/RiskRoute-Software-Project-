import React, { useState } from 'react';
import { Map, X, TrendingUp, TrendingDown, AlertTriangle, Shield, Navigation } from 'lucide-react';

const RiskHeatmap = () => {
  const [selectedRegion, setSelectedRegion] = useState(null);

  // 7 South African regions with coordinates and risk data
  const regions = [
    { 
      id: 1,
      name: 'Johannesburg', 
      lat: -26.2041, 
      lng: 28.0473, 
      risk: 85, 
      incidents: 45, 
      type: 'Theft Hotspot', 
      trend: '+12%',
      description: 'High vehicle theft rates, especially during evening hours',
      recommendations: ['Avoid parking on dark streets', 'Use GPS tracking', 'Install security cameras']
    },
    { 
      id: 2,
      name: 'Cape Town', 
      lat: -33.9249, 
      lng: 18.4241, 
      risk: 72, 
      incidents: 32, 
      type: 'Accident Zone', 
      trend: '+5%',
      description: 'Frequent accidents due to high traffic volume',
      recommendations: ['Reduce speed', 'Avoid peak hours (4-7pm)', 'Use alternative routes']
    },
    { 
      id: 3,
      name: 'Durban', 
      lat: -29.8587, 
      lng: 31.0218, 
      risk: 68, 
      incidents: 28, 
      type: 'Cargo Theft', 
      trend: '-3%',
      description: 'Cargo theft risk, especially for high-value goods',
      recommendations: ['Secure cargo properly', 'Use escort services', 'Install tracking devices']
    },
    { 
      id: 4,
      name: 'Pretoria', 
      lat: -25.7479, 
      lng: 28.2293, 
      risk: 58, 
      incidents: 22, 
      type: 'Traffic Congestion', 
      trend: '+8%',
      description: 'Severe congestion during rush hours',
      recommendations: ['Plan routes avoiding N1/N4', 'Travel outside peak hours']
    },
    { 
      id: 5,
      name: 'Port Elizabeth', 
      lat: -33.9608, 
      lng: 25.6022, 
      risk: 52, 
      incidents: 19, 
      type: 'Accident Zone', 
      trend: '+3%',
      description: 'Coastal road accidents common',
      recommendations: ['Avoid night driving', 'Maintain safe distance']
    },
    { 
      id: 6,
      name: 'Nelspruit', 
      lat: -25.4657, 
      lng: 30.9807, 
      risk: 45, 
      incidents: 16, 
      type: 'Weather Impact', 
      trend: '-5%',
      description: 'Heavy rainfall affects road conditions',
      recommendations: ['Check weather forecasts', 'Reduce speed in rain']
    },
    { 
      id: 7,
      name: 'Bloemfontein', 
      lat: -29.0852, 
      lng: 26.1596, 
      risk: 38, 
      incidents: 12, 
      type: 'Low Risk', 
      trend: '-2%',
      description: 'Generally safe with minimal incidents',
      recommendations: ['Standard precautions apply', 'Regular vehicle maintenance']
    }
  ];

  const getRiskColor = (risk) => {
    if (risk >= 70) return 'bg-red-500';
    if (risk >= 50) return 'bg-orange-500';
    if (risk >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskSize = (risk) => {
    if (risk >= 70) return 'w-6 h-6';
    if (risk >= 50) return 'w-5 h-5';
    if (risk >= 30) return 'w-4 h-4';
    return 'w-3 h-3';
  };

  const getRiskTextColor = (risk) => {
    if (risk >= 70) return 'text-red-600';
    if (risk >= 50) return 'text-orange-600';
    if (risk >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Convert lat/lng to percentage position on the iframe map
  const getPosition = (lat, lng) => {
    // Map bounds for South Africa
    const minLng = 16, maxLng = 33;
    const minLat = -35, maxLat = -22;
    
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((lat - minLat) / (maxLat - minLat)) * 100;
    return { x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Map className="w-5 h-5 text-red-500" />
          Risk Heatmap - South Africa (7 Key Locations)
        </h3>
        <div className="text-xs text-gray-500">
          Click any marker for detailed risk information
        </div>
      </div>

      {/* Map Container with iframe */}
      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative" style={{ height: '500px' }}>
        {/* OpenStreetMap iframe */}
        <iframe
          title="South Africa Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=16.0,-35.0,33.0,-22.0&layer=mapnik&zoom=6"
          style={{ border: 0 }}
        />
        
        {/* Overlay markers */}
        <div className="absolute inset-0 pointer-events-none">
          {regions.map((region) => {
            const position = getPosition(region.lat, region.lng);
            const riskColor = getRiskColor(region.risk);
            const riskSize = getRiskSize(region.risk);
            
            return (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region)}
                className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 z-10"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <div className="relative group">
                  {/* Pulsing ring for high risk */}
                  {region.risk >= 70 && (
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                  )}
                  {/* Main marker */}
                  <div className={`relative rounded-full ${riskColor} ${riskSize} shadow-lg flex items-center justify-center border-2 border-white`}>
                    <div className="absolute inset-0 rounded-full bg-white opacity-30"></div>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="font-bold">{region.name}</div>
                    <div>Risk Score: {region.risk}/100</div>
                    <div>Type: {region.type}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Map attribution */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
          Map data © OpenStreetMap contributors | 7 Risk Locations Monitored
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Risk Legend</p>
          <p className="text-xs text-gray-500">Marker size = Risk severity</p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600 dark:text-gray-400">Critical (70-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">High (50-69)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Medium (30-49)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">Low (0-29)</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-7 gap-2 mt-3">
        <div className="text-center p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Critical</p>
          <p className="text-lg font-bold text-red-600">{regions.filter(r => r.risk >= 70).length}</p>
        </div>
        <div className="text-center p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">High</p>
          <p className="text-lg font-bold text-orange-600">{regions.filter(r => r.risk >= 50 && r.risk < 70).length}</p>
        </div>
        <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Medium</p>
          <p className="text-lg font-bold text-yellow-600">{regions.filter(r => r.risk >= 30 && r.risk < 50).length}</p>
        </div>
        <div className="text-center p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Low</p>
          <p className="text-lg font-bold text-green-600">{regions.filter(r => r.risk < 30).length}</p>
        </div>
        <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg col-span-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Monitored Locations</p>
          <p className="text-lg font-bold text-blue-600">{regions.length}</p>
        </div>
      </div>

      {/* Region Details Modal */}
      {selectedRegion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" onClick={() => setSelectedRegion(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedRegion.name}</h4>
                <p className="text-xs text-gray-500 mt-1">Coordinates: {selectedRegion.lat}°, {selectedRegion.lng}°</p>
              </div>
              <button onClick={() => setSelectedRegion(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Risk Score */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score</span>
                  <span className={`text-2xl font-bold ${getRiskTextColor(selectedRegion.risk)}`}>
                    {selectedRegion.risk}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getRiskColor(selectedRegion.risk)}`}
                    style={{ width: `${selectedRegion.risk}%` }}
                  />
                </div>
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Incidents (30d)</p>
                  <p className="font-bold text-lg">{selectedRegion.incidents}</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Monthly Trend</p>
                  <p className={`font-bold flex items-center justify-center gap-1 ${selectedRegion.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedRegion.trend.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {selectedRegion.trend}
                  </p>
                </div>
              </div>
              
              {/* Risk Type */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Risk Type</span>
                </div>
                <p className="text-sm">{selectedRegion.type}</p>
              </div>
              
              {/* Description */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Risk Description</span>
                </div>
                <p className="text-sm">{selectedRegion.description}</p>
              </div>
              
              {/* Recommendations */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium mb-2">Recommendations:</p>
                <ul className="space-y-1">
                  {selectedRegion.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedRegion(null)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
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