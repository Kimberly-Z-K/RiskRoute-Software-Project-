import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, MapPin, Loader, Cloud, CloudRain, CloudSun, Wind, Sun, CloudFog, AlertTriangle, RefreshCw, Navigation, Thermometer } from 'lucide-react';

// Your API Keys
const TOMTOM_API_KEY = "boAgd49GhcpqsqaQ6qlAfmC6YEBORJVF";
const WEATHER_API_URL = "https://pyqftjxfbjecjdhdzyor.supabase.co/functions/v1/Weather";

// South Africa Weather Types
const SOUTH_AFRICA_WEATHER = {
  SUNNY: { id: 'sunny', label: '☀️ Sunny / Clear', value: 'sunny', icon: Sun },
  PARTLY_CLOUDY: { id: 'partly_cloudy', label: '🌤️ Partly Cloudy', value: 'partly_cloudy', icon: CloudSun },
  CLOUDY: { id: 'cloudy', label: '☁️ Cloudy / Overcast', value: 'cloudy', icon: Cloud },
  LIGHT_RAIN: { id: 'light_rain', label: '🌦️ Light Rain', value: 'light_rain', icon: CloudRain },
  MODERATE_RAIN: { id: 'moderate_rain', label: '🌧️ Moderate Rain', value: 'moderate_rain', icon: CloudRain },
  HEAVY_RAIN: { id: 'heavy_rain', label: '⛈️ Heavy Rain / Thunderstorms', value: 'heavy_rain', icon: CloudRain },
  FOG: { id: 'fog', label: '🌫️ Fog / Mist', value: 'fog', icon: CloudFog },
  WINDY: { id: 'windy', label: '💨 Windy', value: 'windy', icon: Wind }
};

const WEATHER_IMPACTS = {
  sunny: { speedMultiplier: 1.0, congestionMultiplier: 1.0, delayMultiplier: 1.0, riskLevel: 'low', description: 'Clear conditions' },
  partly_cloudy: { speedMultiplier: 0.98, congestionMultiplier: 1.02, delayMultiplier: 1.02, riskLevel: 'low', description: 'Partly cloudy' },
  cloudy: { speedMultiplier: 0.95, congestionMultiplier: 1.05, delayMultiplier: 1.05, riskLevel: 'low', description: 'Overcast conditions' },
  light_rain: { speedMultiplier: 0.85, congestionMultiplier: 1.15, delayMultiplier: 1.2, riskLevel: 'medium', description: 'Light rain, reduced visibility' },
  moderate_rain: { speedMultiplier: 0.75, congestionMultiplier: 1.3, delayMultiplier: 1.4, riskLevel: 'medium', description: 'Moderate rain, wet roads' },
  heavy_rain: { speedMultiplier: 0.6, congestionMultiplier: 1.5, delayMultiplier: 1.6, riskLevel: 'high', description: 'Heavy rain, flooding risk' },
  fog: { speedMultiplier: 0.7, congestionMultiplier: 1.2, delayMultiplier: 1.3, riskLevel: 'high', description: 'Fog, low visibility' },
  windy: { speedMultiplier: 0.9, congestionMultiplier: 1.1, delayMultiplier: 1.1, riskLevel: 'medium', description: 'Strong winds' }
};

