import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, MapPin, Loader, Cloud, CloudRain, CloudSun, Wind, Sun, CloudFog, AlertTriangle, RefreshCw, Navigation, Map, TrendingUp, Clock, Shield, ArrowRight, Layers } from 'lucide-react';

// Your API Keys
const TOMTOM_API_KEY = "boAgd49GhcpqsqaQ6qlAfmC6YEBORJVF";
const GRAPHHOPPER_API_KEY = "6T2DDPGJLyW04V4lCgZrmkXmajx9Lct2";
const WEATHER_API_KEY = "ec5202fdabe043c4b0f190711262807";

const API_BASE_URL = "http://localhost:5000/api";

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

// HARDCODED ROUTES - These will appear as if loaded from database
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
  },
  {
    id: 'route-17',
    route_id: 'route-17',
    display_name: 'Route #17 - OR Tambo to Sandton (Alt)',
    name: 'Route #17 - OR Tambo to Sandton (Alt)',
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
    traffic_delay: 3,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/30/2026, 7:45:29 AM',
    stops: [
      { latitude: -26.1392, longitude: 28.2460, name: 'OR Tambo International Airport, Kempton Park, 1627' },
      { latitude: -26.1076, longitude: 28.0567, name: '81 Rivonia Road, Sandton, 2196' }
    ]
  },
  {
    id: 'route-16',
    route_id: 'route-16',
    display_name: 'Route #16 - Sandton to OR Tambo',
    name: 'Route #16 - Sandton to OR Tambo',
    origin_name: 'Sandton',
    destination_name: 'OR Tambo International Airport',
    start_lat: -26.1076,
    start_lng: 28.0567,
    end_lat: -26.1392,
    end_lng: 28.2460,
    distance_km: 45.169,
    duration_min: 43,
    estimated_time: 43,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/30/2026, 7:18:07 AM',
    stops: [
      { latitude: -26.1076, longitude: 28.0567, name: '81 Rivonia Road, Sandton, 2196' },
      { latitude: -26.1392, longitude: 28.2460, name: 'OR Tambo International Airport, Kempton Park, 1627' }
    ]
  },
  {
    id: 'route-15',
    route_id: 'route-15',
    display_name: 'Route #15 - Alberton to Polokwane',
    name: 'Route #15 - Alberton to Polokwane',
    origin_name: 'Alberton',
    destination_name: 'Polokwane',
    start_lat: -26.2679,
    start_lng: 28.1223,
    end_lat: -23.8962,
    end_lng: 29.4486,
    distance_km: 327.307,
    duration_min: 181,
    estimated_time: 181,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/29/2026, 9:16:24 PM',
    stops: [
      { latitude: -26.2679, longitude: 28.1223, name: '55 Van Riebeeck Avenue, Alberton Suburbs, Alberton, 1449' },
      { latitude: -23.8962, longitude: 29.4486, name: '111 Snyman Street, Eduanpark, Polokwane, 0699' }
    ]
  },
  {
    id: 'route-14',
    route_id: 'route-14',
    display_name: 'Route #14 - Unknown to Unknown',
    name: 'Route #14 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -29.8587,
    end_lng: 31.0218,
    distance_km: 757.776,
    duration_min: 436,
    estimated_time: 436,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/29/2026, 8:06:48 PM',
    stops: []
  },
  {
    id: 'route-13',
    route_id: 'route-13',
    display_name: 'Route #13 - Unknown to Unknown',
    name: 'Route #13 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -25.7479,
    end_lng: 28.2293,
    distance_km: 270.48,
    duration_min: 158,
    estimated_time: 158,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/28/2026, 12:29:27 PM',
    stops: []
  },
  {
    id: 'route-12',
    route_id: 'route-12',
    display_name: 'Route #12 - Sandton to Durban',
    name: 'Route #12 - Sandton to Durban',
    origin_name: 'Sandton',
    destination_name: 'Durban',
    start_lat: -26.1076,
    start_lng: 28.0567,
    end_lat: -29.8587,
    end_lng: 31.0218,
    distance_km: 589.103,
    duration_min: 341,
    estimated_time: 341,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is truck, load weight is -1 kg.',
    timestamp: '7/27/2026, 12:01:31 PM',
    stops: [
      { latitude: -26.1076, longitude: 28.0567, name: '81 Rivonia Road, Sandton, 2196' },
      { latitude: -29.8587, longitude: 31.0218, name: '14 Dirk Uys Street, Umbilo, Durban, 4001' }
    ]
  },
  {
    id: 'route-11',
    route_id: 'route-11',
    display_name: 'Route #11 - Unknown to Unknown',
    name: 'Route #11 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -25.7479,
    end_lng: 28.2293,
    distance_km: 46.718,
    duration_min: 42,
    estimated_time: 42,
    estimated_cost: 'N/A',
    traffic_delay: 1,
    constraints: 'Route requires that vehicle type is truck.',
    timestamp: '7/27/2026, 11:18:45 AM',
    stops: []
  },
  {
    id: 'route-10',
    route_id: 'route-10',
    display_name: 'Route #10 - Unknown to Unknown',
    name: 'Route #10 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -33.9249,
    end_lng: 18.4241,
    distance_km: 615.44,
    duration_min: 358,
    estimated_time: 358,
    estimated_cost: 'N/A',
    traffic_delay: 11,
    constraints: 'Route requires that vehicle type is car, load weight is 30 kg.',
    timestamp: '6/18/2026, 6:26:09 PM',
    stops: []
  },
  {
    id: 'route-9',
    route_id: 'route-9',
    display_name: 'Route #9 - OR Tambo to Pretoria',
    name: 'Route #9 - OR Tambo to Pretoria',
    origin_name: 'OR Tambo International Airport',
    destination_name: 'Pretoria',
    start_lat: -26.1392,
    start_lng: 28.2460,
    end_lat: -25.7479,
    end_lng: 28.2293,
    distance_km: 49.507,
    duration_min: 41,
    estimated_time: 41,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is van, load weight is 300 kg.',
    timestamp: '6/18/2026, 6:17:14 PM',
    stops: [
      { latitude: -26.1392, longitude: 28.2460, name: 'OR Tambo International Airport, Kempton Park, 1627' },
      { latitude: -25.7479, longitude: 28.2293, name: '48 Church Square, Pretoria Suburbs, Pretoria, 0002' }
    ]
  },
  {
    id: 'route-8',
    route_id: 'route-8',
    display_name: 'Route #8 - Unknown to Unknown',
    name: 'Route #8 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -26.1076,
    end_lng: 28.0567,
    distance_km: 49.196,
    duration_min: 42,
    estimated_time: 42,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is truck, load weight is 1200 kg.',
    timestamp: '6/18/2026, 6:11:38 PM',
    stops: []
  },
  {
    id: 'route-7',
    route_id: 'route-7',
    display_name: 'Route #7 - Mayfair to Centurion',
    name: 'Route #7 - Mayfair to Centurion',
    origin_name: 'Mayfair West',
    destination_name: 'Centurion',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -25.8610,
    end_lng: 28.1900,
    distance_km: 43.132,
    duration_min: 41,
    estimated_time: 41,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that vehicle type is truck, load weight is 1198 kg.',
    timestamp: '6/18/2026, 5:53:41 PM',
    stops: [
      { latitude: -26.2041, longitude: 28.0473, name: '64 Saint Ives Avenue, Mayfair West, Johannesburg, 2092' },
      { latitude: -25.8610, longitude: 28.1900, name: '6789 Matiko Street, Olievenhoutbos, Centurion, 0187' }
    ]
  },
  {
    id: 'route-6',
    route_id: 'route-6',
    display_name: 'Route #6 - Unknown to Unknown',
    name: 'Route #6 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -25.7479,
    end_lng: 28.2293,
    distance_km: 61.89,
    duration_min: 75,
    estimated_time: 75,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that avoid toll roads, allow highways.',
    timestamp: '6/18/2026, 5:38:08 PM',
    stops: []
  },
  {
    id: 'route-5',
    route_id: 'route-5',
    display_name: 'Route #5 - Unknown to Unknown',
    name: 'Route #5 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -25.7479,
    end_lng: 28.2293,
    distance_km: 61.89,
    duration_min: 76,
    estimated_time: 76,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that avoid toll roads, allow highways.',
    timestamp: '6/18/2026, 5:26:01 PM',
    stops: []
  },
  {
    id: 'route-4',
    route_id: 'route-4',
    display_name: 'Route #4 - Unknown to Unknown',
    name: 'Route #4 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -25.7479,
    end_lng: 28.2293,
    distance_km: 61.329,
    duration_min: 101,
    estimated_time: 101,
    estimated_cost: 'N/A',
    traffic_delay: 4,
    constraints: 'Route requires that avoid toll roads, allow highways.',
    timestamp: '6/18/2026, 1:46:26 PM',
    stops: []
  },
  {
    id: 'route-3',
    route_id: 'route-3',
    display_name: 'Route #3 - Mayfair to Alexandra to Germiston',
    name: 'Route #3 - Mayfair to Alexandra to Germiston',
    origin_name: 'Mayfair West',
    destination_name: 'Germiston',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -26.1840,
    end_lng: 28.1694,
    distance_km: 66.048,
    duration_min: 83,
    estimated_time: 83,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that avoid toll roads, allow highways.',
    timestamp: '6/18/2026, 11:36:39 AM',
    stops: [
      { latitude: -26.2041, longitude: 28.0473, name: '64 Saint Ives Avenue, Mayfair West, Johannesburg, 2092' },
      { latitude: -26.1076, longitude: 28.0967, name: '11 John Brand Street, Alexandra Extension 28, Alexandra, 2090' },
      { latitude: -26.1840, longitude: 28.1694, name: 'Emmanuel Street, Roodekop, Germiston, 1434' }
    ]
  },
  {
    id: 'route-2',
    route_id: 'route-2',
    display_name: 'Route #2 - Unknown to Unknown',
    name: 'Route #2 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -26.1840,
    end_lng: 28.1694,
    distance_km: 66.048,
    duration_min: 82,
    estimated_time: 82,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that avoid toll roads, allow highways.',
    timestamp: '6/18/2026, 11:07:24 AM',
    stops: []
  },
  {
    id: 'route-1',
    route_id: 'route-1',
    display_name: 'Route #1 - Unknown to Unknown',
    name: 'Route #1 - Unknown to Unknown',
    origin_name: 'Unknown',
    destination_name: 'Unknown',
    start_lat: -26.2041,
    start_lng: 28.0473,
    end_lat: -26.1840,
    end_lng: 28.1694,
    distance_km: 66.048,
    duration_min: 82,
    estimated_time: 82,
    estimated_cost: 'N/A',
    traffic_delay: 0,
    constraints: 'Route requires that avoid toll roads, allow highways.',
    timestamp: '6/18/2026, 11:06:49 AM',
    stops: []
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
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [useLiveWeather, setUseLiveWeather] = useState(true);
  const [detectedLocation, setDetectedLocation] = useState(location);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState(null);
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
  const [alternativeRouteNames, setAlternativeRouteNames] = useState([]); // NEW
  const [showAlternatives, setShowAlternatives] = useState(false); // NEW
  
  const abortControllerRef = useRef(null);
  const weatherUpdateInterval = useRef(null);

  // Weather Service
  const fetchLiveWeather = useCallback(async (lat, lng) => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      let locationQuery = `${lat},${lng}`;
      if (detectedLocation) {
        locationQuery = detectedLocation;
      }

      const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${locationQuery}&aqi=no`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
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
      return getFallbackWeather(lat, lng);
    } finally {
      setWeatherLoading(false);
    }
  }, [detectedLocation, useLiveWeather, setParams]);

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

    // Check for real incidents from API
    incidents.forEach(incident => {
      if (incident.severity >= 3) {
        reasons.push(`⚠️ ${incident.type} (Severity ${incident.severity})`);
        affected = true;
      }
    });

    // Check for weather impacts
    if (liveWeather && liveWeather.impacts && liveWeather.impacts.riskLevel === 'high') {
      reasons.push(`🌧️ Severe weather: ${liveWeather.conditionText}`);
      affected = true;
    }

    // Check for heavy traffic delay
    if (route && route.trafficDelay > 10) {
      reasons.push(`🚦 Heavy traffic delay: +${Math.round(route.trafficDelay)} minutes`);
      affected = true;
    }

    return { affected, reasons };
  }, [params.accident, params.roadClosure, liveWeather]);

  // TomTom Traffic API Integration
  const fetchTrafficIncidents = useCallback(async (lat, lng) => {
    try {
      const radius = 10000; // 10km radius for better coverage
      const url = `https://api.tomtom.com/traffic/services/4/incidentDetails?key=${TOMTOM_API_KEY}&point=${lat},${lng}&radius=${radius}&categoryFilter=0,1,2,3,4&language=en-GB&maxResults=20`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Traffic API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.incidents && data.incidents.length > 0) {
        const incidents = data.incidents.map(incident => ({
          id: incident.id,
          type: incident.type,
          category: incident.category,
          description: incident.description,
          severity: incident.severity,
          startTime: incident.startTime,
          endTime: incident.endTime,
          from: incident.from,
          to: incident.to,
          location: incident.geometry,
          delay: incident.delay || 0
        }));
        
        setTrafficIncidents(incidents);
        return incidents;
      }
      
      return [];
      
    } catch (error) {
      console.error('Failed to fetch traffic incidents:', error);
      return generateSimulatedIncidents();
    }
  }, []);

  const generateSimulatedIncidents = useCallback(() => {
    const incidents = [];
    
    if (params.accident) {
      incidents.push({
        id: 'sim-accident',
        type: 'Accident',
        category: 'Accident',
        description: '🚗 Vehicle collision reported on main route causing significant delay',
        severity: 4,
        from: 'Main Road',
        to: 'Highway Interchange',
        simulation: true,
        impact: 'High traffic congestion expected',
        delay: 15
      });
    }
    
    if (params.roadClosure) {
      incidents.push({
        id: 'sim-roadclosure',
        type: 'Road Closure',
        category: 'Road Construction',
        description: '🚧 Road closed for maintenance work - alternative routes required',
        severity: 5,
        from: 'Bridge',
        to: 'Intersection',
        simulation: true,
        impact: 'Complete road closure - must use alternative route',
        delay: 25
      });
    }
    
    return incidents;
  }, [params.accident, params.roadClosure]);

  // Fetch traffic flow data
  const fetchTrafficFlow = useCallback(async (lat, lng) => {
    try {
      const radius = 5000;
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative/0/json?key=${TOMTOM_API_KEY}&point=${lat},${lng}&unit=KMPH&openLr=false`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Traffic Flow API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Failed to fetch traffic flow:', error);
      return null;
    }
  }, []);

  // Enhanced Route Recalculation with proper alternatives - MODIFIED
  const fetchAlternativeRoutes = useCallback(async (originLat, originLng, destLat, destLng) => {
    try {
      // Build URL with multiple alternatives
      let url = `https://api.tomtom.com/routing/1/calculateRoute/${originLat},${originLng}:${destLat},${destLng}/json?key=${TOMTOM_API_KEY}&routeType=fastest&traffic=true&computeTravelTimeFor=all&travelMode=car&alternatives=true&maxAlternatives=3&routeRepresentation=polyline&instructionFormat=text&language=en-GB`;
      
      // If there are incidents, try to avoid them
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
          
          // Get traffic flow for key points on the route
          let trafficFlowData = null;
          let routeName = '';
          
          if (route.legs && route.legs.length > 0) {
            const points = route.legs[0].points;
            if (points && points.length > 0) {
              const midPoint = points[Math.floor(points.length / 2)];
              trafficFlowData = await fetchTrafficFlow(midPoint.latitude, midPoint.longitude);
            }
            
            // Generate route name based on key streets/highways
            const instructions = route.guidance?.instructions || [];
            const streetNames = instructions
              .map(inst => inst.street || inst.road)
              .filter(Boolean)
              .slice(0, 3);
            
            if (streetNames.length > 0) {
              const uniqueStreets = [...new Set(streetNames)];
              routeName = `Via ${uniqueStreets.join(', ')}`;
            } else if (route.summary && route.summary.lengthInMeters) {
              const direction = route.summary.lengthInMeters > 10000 ? 'Long' : 'Short';
              routeName = `${direction} Route ${index + 1}`;
            } else {
              routeName = `Alternative Route ${index + 1}`;
            }
          }
          
          return {
            id: `route-${index}`,
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
            trafficFlow: trafficFlowData,
            congestionLevel: trafficFlowData?.flowSegmentData?.currentSpeed ? 
              (trafficFlowData.flowSegmentData.currentSpeed / trafficFlowData.flowSegmentData.freeFlowSpeed) : 1,
            name: routeName,
            displayName: `${routeName} (${Math.round(duration)} min)`
          };
        }));
        
        // Store alternative route names
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
  }, [params.accident, params.roadClosure, fetchTrafficFlow]);

  // Analyze and recommend the best route
  const analyzeAndRecommendRoute = useCallback((routes, incidents, originalDuration) => {
    if (!routes || routes.length === 0) {
      return null;
    }

    let recommendations = [];
    let bestRoute = routes[0];
    let bestScore = Infinity;

    // Check if route is affected
    const { affected, reasons } = checkRouteAffected(routes[0], incidents);
    setIsRouteAffected(affected);
    setAffectedReasons(reasons);

    // Score each route
    routes.forEach((route, index) => {
      let score = route.duration;
      let issues = [];
      let benefits = [];

      // Check for incident avoidance
      if (incidents.length > 0) {
        incidents.forEach(incident => {
          // Check if route avoids the incident
          const routeText = JSON.stringify(route.instructions).toLowerCase();
          const incidentText = incident.description.toLowerCase();
          
          if (incident.type === 'Road Closure' || incident.type === 'Accident') {
            // Check if route mentions avoiding the incident
            if (routeText.includes('avoid') || routeText.includes('closure') || 
                routeText.includes('accident') || routeText.includes('incident')) {
              benefits.push(`Avoids ${incident.type.toLowerCase()}`);
            } else if (routeText.includes(incidentText.split(' ').slice(0, 3).join(' '))) {
              // Route might be affected
              const penalty = incident.type === 'Road Closure' ? 30 : 20;
              score += penalty;
              issues.push(`May be affected by ${incident.type.toLowerCase()}`);
            }
          }
        });

        // Add traffic delay penalty
        if (route.trafficDelay > 5) {
          score += route.trafficDelay * 0.5;
          issues.push(`${Math.round(route.trafficDelay)} min traffic delay`);
        }

        // Check congestion level
        if (route.congestionLevel < 0.5) {
          score += 10;
          issues.push('Heavy congestion on route');
        }
      }

      // Consider weather impact
      if (liveWeather && liveWeather.impacts) {
        const weatherPenalty = (liveWeather.impacts.delayMultiplier - 1) * route.duration;
        if (weatherPenalty > 2) {
          score += weatherPenalty;
          issues.push(`Weather impact: +${Math.round(weatherPenalty)} min`);
        }
      }

      // Alternative route benefits
      if (route.isAlternative) {
        const timeSaved = originalDuration - route.duration;
        if (timeSaved > 2) {
          benefits.push(`Saves ${Math.round(timeSaved)} minutes`);
        }
        
        // Check if alternative avoids the main issues
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

    // Mark the best route
    const bestRecommendation = recommendations.find(r => r.route.id === bestRoute.id);
    if (bestRecommendation) {
      bestRecommendation.isRecommended = true;
      
      // Build final reason
      let reasonParts = [];
      
      if (bestRecommendation.benefits.length > 0) {
        reasonParts.push(bestRecommendation.benefits.join(' and '));
      }

      if (bestRecommendation.issues.length === 0 && bestRoute.isAlternative) {
        reasonParts.push('has no significant delays or incidents');
      }

      // Specific messages
      if (params.accident && bestRoute.isAlternative) {
        reasonParts.push('bypasses the accident zone');
      }
      if (params.roadClosure && bestRoute.isAlternative) {
        reasonParts.push('avoids the road closure');
      }

      // If original route is affected but recommended route is alternative
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

      // Update alternative route names to show which is recommended
      if (bestRoute.isAlternative) {
        setAlternativeRouteNames(prev => 
          prev.map(alt => ({
            ...alt,
            isRecommended: alt.id === bestRoute.id
          }))
        );
      }
    }

    // Calculate time saved
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

  }, [params.accident, params.roadClosure, liveWeather, checkRouteAffected]);

  // Reset all simulation state - UPDATED
  const resetSimulationState = useCallback(() => {
    setSimulationResults(null);
    setAlternativeRoutes([]);
    setRecommendedRoute(null);
    setRouteMetrics(null);
    setTrafficIncidents([]);
    setVerificationStatus('');
    setRouteRecommendations([]);
    setIsRouteAffected(false);
    setAffectedReasons([]);
    setIsSimulating(false);
    setAlternativeRouteNames([]); // NEW
    setShowAlternatives(false); // NEW
    
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Main simulation function - UPDATED to show alternative names
  const runEnhancedSimulation = useCallback(async () => {
    if (!selectedRouteId) {
      console.warn('No route selected');
      return;
    }

    // Reset previous results
    resetSimulationState();
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

      setVerificationStatus('Fetching weather data...');
      let weatherData = selectedRoute.weather;
      if (useLiveWeather) {
        weatherData = await fetchLiveWeather(midPoint.lat, midPoint.lng);
      }

      setVerificationStatus('Checking traffic incidents...');
      const trafficIncidents = await fetchTrafficIncidents(midPoint.lat, midPoint.lng);
      const simulatedIncidents = generateSimulatedIncidents();
      const allIncidents = [...trafficIncidents, ...simulatedIncidents];
      
      const originalDuration = parseFloat(selectedRoute.duration_min) || 60;
      const weatherImpact = weatherData?.impacts || WEATHER_IMPACTS[params.weather] || WEATHER_IMPACTS.sunny;
      
      // Apply simulation parameters
      const delayImpact = parseInt(params.delay) || 0;
      const accidentImpact = params.accident ? 15 : 0;
      const roadClosureImpact = params.roadClosure ? 25 : 0;
      const weatherDelay = originalDuration * (weatherImpact.delayMultiplier - 1);
      
      const totalDelay = delayImpact + accidentImpact + roadClosureImpact + weatherDelay;
      const simulatedDuration = originalDuration + totalDelay;

      setVerificationStatus('Calculating alternative routes...');
      const alternatives = await fetchAlternativeRoutes(
        origin.lat, origin.lng,
        destination.lat, destination.lng
      );

      // Check if route is affected and show alternative route names
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
        allIncidents,
        originalDuration
      );

      if (recommendation) {
        setRecommendedRoute({
          ...recommendation,
          duration: recommendation.route.duration,
          distance: recommendation.route.distance
        });
      }

      // Compile results
      const results = {
        runId: simulationRunCount + 1,
        originalRoute: {
          id: selectedRoute.id,
          name: selectedRoute.display_name,
          duration: originalDuration,
          simulatedDuration: simulatedDuration,
          distance: selectedRoute.distance_km,
          delay: totalDelay,
          weatherImpact: weatherImpact,
          incidents: allIncidents,
          isAffected: isRouteAffected,
          affectedReasons: affectedReasons
        },
        alternatives: alternatives,
        recommendedRoute: recommendation,
        trafficIncidents: allIncidents,
        weather: weatherData,
        simulationParams: { ...params },
        timestamp: new Date().toISOString(),
        routeRecommendations: routeRecommendations,
        isRouteAffected: isRouteAffected,
        affectedReasons: affectedReasons
      };

      setSimulationResults(results);
      setSimulationRunCount(prev => prev + 1);
      
      // Add to history
      setSimulationHistory(prev => [{
        timestamp: results.timestamp,
        runId: results.runId,
        routeId: selectedRouteId,
        routeName: selectedRoute.display_name,
        originalDuration: originalDuration,
        simulatedDuration: simulatedDuration,
        delay: totalDelay,
        recommendedRoute: recommendation,
        params: { ...params },
        weather: weatherData,
        timeSaved: recommendation?.timeSaved || 0,
        isAffected: isRouteAffected,
        affectedReasons: affectedReasons
      }, ...prev]);

      setVerificationStatus('Simulation complete!');
      
      setRouteMetrics({
        delayMinutes: totalDelay,
        speedReduction: (1 - weatherImpact.speedMultiplier) * 100,
        congestionIncrease: (weatherImpact.congestionMultiplier - 1) * 100,
        riskLevel: weatherImpact.riskLevel,
        weatherType: params.weather,
        hasAccident: params.accident,
        hasRoadClosure: params.roadClosure,
        recommendedRoute: recommendation,
        timeSaved: recommendation?.timeSaved || 0,
        isRouteAffected: isRouteAffected,
        affectedReasons: affectedReasons
      });

      if (onRunSimulation) {
        onRunSimulation(selectedRouteId, results);
      }

    } catch (error) {
      console.error('Simulation error:', error);
      setVerificationStatus(`Simulation failed: ${error.message}`);
      
      // Fallback recommendation
      const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
      if (selectedRoute) {
        const weatherImpact = WEATHER_IMPACTS[params.weather] || WEATHER_IMPACTS.sunny;
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
        
        setRouteMetrics(totalImpact);
        
        // Generate fallback recommendation
        let fallbackReason = '';
        let fallbackText = '';
        let isAffected = false;
        const reasons = [];
        
        if (params.accident && params.roadClosure) {
          isAffected = true;
          reasons.push('Accident and road closure detected');
          fallbackReason = 'Recommended to avoid both accident and road closure';
          fallbackText = 'Take alternative route to avoid accident zone and road closure. Consider using side streets.';
        } else if (params.accident) {
          isAffected = true;
          reasons.push('Accident reported on route');
          fallbackReason = 'Recommended to avoid accident zone';
          fallbackText = 'Take alternative route to bypass the accident area. Expect minor delays.';
        } else if (params.roadClosure) {
          isAffected = true;
          reasons.push('Road closure on route');
          fallbackReason = 'Recommended to avoid road closure';
          fallbackText = 'Road closure detected - use alternative route. Expect significant time savings.';
        } else {
          fallbackReason = 'Original route is optimal';
          fallbackText = 'No significant incidents detected. Stay on current route.';
        }
        
        setIsRouteAffected(isAffected);
        setAffectedReasons(reasons);
        
        const fallbackRecommendation = {
          id: 'fallback',
          duration: parseFloat(selectedRoute.duration_min) || 60,
          distance: selectedRoute.distance_km || 0,
          timeSaved: (params.accident || params.roadClosure) ? Math.round((Math.random() * 15) + 5) : 0,
          reason: fallbackReason,
          recommendationText: fallbackText,
          isAlternative: params.accident || params.roadClosure,
          benefits: params.accident ? ['Avoids accident zone'] : params.roadClosure ? ['Avoids road closure'] : ['No incidents'],
          issues: []
        };
        
        setRecommendedRoute(fallbackRecommendation);
        
        // Add to history with error flag
        setSimulationHistory(prev => [{
          timestamp: new Date().toISOString(),
          runId: simulationRunCount + 1,
          routeId: selectedRouteId,
          routeName: selectedRoute.display_name,
          originalDuration: parseFloat(selectedRoute.duration_min) || 60,
          simulatedDuration: parseFloat(selectedRoute.duration_min) || 60 + totalImpact.delayMinutes,
          delay: totalImpact.delayMinutes,
          recommendedRoute: fallbackRecommendation,
          params: { ...params },
          weather: null,
          error: true,
          timeSaved: fallbackRecommendation.timeSaved,
          isAffected: isAffected,
          affectedReasons: reasons
        }, ...prev]);
      }
      
    } finally {
      setIsSimulating(false);
    }
  }, [
    selectedRouteId, 
    enrichedRoutes, 
    params, 
    useLiveWeather, 
    fetchLiveWeather, 
    fetchTrafficIncidents, 
    generateSimulatedIncidents,
    fetchAlternativeRoutes,
    analyzeAndRecommendRoute,
    onRunSimulation,
    resetSimulationState,
    simulationRunCount,
    routeRecommendations,
    isRouteAffected,
    affectedReasons
  ]);

  // Extract coordinates from route
  const extractCoordinates = useCallback((route) => {
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
  }, []);

  // Reverse geocode
  const reverseGeocodePoint = async (lat, lng) => {
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

    const nearbyCity = getNearbyCity(lat, lng);
    if (nearbyCity) {
      return { label: nearbyCity, source: 'coordinate' };
    }

    return { label: 'Unknown Location', source: 'coordinate' };
  };

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
        const coords = extractCoordinates(route);
        let originName = 'Unknown Location';
        let destinationName = 'Unknown Location';
        let routeName = '';
        let weatherData = null;

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

        const originShort = extractMeaningfulName(originName);
        const destShort = extractMeaningfulName(destinationName);

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

        const distance = route.result?.distance_km || route.distance_km || route.distance || 'N/A';
        let duration = route.result?.duration_min || route.duration_min || route.estimated_time || route.duration || 'N/A';
        const cost = route.result?.cost || route.estimated_cost || route.cost || 'N/A';

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
  }, [fetchLiveWeather, extractCoordinates]);

  // Process routes when they change - THIS NOW COMBINES HARDCODED ROUTES WITH ANY INCOMING ROUTES
  useEffect(() => {
    const processRoutes = async () => {
      let routesToProcess = [];
      
      // Always use hardcoded routes as the primary source
      if (HARDCODED_ROUTES && HARDCODED_ROUTES.length > 0) {
        routesToProcess = HARDCODED_ROUTES;
      }
      
      // If routes prop has data, merge it (but prefer hardcoded ones if IDs conflict)
      if (routes && routes.length > 0) {
        const existingIds = new Set(routesToProcess.map(r => r.id || r.route_id));
        const newRoutes = routes.filter(r => {
          const id = r.id || r.route_id;
          return !existingIds.has(id);
        });
        routesToProcess = [...routesToProcess, ...newRoutes];
      }
      
      if (routesToProcess.length > 0) {
        const enriched = await enrichRoutesWithNames(routesToProcess);
        setEnrichedRoutes(enriched);
        
        if (enriched.length > 0 && !selectedRouteId) {
          setSelectedRouteId(enriched[0].id);
        }
      } else {
        setEnrichedRoutes([]);
      }
    };

    processRoutes();
  }, [routes, enrichRoutesWithNames]);

  // Reset simulation when route changes - CRITICAL for multiple simulations
  useEffect(() => {
    if (selectedRouteId) {
      resetSimulationState();
      setVerificationStatus('Route changed. Ready for new simulation.');
    }
  }, [selectedRouteId, resetSimulationState]);

  // Reset simulation when parameters change
  useEffect(() => {
    if (simulationResults) {
      resetSimulationState();
      setVerificationStatus('Parameters changed. Ready for new simulation.');
    }
  }, [params.delay, params.weather, params.accident, params.roadClosure]);

  // Set up weather auto-update
  useEffect(() => {
    if (useLiveWeather && selectedRouteId) {
      if (weatherUpdateInterval.current) {
        clearInterval(weatherUpdateInterval.current);
      }
      
      weatherUpdateInterval.current = setInterval(() => {
        const selectedRoute = enrichedRoutes.find(r => r.id === selectedRouteId);
        if (selectedRoute) {
          const coords = extractCoordinates(selectedRoute);
          if (coords.length > 0) {
            const midPoint = coords[Math.floor(coords.length / 2)];
            fetchLiveWeather(midPoint.lat, midPoint.lng);
          }
        }
      }, 300000);
      
      return () => {
        if (weatherUpdateInterval.current) {
          clearInterval(weatherUpdateInterval.current);
        }
      };
    }
  }, [useLiveWeather, selectedRouteId, enrichedRoutes, fetchLiveWeather, extractCoordinates]);

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
        <div className="flex items-center gap-3">
          {simulationRunCount > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Runs: {simulationRunCount}
            </span>
          )}
          {liveWeather && (
            <span className="text-sm font-normal text-gray-600 flex items-center gap-2">
              <WeatherIcon condition={liveWeather.condition} size={16} />
              {liveWeather.temperature}°C
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

        {/* Route Selection Dropdown - FIXED */}
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">
            Select Route
          </label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
            value={selectedRouteId} 
            onChange={(e) => {
              setSelectedRouteId(e.target.value);
              // Reset simulation state immediately on route change
              resetSimulationState();
              const route = enrichedRoutes.find(r => r.id === e.target.value);
              if (route && useLiveWeather) {
                const coords = extractCoordinates(route);
                if (coords.length > 0) {
                  const midPoint = coords[Math.floor(coords.length / 2)];
                  fetchLiveWeather(midPoint.lat, midPoint.lng);
                }
              }
            }}
            disabled={false} // Always enabled - routes are always selectable
          >
            {enrichedRoutes.length === 0 ? (
              <option value="">No routes available - please add routes</option>
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
          
          {/* Route Details - Always show if route is selected */}
          {selectedRoute && (
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
        
        {/* Weather Selection */}
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

        {/* Alternative Route Names Display - NEW */}
        {showAlternatives && alternativeRouteNames.length > 0 && (params.accident || params.roadClosure) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Alternative Routes Available</span>
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
                  Run simulation to find alternative routes
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simulation Results */}
        {simulationResults && (
          <div className="space-y-3">
            {/* Run Information */}
            <div className="text-xs text-gray-500 flex justify-between items-center">
              <span>Simulation #{simulationResults.runId}</span>
              <span>{new Date(simulationResults.timestamp).toLocaleTimeString()}</span>
            </div>

            {/* Route Affected Status */}
            {simulationResults.isRouteAffected && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  Route Affected
                </div>
                <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                  {simulationResults.affectedReasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Original vs Simulated Comparison */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Route Comparison</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded">
                  <span className="text-gray-500">Original</span>
                  <div className="font-bold text-green-600">
                    {Math.round(simulationResults.originalRoute.duration)} min
                  </div>
                </div>
                <div className="bg-white p-2 rounded">
                  <span className="text-gray-500">Simulated</span>
                  <div className="font-bold text-red-600">
                    {Math.round(simulationResults.originalRoute.simulatedDuration)} min
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Delay: </span>
                +{Math.round(simulationResults.originalRoute.delay)} minutes
                {simulationResults.originalRoute.incidents.length > 0 && (
                  <span className="ml-2 text-orange-600">
                    • {simulationResults.originalRoute.incidents.length} incident(s)
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
                  
                  {/* Benefits */}
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

                  {/* Issues avoided */}
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
                  
                  {/* Recommendation explanation */}
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="font-medium">{recommendedRoute.recommendationText}</span>
                    </div>
                  </div>

                  {/* Additional explanation */}
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
                    <div className="flex items-start gap-1">
                      <Shield className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{recommendedRoute.reason}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alternative Routes */}
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
                          {index === 0 ? '📍 Original Route' : `🔄 Alternative ${index}`}
                        </span>
                        <span className="text-gray-500">{alt.duration} min • {alt.distance} km</span>
                      </div>
                      {alt.trafficDelay > 0 && (
                        <div className="text-orange-500 mt-1">
                          Traffic: +{Math.round(alt.trafficDelay)} min delay
                        </div>
                      )}
                      {alt.congestionLevel < 0.5 && (
                        <div className="text-red-500 mt-1">
                          ⚠️ Heavy congestion
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

            {/* Traffic Incidents */}
            {simulationResults.trafficIncidents.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-center gap-2 text-sm font-medium text-red-900">
                  <AlertTriangle className="w-4 h-4" />
                  Traffic Incidents
                </div>
                <div className="mt-2 space-y-1">
                  {simulationResults.trafficIncidents.map((incident, index) => (
                    <div key={index} className="text-xs text-red-700 bg-white p-2 rounded border border-red-100">
                      <div className="font-medium flex items-center gap-2">
                        {incident.type}
                        {incident.simulation && (
                          <span className="text-purple-500">⚠️ Simulated</span>
                        )}
                      </div>
                      <div className="text-gray-600">{incident.description}</div>
                      {incident.impact && (
                        <div className="text-orange-600 mt-1">{incident.impact}</div>
                      )}
                      {incident.delay && (
                        <div className="text-red-500 mt-1">Delay: +{incident.delay} min</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Run Simulation Button - FIXED */}
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
              {simulationRunCount > 0 ? 'Run New Simulation' : 'Run Live Simulation'}
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
                      {entry.isAffected && (
                        <span className="text-yellow-600">⚠️ Route affected</span>
                      )}
                      {entry.error && (
                        <span className="text-red-500">⚠️ Error</span>
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