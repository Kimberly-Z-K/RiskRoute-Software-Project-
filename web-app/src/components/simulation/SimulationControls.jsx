import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, MapPin, Loader, Cloud, CloudRain, CloudSun, Wind, Sun, CloudFog, AlertTriangle } from 'lucide-react';

// Your API Keys
const TOMTOM_API_KEY = "boAgd49GhcpqsqaQ6qlAfmC6YEBORJVF";
const GRAPHHOPPER_API_KEY = "6T2DDPGJLyW04V4lCgZrmkXmajx9Lct2";
const WEATHER_API_KEY = "ec5202fdabe043c4b0f190711262807";

const API_BASE_URL = "http://localhost:5000/api";

// South Africa Weather Types - Only common SA conditions
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
  sunny: { speedMultiplier: 1.0, congestionMultiplier: 1.0, delayMultiplier: 1.0, riskLevel: 'low' },
  partly_cloudy: { speedMultiplier: 0.98, congestionMultiplier: 1.02, delayMultiplier: 1.02, riskLevel: 'low' },
  cloudy: { speedMultiplier: 0.95, congestionMultiplier: 1.05, delayMultiplier: 1.05, riskLevel: 'low' },
  light_rain: { speedMultiplier: 0.85, congestionMultiplier: 1.15, delayMultiplier: 1.2, riskLevel: 'medium' },
  moderate_rain: { speedMultiplier: 0.75, congestionMultiplier: 1.3, delayMultiplier: 1.4, riskLevel: 'medium' },
  heavy_rain: { speedMultiplier: 0.6, congestionMultiplier: 1.5, delayMultiplier: 1.6, riskLevel: 'high' },
  fog: { speedMultiplier: 0.7, congestionMultiplier: 1.2, delayMultiplier: 1.3, riskLevel: 'high' },
  windy: { speedMultiplier: 0.9, congestionMultiplier: 1.1, delayMultiplier: 1.1, riskLevel: 'medium' }
};

