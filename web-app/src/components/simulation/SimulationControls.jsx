import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, MapPin, Loader, Cloud, CloudRain, CloudSun, Wind, Sun, CloudFog, AlertTriangle, RefreshCw, Navigation, Thermometer, Layers, Shield, Map } from 'lucide-react';

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

// Alternative route names for different scenarios
const ALTERNATIVE_ROUTE_NAMES = {
  'Johannesburg to Durban': [
    'Route via N3 (Alternate - Pietermaritzburg)',
    'Route via R103 (Scenic route)',
    'Route via N2 (Coastal route)',
    'Route via R34 (Northern bypass)',
    'Route via R33 (Western alternative)'
  ],
  'OR Tambo to Sandton': [
    'Route via R24 (Albertina Sisulu Road)',
    'Route via N1 (Western bypass)',
    'Route via R21 (Eastern alternative)',
    'Route via M1 (City center route)',
    'Route via M2 (Southern bypass)'
  ],
  'Cape Town to Johannesburg': [
    'Route via N1 (Direct route)',
    'Route via N12 (Northern Cape)',
    'Route via N2 (Coastal route)',
    'Route via N7 (West coast)'
  ],
  'Cape Town to Durban': [
    'Route via N2 (Garden Route)',
    'Route via N1 (Inland route)',
    'Route via N9 (Karoo route)'
  ],
  'default': [
    'Alternative Route via N1',
    'Alternative Route via R21',
    'Alternative Route via M1',
    'Alternative Route via R24',
    'Alternative Route via N2'
  ]
};

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
  
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [useLiveWeather, setUseLiveWeather] = useState(true);
  const [currentWeatherLocation, setCurrentWeatherLocation] = useState('Johannesburg');
  
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [simulationResults, setSimulationResults] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [recommendedRoute, setRecommendedRoute] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [trafficIncidents, setTrafficIncidents] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [simulationRunCount, setSimulationRunCount] = useState(0);
  const [routeRecommendations, setRouteRecommendations] = useState([]);
  const [isRouteAffected, setIsRouteAffected] = useState(false);
  const [affectedReasons, setAffectedReasons] = useState([]);
  const [alternativeRouteNames, setAlternativeRouteNames] = useState([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternativeRouteSuggestions, setAlternativeRouteSuggestions] = useState([]);
  
  const abortControllerRef = useRef(null);
  const weatherUpdateInterval = useRef(null);

  // Helper function to get nearby city
  const getNearbyCity = useCallback((lat, lng) => {
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
  }, []);

  // Extract coordinates from route - MOVED UP BEFORE IT'S USED
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
      impacts: WEATHER_IMPACTS[randomWeather] || WEATHER_IMPACTS.sunny,
      lat: lat,
      lng: lng
    };
  };

  const fetchLiveWeather = useCallback(async (lat, lng, locationName = null) => {
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
      
      const mappedWeather = mapToSouthAfricaWeather(data.current.condition.text);
      
      const weatherData = {
        temperature: data.current.temp_c,
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
        impacts: WEATHER_IMPACTS[mappedWeather] || WEATHER_IMPACTS.sunny,
        lat: lat,
        lng: lng
      };
      
      setLiveWeather(weatherData);
      setCurrentWeatherLocation(weatherData.location);
      console.log(`✅ Current Temperature: ${weatherData.temperature}°C, Condition: ${weatherData.conditionText} in ${weatherData.location}`);
      
      if (useLiveWeather && setParams) {
        setParams(prev => ({
          ...prev,
          weather: mappedWeather
        }));
      }
      
      setVerificationStatus(`🌤️ Weather updated for ${weatherData.location}: ${weatherData.temperature}°C, ${weatherData.conditionText}`);
      
      return weatherData;
      
    } catch (error) {
      console.error('❌ Failed to fetch weather:', error);
      setWeatherError(error.message);
      setVerificationStatus(`❌ Weather fetch failed: ${error.message}`);
      return getFallbackWeather(lat, lng);
    } finally {
      setWeatherLoading(false);
    }
  }, [useLiveWeather, setParams]);

  // Function to refresh weather for current location - MOVED AFTER extractCoordinates
  const refreshWeather = useCallback(() => {
    if (selectedRouteId && useLiveWeather) {
      const route = enrichedRoutes.find(r => r.id === selectedRouteId);
      if (route) {
        const coords = extractCoordinates(route);
        if (coords.length > 0) {
          const midPoint = coords[Math.floor(coords.length / 2)];
          const cityName = getNearbyCity(midPoint.lat, midPoint.lng);
          fetchLiveWeather(midPoint.lat, midPoint.lng, cityName);
          return;
        }
      }
    }
    // Fallback to Johannesburg
    fetchLiveWeather(-26.2041, 28.0473, 'Johannesburg');
  }, [selectedRouteId, enrichedRoutes, useLiveWeather, fetchLiveWeather, extractCoordinates, getNearbyCity]);

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

  // Get alternative route suggestions based on the current route
  const getAlternativeRouteSuggestions = useCallback((routeName) => {
    // Find matching route in the predefined list
    let matchedKey = 'default';
    
    if (routeName) {
      for (const [key, value] of Object.entries(ALTERNATIVE_ROUTE_NAMES)) {
        if (routeName.includes(key) || key.includes(routeName)) {
          matchedKey = key;
          break;
        }
      }
    }
    
    // Get alternative routes for the matched key
    const alternatives = ALTERNATIVE_ROUTE_NAMES[matchedKey] || ALTERNATIVE_ROUTE_NAMES.default;
    
    // Randomize which alternatives to show (3-5 options)
    const shuffled = [...alternatives].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3 + Math.floor(Math.random() * 3));
    
    return selected;
  }, []);

  // Generate proper route names from TomTom instructions
  const generateRouteName = useCallback((route, index) => {
    const instructions = route.guidance?.instructions || [];
    
    const streetNames = [];
    const highwayNames = [];
    const roadNumbers = [];
    
    instructions.forEach(inst => {
      const street = inst.street || inst.road || '';
      const roadNumber = inst.roadNumber || '';
      
      // Look for N routes (N1, N2, N3, etc.) - South African national routes
      if (street.match(/N\d+/i) || roadNumber.match(/N\d+/i)) {
        const match = street.match(/N\d+/i) || roadNumber.match(/N\d+/i);
        if (match && !highwayNames.includes(match[0].toUpperCase())) {
          highwayNames.push(match[0].toUpperCase());
        }
      }
      
      // Look for R routes (R21, R24, etc.) - South African regional routes
      if (street.match(/R\d+/i) || roadNumber.match(/R\d+/i)) {
        const match = street.match(/R\d+/i) || roadNumber.match(/R\d+/i);
        if (match && !roadNumbers.includes(match[0].toUpperCase())) {
          roadNumbers.push(match[0].toUpperCase());
        }
      }
      
      // Look for M routes (M1, M2, etc.) - South African metropolitan routes
      if (street.match(/M\d+/i) || roadNumber.match(/M\d+/i)) {
        const match = street.match(/M\d+/i) || roadNumber.match(/M\d+/i);
        if (match && !roadNumbers.includes(match[0].toUpperCase())) {
          roadNumbers.push(match[0].toUpperCase());
        }
      }
      
      // Collect other street names
      if (street && street.length > 1 && !street.match(/^[A-Z]\d+$/i)) {
        const cleanStreet = street.replace(/\s*\([^)]*\)/g, '').trim();
        if (cleanStreet && cleanStreet.length > 1 && !streetNames.includes(cleanStreet)) {
          streetNames.push(cleanStreet);
        }
      }
    });
    
    // Build the route name
    let nameParts = [];
    
    // Add highway names first (N1, N2, etc.)
    if (highwayNames.length > 0) {
      nameParts.push(highwayNames.join(' & '));
    }
    
    // Add road numbers (R21, M1, etc.)
    if (roadNumbers.length > 0 && nameParts.length < 2) {
      nameParts.push(roadNumbers.join(' & '));
    }
    
    // Add major street names
    if (streetNames.length > 0 && nameParts.length === 0) {
      const majorStreets = streetNames.slice(0, 2);
      nameParts.push(majorStreets.join(' → '));
    }
    
    // Add direction or area information
    if (nameParts.length === 0) {
      const locations = [];
      instructions.forEach(inst => {
        if (inst.street && inst.street.includes('Off-ramp')) {
          const match = inst.street.match(/to\s+([^,]+)/i);
          if (match) locations.push(match[1].trim());
        }
      });
      
      if (locations.length > 0) {
        nameParts.push(`Via ${locations.slice(0, 2).join(' & ')}`);
      } else {
        const totalDistance = route.summary.lengthInMeters / 1000;
        nameParts.push(totalDistance > 10 ? `Long Route ${index + 1}` : `Short Route ${index + 1}`);
      }
    }
    
    // Build the final name
    let finalName = nameParts.join(' via ');
    
    if (index > 0) {
      finalName = `Alt ${index} • ${finalName}`;
    } else {
      finalName = `Main • ${finalName}`;
    }
    
    return finalName;
  }, []);

  // Fetch alternative routes with proper naming
  const fetchAlternativeRoutes = useCallback(async (originLat, originLng, destLat, destLng) => {
    try {
      let url = `https://api.tomtom.com/routing/1/calculateRoute/${originLat},${originLng}:${destLat},${destLng}/json?key=${TOMTOM_API_KEY}&routeType=fastest&traffic=true&computeTravelTimeFor=all&travelMode=car&alternatives=true&maxAlternatives=3&routeRepresentation=polyline&instructionFormat=text&language=en-GB`;
      
      if (params.accident || params.roadClosure) {
        url += '&avoid=unpavedRoads';
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Routing API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const routes = await Promise.all(data.routes.map(async (route, index) => {
          const duration = route.summary.travelTimeInSeconds / 60;
          const distance = route.summary.lengthInMeters / 1000;
          const trafficDelay = (route.summary.trafficDelayInSeconds || 0) / 60;
          
          const routeName = generateRouteName(route, index);
          
          return {
            id: `alternative-${index}`,
            index: index,
            duration: Math.round(duration),
            distance: Math.round(distance * 10) / 10,
            trafficDelay: Math.round(trafficDelay),
            isOriginal: index === 0,
            isAlternative: index > 0,
            points: route.legs.map(leg => leg.points).flat(),
            summary: route.summary,
            instructions: route.guidance?.instructions || [],
            hasTraffic: trafficDelay > 0,
            name: routeName,
            displayName: `${routeName} (${Math.round(duration)} min)`
          };
        }));
        
        const altNames = routes
          .filter((r, idx) => idx > 0)
          .map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName,
            duration: r.duration,
            distance: r.distance,
            trafficDelay: r.trafficDelay,
            isRecommended: false
          }));
        
        setAlternativeRouteNames(altNames);
        setShowAlternatives(altNames.length > 0);
        setAlternativeRoutes(routes);
        return routes;
      }
      
      return [];
      
    } catch (error) {
      console.error('Failed to fetch alternative routes:', error);
      return [];
    }
  }, [params.accident, params.roadClosure, generateRouteName]);

  // Check if route is affected by incidents
  const checkRouteAffected = useCallback((route, incidents) => {
    const reasons = [];
    let affected = false;

    if (params.accident) {
      reasons.push('🚗 Accident reported on route');
      affected = true;
    }

    if (params.roadClosure) {
      reasons.push('🚧 Road closure on route');
      affected = true;
    }

    incidents.forEach(incident => {
      if (incident.severity >= 3) {
        reasons.push(`⚠️ ${incident.type} (Severity ${incident.severity})`);
        affected = true;
      }
    });

    if (liveWeather && liveWeather.impacts && liveWeather.impacts.riskLevel === 'high') {
      reasons.push(`🌧️ Severe weather: ${liveWeather.conditionText}`);
      affected = true;
    }

    if (route && route.trafficDelay > 10) {
      reasons.push(`🚦 Heavy traffic delay: +${Math.round(route.trafficDelay)} minutes`);
      affected = true;
    }

    return { affected, reasons };
  }, [params.accident, params.roadClosure, liveWeather]);

  // Analyze and recommend the best route
  const analyzeAndRecommendRoute = useCallback((routes, incidents, originalDuration) => {
    if (!routes || routes.length === 0) {
      return null;
    }

    let recommendations = [];
    let bestRoute = routes[0];
    let bestScore = Infinity;

    const { affected, reasons } = checkRouteAffected(routes[0], incidents);
    setIsRouteAffected(affected);
    setAffectedReasons(reasons);

    // If affected, get alternative route suggestions
    if (affected) {
      const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
      const routeName = selectedRoute?.display_name || selectedRoute?.name || '';
      const suggestions = getAlternativeRouteSuggestions(routeName);
      setAlternativeRouteSuggestions(suggestions);
    } else {
      setAlternativeRouteSuggestions([]);
    }

    routes.forEach((route, index) => {
      let score = route.duration;
      let issues = [];
      let benefits = [];

      if (incidents.length > 0) {
        incidents.forEach(incident => {
          const routeText = JSON.stringify(route.instructions).toLowerCase();
          const incidentText = incident.description.toLowerCase();
          
          if (incident.type === 'Road Closure' || incident.type === 'Accident') {
            if (routeText.includes('avoid') || routeText.includes('closure') || 
                routeText.includes('accident') || routeText.includes('incident')) {
              benefits.push(`Avoids ${incident.type.toLowerCase()}`);
            } else if (routeText.includes(incidentText.split(' ').slice(0, 3).join(' '))) {
              const penalty = incident.type === 'Road Closure' ? 30 : 20;
              score += penalty;
              issues.push(`May be affected by ${incident.type.toLowerCase()}`);
            }
          }
        });

        if (route.trafficDelay > 5) {
          score += route.trafficDelay * 0.5;
          issues.push(`${Math.round(route.trafficDelay)} min traffic delay`);
        }

        if (route.congestionLevel < 0.5) {
          score += 10;
          issues.push('Heavy congestion on route');
        }
      }

      if (liveWeather && liveWeather.impacts) {
        const weatherPenalty = (liveWeather.impacts.delayMultiplier - 1) * route.duration;
        if (weatherPenalty > 2) {
          score += weatherPenalty;
          issues.push(`Weather impact: +${Math.round(weatherPenalty)} min`);
        }
      }

      if (route.isAlternative) {
        const timeSaved = originalDuration - route.duration;
        if (timeSaved > 2) {
          benefits.push(`Saves ${Math.round(timeSaved)} minutes`);
        }
        
        if (params.accident && !issues.some(i => i.includes('Accident'))) {
          benefits.push('Avoids accident zone');
          score -= 10;
        }
        if (params.roadClosure && !issues.some(i => i.includes('Road Closure'))) {
          benefits.push('Avoids road closure');
          score -= 15;
        }
        if (route.congestionLevel > 0.7) {
          benefits.push('Better traffic flow');
          score -= 5;
        }
      }

      const recommendation = {
        route: route,
        score: score,
        issues: issues,
        benefits: benefits,
        isRecommended: false,
        reason: ''
      };

      if (score < bestScore) {
        bestScore = score;
        bestRoute = route;
      }

      recommendations.push(recommendation);
    });

    const bestRecommendation = recommendations.find(r => r.route.id === bestRoute.id);
    if (bestRecommendation) {
      bestRecommendation.isRecommended = true;
      
      let reasonParts = [];
      
      if (bestRecommendation.benefits.length > 0) {
        reasonParts.push(bestRecommendation.benefits.join(' and '));
      }

      if (bestRecommendation.issues.length === 0 && bestRoute.isAlternative) {
        reasonParts.push('has no significant delays or incidents');
      }

      if (params.accident && bestRoute.isAlternative) {
        reasonParts.push('bypasses the accident zone');
      }
      if (params.roadClosure && bestRoute.isAlternative) {
        reasonParts.push('avoids the road closure');
      }

      if (affected && bestRoute.isAlternative) {
        reasonParts.push('provides the safest and fastest alternative');
      }

      if (bestRoute.isOriginal && !affected) {
        reasonParts = ['original route is the fastest and safest option'];
      } else if (bestRoute.isOriginal && affected) {
        reasonParts = ['original route affected but still recommended with caution'];
      }

      bestRecommendation.reason = reasonParts.length > 0 
        ? `Recommended because it ${reasonParts.join(', ')}`
        : 'Recommended as the fastest and safest route';

      if (bestRoute.isAlternative) {
        setAlternativeRouteNames(prev => 
          prev.map(alt => ({
            ...alt,
            isRecommended: alt.id === bestRoute.id
          }))
        );
      }
    }

    const bestRouteObj = bestRecommendation?.route || bestRoute;
    const timeSaved = bestRouteObj.isAlternative 
      ? Math.round(originalDuration - bestRouteObj.duration)
      : 0;

    const finalRecommendation = {
      route: bestRouteObj,
      timeSaved: Math.max(0, timeSaved),
      reason: bestRecommendation?.reason || 'Recommended as optimal route',
      benefits: bestRecommendation?.benefits || [],
      issues: bestRecommendation?.issues || [],
      isAlternative: bestRouteObj.isAlternative,
      recommendationText: timeSaved > 0 
        ? `Take alternative route saving ${timeSaved} minutes. ${bestRecommendation?.reason || ''}`
        : affected 
          ? `Current route is affected but remains optimal. ${bestRecommendation?.reason || ''}`
          : `Stay on current route. ${bestRecommendation?.reason || ''}`
    };

    setRouteRecommendations(recommendations);
    return finalRecommendation;

  }, [params.accident, params.roadClosure, liveWeather, checkRouteAffected, enrichedRoutes, selectedRouteId, getAlternativeRouteSuggestions]);

  // Main simulation function
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
        const cityName = getNearbyCity(midPoint.lat, midPoint.lng);
        weatherData = await fetchLiveWeather(midPoint.lat, midPoint.lng, cityName);
      }

      const currentTemp = weatherData?.temperature || 25;
      console.log(`🌡️ Current temperature for simulation: ${currentTemp}°C`);

      const originalDuration = parseFloat(selectedRoute.duration_min) || 60;
      const weatherImpact = weatherData?.impacts || WEATHER_IMPACTS[params.weather] || WEATHER_IMPACTS.sunny;
      
      const delayImpact = parseInt(params.delay) || 0;
      const accidentImpact = params.accident ? 15 : 0;
      const roadClosureImpact = params.roadClosure ? 25 : 0;
      const weatherDelay = originalDuration * (weatherImpact.delayMultiplier - 1);
      
      const tempImpact = currentTemp > 30 ? 0.15 : currentTemp > 25 ? 0.1 : currentTemp > 20 ? 0.05 : 0;
      const tempDelay = originalDuration * tempImpact;
      
      const totalDelay = delayImpact + accidentImpact + roadClosureImpact + weatherDelay + tempDelay;
      const simulatedDuration = originalDuration + totalDelay;

      setVerificationStatus('Calculating alternative routes...');
      const alternatives = await fetchAlternativeRoutes(
        origin.lat, origin.lng,
        destination.lat, destination.lng
      );

      if ((params.accident || params.roadClosure) && alternatives.length > 1) {
        const altNames = alternatives
          .filter((r, idx) => idx > 0 || r.isAlternative)
          .map(r => r.displayName || r.name);
        
        setAlternativeRouteNames(alternatives
          .filter((r, idx) => idx > 0 || r.isAlternative)
          .map(r => ({
            id: r.id,
            name: r.name,
            displayName: r.displayName || r.name,
            duration: r.duration,
            distance: r.distance,
            trafficDelay: r.trafficDelay,
            isRecommended: false
          }))
        );
        
        setShowAlternatives(true);
        setVerificationStatus(`🚧 Route affected! Found ${alternatives.length - 1} alternative routes: ${altNames.join(', ')}`);
      } else {
        setShowAlternatives(false);
      }

      setVerificationStatus('Analyzing route recommendations...');
      const recommendation = analyzeAndRecommendRoute(
        alternatives.length > 0 ? alternatives : [{
          id: 'original',
          index: 0,
          duration: originalDuration,
          distance: selectedRoute.distance_km || 0,
          trafficDelay: 0,
          isOriginal: true,
          isAlternative: false,
          points: coords,
          instructions: [],
          congestionLevel: 0.8,
          hasTraffic: false
        }],
        trafficIncidents,
        originalDuration
      );

      if (recommendation) {
        setRecommendedRoute({
          ...recommendation,
          duration: recommendation.route.duration,
          distance: recommendation.route.distance
        });
      }

      const results = {
        runId: simulationRunCount + 1,
        originalRoute: {
          id: selectedRoute.id,
          name: selectedRoute.display_name,
          duration: originalDuration,
          simulatedDuration: simulatedDuration,
          distance: selectedRoute.distance_km,
          delay: totalDelay,
          temperature: currentTemp,
          weatherImpact: weatherImpact,
          incidents: trafficIncidents,
          isAffected: isRouteAffected,
          affectedReasons: affectedReasons
        },
        alternatives: alternatives,
        recommendedRoute: recommendation,
        trafficIncidents: trafficIncidents,
        weather: weatherData,
        simulationParams: { ...params, temperature: currentTemp },
        timestamp: new Date().toISOString(),
        routeRecommendations: routeRecommendations,
        isRouteAffected: isRouteAffected,
        affectedReasons: affectedReasons,
        alternativeSuggestions: alternativeRouteSuggestions
      };

      setSimulationResults(results);
      setSimulationRunCount(prev => prev + 1);
      
      setSimulationHistory(prev => [{
        timestamp: results.timestamp,
        runId: results.runId,
        routeId: selectedRouteId,
        routeName: selectedRoute.display_name,
        originalDuration: originalDuration,
        simulatedDuration: simulatedDuration,
        delay: totalDelay,
        temperature: currentTemp,
        params: { ...params },
        weather: weatherData,
        timeSaved: recommendation?.timeSaved || 0,
        isAffected: isRouteAffected,
        affectedReasons: affectedReasons,
        alternativeSuggestions: alternativeRouteSuggestions
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
    fetchAlternativeRoutes,
    analyzeAndRecommendRoute,
    onRunSimulation,
    simulationRunCount,
    routeRecommendations,
    isRouteAffected,
    affectedReasons,
    trafficIncidents,
    extractCoordinates,
    alternativeRouteSuggestions,
    getNearbyCity
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
        }
      } else {
        setEnrichedRoutes([]);
      }
    };

    processRoutes();
  }, [routes]);

  // Fetch Johannesburg weather on component mount
  useEffect(() => {
    const johannesburgLat = -26.2041;
    const johannesburgLng = 28.0473;
    fetchLiveWeather(johannesburgLat, johannesburgLng, 'Johannesburg');
    setVerificationStatus('🌤️ Loading Johannesburg weather...');
  }, []);

  // Fetch weather when route changes
  useEffect(() => {
    if (selectedRouteId && useLiveWeather) {
      const route = enrichedRoutes.find(r => r.id === selectedRouteId);
      if (route) {
        const coords = extractCoordinates(route);
        if (coords.length > 0) {
          const midPoint = coords[Math.floor(coords.length / 2)];
          const cityName = getNearbyCity(midPoint.lat, midPoint.lng);
          fetchLiveWeather(midPoint.lat, midPoint.lng, cityName);
          setVerificationStatus(`🌤️ Loading weather for ${cityName}...`);
        }
      }
    }
  }, [selectedRouteId, enrichedRoutes, useLiveWeather, fetchLiveWeather, extractCoordinates, getNearbyCity]);

  // Reset simulation when route changes
  useEffect(() => {
    if (selectedRouteId) {
      setSimulationResults(null);
    }
  }, [selectedRouteId]);

  // Reset simulation when parameters change (but don't auto-run)
  useEffect(() => {
    if (simulationResults) {
      setSimulationResults(null);
      setVerificationStatus('Parameters changed. Click "Run Simulation" to see updated results.');
    }
  }, [params.delay, params.weather, params.accident, params.roadClosure]);

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
      const newAccidentState = e.target.checked;
      setParams(prev => ({ ...prev, accident: newAccidentState }));
      
      // Update traffic incidents based on accident state
      if (newAccidentState) {
        setTrafficIncidents(prev => [...prev, {
          type: 'Accident',
          severity: 4,
          description: 'Accident reported on route'
        }]);
        
        // Get alternative route suggestions when accident is reported
        const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
        const routeName = selectedRoute?.display_name || selectedRoute?.name || '';
        const suggestions = getAlternativeRouteSuggestions(routeName);
        setAlternativeRouteSuggestions(suggestions);
      } else {
        setTrafficIncidents(prev => prev.filter(incident => incident.type !== 'Accident'));
        setAlternativeRouteSuggestions([]);
      }
      
      // Clear previous results when toggling
      if (simulationResults) {
        setSimulationResults(null);
        setRecommendedRoute(null);
        setAlternativeRoutes([]);
        setAlternativeRouteNames([]);
        setShowAlternatives(false);
        setVerificationStatus('Accident toggled. Click "Run Simulation" to see updated results.');
      }
    }
  };
  
  const handleRoadClosureChange = (e) => {
    if (setParams) {
      const newClosureState = e.target.checked;
      setParams(prev => ({ ...prev, roadClosure: newClosureState }));
      
      // Update traffic incidents based on road closure state
      if (newClosureState) {
        setTrafficIncidents(prev => [...prev, {
          type: 'Road Closure',
          severity: 5,
          description: 'Road closure on route'
        }]);
        
        // Get alternative route suggestions when road closure is reported
        const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
        const routeName = selectedRoute?.display_name || selectedRoute?.name || '';
        const suggestions = getAlternativeRouteSuggestions(routeName);
        setAlternativeRouteSuggestions(suggestions);
      } else {
        setTrafficIncidents(prev => prev.filter(incident => incident.type !== 'Road Closure'));
        setAlternativeRouteSuggestions([]);
      }
      
      // Clear previous results when toggling
      if (simulationResults) {
        setSimulationResults(null);
        setRecommendedRoute(null);
        setAlternativeRoutes([]);
        setAlternativeRouteNames([]);
        setShowAlternatives(false);
        setVerificationStatus('Road closure toggled. Click "Run Simulation" to see updated results.');
      }
    }
  };

  const handleUseLiveWeather = () => {
    setUseLiveWeather(!useLiveWeather);
    if (useLiveWeather) {
      // When enabling live weather, refresh for current route or Johannesburg
      refreshWeather();
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
          
          {liveWeather && (
            <div className="flex items-center gap-3 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <Thermometer className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-gray-800">
                {liveWeather.temperature}°C
              </span>
              <span className="text-xs text-gray-600">
                {liveWeather.conditionText}
              </span>
              <span className="text-xs text-gray-500 ml-1">
                📍 {liveWeather.location}
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

        {/* Weather Status Banner */}
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
                  📍 {liveWeather.location}
                </span>
                <span className="text-xs text-gray-500">
                  {liveWeather.conditionText}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span>💨 {liveWeather.windKph} km/h</span>
                <span>💧 {liveWeather.humidity}%</span>
                {liveWeather.isRainy && <span className="text-blue-600">🌧️ Rain</span>}
                <button 
                  onClick={refreshWeather}
                  disabled={weatherLoading}
                  className="p-1 hover:bg-blue-100 rounded-full transition"
                  title="Refresh weather"
                >
                  <RefreshCw className={`w-4 h-4 text-blue-600 ${weatherLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
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
            <div className="mt-1 text-xs text-gray-400">
              🕐 Updated: {new Date(liveWeather.lastUpdated).toLocaleString()}
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
            <span className="text-xs text-green-600">✓ Live data from {liveWeather.location}</span>
          )}
          <button
            onClick={refreshWeather}
            disabled={weatherLoading}
            className="text-xs text-purple-600 hover:text-purple-800 underline disabled:opacity-50"
          >
            Refresh Weather
          </button>
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
              setAlternativeRouteSuggestions([]);
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
              🌡️ Using live temperature: {liveWeather.temperature}°C from {liveWeather.location}
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
            {params.accident && (
              <span className="text-xs text-red-500 ml-1">Active</span>
            )}
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={params.roadClosure || false} 
              onChange={handleRoadClosureChange} 
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">🚧 Road closure</span>
            {params.roadClosure && (
              <span className="text-xs text-red-500 ml-1">Active</span>
            )}
          </label>
          
          {/* Show active incidents count */}
          {(params.accident || params.roadClosure) && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
              {[params.accident, params.roadClosure].filter(Boolean).length} incident(s) active
            </span>
          )}
        </div>

        {/* Alternative Route Suggestions - DISPLAYED WHEN ACCIDENT OR ROAD CLOSURE IS REPORTED */}
        {(params.accident || params.roadClosure) && alternativeRouteSuggestions.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Map className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  🚗 Alternative Routes Available
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                    {alternativeRouteSuggestions.length} options
                  </span>
                </h4>
                
                <div className="space-y-2">
                  {alternativeRouteSuggestions.map((routeName, index) => (
                    <div key={index} className="bg-white rounded-lg p-2 border border-green-100 flex items-center justify-between hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-green-700 bg-green-100 rounded-full w-5 h-5 flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{routeName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {index % 2 === 0 ? '~5 min faster' : '~8 min faster'}
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                            Best Alternative
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 text-xs text-green-700 bg-green-100 p-2 rounded border border-green-200">
                  <div className="flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Recommendation:</strong> These alternative routes avoid the 
                      {params.accident && ' 🚗 accident'} 
                      {params.accident && params.roadClosure && ' and '} 
                      {params.roadClosure && ' 🚧 road closure'}. 
                      Click "Run Simulation" to compare travel times.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alternative Route Names Display (from TomTom) */}
        {showAlternatives && alternativeRouteNames.length > 0 && (params.accident || params.roadClosure) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">TomTom Alternative Routes Available</span>
            </div>
            <div className="space-y-2">
              {alternativeRouteNames.map((alt, idx) => (
                <div key={alt.id} className="bg-white rounded p-2 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{alt.displayName || alt.name}</span>
                    <span className="text-xs text-gray-500">({alt.duration} min • {alt.distance} km)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {alt.trafficDelay > 0 && (
                      <span className="text-xs text-orange-500">+{alt.trafficDelay} min delay</span>
                    )}
                    {alt.isRecommended && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Best Alternative</span>
                    )}
                    {idx === 0 && !alt.isRecommended && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Option {idx + 1}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-blue-600">
              💡 These routes will get you to the same destination while avoiding the {params.accident ? 'accident' : ''} {params.accident && params.roadClosure ? 'and ' : ''} {params.roadClosure ? 'road closure' : ''}
            </div>
          </div>
        )}

        {/* Route Affected Warning */}
        {isRouteAffected && !simulationResults && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-700">Route Affected</div>
                <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                  {affectedReasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
                <div className="text-xs text-red-500 mt-1">
                  Click "Run Simulation" to find alternative routes
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simulation Results */}
        {simulationResults && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Simulation Results</h4>
              
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
                {simulationResults.originalRoute.isAffected && (
                  <span className="ml-2 text-red-600">
                    • Route affected
                  </span>
                )}
              </div>
            </div>

            {/* Recommended Route */}
            {recommendedRoute && (
              <div className={`rounded-lg p-3 border ${
                recommendedRoute.isAlternative 
                  ? 'bg-green-50 border-green-300' 
                  : simulationResults.isRouteAffected 
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-purple-50 border-purple-200'
              }`}>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Navigation className={`w-4 h-4 ${
                    recommendedRoute.isAlternative ? 'text-green-600' : 
                    simulationResults.isRouteAffected ? 'text-yellow-600' : 'text-purple-600'
                  }`} />
                  <span className={
                    recommendedRoute.isAlternative ? 'text-green-700' : 
                    simulationResults.isRouteAffected ? 'text-yellow-700' : 'text-purple-700'
                  }>
                    {recommendedRoute.isAlternative ? '🌟 Recommended Alternative Route' : 
                     simulationResults.isRouteAffected ? '⚠️ Recommended Route (Affected)' : 'Recommended Route'}
                  </span>
                </div>
                
                <div className="bg-white rounded p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">
                      {recommendedRoute.timeSaved > 0 
                        ? `⏱️ Save ${recommendedRoute.timeSaved} minutes` 
                        : '✅ Optimal Route'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {recommendedRoute.duration} min • {recommendedRoute.distance} km
                    </span>
                  </div>
                  
                  {recommendedRoute.benefits && recommendedRoute.benefits.length > 0 && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
                      <div className="font-medium mb-1">✅ Benefits:</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {recommendedRoute.benefits.map((benefit, idx) => (
                          <li key={idx}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recommendedRoute.issues && recommendedRoute.issues.length > 0 && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100">
                      <div className="font-medium mb-1">⚠️ Issues avoided:</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {recommendedRoute.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="font-medium">{recommendedRoute.recommendationText}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
                    <div className="flex items-start gap-1">
                      <Shield className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{recommendedRoute.reason}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alternative Routes List */}
            {alternativeRoutes.length > 1 && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Alternative Routes Available
                </h4>
                <div className="space-y-2">
                  {alternativeRoutes.map((alt, index) => (
                    <div key={alt.id} className={`bg-white p-2 rounded border text-xs ${
                      index === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-100'
                    }`}>
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {index === 0 ? '📍 Original Route' : `🔄 ${alt.displayName || alt.name}`}
                        </span>
                        <span className="text-gray-500">{alt.duration} min • {alt.distance} km</span>
                      </div>
                      {alt.trafficDelay > 0 && (
                        <div className="text-orange-500 mt-1">
                          Traffic: +{Math.round(alt.trafficDelay)} min delay
                        </div>
                      )}
                      {alt.isAlternative && (
                        <div className="text-green-500 mt-1 text-xs">
                          {index === 1 ? '🟢 Recommended alternative' : 'ℹ️ Additional option'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* Simulation History */}
        {simulationHistory.length > 0 && (
          <div className="mt-2">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                📊 Simulation History ({simulationHistory.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {simulationHistory.map((entry, index) => (
                  <div key={index} className={`bg-gray-50 p-2 rounded text-gray-600 ${entry.error ? 'border-l-2 border-red-400' : entry.isAffected ? 'border-l-2 border-yellow-400' : ''}`}>
                    <div className="flex justify-between">
                      <span className="font-medium">#{entry.runId || index + 1}</span>
                      <span>{entry.routeName}</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex gap-2 text-gray-400">
                      <span>Delay: +{Math.round(entry.delay)}min</span>
                      {entry.timeSaved > 0 && (
                        <span className="text-green-600">✓ Save {entry.timeSaved}min</span>
                      )}
                      {entry.temperature && (
                        <span className="text-red-500">🌡️ {entry.temperature}°C</span>
                      )}
                      {entry.isAffected && (
                        <span className="text-yellow-600">⚠️ Route affected</span>
                      )}
                      {entry.error && (
                        <span className="text-red-500">⚠️ Error</span>
                      )}
                    </div>
                    {entry.alternativeSuggestions && entry.alternativeSuggestions.length > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        💡 Alternative routes available: {entry.alternativeSuggestions.slice(0, 3).join(', ')}
                      </div>
                    )}
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