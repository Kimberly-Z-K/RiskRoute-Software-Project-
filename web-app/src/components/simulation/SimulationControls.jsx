import React, { useState, useEffect } from 'react';
import { Zap, MapPin, Loader, CloudRain, Sun, Wind, Thermometer } from 'lucide-react';

const API_BASE_URL = "http://localhost:5000/api";
const WEATHER_API_KEY = "ec5202fdabe043c4b0f190711262807";

const SimulationControls = ({ 
  params = { delay: 30, weather: 'moderate', accident: false, roadClosure: false }, 
  setParams, 
  onRunSimulation,
  routes = [],
  isRoutesLoading = false
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [enrichedRoutes, setEnrichedRoutes] = useState([]);
  const [enriching, setEnriching] = useState(false);
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Fetch live weather data from OpenWeather API
  const fetchLiveWeather = async (lat, lng) => {
    if (!lat || !lng) return null;
    
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        return {
          condition: data.weather?.[0]?.description || 'Unknown',
          temperature: Math.round(data.main?.temp || 0),
          feelsLike: Math.round(data.main?.feels_like || 0),
          humidity: data.main?.humidity || 0,
          rainfall: data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0,
          windSpeed: Math.round((data.wind?.speed || 0) * 3.6), // Convert m/s to km/h
          windGust: data.wind?.gust ? Math.round(data.wind.gust * 3.6) : null,
          visibility: data.visibility ? Math.round(data.visibility / 1000) : 0,
          pressure: data.main?.pressure || 0,
          icon: data.weather?.[0]?.icon || '',
          severity: calculateWeatherSeverity(data)
        };
      }
    } catch (error) {
      console.warn('Failed to fetch weather data:', error);
    }
    return null;
  };

  // Calculate weather severity based on conditions
  const calculateWeatherSeverity = (data) => {
    let severity = 0;
    
    // Rain impact
    if (data.rain) {
      const rainfall = data.rain['1h'] || data.rain['3h'] || 0;
      if (rainfall > 10) severity += 40;
      else if (rainfall > 5) severity += 25;
      else if (rainfall > 1) severity += 10;
    }
    
    // Wind impact
    if (data.wind) {
      const windSpeed = data.wind.speed;
      if (windSpeed > 15) severity += 30;
      else if (windSpeed > 10) severity += 20;
      else if (windSpeed > 5) severity += 10;
    }
    
    // Visibility impact
    if (data.visibility && data.visibility < 1000) {
      severity += 20;
    } else if (data.visibility && data.visibility < 5000) {
      severity += 10;
    }
    
    // Temperature extremes
    if (data.main) {
      const temp = data.main.temp;
      if (temp > 35) severity += 15;
      else if (temp < 0) severity += 10;
    }
    
    return Math.min(severity, 100);
  };

  // Simple reverse geocode using your backend API
  const reverseGeocodePoint = async (lat, lng) => {
    try {
      const url = `${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.label) {
          return data.data.label;
        }
      }
    } catch (error) {
      console.warn('Reverse geocode failed:', error);
    }
    return null;
  };

  // Get the actual route name from the route data
  const getRouteDisplayName = (route) => {
    // If route already has a name from the database, use it
    if (route.name && route.name !== 'Unnamed Route') {
      return route.name;
    }

    // Try to get from start_point and stops
    if (route.start_point && route.stops && route.stops.length > 0) {
      const originName = route.start_point.name || 'Start';
      const destName = route.stops[route.stops.length - 1].name || 'Destination';
      if (originName !== 'Start' && destName !== 'Destination') {
        return `${originName} → ${destName}`;
      }
    }

    // Try to get from origin_name and destination_name
    if (route.origin_name && route.destination_name) {
      return `${route.origin_name} → ${route.destination_name}`;
    }

    // Use route ID as fallback
    return `Route ${route.id || route.route_id || 'Unknown'}`;
  };

  // Enrich routes with proper names and weather data
  const enrichRoutesWithNames = async (routesData) => {
    if (!routesData || routesData.length === 0) return routesData;

    setEnriching(true);
    const enriched = [];

    for (const route of routesData) {
      try {
        // Get display name from existing data first
        let displayName = getRouteDisplayName(route);
        
        // If still generic, try reverse geocoding
        if (displayName.includes('Route') || displayName === 'Unnamed Route') {
          let originName = null;
          let destName = null;

          // Get origin
          if (route.start_point && route.start_point.lat && route.start_point.lng) {
            originName = await reverseGeocodePoint(route.start_point.lat, route.start_point.lng);
          } else if (route.start_lat && route.start_lng) {
            originName = await reverseGeocodePoint(route.start_lat, route.start_lng);
          }

          // Get destination from stops
          if (route.stops && route.stops.length > 0) {
            const lastStop = route.stops[route.stops.length - 1];
            if (lastStop.lat && lastStop.lng) {
              destName = await reverseGeocodePoint(lastStop.lat, lastStop.lng);
            }
          }

          // Build display name
          if (originName && destName) {
            displayName = `${originName} → ${destName}`;
          } else if (originName) {
            displayName = `From ${originName}`;
          } else if (destName) {
            displayName = `To ${destName}`;
          }
        }

        // Fetch live weather for the route's origin
        let weatherData = null;
        if (route.start_point && route.start_point.lat && route.start_point.lng) {
          weatherData = await fetchLiveWeather(route.start_point.lat, route.start_point.lng);
        } else if (route.start_lat && route.start_lng) {
          weatherData = await fetchLiveWeather(route.start_lat, route.start_lng);
        }

        const enrichedRoute = {
          ...route,
          display_name: displayName,
          live_weather: weatherData
        };

        enriched.push(enrichedRoute);
        
        // Store weather for first route as default
        if (!liveWeather && weatherData) {
          setLiveWeather(weatherData);
        }
        
      } catch (error) {
        console.error('Error enriching route:', error);
        enriched.push({
          ...route,
          display_name: route.name || `Route ${route.id || route.route_id || 'Unknown'}`
        });
      }
    }

    setEnriching(false);
    return enriched;
  };

  // Process routes when they change
  useEffect(() => {
    const processRoutes = async () => {
      if (routes && routes.length > 0) {
        console.log('[SimulationControls] Processing routes:', routes.length);
        const enriched = await enrichRoutesWithNames(routes);
        setEnrichedRoutes(enriched);
      } else {
        setEnrichedRoutes([]);
      }
    };

    processRoutes();
  }, [routes]);

  // Set first route as default when routes load
  useEffect(() => {
    if (enrichedRoutes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(enrichedRoutes[0].id || enrichedRoutes[0].route_id);
    }
  }, [enrichedRoutes, selectedRouteId]);

  // Update weather when selected route changes
  useEffect(() => {
    const updateWeather = async () => {
      if (selectedRoute) {
        const route = enrichedRoutes.find(r => (r.id || r.route_id) === selectedRouteId);
        if (route && route.live_weather) {
          setLiveWeather(route.live_weather);
        } else if (route) {
          // Try to fetch weather if not already available
          let lat, lng;
          if (route.start_point && route.start_point.lat && route.start_point.lng) {
            lat = route.start_point.lat;
            lng = route.start_point.lng;
          } else if (route.start_lat && route.start_lng) {
            lat = route.start_lat;
            lng = route.start_lng;
          }
          
          if (lat && lng) {
            const weather = await fetchLiveWeather(lat, lng);
            if (weather) {
              setLiveWeather(weather);
              // Update the route with weather data
              const updatedRoutes = enrichedRoutes.map(r => {
                if ((r.id || r.route_id) === selectedRouteId) {
                  return { ...r, live_weather: weather };
                }
                return r;
              });
              setEnrichedRoutes(updatedRoutes);
            }
          }
        }
      }
    };

    updateWeather();
  }, [selectedRouteId, enrichedRoutes]);

  const handleDelayChange = (e) => {
    if (setParams) {
      setParams({ ...params, delay: parseInt(e.target.value) || 0 });
    }
  };
  
  const handleWeatherChange = (e) => {
    if (setParams) {
      setParams({ ...params, weather: e.target.value });
    }
  };
  
  const handleAccidentChange = (e) => {
    if (setParams) {
      setParams({ ...params, accident: e.target.checked });
    }
  };
  
  const handleRoadClosureChange = (e) => {
    if (setParams) {
      setParams({ ...params, roadClosure: e.target.checked });
    }
  };
  
  const handleRunSimulation = () => {
    if (onRunSimulation) {
      onRunSimulation(selectedRouteId);
    }
  };

  // Get selected route details
  const selectedRoute = enrichedRoutes.find(r => {
    const routeId = r.id || r.route_id;
    return routeId === selectedRouteId;
  });

  const isLoading = isRoutesLoading || enriching;

  // Get weather icon based on condition
  const getWeatherIcon = (condition) => {
    if (!condition) return <Sun className="w-4 h-4" />;
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('shower')) return <CloudRain className="w-4 h-4 text-blue-500" />;
    if (lower.includes('storm') || lower.includes('thunder')) return <CloudRain className="w-4 h-4 text-purple-500" />;
    if (lower.includes('wind')) return <Wind className="w-4 h-4 text-gray-500" />;
    if (lower.includes('clear') || lower.includes('sun')) return <Sun className="w-4 h-4 text-yellow-500" />;
    if (lower.includes('cloud')) return <Sun className="w-4 h-4 text-gray-400" />;
    return <Thermometer className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h2 className="font-bold text-lg mb-4 text-gray-900">What-If Simulation</h2>
      
      <div className="space-y-4">
        {/* Route Selection Dropdown */}
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">
            Select Route
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            value={selectedRouteId} 
            onChange={(e) => setSelectedRouteId(e.target.value)}
            disabled={isLoading || enrichedRoutes.length === 0}
          >
            {isLoading ? (
              <option>Loading routes...</option>
            ) : enrichedRoutes.length === 0 ? (
              <option>No routes available</option>
            ) : (
              enrichedRoutes.map((route) => {
                const id = route.id || route.route_id;
                return (
                  <option key={id} value={id}>
                    {route.display_name || route.name || `Route ${id}`}
                  </option>
                );
              })
            )}
          </select>
          
          {/* Show route details with weather */}
          {selectedRoute && !isLoading && (
            <div className="mt-3 space-y-1.5 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-gray-500">From</span>
                  <p className="font-medium text-gray-800">
                    {selectedRoute.start_point?.name || 
                     selectedRoute.origin_name || 
                     (selectedRoute.start_point?.lat && selectedRoute.start_point?.lng ? 
                       `${selectedRoute.start_point.lat.toFixed(4)}, ${selectedRoute.start_point.lng.toFixed(4)}` : 
                       'Unknown')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-gray-500">To</span>
                  <p className="font-medium text-gray-800">
                    {selectedRoute.stops && selectedRoute.stops.length > 0 ? 
                      (selectedRoute.stops[selectedRoute.stops.length - 1].name || 
                       selectedRoute.destination_name ||
                       (selectedRoute.stops[selectedRoute.stops.length - 1].lat && 
                        selectedRoute.stops[selectedRoute.stops.length - 1].lng ? 
                        `${selectedRoute.stops[selectedRoute.stops.length - 1].lat.toFixed(4)}, ${selectedRoute.stops[selectedRoute.stops.length - 1].lng.toFixed(4)}` : 
                        'Unknown')) : 
                      'Unknown'}
                  </p>
                </div>
              </div>
              
              {/* Live Weather Display */}
              {selectedRoute.live_weather && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getWeatherIcon(selectedRoute.live_weather.condition)}
                      <span className="text-xs font-medium text-gray-700">
                        {selectedRoute.live_weather.condition}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-red-500" />
                      <span className="text-xs font-bold text-gray-800">
                        {selectedRoute.live_weather.temperature}°C
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-1 text-xs">
                    {selectedRoute.live_weather.rainfall > 0 && (
                      <div className="flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-blue-500" />
                        <span className="text-gray-600">{selectedRoute.live_weather.rainfall}mm</span>
                      </div>
                    )}
                    {selectedRoute.live_weather.windSpeed > 0 && (
                      <div className="flex items-center gap-1">
                        <Wind className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-600">{selectedRoute.live_weather.windSpeed}km/h</span>
                      </div>
                    )}
                    {selectedRoute.live_weather.severity > 0 && (
                      <div className="flex items-center gap-1">
                        <span className={`font-medium ${selectedRoute.live_weather.severity > 70 ? 'text-red-600' : selectedRoute.live_weather.severity > 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                          Severity: {selectedRoute.live_weather.severity}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200">
                {selectedRoute.duration_min && selectedRoute.duration_min !== 'N/A' && (
                  <span>⏱️ {selectedRoute.duration_min} min</span>
                )}
                {selectedRoute.estimated_cost && selectedRoute.estimated_cost !== 'N/A' && (
                  <span>💰 R{selectedRoute.estimated_cost}</span>
                )}
                {selectedRoute.distance_km && selectedRoute.distance_km !== 'N/A' && (
                  <span>📏 {selectedRoute.distance_km} km</span>
                )}
              </div>
            </div>
          )}
          
          {enrichedRoutes.length === 0 && !isLoading && (
            <p className="text-xs text-red-500 mt-1">No routes found in database</p>
          )}
          {enrichedRoutes.length > 0 && !isLoading && (
            <p className="text-xs text-green-500 mt-1">✅ {enrichedRoutes.length} route(s) available</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">
            Delay (minutes): <span className="font-semibold">{params.delay || 0}</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="120" 
            value={params.delay || 0} 
            onChange={handleDelayChange} 
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>60</span>
            <span>120</span>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">Weather</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            value={params.weather || 'moderate'} 
            onChange={handleWeatherChange}
          >
            <option value="clear">☀️ Clear</option>
            <option value="moderate">🌧️ Moderate Rain</option>
            <option value="severe">⛈️ Severe Storm</option>
          </select>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={params.accident || false} 
              onChange={handleAccidentChange} 
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">🚗 Accident</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={params.roadClosure || false} 
              onChange={handleRoadClosureChange} 
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">🚧 Road closure</span>
          </label>
        </div>
        
        <button 
          onClick={handleRunSimulation} 
          disabled={isLoading || enrichedRoutes.length === 0}
          className="w-full bg-purple-600 text-white py-2 rounded-md font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Loading Routes...
            </>
          ) : enrichedRoutes.length === 0 ? (
            'No Routes Available'
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Live Simulation
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SimulationControls;