// South African cities coordinates for weather lookup
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
  const [liveTrafficData, setLiveTrafficData] = useState(null);
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [useLiveWeather, setUseLiveWeather] = useState(true);
  const [detectedLocation, setDetectedLocation] = useState(location);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState(null);
  
  const abortControllerRef = useRef(null);
  const weatherUpdateInterval = useRef(null);

  // Weather Service
  const fetchLiveWeather = useCallback(async (lat, lng) => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      // Try to get weather for the specific location
      let locationQuery = `${lat},${lng}`;
      
      // If we have a city name, use it
      if (detectedLocation) {
        locationQuery = detectedLocation;
      }

      const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${locationQuery}&aqi=no`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map to South Africa weather types
      const mappedWeather = mapToSouthAfricaWeather(data.current.condition.text);
      
      const weatherData = {
        temperature: data.current.temp_c,
        condition: mappedWeather,
        conditionText: data.current.condition.text,
        windKph: data.current.wind_kph,
        humidity: data.current.humidity,
        precipMm: data.current.precip_mm,
        location: data.location.name,
        country: data.location.country,
        lastUpdated: data.current.last_updated,
        isRainy: ['light_rain', 'moderate_rain', 'heavy_rain'].includes(mappedWeather),
        isWindy: mappedWeather === 'windy',
        isFoggy: mappedWeather === 'fog',
        impacts: WEATHER_IMPACTS[mappedWeather] || WEATHER_IMPACTS.sunny
      };
      
      setLiveWeather(weatherData);
      
      // Auto-update simulation params if using live weather
      if (useLiveWeather && setParams) {
        setParams(prev => ({
          ...prev,
          weather: mappedWeather
        }));
      }
      
      return weatherData;
      
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      setWeatherError(error.message);
      
      // Fallback to detected location weather
      return getFallbackWeather(lat, lng);
    } finally {
      setWeatherLoading(false);
    }
  }, [detectedLocation, useLiveWeather, setParams]);

  // Map WeatherAPI conditions to South Africa weather types
  const mapToSouthAfricaWeather = (conditionText) => {
    const text = conditionText.toLowerCase();
    
    const mapping = {
      'sunny': 'sunny',
      'clear': 'sunny',
      'partly cloudy': 'partly_cloudy',
      'cloudy': 'cloudy',
      'overcast': 'cloudy',
      'patchy rain': 'light_rain',
      'light rain': 'light_rain',
      'moderate rain': 'moderate_rain',
      'heavy rain': 'heavy_rain',
      'thunderstorm': 'heavy_rain',
      'fog': 'fog',
      'mist': 'fog',
      'windy': 'windy',
      'breezy': 'windy'
    };
    
    for (const [key, value] of Object.entries(mapping)) {
      if (text.includes(key)) {
        return value;
      }
    }
    
    return 'sunny'; // Default
  };

  // Fallback weather based on city
  const getFallbackWeather = (lat, lng) => {
    const city = getNearbyCity(lat, lng);
    const weatherConditions = ['sunny', 'partly_cloudy', 'cloudy', 'sunny', 'sunny'];
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
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

  // Helper to find nearby South African city
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

  // Get weather for route location
  const getWeatherForRoute = useCallback(async (route) => {
    const coords = extractCoordinates(route);
    if (coords.length > 0) {
      const midPoint = coords[Math.floor(coords.length / 2)];
      if (midPoint.lat && midPoint.lng) {
        const city = getNearbyCity(midPoint.lat, midPoint.lng);
        setDetectedLocation(city);
        return await fetchLiveWeather(midPoint.lat, midPoint.lng);
      }
    }
    return null;
  }, [fetchLiveWeather]);

  // Extract coordinates from route
  const extractCoordinates = (route) => {
    let coords = [];
    
    if (route.stops && Array.isArray(route.stops)) {
      coords = route.stops.map(stop => ({
        lat: stop.latitude || stop.lat,
        lng: stop.longitude || stop.lng
      })).filter(coord => coord.lat && coord.lng);
    }
    
    if (route.result?.geometry?.points && Array.isArray(route.result.geometry.points)) {
      const geomCoords = route.result.geometry.points.map(point => ({
        lat: point.latitude || point.lat,
        lng: point.longitude || point.lng
      })).filter(coord => coord.lat && coord.lng);
      
      if (geomCoords.length > 0) {
        coords = geomCoords;
      }
    }
    
    if (coords.length === 0) {
      if (route.start_lat && route.start_lng) {
        coords.push({ lat: route.start_lat, lng: route.start_lng });
      }
      if (route.end_lat && route.end_lng) {
        coords.push({ lat: route.end_lat, lng: route.end_lng });
      }
    }
    
    // Remove duplicates
    const uniqueCoords = [];
    const seen = new Set();
    for (const coord of coords) {
      const key = `${coord.lat.toFixed(6)},${coord.lng.toFixed(6)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCoords.push(coord);
      }
    }
    
    return uniqueCoords;
  };

  // Reverse geocode (existing function)
  const reverseGeocodePoint = async (lat, lng) => {
    console.log("[SimulationControls] Reverse geocoding point:", { lat, lng });

    try {
      const url = `${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.label) {
          return { label: data.data.label, source: 'local' };
        }
      }
    } catch (error) {
      console.warn('Local API reverse geocode failed:', error);
    }

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

    try {
      const graphhopperUrl = `https://graphhopper.com/api/1/geocode?reverse=true&point=${lat},${lng}&key=${GRAPHHOPPER_API_KEY}`;
      const response = await fetch(graphhopperUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
          const hit = data.hits[0];
          const label = hit.name || hit.street || hit.city || hit.country || 'Unknown Location';
          return { label, source: 'graphhopper' };
        }
      }
    } catch (error) {
      console.warn('GraphHopper reverse geocode failed:', error);
    }

    const nearbyCity = getNearbyCity(lat, lng);
    if (nearbyCity) {
      return { label: nearbyCity, source: 'coordinate' };
    }

    return { label: 'Unknown Location', source: 'coordinate' };
  };

  // Extract meaningful name (existing function)
  const extractMeaningfulName = (fullAddress) => {
    if (!fullAddress || fullAddress === 'Unknown Location') return 'Unknown Location';
    
    if (fullAddress.includes('(') && fullAddress.includes(')')) {
      const parts = fullAddress.split('(');
      if (parts.length > 0) {
        const cityPart = parts[0].trim();
        const cleaned = cityPart.replace(/^Near\s+/, '').trim();
        if (cleaned && cleaned !== 'Location') {
          return cleaned;
        }
      }
      return 'Unknown Location';
    }
    
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

  // Enrich routes with names and weather
  const enrichRoutesWithNames = useCallback(async (routesData) => {
    if (!routesData || routesData.length === 0) return routesData;

    setEnriching(true);
    const enriched = [];

    for (const route of routesData) {
      try {
        console.log(`[Route ${route.id}] Processing route...`);
        
        const coords = extractCoordinates(route);
        console.log(`[Route ${route.id}] Extracted ${coords.length} coordinates`);
        
        let originName = 'Unknown Location';
        let destinationName = 'Unknown Location';
        let routeName = '';
        let weatherData = null;

        // Get origin name
        if (coords.length > 0 && coords[0].lat && coords[0].lng) {
          try {
            const originData = await reverseGeocodePoint(coords[0].lat, coords[0].lng);
            if (originData && originData.label) {
              originName = originData.label;
            }
          } catch (error) {
            console.warn(`[Route ${route.id}] Could not reverse geocode origin:`, error);
          }
        }

        // Get destination name
        if (coords.length > 1) {
          const lastCoord = coords[coords.length - 1];
          if (lastCoord.lat && lastCoord.lng) {
            try {
              const destData = await reverseGeocodePoint(lastCoord.lat, lastCoord.lng);
              if (destData && destData.label) {
                destinationName = destData.label;
              }
            } catch (error) {
              console.warn(`[Route ${route.id}] Could not reverse geocode destination:`, error);
            }
          }
        } else if (coords.length === 1) {
          destinationName = originName;
        }

        // Get weather for route
        if (coords.length > 0) {
          const midPoint = coords[Math.floor(coords.length / 2)];
          if (midPoint.lat && midPoint.lng) {
            try {
              weatherData = await fetchLiveWeather(midPoint.lat, midPoint.lng);
            } catch (error) {
              console.warn(`[Route ${route.id}] Could not fetch weather:`, error);
            }
          }
        }

        // Extract meaningful short names
        const originShort = extractMeaningfulName(originName);
        const destShort = extractMeaningfulName(destinationName);

        // Create meaningful route name
        if (originShort !== 'Unknown Location' && destShort !== 'Unknown Location' && originShort !== destShort) {
          routeName = `${originShort} → ${destShort}`;
        } else if (route.name && route.name !== `Route ${route.id}`) {
          routeName = route.name;
        } else if (originShort !== 'Unknown Location') {
          routeName = `Route from ${originShort}`;
        } else if (destShort !== 'Unknown Location') {
          routeName = `Route to ${destShort}`;
        } else if (route.id) {
          routeName = `Route ${route.id}`;
        } else {
          routeName = 'Unnamed Route';
        }

        // Get route metrics
        const distance = route.result?.distance_km || route.distance_km || route.distance || 'N/A';
        let duration = route.result?.duration_min || route.duration_min || route.estimated_time || route.duration || 'N/A';
        const cost = route.result?.cost || route.estimated_cost || route.cost || 'N/A';

        // Apply weather impact to duration if weather data available
        let adjustedDuration = duration;
        if (weatherData && weatherData.impacts && duration !== 'N/A') {
          const durationNum = parseFloat(duration);
          if (!isNaN(durationNum)) {
            adjustedDuration = Math.round(durationNum * weatherData.impacts.delayMultiplier);
          }
        }

        const enrichedRoute = {
          ...route,
          origin_name: originShort,
          destination_name: destShort,
          name: routeName,
          distance_km: distance,
          duration_min: duration,
          estimated_time: duration,
          estimated_cost: cost,
          display_name: routeName,
          weather: weatherData,
          adjusted_duration: adjustedDuration,
          weather_impact: weatherData?.impacts || WEATHER_IMPACTS.sunny
        };

        enriched.push(enrichedRoute);

      } catch (error) {
        console.error(`[Route ${route.id}] Error enriching route:`, error);
        const fallbackName = route.name || `Route ${route.id || 'N/A'}`;
        enriched.push({
          ...route,
          display_name: fallbackName
        });
      }
    }

    setEnriching(false);
    return enriched;
  }, [fetchLiveWeather]);

  // Process routes when they change
  useEffect(() => {
    const processRoutes = async () => {
      if (routes && routes.length > 0) {
        console.log('[SimulationControls] Processing routes:', routes.length);
        const enriched = await enrichRoutesWithNames(routes);
        setEnrichedRoutes(enriched);
        
        // Auto-select first route
        if (enriched.length > 0 && !selectedRouteId) {
          setSelectedRouteId(enriched[0].id);
        }
      } else {
        setEnrichedRoutes([]);
      }
    };

    processRoutes();
  }, [routes, enrichRoutesWithNames]);

  // Set up weather auto-update
  useEffect(() => {
    if (useLiveWeather && selectedRouteId) {
      // Clear existing interval
      if (weatherUpdateInterval.current) {
        clearInterval(weatherUpdateInterval.current);
      }
      
      // Update weather every 5 minutes
      weatherUpdateInterval.current = setInterval(() => {
        const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
        if (selectedRoute) {
          const coords = extractCoordinates(selectedRoute);
          if (coords.length > 0) {
            const midPoint = coords[Math.floor(coords.length / 2)];
            fetchLiveWeather(midPoint.lat, midPoint.lng);
          }
        }
      }, 300000); // 5 minutes
      
      return () => {
        if (weatherUpdateInterval.current) {
          clearInterval(weatherUpdateInterval.current);
        }
      };
    }
  }, [useLiveWeather, selectedRouteId, enrichedRoutes, fetchLiveWeather]);

  // Cleanup on unmount
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
    // Disable live weather when manually selecting
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
      // Refresh weather when enabling
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
    if (onRunSimulation) {
      // Calculate simulation impact
      const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
      
      if (selectedRoute) {
        const weatherImpact = selectedRoute.weather?.impacts || WEATHER_IMPACTS[params.weather] || WEATHER_IMPACTS.sunny;
        const delayImpact = params.delay || 0;
        const accidentImpact = params.accident ? 15 : 0;
        const roadClosureImpact = params.roadClosure ? 25 : 0;
        
        const totalImpact = {
          delayMinutes: delayImpact + accidentImpact + roadClosureImpact,
          speedReduction: (1 - weatherImpact.speedMultiplier) * 100,
          congestionIncrease: (weatherImpact.congestionMultiplier - 1) * 100,
          riskLevel: weatherImpact.riskLevel,
          weatherType: params.weather,
          hasAccident: params.accident,
          hasRoadClosure: params.roadClosure
        };
        
        // Add to simulation history
        setSimulationHistory(prev => [...prev, {
          timestamp: new Date().toISOString(),
          routeId: selectedRouteId,
          routeName: selectedRoute.display_name,
          params: { ...params },
          impact: totalImpact,
          weather: selectedRoute.weather
        }]);
        
        setRouteMetrics(totalImpact);
      }
      
      onRunSimulation(selectedRouteId);
    }
  };

  // Get selected route
  const selectedRoute = useMemo(() => {
    return enrichedRoutes.find(r => {
      const routeId = r.id || r.route_id;
      return routeId === selectedRouteId;
    });
  }, [enrichedRoutes, selectedRouteId]);

  const isLoading = isRoutesLoading || enriching;

  // Weather icon component
  const WeatherIcon = ({ condition, size = 20 }) => {
    const weatherType = SOUTH_AFRICA_WEATHER[condition?.toUpperCase()] || SOUTH_AFRICA_WEATHER.SUNNY;
    const IconComponent = weatherType.icon || Sun;
    return <IconComponent size={size} className="inline-block" />;
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h2 className="font-bold text-lg mb-4 text-gray-900 flex items-center justify-between">
        <span>What-If Simulation</span>
        {liveWeather && (
          <span className="text-sm font-normal text-gray-600 flex items-center gap-2">
            <WeatherIcon condition={liveWeather.condition} size={16} />
            {liveWeather.temperature}°C
          </span>
        )}
      </h2>
      
      <div className="space-y-4">
        {/* Weather Status Banner */}
        {liveWeather && (
          <div className={`p-3 rounded-lg border ${
            liveWeather.impacts.riskLevel === 'high' ? 'bg-red-50 border-red-200' :
            liveWeather.impacts.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WeatherIcon condition={liveWeather.condition} size={20} />
                <span className="font-medium text-sm">
                  {liveWeather.location}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>💨 {liveWeather.windKph} km/h</span>
                <span>💧 {liveWeather.humidity}%</span>
                {liveWeather.isRainy && <span className="text-blue-600">🌧️ Rain</span>}
              </div>
            </div>
            {weatherError && (
              <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                {weatherError}
              </div>
            )}
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
              // Refresh weather for new route
              const route = enrichedRoutes.find(r => r.id === e.target.value);
              if (route && useLiveWeather) {
                const coords = extractCoordinates(route);
                if (coords.length > 0) {
                  const midPoint = coords[Math.floor(coords.length / 2)];
                  fetchLiveWeather(midPoint.lat, midPoint.lng);
                }
              }
            }}
            disabled={isLoading || enrichedRoutes.length === 0}
          >
            {isLoading ? (
              <option>Loading routes with live data...</option>
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
          
          {/* Route Details with Weather Impact */}
          {selectedRoute && !isLoading && (
            <div className="mt-3 space-y-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-gray-500">From</span>
                  <p className="font-medium text-gray-800">{selectedRoute.origin_name || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs text-gray-500">To</span>
                  <p className="font-medium text-gray-800">{selectedRoute.destination_name || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200">
                {selectedRoute.duration_min && selectedRoute.duration_min !== 'N/A' && (
                  <span>⏱️ {selectedRoute.duration_min} min</span>
                )}
                {selectedRoute.weather && selectedRoute.weather.impacts && (
                  <span className={`px-2 py-0.5 rounded ${
                    selectedRoute.weather.impacts.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                    selectedRoute.weather.impacts.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedRoute.weather.impacts.riskLevel.toUpperCase()} RISK
                  </span>
                )}
                {selectedRoute.weather && selectedRoute.adjusted_duration && (
                  <span className="text-blue-600">
                    ⚡ Adjusted: {selectedRoute.adjusted_duration} min
                  </span>
                )}
                {selectedRoute.estimated_cost && selectedRoute.estimated_cost !== 'N/A' && (
                  <span>💰 R{selectedRoute.estimated_cost}</span>
                )}
                {selectedRoute.distance_km && selectedRoute.distance_km !== 'N/A' && (
                  <span>📏 {selectedRoute.distance_km} km</span>
                )}
              </div>

              {/* Weather Impact Details */}
              {selectedRoute.weather && selectedRoute.weather.impacts && (
                <div className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-gray-400">Speed</span>
                      <div className="font-medium">
                        {Math.round(selectedRoute.weather.impacts.speedMultiplier * 100)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Congestion</span>
                      <div className="font-medium">
                        +{Math.round((selectedRoute.weather.impacts.congestionMultiplier - 1) * 100)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Delay</span>
                      <div className="font-medium">
                        +{Math.round((selectedRoute.weather.impacts.delayMultiplier - 1) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
        
        {/* Weather Selection - Only South Africa weather types */}
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">
            Weather Conditions
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
          {useLiveWeather && (
            <p className="text-xs text-blue-500 mt-1">Using live weather data</p>
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

        {/* Simulation Impact Preview */}
        {routeMetrics && (
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-900 mb-2">
              <AlertTriangle size={16} />
              Simulation Impact
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">Delay</span>
                <div className="font-bold text-purple-700">
                  +{routeMetrics.delayMinutes} min
                </div>
              </div>
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">Speed Reduction</span>
                <div className="font-bold text-purple-700">
                  {Math.round(routeMetrics.speedReduction)}%
                </div>
              </div>
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">Congestion</span>
                <div className="font-bold text-purple-700">
                  +{Math.round(routeMetrics.congestionIncrease)}%
                </div>
              </div>
              <div className="bg-white rounded p-2">
                <span className="text-gray-500">Risk Level</span>
                <div className={`font-bold ${
                  routeMetrics.riskLevel === 'high' ? 'text-red-600' :
                  routeMetrics.riskLevel === 'medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {routeMetrics.riskLevel.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Run Simulation Button */}
        <button 
          onClick={handleRunSimulation} 
          disabled={isLoading || enrichedRoutes.length === 0}
          className="w-full bg-purple-600 text-white py-2.5 rounded-md font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Simulation History */}
        {simulationHistory.length > 0 && (
          <div className="mt-2">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                📊 Simulation History ({simulationHistory.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {simulationHistory.slice(-5).reverse().map((entry, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-gray-600">
                    <div className="flex justify-between">
                      <span>{entry.routeName}</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2 text-gray-400">
                      <span>Delay: +{entry.impact.delayMinutes}min</span>
                      <span>Risk: {entry.impact.riskLevel}</span>
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