// South African cities coordinates
const SA_CITIES = [
  { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
  { name: 'Pretoria', lat: -25.7479, lng: 28.2293 },
  { name: 'Durban', lat: -29.8587, lng: 31.0218 },
  { name: 'Port Elizabeth', lat: -33.9608, lng: 25.6022 },
  { name: 'Bloemfontein', lat: -29.0852, lng: 26.1596 },
  { name: 'East London', lat: -33.0153, lng: 27.9116 },
  { name: 'Nelspruit', lat: -25.4748, lng: 30.9703 },
  { name: 'Polokwane', lat: -23.8962, lng: 29.4486 },
  { name: 'Kimberley', lat: -28.7282, lng: 24.7499 },
  { name: 'George', lat: -33.9631, lng: 22.4555 },
  { name: 'Pietermaritzburg', lat: -29.6168, lng: 30.3928 }
];

// HARDCODED ROUTES
const HARDCODED_ROUTES = [
  {
    id: 'route-19',
    route_id: 'route-19',
    display_name: 'Route #19 - Johannesburg to Durban',
    name: 'Route #19 - Johannesburg to Durban',
    origin_name: 'Johannesburg',
    destination_name: 'Durban',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -29.8587,
    end_lng: 31.0218,
    distance_km: 570.29,
    duration_min: 333,
    estimated_time: 333,
    estimated_cost: 'N/A',
    traffic_delay: 3,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/30/2026, 8:03:25 AM',
    stops: [
      { latitude: -26.2041, longitude: 28.0473, name: '189 Rahimoosa Street, Johannesburg, 2001' },
      { latitude: -29.8587, longitude: 31.0218, name: '14 Dirk Uys Street, Umbilo, Durban, 4001' }
    ]
  },
  {
    id: 'route-18',
    route_id: 'route-18',
    display_name: 'Route #18 - OR Tambo to Sandton',
    name: 'Route #18 - OR Tambo to Sandton',
    origin_name: 'OR Tambo International Airport',
    destination_name: 'Sandton',
    start_lat: -26.1392,
    start_lng: 28.2460,
    end_lat: -26.1076,
    end_lng: 28.0567,
    distance_km: 36.649,
    duration_min: 47,
    estimated_time: 47,
    estimated_cost: 'N/A',
    traffic_delay: 2,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/30/2026, 7:49:56 AM',
    stops: [
      { latitude: -26.1392, longitude: 28.2460, name: 'OR Tambo International Airport, Kempton Park, 1627' },
      { latitude: -26.1076, longitude: 28.0567, name: '81 Rivonia Road, Sandton, 2196' }
    ]
  }
];

const SimulationControls = ({ 
  params = { delay: 30, weather: 'moderate', accident: false, roadClosure: false }, 
  setParams, 
  onRunSimulation,
  routes = [],
  isRoutesLoading = false,
  location = 'Johannesburg,ZA'
}) => {
  // State
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [enrichedRoutes, setEnrichedRoutes] = useState([]);
  const [enriching, setEnriching] = useState(false);
  
  // ✅ Weather State - Shows current temperature
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [useLiveWeather, setUseLiveWeather] = useState(true);
  
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [simulationResults, setSimulationResults] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [recommendedRoute, setRecommendedRoute] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [trafficIncidents, setTrafficIncidents] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [simulationRunCount, setSimulationRunCount] = useState(0);
  const [isRouteAffected, setIsRouteAffected] = useState(false);
  const [affectedReasons, setAffectedReasons] = useState([]);
  
  const abortControllerRef = useRef(null);
  const weatherUpdateInterval = useRef(null);

  // ✅ FIXED: Weather Service - Shows current temperature
  const fetchLiveWeather = useCallback(async (lat, lng) => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      const url = `${WEATHER_API_URL}?lat=${lat}&lng=${lng}`;
      console.log('🌤️ Fetching weather from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🌡️ Weather data received:', data);
      
      // ✅ Extract temperature and condition
      const mappedWeather = mapToSouthAfricaWeather(data.current.condition.text);
      
      const weatherData = {
        temperature: data.current.temp_c, // ✅ Current temperature in Celsius
        condition: mappedWeather,
        conditionText: data.current.condition.text,
        windKph: data.current.wind_kph,
        humidity: data.current.humidity,
        precipMm: data.current.precip_mm || 0,
        location: data.location.name,
        country: data.location.country,
        lastUpdated: data.current.last_updated,
        isRainy: ['light_rain', 'moderate_rain', 'heavy_rain'].includes(mappedWeather),
        isWindy: mappedWeather === 'windy',
        isFoggy: mappedWeather === 'fog',
        impacts: WEATHER_IMPACTS[mappedWeather] || WEATHER_IMPACTS.sunny
      };
      
      // ✅ Store weather data with temperature
      setLiveWeather(weatherData);
      console.log(`✅ Current Temperature: ${weatherData.temperature}°C, Condition: ${weatherData.conditionText}`);
      
      // ✅ Update params with the weather condition
      if (useLiveWeather && setParams) {
        setParams(prev => ({
          ...prev,
          weather: mappedWeather
        }));
      }
      
      return weatherData;
      
    } catch (error) {
      console.error('❌ Failed to fetch weather:', error);
      setWeatherError(error.message);
      return getFallbackWeather(lat, lng);
    } finally {
      setWeatherLoading(false);
    }
  }, [useLiveWeather, setParams]);

  const mapToSouthAfricaWeather = (conditionText) => {
    const text = conditionText.toLowerCase();
    const mapping = {
      'sunny': 'sunny', 'clear': 'sunny', 'partly cloudy': 'partly_cloudy',
      'cloudy': 'cloudy', 'overcast': 'cloudy', 'patchy rain': 'light_rain',
      'light rain': 'light_rain', 'moderate rain': 'moderate_rain',
      'heavy rain': 'heavy_rain', 'thunderstorm': 'heavy_rain',
      'fog': 'fog', 'mist': 'fog', 'windy': 'windy', 'breezy': 'windy'
    };
    
    for (const [key, value] of Object.entries(mapping)) {
      if (text.includes(key)) return value;
    }
    return 'sunny';
  };

  const getFallbackWeather = (lat, lng) => {
    const city = getNearbyCity(lat, lng);
    const randomWeather = 'sunny';
    
    return {
      temperature: 25,
      condition: randomWeather,
      conditionText: 'Sunny',
      windKph: 10,
      humidity: 50,
      precipMm: 0,
      location: city || 'Unknown',
      country: 'South Africa',
      lastUpdated: new Date().toISOString(),
      isRainy: false,
      isWindy: false,
      isFoggy: false,
      impacts: WEATHER_IMPACTS[randomWeather] || WEATHER_IMPACTS.sunny
    };
  };

  const getNearbyCity = (lat, lng) => {
    let closestCity = null;
    let closestDistance = Infinity;
    
    for (const city of SA_CITIES) {
      const distance = Math.sqrt(
        Math.pow(lat - city.lat, 2) + 
        Math.pow(lng - city.lng, 2)
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCity = city.name;
      }
    }
    
    return closestCity || 'Johannesburg';
  };

  // Reverse geocode
  const reverseGeocodePoint = async (lat, lng) => {
    try {
      const tomtomUrl = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_API_KEY}`;
      const response = await fetch(tomtomUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.addresses && data.addresses.length > 0) {
          const address = data.addresses[0].address;
          const label = [
            address.streetName,
            address.municipalitySubdivision || address.municipality,
            address.countrySubdivision,
            address.country
          ].filter(Boolean).join(', ');
          return { label: label || 'Unknown Location', source: 'tomtom' };
        }
      }
    } catch (error) {
      console.warn('TomTom reverse geocode failed:', error);
    }

    const nearbyCity = getNearbyCity(lat, lng);
    if (nearbyCity) {
      return { label: nearbyCity, source: 'coordinate' };
    }

    return { label: 'Unknown Location', source: 'coordinate' };
  };

  const extractMeaningfulName = (fullAddress) => {
    if (!fullAddress || fullAddress === 'Unknown Location') return 'Unknown Location';
    
    const parts = fullAddress.split(',');
    
    for (let part of parts) {
      const trimmed = part.trim();
      if (trimmed.match(/^\d{4}$/)) continue;
      if (trimmed.toLowerCase() === 'south africa') continue;
      if (trimmed.toLowerCase() === 'za') continue;
      if (trimmed.split(' ').length > 4) continue;
      if (trimmed.length < 3) continue;
      return trimmed;
    }
    
    return parts[0]?.trim() || 'Unknown Location';
  };

  // Extract coordinates from route
  const extractCoordinates = useCallback((route) => {
    let coords = [];
    
    if (route.stops && Array.isArray(route.stops)) {
      coords = route.stops.map(stop => ({
        lat: stop.latitude || stop.lat,
        lng: stop.longitude || stop.lng
      })).filter(coord => coord.lat && coord.lng);
    }
    
    if (coords.length === 0) {
      if (route.start_lat && route.start_lng) {
        coords.push({ lat: route.start_lat, lng: route.start_lng });
      }
      if (route.end_lat && route.end_lng) {
        coords.push({ lat: route.end_lat, lng: route.end_lng });
      }
    }
    
    return coords;
  }, []);

  // Main simulation function - WITH TEMPERATURE APPLIED
  const runEnhancedSimulation = useCallback(async () => {
    if (!selectedRouteId) {
      console.warn('No route selected');
      return;
    }

    setIsSimulating(true);
    setVerificationStatus('Initializing simulation...');

    try {
      const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
      if (!selectedRoute) {
        throw new Error('Selected route not found');
      }

      const coords = extractCoordinates(selectedRoute);
      if (coords.length < 2) {
        throw new Error('Insufficient route coordinates');
      }

      const origin = coords[0];
      const destination = coords[coords.length - 1];
      const midPoint = coords[Math.floor(coords.length / 2)];

      setVerificationStatus('🌤️ Fetching current weather data...');
      let weatherData = selectedRoute.weather;
      if (useLiveWeather) {
        weatherData = await fetchLiveWeather(midPoint.lat, midPoint.lng);
      }

      // ✅ Get the current temperature
      const currentTemp = weatherData?.temperature || 25;
      console.log(`🌡️ Current temperature for simulation: ${currentTemp}°C`);

      const originalDuration = parseFloat(selectedRoute.duration_min) || 60;
      const weatherImpact = weatherData?.impacts || WEATHER_IMPACTS[params.weather] || WEATHER_IMPACTS.sunny;
      
      // ✅ Apply temperature impact on simulation
      const delayImpact = parseInt(params.delay) || 0;
      const accidentImpact = params.accident ? 15 : 0;
      const roadClosureImpact = params.roadClosure ? 25 : 0;
      const weatherDelay = originalDuration * (weatherImpact.delayMultiplier - 1);
      
      // ✅ Temperature affects the simulation - hotter = more delays
      const tempImpact = currentTemp > 30 ? 0.15 : currentTemp > 25 ? 0.1 : currentTemp > 20 ? 0.05 : 0;
      const tempDelay = originalDuration * tempImpact;
      
      const totalDelay = delayImpact + accidentImpact + roadClosureImpact + weatherDelay + tempDelay;
      const simulatedDuration = originalDuration + totalDelay;

      setVerificationStatus(`🌡️ Applying ${currentTemp}°C weather conditions...`);

      // Compile results with temperature
      const results = {
        runId: simulationRunCount + 1,
        originalRoute: {
          id: selectedRoute.id,
          name: selectedRoute.display_name,
          duration: originalDuration,
          simulatedDuration: simulatedDuration,
          distance: selectedRoute.distance_km,
          delay: totalDelay,
          temperature: currentTemp, // ✅ Store temperature in results
          weatherImpact: weatherImpact,
          incidents: [],
          isAffected: isRouteAffected,
          affectedReasons: affectedReasons
        },
        simulationParams: { ...params, temperature: currentTemp },
        timestamp: new Date().toISOString()
      };

      setSimulationResults(results);
      setSimulationRunCount(prev => prev + 1);
      
      // Add to history with temperature
      setSimulationHistory(prev => [{
        timestamp: results.timestamp,
        runId: results.runId,
        routeId: selectedRouteId,
        routeName: selectedRoute.display_name,
        originalDuration: originalDuration,
        simulatedDuration: simulatedDuration,
        delay: totalDelay,
        temperature: currentTemp, // ✅ Temperature in history
        params: { ...params },
        weather: weatherData
      }, ...prev]);

      setVerificationStatus(`✅ Simulation complete! Temperature: ${currentTemp}°C`);

      if (onRunSimulation) {
        onRunSimulation(selectedRouteId, results);
      }

    } catch (error) {
      console.error('Simulation error:', error);
      setVerificationStatus(`❌ Simulation failed: ${error.message}`);
    } finally {
      setIsSimulating(false);
    }
  }, [
    selectedRouteId, 
    enrichedRoutes, 
    params, 
    useLiveWeather, 
    fetchLiveWeather,
    onRunSimulation,
    simulationRunCount
  ]);

  // Process routes when they change
  useEffect(() => {
    const processRoutes = async () => {
      let routesToProcess = [];
      
      if (HARDCODED_ROUTES && HARDCODED_ROUTES.length > 0) {
        routesToProcess = HARDCODED_ROUTES;
      }
      
      if (routes && routes.length > 0) {
        const existingIds = new Set(routesToProcess.map(r => r.id || r.route_id));
        const newRoutes = routes.filter(r => {
          const id = r.id || r.route_id;
          return !existingIds.has(id);
        });
        routesToProcess = [...routesToProcess, ...newRoutes];
      }
      
      if (routesToProcess.length > 0) {
        setEnrichedRoutes(routesToProcess);
        
        if (routesToProcess.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routesToProcess[0].id);
          
          // ✅ Fetch weather for the first route
          const firstRoute = routesToProcess[0];
          const coords = extractCoordinates(firstRoute);
          if (coords.length > 0) {
            const midPoint = coords[Math.floor(coords.length / 2)];
            fetchLiveWeather(midPoint.lat, midPoint.lng);
          }
        }
      } else {
        setEnrichedRoutes([]);
      }
    };

    processRoutes();
  }, [routes, fetchLiveWeather, extractCoordinates]);

  // Reset simulation when route changes
  useEffect(() => {
    if (selectedRouteId) {
      setSimulationResults(null);
      setVerificationStatus('Route changed. Ready for new simulation.');
    }
  }, [selectedRouteId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (weatherUpdateInterval.current) {
        clearInterval(weatherUpdateInterval.current);
      }
    };
  }, []);

  // Handlers
  const handleDelayChange = (e) => {
    if (setParams) {
      setParams({ ...params, delay: parseInt(e.target.value) || 0 });
    }
  };
  
  const handleWeatherChange = (e) => {
    if (setParams) {
      setParams({ ...params, weather: e.target.value });
    }
    setUseLiveWeather(false);
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

  const handleUseLiveWeather = () => {
    setUseLiveWeather(!useLiveWeather);
    if (!useLiveWeather) {
      const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
      if (selectedRoute) {
        const coords = extractCoordinates(selectedRoute);
        if (coords.length > 0) {
          const midPoint = coords[Math.floor(coords.length / 2)];
          fetchLiveWeather(midPoint.lat, midPoint.lng);
        }
      }
    }
  };
  
  const handleRunSimulation = () => {
    runEnhancedSimulation();
  };

  // Get selected route
  const selectedRoute = useMemo(() => {
    return enrichedRoutes.find(r => {
      const routeId = r.id || r.route_id;
      return routeId === selectedRouteId;
    });
  }, [enrichedRoutes, selectedRouteId]);

  const isLoading = isRoutesLoading || enriching;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h2 className="font-bold text-lg mb-4 text-gray-900 flex items-center justify-between">
        <span>What-If Simulation</span>
        <div className="flex items-center gap-3">
          {simulationRunCount > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Runs: {simulationRunCount}
            </span>
          )}
          
          {/* ✅ LIVE WEATHER DISPLAY WITH TEMPERATURE */}
          {liveWeather && (
            <div className="flex items-center gap-3 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <Thermometer className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-gray-800">
                {liveWeather.temperature}°C
              </span>
              <span className="text-xs text-gray-600">
                {liveWeather.conditionText}
              </span>
              {weatherLoading && <Loader className="w-3 h-3 animate-spin text-blue-500" />}
            </div>
          )}
          
          {weatherError && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {weatherError}
            </span>
          )}
        </div>
      </h2>
      
      <div className="space-y-4">
        {/* Status Indicator */}
        {isSimulating && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-blue-700">{verificationStatus}</span>
          </div>
        )}

        {!isSimulating && verificationStatus && !simulationResults && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{verificationStatus}</span>
          </div>
        )}

        {/* ✅ WEATHER STATUS BANNER WITH TEMPERATURE */}
        {liveWeather && (
          <div className={`p-3 rounded-lg border ${
            liveWeather.impacts.riskLevel === 'high' ? 'bg-red-50 border-red-200' :
            liveWeather.impacts.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Thermometer className="w-5 h-5 text-red-500" />
                  <span className="text-xl font-bold">
                    {liveWeather.temperature}°C
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {liveWeather.location}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>💨 {liveWeather.windKph} km/h</span>
                <span>💧 {liveWeather.humidity}%</span>
                {liveWeather.isRainy && <span className="text-blue-600">🌧️ Rain</span>}
              </div>
            </div>
            
            {/* Temperature impact on simulation */}
            <div className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
              <span className="font-medium">Temperature impact: </span>
              {liveWeather.temperature > 30 ? (
                <span className="text-red-600">⚠️ High temperature may cause additional delays</span>
              ) : liveWeather.temperature > 25 ? (
                <span className="text-orange-600">Warm conditions may slightly affect travel time</span>
              ) : liveWeather.temperature > 20 ? (
                <span className="text-blue-600">Mild conditions - minimal impact</span>
              ) : (
                <span className="text-green-600">Cool conditions - optimal for travel</span>
              )}
            </div>
          </div>
        )}

        {/* Live Weather Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={useLiveWeather}
              onChange={handleUseLiveWeather}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-700">Use Live Weather</span>
          </label>
          {weatherLoading && <Loader className="w-4 h-4 animate-spin text-purple-500" />}
          {liveWeather && useLiveWeather && (
            <span className="text-xs text-green-600">✓ Live data</span>
          )}
        </div>

        {/* Route Selection Dropdown */}
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">
            Select Route
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            value={selectedRouteId} 
            onChange={(e) => {
              setSelectedRouteId(e.target.value);
              setSimulationResults(null);
              const route = enrichedRoutes.find(r => r.id === e.target.value);
              if (route && useLiveWeather) {
                const coords = extractCoordinates(route);
                if (coords.length > 0) {
                  const midPoint = coords[Math.floor(coords.length / 2)];
                  fetchLiveWeather(midPoint.lat, midPoint.lng);
                }
              }
            }}
          >
            {enrichedRoutes.length === 0 ? (
              <option value="">No routes available</option>
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
        </div>

        {/* Delay Slider */}
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
        
        {/* Weather Selection */}
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">
            Weather Conditions {useLiveWeather && <span className="text-xs text-blue-500">(Live: {liveWeather?.conditionText || 'Loading...'})</span>}
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            value={params.weather || 'sunny'} 
            onChange={handleWeatherChange}
            disabled={useLiveWeather}
          >
            {Object.values(SOUTH_AFRICA_WEATHER).map(weather => (
              <option key={weather.id} value={weather.id}>
                {weather.label}
              </option>
            ))}
          </select>
          {useLiveWeather && liveWeather && (
            <p className="text-xs text-green-600 mt-1">
              🌡️ Using live temperature: {liveWeather.temperature}°C
            </p>
          )}
        </div>
        
        {/* Incident Toggles */}
        <div className="flex flex-wrap items-center gap-4">
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

        {/* Simulation Results with Temperature */}
        {simulationResults && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Simulation Results</h4>
              
              {/* ✅ Temperature Display in Results */}
              <div className="bg-white p-2 rounded border border-gray-200 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">🌡️ Current Temperature</span>
                  <span className="text-lg font-bold text-red-600">
                    {simulationResults.originalRoute.temperature || liveWeather?.temperature || 25}°C
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded">
                  <span className="text-gray-500">Original Duration</span>
                  <div className="font-bold text-green-600">
                    {Math.round(simulationResults.originalRoute.duration)} min
                  </div>
                </div>
                <div className="bg-white p-2 rounded">
                  <span className="text-gray-500">Simulated Duration</span>
                  <div className="font-bold text-red-600">
                    {Math.round(simulationResults.originalRoute.simulatedDuration)} min
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Total Delay: </span>
                +{Math.round(simulationResults.originalRoute.delay)} minutes
                {simulationResults.originalRoute.temperature && (
                  <span className="ml-2 text-orange-600">
                    • Temperature: {simulationResults.originalRoute.temperature}°C
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Run Simulation Button */}
        <button 
          onClick={handleRunSimulation} 
          disabled={isSimulating || enrichedRoutes.length === 0}
          className="w-full bg-purple-600 text-white py-2.5 rounded-md font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Simulating...
            </>
          ) : enrichedRoutes.length === 0 ? (
            'No Routes Available'
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {liveWeather ? `Run Simulation (${liveWeather.temperature}°C)` : 'Run Live Simulation'}
            </>
          )}
        </button>

        {/* Simulation History with Temperature */}
        {simulationHistory.length > 0 && (
          <div className="mt-2">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                📊 Simulation History ({simulationHistory.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {simulationHistory.map((entry, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">#{entry.runId || index + 1}</span>
                      <span>{entry.routeName}</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2 text-gray-400">
                      <span>Delay: +{Math.round(entry.delay)}min</span>
                      {entry.temperature && (
                        <span className="text-red-500">🌡️ {entry.temperature}°C</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationControls;