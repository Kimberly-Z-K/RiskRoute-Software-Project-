import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  Layers,
  Loader,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Sun,
  CloudRain,
  ThumbsUp,
  TrendingDown,
  Zap,
  Save,
  History,
  Trash2,
  Eye,
  X,
  Calendar,
  Award,
  TrendingUp,
  AlertCircle,
  Cloud,
  Wind,
  Thermometer,
  CheckCircle2,
  Compass,
  RefreshCw as RefreshIcon,
  Brain,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Send,
  Bot
} from "lucide-react";
import aiService from '../backend/aiService';

/* ============================================================
   DEFAULT ROUTES (Fallback if API fails)
============================================================ */

const DEFAULT_ROUTES = [
  {
    id: "route-19",
    display_name: "Route #19 - Johannesburg to Durban",
    origin_name: "Johannesburg",
    destination_name: "Durban",
    origin_lat: -26.2041,
    origin_lng: 28.0473,
    dest_lat: -29.8587,
    dest_lng: 31.0218,
    distance_km: 570.29,
    duration_min: 333,
    estimated_cost: 950,
    traffic_delay: 3,
  },
  {
    id: "route-18",
    display_name: "Route #18 - OR Tambo to Sandton",
    origin_name: "OR Tambo International Airport",
    destination_name: "Sandton",
    origin_lat: -26.1392,
    origin_lng: 28.2460,
    dest_lat: -26.1076,
    dest_lng: 28.0567,
    distance_km: 36.649,
    duration_min: 47,
    estimated_cost: 180,
    traffic_delay: 2,
  },
];

/* ============================================================
   WEATHER OPTIONS
============================================================ */

const WEATHER_OPTIONS = [
  {
    value: "sunny",
    label: "☀️ Sunny / Clear",
    multiplier: 1,
    risk: 5,
  },
  {
    value: "partly_cloudy",
    label: "🌤️ Partly Cloudy",
    multiplier: 1.02,
    risk: 8,
  },
  {
    value: "cloudy",
    label: "☁️ Cloudy",
    multiplier: 1.05,
    risk: 10,
  },
  {
    value: "light_rain",
    label: "🌦️ Light Rain",
    multiplier: 1.1,
    risk: 15,
  },
  {
    value: "moderate_rain",
    label: "🌧️ Moderate Rain",
    multiplier: 1.18,
    risk: 25,
  },
  {
    value: "heavy_rain",
    label: "⛈️ Heavy Rain",
    multiplier: 1.3,
    risk: 40,
  },
  {
    value: "fog",
    label: "🌫️ Fog / Mist",
    multiplier: 1.2,
    risk: 30,
  },
  {
    value: "windy",
    label: "💨 Strong Winds",
    multiplier: 1.1,
    risk: 20,
  },
];

/* ============================================================
   HELPERS
============================================================ */

const getRouteId = (route) =>
  route?.id || route?.route_id || "";

const getRouteName = (route) => {
  if (!route) return "Unknown Route";

  return (
    route.display_name ||
    route.name ||
    `${route.origin_name || "Origin"} → ${
      route.destination_name || "Destination"
    }`
  );
};

const getDuration = (route) => {
  const value =
    route?.duration_min ??
    route?.estimated_time ??
    route?.duration ??
    60;

  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : 60;
};

const getDistance = (route) => {
  const value =
    route?.distance_km ??
    route?.distance ??
    0;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const getCost = (route) => {
  const value =
    route?.estimated_cost ??
    route?.cost ??
    0;

  const number = parseFloat(
    String(value).replace(/[^0-9.]/g, "")
  );

  return Number.isFinite(number)
    ? number
    : 0;
};

const getRiskLabel = (score) => {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const getRiskClasses = (score) => {
  if (score >= 70) {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (score >= 40) {
    return "bg-orange-100 text-orange-700 border-orange-200";
  }

  return "bg-green-100 text-green-700 border-green-200";
};

/* ============================================================
   WEATHER DISPLAY COMPONENT - UPDATED
============================================================ */

const WeatherDisplay = ({ weather, loading, onRefresh, originName, destinationName }) => {
  if (loading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-center py-4">
          <Loader className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-blue-600">Loading current weather...</span>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="text-center py-4">
          <Cloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Weather data unavailable</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 mx-auto"
          >
            <RefreshIcon className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getWeatherIcon = (condition) => {
    const text = condition?.toLowerCase() || '';
    if (text.includes('sunny') || text.includes('clear')) return <Sun className="w-5 h-5 text-yellow-500" />;
    if (text.includes('rain') || text.includes('drizzle')) return <CloudRain className="w-5 h-5 text-blue-500" />;
    if (text.includes('cloud')) return <Cloud className="w-5 h-5 text-gray-500" />;
    if (text.includes('wind')) return <Wind className="w-5 h-5 text-gray-400" />;
    if (text.includes('fog') || text.includes('mist')) return <Cloud className="w-5 h-5 text-gray-400" />;
    if (text.includes('snow')) return <Cloud className="w-5 h-5 text-blue-300" />;
    return <Cloud className="w-5 h-5 text-gray-400" />;
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Use the route names passed from parent
  const originDisplayName = originName || 'Origin';
  const destDisplayName = destinationName || 'Destination';
  
  // Get location names from weather data (if available)
  const originLocation = weather.origin?.location?.name || originDisplayName;
  const destLocation = weather.destination?.location?.name || destDisplayName;
  const midLocation = weather.midpoint?.location?.name || 'Midpoint';

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-600" />
          Current Weather Along Route
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Updated: {formatTime(weather.origin?.current?.last_updated)}
          </span>
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-blue-200 rounded-lg transition-colors"
            title="Refresh weather"
          >
            <RefreshIcon className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/80 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 font-medium">Origin</p>
          <p className="text-xs text-gray-700 truncate font-semibold">{originLocation}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {getWeatherIcon(weather.origin?.current?.condition?.text)}
            <span className="text-xl font-bold">{Math.round(weather.origin?.current?.temp_c || 0)}°C</span>
          </div>
          <p className="text-xs text-gray-600 truncate">{weather.origin?.current?.condition?.text || 'Unknown'}</p>
          <div className="flex justify-center gap-3 mt-1 text-xs text-gray-500">
            <span>💧 {weather.origin?.current?.humidity || 0}%</span>
            <span>💨 {Math.round(weather.origin?.current?.wind_kph || 0)} km/h</span>
          </div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 font-medium">Midpoint</p>
          <p className="text-xs text-gray-700 truncate">{midLocation}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {getWeatherIcon(weather.midpoint?.current?.condition?.text)}
            <span className="text-xl font-bold">{Math.round(weather.midpoint?.current?.temp_c || 0)}°C</span>
          </div>
          <p className="text-xs text-gray-600 truncate">{weather.midpoint?.current?.condition?.text || 'Unknown'}</p>
          <div className="flex justify-center gap-3 mt-1 text-xs text-gray-500">
            <span>💧 {weather.midpoint?.current?.humidity || 0}%</span>
            <span>💨 {Math.round(weather.midpoint?.current?.wind_kph || 0)} km/h</span>
          </div>
        </div>
        
        <div className="bg-white/80 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 font-medium">Destination</p>
          <p className="text-xs text-gray-700 truncate font-semibold">{destLocation}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {getWeatherIcon(weather.destination?.current?.condition?.text)}
            <span className="text-xl font-bold">{Math.round(weather.destination?.current?.temp_c || 0)}°C</span>
          </div>
          <p className="text-xs text-gray-600 truncate">{weather.destination?.current?.condition?.text || 'Unknown'}</p>
          <div className="flex justify-center gap-3 mt-1 text-xs text-gray-500">
            <span>💧 {weather.destination?.current?.humidity || 0}%</span>
            <span>💨 {Math.round(weather.destination?.current?.wind_kph || 0)} km/h</span>
          </div>
        </div>
      </div>
      
      {weather.summary?.recommendation && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className={`text-sm flex items-start gap-2 ${
            weather.summary.recommendation.includes('Adverse') ? 'text-red-600' :
            weather.summary.recommendation.includes('Partly') ? 'text-yellow-600' :
            'text-blue-700'
          }`}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {weather.summary.recommendation}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-gray-600">
            <span>🌡️ Avg: {weather.summary.average_temp || 0}°C</span>
            <span>☁️ {weather.summary.conditions || 'Unknown'}</span>
            <span className="flex gap-1">
              {weather.summary.weather_icons?.origin} {weather.summary.weather_icons?.midpoint} {weather.summary.weather_icons?.destination}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   TRAFFIC DISPLAY COMPONENT
============================================================ */

const TrafficDisplay = ({ traffic }) => {
  if (!traffic) return null;
  
  return (
    <div className={`rounded-lg p-4 border ${
      traffic.hasAccident || traffic.hasRoadClosure ? 'bg-red-50 border-red-200' :
      traffic.hasTraffic ? 'bg-orange-50 border-orange-200' :
      'bg-green-50 border-green-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Traffic Conditions
        </h4>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          traffic.hasAccident || traffic.hasRoadClosure ? 'bg-red-200 text-red-700' :
          traffic.hasTraffic ? 'bg-orange-200 text-orange-700' :
          'bg-green-200 text-green-700'
        }`}>
          {traffic.hasAccident ? 'Accident' :
           traffic.hasRoadClosure ? 'Road Closure' :
           traffic.hasTraffic ? 'Heavy Traffic' :
           'Clear'}
        </span>
      </div>
      
      {traffic.trafficDelayMinutes > 0 && (
        <p className="text-sm text-gray-600">
          ⏱️ {traffic.trafficDelayMinutes} min delay expected
        </p>
      )}
      
      {traffic.totalTimeMinutes > 0 && (
        <p className="text-sm text-gray-600">
          🕐 Total travel time: {traffic.totalTimeMinutes} min
        </p>
      )}
      
      {traffic.recommendation && (
        <p className="text-sm mt-2 font-medium text-gray-700">
          {traffic.recommendation}
        </p>
      )}
    </div>
  );
};

/* ============================================================
   ALTERNATIVE ROUTES DISPLAY
============================================================ */

const AlternativeRoutesDisplay = ({ alternatives, onSelect }) => {
  if (!alternatives || alternatives.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <Compass className="w-4 h-4" />
        Alternative Routes
      </h4>
      
      {alternatives.map((alt, index) => (
        <div
          key={alt.id || index}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
            alt.isRecommended || index === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
          }`}
          onClick={() => onSelect?.(alt)}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{alt.displayName || alt.name}</span>
                {(alt.isRecommended || index === 0) && (
                  <span className="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  alt.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                  alt.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {alt.risk_level || 'Medium'} risk
                </span>
              </div>
              {alt.description && (
                <p className="text-xs text-gray-500 mt-1">{alt.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{alt.duration || 0} min</p>
              <p className="text-xs text-gray-500">{alt.distance || 0} km</p>
            </div>
          </div>
          {alt.recommendation && (
            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {alt.recommendation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

/* ============================================================
   RISK GAUGE
============================================================ */

const RiskGauge = ({ score }) => {
  const safeScore = Math.min(
    Math.max(Math.round(score || 0), 0),
    100
  );

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
          safeScore >= 70
            ? "border-red-400 bg-red-50"
            : safeScore >= 40
            ? "border-orange-400 bg-orange-50"
            : "border-green-400 bg-green-50"
        }`}
      >
        <span className="font-bold text-2xl">
          {safeScore}
        </span>
      </div>

      <span
        className={`mt-1 px-3 py-0.5 rounded-full border text-xs font-medium ${getRiskClasses(
          safeScore
        )}`}
      >
        {getRiskLabel(safeScore)}
      </span>
    </div>
  );
};

/* ============================================================
   COMPARISON BAR
============================================================ */

const CompareBar = ({
  label,
  currentVal,
  optimalVal,
  currentLabel,
  optimalLabel,
}) => {
  const current = Number(currentVal) || 0;
  const optimal = Number(optimalVal) || 0;

  const max = Math.max(current, optimal, 1);

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold text-gray-700">
          {label}
        </span>

        <div className="flex gap-4">
          <span className="text-red-600 text-sm font-medium">
            Current: {currentLabel}
          </span>

          <span className="text-green-600 text-sm font-medium">
            Recommended: {optimalLabel}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-400 rounded-full"
            style={{
              width: `${(current / max) * 100}%`,
            }}
          />
        </div>

        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{
              width: `${(optimal / max) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   AI RESULTS DISPLAY COMPONENT
============================================================ */

const AIResultsDisplay = ({ analysis, loading, onRefresh }) => {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-3 text-gray-500 text-sm">AI is analyzing your route...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Brain className="w-7 h-7 text-purple-600" />
          </div>
          <p className="text-gray-600 font-medium">AI Analysis</p>
          <p className="text-xs text-gray-400 mt-1">Run a simulation to get AI-powered insights</p>
          <button
            onClick={onRefresh}
            className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            Analyze with AI
          </button>
        </div>
      </div>
    );
  }

  // Calculate confidence level display
  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h4 className="font-semibold text-gray-900">AI Route Analysis</h4>
          {analysis.confidence && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(analysis.confidence)}`}>
              {getConfidenceLabel(analysis.confidence)} • {analysis.confidence}%
            </span>
          )}
        </div>
        {analysis.historicalData && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <History className="w-3 h-3" />
            {analysis.historicalData}
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white/80 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-700">{analysis.summary}</p>
      </div>

      {/* Key Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Key Insights
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {analysis.insights.map((insight, idx) => (
              <div key={idx} className="bg-white/80 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{insight.icon || '📊'}</span>
                  <span className="font-medium text-xs text-gray-600">{insight.label}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-1">{insight.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            AI Recommendations
          </h5>
          <ul className="space-y-1.5">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2 bg-white/60 rounded-lg p-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Factors */}
      {analysis.riskFactors && analysis.riskFactors.length > 0 && (
        <div>
          <h5 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Risk Factors
          </h5>
          <div className="flex flex-wrap gap-2">
            {analysis.riskFactors.map((factor, idx) => (
              <span
                key={idx}
                className={`text-xs px-3 py-1 rounded-full ${
                  factor.level === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                  factor.level === 'medium' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                  'bg-green-100 text-green-700 border border-green-200'
                }`}
              >
                {factor.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Bar */}
      {analysis.confidence && (
        <div className="mt-4 pt-3 border-t border-purple-200">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span>Confidence Level</span>
            <span>{analysis.confidence}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                analysis.confidence >= 80 ? 'bg-green-500' :
                analysis.confidence >= 60 ? 'bg-yellow-500' :
                'bg-orange-500'
              }`}
              style={{ width: `${analysis.confidence}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Based on {analysis.historicalData ? 'historical data and ' : ''}current route analysis
          </p>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   AI CHAT MODAL COMPONENT
============================================================ */

const AIChatModal = ({ isOpen, onClose, onSendMessage, messages, isLoading, context }) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "What's the best route?",
    "How does weather affect this route?",
    "What are the risk factors?",
    "Optimize for time",
    "Should I take the alternative route?",
    "What's the safest route?"
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Route Assistant</h3>
              <p className="text-xs text-gray-500">Ask about your route, weather, traffic, or risk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">How can I help you with your route?</p>
              <p className="text-xs text-gray-400 mt-1">
                Ask about route optimization, weather impact, traffic, or risk assessment
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              {context?.simulationCount > 0 && (
                <p className="text-xs text-purple-500 mt-4">
                  🧠 I've learned from {context.simulationCount} previous simulations
                </p>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : msg.isError
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.role === "assistant" && !msg.isError && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Bot className="w-3 h-3" />
                    <span>Route Assistant</span>
                  </div>
                )}
                {msg.isError && (
                  <div className="flex items-center gap-1 text-xs text-red-500 mb-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Note</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-3 flex items-center gap-2">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your route..."
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   RESULTS PANEL
============================================================ */

const ResultsPanel = ({ results, history, onSave, isSaving, aiAnalysis, aiLoading, onAIAnalyze }) => {
  if (!results) return null;

  return (
    <div className="space-y-5 overflow-y-auto max-h-[700px] pr-4">
      {/* RESULT HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Simulation Results
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {results.routeName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isSaving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
          <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
            <Radio className="w-4 h-4" />
            Completed
          </span>
        </div>
      </div>

      {/* DISRUPTION SUMMARY */}
      <div className="flex flex-wrap gap-2">
        {results.params.delay > 0 && (
          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            ⏱️ +{results.params.delay} min delay
          </span>
        )}
        {results.params.accident && (
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            🚗 Accident
          </span>
        )}
        {results.params.roadClosure && (
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            🚧 Road Closure
          </span>
        )}
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
          🌦️ {results.params.weather?.replace("_", " ") || 'Unknown'}
        </span>
      </div>

      {/* WEATHER DISPLAY */}
      {results.params?.realWeather && (
        <WeatherDisplay weather={results.params.realWeather} />
      )}

      {/* TRAFFIC DISPLAY */}
      {results.params?.realTraffic && (
        <TrafficDisplay traffic={results.params.realTraffic} />
      )}

      {/* AI ANALYSIS */}
      <AIResultsDisplay 
        analysis={aiAnalysis}
        loading={aiLoading}
        onRefresh={onAIAnalyze}
      />

      {/* CARDS */}
      <div className="grid grid-cols-2 gap-4">
        {/* CURRENT */}
        <div className="rounded-xl p-5 border-2 border-red-200 bg-red-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-bold text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Current Route
              </p>
              <div className="mt-4 space-y-3">
                <p className="flex gap-3 text-base">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <strong className="text-2xl">{results.current.duration} min</strong>
                </p>
                <p className="flex gap-3 text-base">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <strong className="text-2xl">{results.current.cost}</strong>
                </p>
              </div>
            </div>
            <RiskGauge score={results.current.riskScore} />
          </div>
          <div className="mt-4 pt-3 border-t-2 border-red-200 text-sm text-red-600 font-medium">
            <TrendingDown className="inline w-4 h-4 mr-1" />
            +{results.current.delay} minutes total delay
          </div>
        </div>

        {/* RECOMMENDED */}
        <div className="rounded-xl p-5 border-2 border-green-300 bg-green-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-bold text-base flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                Recommended Route
              </p>
              <div className="mt-4 space-y-3">
                <p className="flex gap-3 text-base">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <strong className="text-2xl">{results.optimal.duration} min</strong>
                </p>
                <p className="flex gap-3 text-base">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <strong className="text-2xl">{results.optimal.cost}</strong>
                </p>
              </div>
            </div>
            <RiskGauge score={results.optimal.riskScore} />
          </div>
        </div>
      </div>

      {/* ALTERNATIVE ROUTES */}
      {results.alternatives && results.alternatives.length > 0 && (
        <AlternativeRoutesDisplay 
          alternatives={results.alternatives}
          onSelect={(alt) => {
            console.log('Selected alternative:', alt);
          }}
        />
      )}

      {/* COMPARISON */}
      <div className="border-2 border-gray-200 rounded-xl p-5 space-y-4">
        <CompareBar
          label="Delivery Time"
          currentVal={results.current.duration}
          optimalVal={results.optimal.duration}
          currentLabel={`${results.current.duration} min`}
          optimalLabel={`${results.optimal.duration} min`}
        />
        <CompareBar
          label="Risk"
          currentVal={results.current.riskScore}
          optimalVal={results.optimal.riskScore}
          currentLabel={`${results.current.riskScore}%`}
          optimalLabel={`${results.optimal.riskScore}%`}
        />
      </div>

      {/* SUMMARY */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
        <h4 className="font-bold text-base flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          Simulation Summary
        </h4>
        <p className="text-base mt-2 text-gray-700">
          The recommended route could save{" "}
          <strong className="text-xl text-purple-700">
            {Math.max(results.current.duration - results.optimal.duration, 0)} minutes
          </strong>{" "}
          and reduce the estimated risk by{" "}
          <strong className="text-xl text-purple-700">
            {Math.max(results.current.riskScore - results.optimal.riskScore, 0)}%
          </strong>.
        </p>
        {results.recommendation && (
          <p className="text-sm mt-3 text-blue-700 bg-blue-100 p-3 rounded-lg">
            💡 {results.recommendation}
          </p>
        )}
      </div>

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="border-t-2 pt-4">
          <p className="text-sm font-bold text-gray-500 mb-3">
            Simulation History
          </p>
          <div className="space-y-2">
            {history.map((item, index) => (
              <div
                key={item.id}
                className="text-sm bg-gray-50 border-2 rounded-lg p-3 flex justify-between items-center"
              >
                <span className="font-medium">Run #{history.length - index}</span>
                <span className="font-bold text-lg">{item.current.duration} min</span>
                <span className="text-red-500 font-bold text-lg">{item.current.riskScore}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   SAVED SIMULATIONS LIST
============================================================ */

const SavedSimulationsList = ({ simulations, onLoad, onDelete, loading }) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading saved simulations...</p>
      </div>
    );
  }

  if (!simulations || simulations.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500 text-lg font-medium">No saved simulations yet</p>
        <p className="text-gray-400 text-sm mt-2">
          Run a simulation and click "Save" to store it here
        </p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-purple-600" />
          Saved Simulations
          <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            {simulations.length}
          </span>
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simulations.map((sim) => {
          const riskScore = sim.current_route?.riskScore || sim.current?.riskScore || 0;
          const duration = sim.current_route?.duration || sim.current?.duration || 0;
          const cost = sim.current_route?.cost || sim.current?.cost || 'R0';
          const routeName = sim.route_name || sim.routeName || 'Unknown Route';
          const weather = sim.parameters?.weather || 'unknown';
          const delay = sim.parameters?.delay || 0;
          const hasAccident = sim.parameters?.accident || false;
          const hasClosure = sim.parameters?.roadClosure || false;

          return (
            <div
              key={sim.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-purple-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-base truncate">
                    {sim.name || routeName}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(sim.created_at || sim.timestamp)}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => onLoad?.(sim)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Load this simulation"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete?.(sim.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete this simulation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                <Navigation className="w-4 h-4 text-gray-400" />
                <span className="truncate">{routeName}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-bold text-purple-600 text-sm">{duration} min</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="font-bold text-green-600 text-sm">{cost}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Risk</p>
                  <p className={`font-bold text-sm ${
                    riskScore >= 70 ? 'text-red-600' :
                    riskScore >= 40 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {riskScore}%
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {delay > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    +{delay}min
                  </span>
                )}
                {hasAccident && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Accident
                  </span>
                )}
                {hasClosure && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Closure
                  </span>
                )}
                {weather && weather !== 'sunny' && weather !== 'unknown' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {weather.replace('_', ' ')}
                  </span>
                )}
                {riskScore >= 70 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    High Risk
                  </span>
                )}
                {riskScore < 30 && riskScore > 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Low Risk
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================
   SAVE MODAL
============================================================ */

const SaveModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  results,
  isSaving,
  error 
}) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen && results) {
      setName(results.routeName || "");
    }
  }, [isOpen, results]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(name);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Save Simulation</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Simulation Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Route 19 - Rainy Day Simulation"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            {results && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>Route:</strong> {results.routeName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Duration:</strong> {results.current?.duration} min
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Risk Score:</strong> {results.current?.riskScore}%
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const SimulationControls = ({
  apiUrl = 'http://localhost:5000/api/routes',
  onSimulationComplete,
  onSaveSimulation,
  savedSimulations = [],
  onLoadSimulation,
  onDeleteSimulation,
  isLoadingSaved = false,
}) => {
  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */

  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState(null);
  
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [delay, setDelay] = useState(30);
  const [weather, setWeather] = useState("moderate_rain");
  const [hasAccident, setHasAccident] = useState(false);
  const [hasRoadClosure, setHasRoadClosure] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showSavedList, setShowSavedList] = useState(false);
  const [localSavedSimulations, setLocalSavedSimulations] = useState([]);
  
  // Weather state
  const [currentWeather, setCurrentWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  const resultsRef = useRef(null);
  const hasRunSimulationRef = useRef(false);
  const historyRef = useRef([]);
  const [, forceUpdate] = useState({});

  // ===== AI STATE =====
  const [aiAnalysis, setAIAnalysis] = useState(null);
  const [aiAnalysisLoading, setAIAnalysisLoading] = useState(false);
  const [aiInitialized, setAiInitialized] = useState(false);

  // ===== CHAT STATE =====
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  /* ==========================================================
     FETCH WEATHER FOR CURRENT ROUTE
  ========================================================== */

  const fetchWeatherForRoute = useCallback(async (route) => {
    if (!route) {
      console.warn('⚠️ No route provided for weather fetch');
      return;
    }
    
    // Get coordinates
    const originLat = route.origin_lat || route.start_point?.lat || 0;
    const originLng = route.origin_lng || route.start_point?.lng || 0;
    const destLat = route.dest_lat || route.stops?.[route.stops.length - 1]?.lat || 0;
    const destLng = route.dest_lng || route.stops?.[route.stops.length - 1]?.lng || 0;
    
    // Get the actual names from the route
    const originName = route.origin_name || 'Origin';
    const destinationName = route.destination_name || 'Destination';
    
    console.log(`🌤️ Fetching weather for route: ${originName} → ${destinationName}`);
    console.log(`📍 Origin: ${originLat}, ${originLng}`);
    console.log(`📍 Destination: ${destLat}, ${destLng}`);
    
    if (!originLat || !originLng || !destLat || !destLng || 
        originLat === 0 || originLng === 0 || destLat === 0 || destLng === 0) {
      console.warn('⚠️ Missing coordinates for weather fetch');
      setCurrentWeather(null);
      return;
    }
    
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      const weatherUrl = `http://localhost:5000/api/weather/route?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`;
      console.log(`📡 Calling weather API: ${weatherUrl}`);
      
      const response = await fetch(weatherUrl);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add the route names to the weather data for display
      if (data) {
        data.originName = originName;
        data.destinationName = destinationName;
      }
      
      console.log('✅ Weather data received:', data);
      setCurrentWeather(data);
      
    } catch (error) {
      console.error('❌ Error fetching weather:', error);
      setWeatherError(error.message);
      setCurrentWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  /* ==========================================================
     FETCH ROUTES FROM BACKEND
  ========================================================== */

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setRoutesLoading(true);
        setStatusMessage("🔄 Loading routes...");
        
        console.log('📡 Fetching routes from:', apiUrl);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch routes: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Fetched routes:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          setRoutes(data);
          setRoutesError(null);
          setStatusMessage(`✅ Loaded ${data.length} routes `);
          
          if (data.length > 0) {
            console.log('🌤️ Auto-fetching weather for first route:', data[0].display_name);
            fetchWeatherForRoute(data[0]);
          }
        } else {
          setRoutes(DEFAULT_ROUTES);
          setStatusMessage("⚠️ Using default routes (no data from API)");
          fetchWeatherForRoute(DEFAULT_ROUTES[0]);
        }
      } catch (err) {
        console.error('❌ Error fetching routes:', err);
        setRoutesError(err.message);
        setRoutes(DEFAULT_ROUTES);
        setStatusMessage("⚠️ Using default routes (API unavailable)");
        fetchWeatherForRoute(DEFAULT_ROUTES[0]);
      } finally {
        setRoutesLoading(false);
      }
    };

    fetchRoutes();
  }, [apiUrl, fetchWeatherForRoute]);

  /* ==========================================================
     FETCH SAVED SIMULATIONS FROM DATABASE
  ========================================================== */

  const fetchSavedSimulations = useCallback(async () => {
    try {
      console.log('📋 Fetching saved simulations from database...');
      const response = await fetch('http://localhost:5000/api/simulations');
      if (response.ok) {
        const data = await response.json();
        console.log(`📋 Loaded ${data.length} saved simulations`);
        setLocalSavedSimulations(data);
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching saved simulations:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchSavedSimulations();
  }, [fetchSavedSimulations]);

  /* ----------------------------------------------------------
     AVAILABLE ROUTES
  ---------------------------------------------------------- */

  const availableRoutes = useMemo(() => {
    if (Array.isArray(routes) && routes.length > 0) {
      return routes;
    }
    return DEFAULT_ROUTES;
  }, [routes]);

  /* ----------------------------------------------------------
     SELECTED ROUTE
  ---------------------------------------------------------- */

  const selectedRoute = useMemo(() => {
    if (!availableRoutes.length) {
      return null;
    }

    if (!selectedRouteId) {
      return availableRoutes[0];
    }

    const found = availableRoutes.find(
      (route) => getRouteId(route) === selectedRouteId
    );
    
    return found || availableRoutes[0];
  }, [availableRoutes, selectedRouteId]);

  // Fetch weather when selected route changes
  useEffect(() => {
    if (selectedRoute) {
      console.log('🔄 Route changed, fetching weather for:', selectedRoute.display_name);
      fetchWeatherForRoute(selectedRoute);
    }
  }, [selectedRoute, fetchWeatherForRoute]);

  /* ----------------------------------------------------------
     WEATHER
  ---------------------------------------------------------- */

  const selectedWeather = useMemo(() => {
    const found = WEATHER_OPTIONS.find(
      (item) => item.value === weather
    );
    return found || WEATHER_OPTIONS[0];
  }, [weather]);

  /* ==========================================================
     AUTO-LEARN FROM DATABASE ON LOAD
  ========================================================== */

  // Automatically learn from database when component mounts
  useEffect(() => {
    const autoLearn = async () => {
      try {
        console.log('🧠 AI: Auto-learning from database...');
        const response = await fetch('http://localhost:5000/api/simulations');
        if (response.ok) {
          const simulations = await response.json();
          if (simulations && simulations.length > 0) {
            if (typeof aiService !== 'undefined' && aiService.learnFromHistory) {
              await aiService.learnFromHistory(simulations);
              console.log(`🧠 AI: Learned from ${simulations.length} simulations`);
              setStatusMessage(`🧠 AI learned from ${simulations.length} historical simulations`);
              setAiInitialized(true);
            }
          } else {
            console.log('🧠 AI: No simulations found to learn from');
            setAiInitialized(true);
          }
        }
      } catch (error) {
        console.error('AI auto-learn error:', error);
        setAiInitialized(true);
      }
    };

    autoLearn();
  }, []);

  // Auto-learn after saving a new simulation
  useEffect(() => {
    const learnAfterSave = async () => {
      if (localSavedSimulations.length > 0 && aiInitialized) {
        try {
          console.log('🧠 AI: Auto-learning from updated database...');
          const response = await fetch('http://localhost:5000/api/simulations');
          if (response.ok) {
            const simulations = await response.json();
            if (typeof aiService !== 'undefined' && aiService.learnFromHistory) {
              await aiService.learnFromHistory(simulations);
              console.log(`🧠 AI: Re-learned from ${simulations.length} simulations`);
            }
          }
        } catch (error) {
          console.error('AI re-learn error:', error);
        }
      }
    };

    if (localSavedSimulations.length > 0) {
      learnAfterSave();
    }
  }, [localSavedSimulations, aiInitialized]);

  /* ==========================================================
     GENERATE AI ANALYSIS
  ========================================================== */

  const generateAIAnalysis = useCallback(async () => {
    if (!resultsRef.current || aiAnalysisLoading) return;

    setAIAnalysisLoading(true);
    setStatusMessage("🧠 AI is analyzing your route...");

    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const results = resultsRef.current;
      const timeDiff = (results.current?.duration || 0) - (results.optimal?.duration || 0);
      const riskDiff = (results.current?.riskScore || 0) - (results.optimal?.riskScore || 0);
      
      // Get historical context
      let historicalNote = '';
      let historicalCount = 0;
      try {
        const response = await fetch('http://localhost:5000/api/simulations');
        if (response.ok) {
          const sims = await response.json();
          historicalCount = sims.length;
          if (historicalCount > 0) {
            historicalNote = `Based on ${historicalCount} historical simulations`;
          }
        }
      } catch (e) {
        console.log('Could not fetch historical data for analysis');
      }

      // Get route-specific historical data
      let routeSpecificNote = '';
      try {
        const allSims = await fetch('http://localhost:5000/api/simulations').then(r => r.json());
        const routeSims = allSims.filter(s => s.routeName === results.routeName);
        if (routeSims.length > 0) {
          const avgDuration = routeSims.reduce((sum, s) => sum + (s.current?.duration || 0), 0) / routeSims.length;
          const avgRisk = routeSims.reduce((sum, s) => sum + (s.current?.riskScore || 0), 0) / routeSims.length;
          routeSpecificNote = ` This route has been analyzed ${routeSims.length} times. Average duration: ${Math.round(avgDuration)}min, Average risk: ${Math.round(avgRisk)}%.`;
        }
      } catch (e) {
        console.log('Could not fetch route-specific data');
      }

      // Generate insights based on historical patterns
      const insights = [
        { icon: "⏱️", label: "Time Impact", value: `${Math.abs(timeDiff)} min ${timeDiff > 0 ? 'saved' : 'difference'}` },
        { icon: "🎯", label: "Risk Impact", value: `${Math.abs(riskDiff)}% ${riskDiff > 0 ? 'reduction' : 'difference'}` },
        { icon: "📊", label: "Route Status", value: timeDiff > 0 ? "Optimization available" : "Already optimal" },
        { icon: "🏷️", label: "Cost Efficiency", value: results.current?.cost || 'R0' }
      ];

      // Add historical insight if available
      if (historicalCount > 0) {
        insights.push({
          icon: "📚",
          label: "Historical Data",
          value: `${historicalCount} simulations analyzed`
        });
      }

      // Generate recommendations with historical context
      const recommendations = [
        timeDiff > 0 ? `✅ Consider the optimal route to save ${timeDiff} minutes` : "✅ Current route is time-optimal",
        riskDiff > 0 ? "🛡️ Optimal route has lower risk - recommended for safety" : "✅ Risk levels are balanced",
        weather.includes('rain') ? "🌧️ Check weather conditions before departure" : "☀️ Weather conditions look favorable"
      ];

      // Add historical recommendation
      if (historicalCount > 0) {
        recommendations.push(`📚 Based on ${historicalCount} previous simulations, this route typically performs ${riskDiff > 0 ? 'better' : 'similarly'}`);
      }

      // Generate risk factors with historical context
      const riskFactors = [
        ...(results.params?.hasAccident ? [{ label: "🚗 Accident reported on route", level: "high" }] : []),
        ...(results.params?.hasRoadClosure ? [{ label: "🚧 Road closure detected", level: "high" }] : []),
        ...(results.params?.weather?.includes('rain') ? [{ label: `🌧️ ${results.params.weather.replace('_', ' ')} conditions`, level: "medium" }] : []),
        ...(results.current?.riskScore > 70 ? [{ label: "⚠️ High risk score", level: "high" }] : []),
        ...(results.current?.riskScore > 40 && results.current?.riskScore <= 70 ? [{ label: "⚠️ Moderate risk level", level: "medium" }] : []),
        ...(results.current?.riskScore <= 40 ? [{ label: "✅ Low risk - safe for travel", level: "low" }] : [])
      ];

      // Add historical risk insight
      if (historicalCount > 5) {
        const highRiskCount = await fetch('http://localhost:5000/api/simulations')
          .then(r => r.json())
          .then(sims => sims.filter(s => s.current?.riskScore > 70).length);
        
        if (highRiskCount > 0) {
          riskFactors.push({
            label: `📊 ${highRiskCount} previous simulations had high risk`,
            level: "medium"
          });
        }
      }

      // Calculate confidence based on historical data
      let confidence = 75 + Math.floor(Math.random() * 20);
      if (historicalCount > 10) confidence = Math.min(confidence + 10, 95);
      if (historicalCount > 20) confidence = Math.min(confidence + 5, 98);

      const analysis = {
        summary: `AI analysis of ${results.routeName || 'your route'} is complete. ${timeDiff > 0 ? `The optimal route saves ${timeDiff} minutes.` : 'Current route is time-optimal.'} ${riskDiff > 0 ? `Risk is reduced by ${riskDiff}%.` : ''} ${historicalNote}${routeSpecificNote}`,
        confidence: confidence,
        insights: insights,
        recommendations: recommendations,
        riskFactors: riskFactors,
        historicalData: historicalCount > 0 ? `${historicalCount} simulations analyzed` : null
      };

      setAIAnalysis(analysis);
      setStatusMessage("✅ AI analysis complete!");
      
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setStatusMessage("❌ Failed to generate AI analysis");
    } finally {
      setAIAnalysisLoading(false);
    }
  }, [aiAnalysisLoading, weather]);

  /* ==========================================================
     HANDLE CHAT MESSAGE
  ========================================================== */

  const handleChatMessage = useCallback(async (message) => {
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: "user", content: message }]);
    setChatLoading(true);

    try {
      // Check if the question is route-related
      const routeKeywords = [
        'route', 'path', 'direction', 'way', 'road', 'highway',
        'weather', 'rain', 'sunny', 'cloud', 'storm', 'wind', 'fog',
        'traffic', 'delay', 'congestion', 'jam', 'accident', 'closure',
        'risk', 'safe', 'safety', 'danger', 'hazard',
        'time', 'duration', 'minute', 'hour', 'speed',
        'cost', 'price', 'money', 'fuel', 'toll',
        'alternative', 'option', 'choice', 'recommend',
        'optimal', 'best', 'fastest', 'shortest',
        'simulation', 'result', 'analysis', 'predict',
        'origin', 'destination', 'start', 'end', 'travel'
      ];

      const lowerMessage = message.toLowerCase();
      const isRouteRelated = routeKeywords.some(keyword => lowerMessage.includes(keyword));

      // If not route-related, reject the question
      if (!isRouteRelated) {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: "🚫 I'm a route optimization assistant. I can only help with:\n\n• Route planning and optimization\n• Weather conditions along your route\n• Traffic patterns and delays\n• Risk assessment and safety\n• Time and cost estimates\n• Alternative route suggestions\n\nPlease ask a route-related question!",
          isError: true
        }]);
        setChatLoading(false);
        return;
      }

      // If route-related, generate a response
      await new Promise(resolve => setTimeout(resolve, 800));

      // Get context for the response
      const routeName = selectedRoute ? getRouteName(selectedRoute) : "No route selected";
      const hasResults = !!resultsRef.current;
      const results = resultsRef.current;
      const delayMinutes = delay || 0;
      const weatherCondition = weather || "unknown";
      const hasAccidentFlag = hasAccident;
      const hasClosureFlag = hasRoadClosure;

      // Build response based on keywords
      let response = "";

      if (lowerMessage.includes("weather") || lowerMessage.includes("rain") || lowerMessage.includes("sunny")) {
        const weatherDisplay = weatherCondition.replace("_", " ");
        response = `🌤️ Current weather condition: ${weatherDisplay}.\n\n`;
        if (weatherCondition.includes("rain")) {
          response += "⚠️ Rain detected! I recommend:\n• Reducing speed by 10-15%\n• Maintaining safe following distance\n• Allowing extra travel time\n";
        } else if (weatherCondition === "sunny") {
          response += "☀️ Clear skies! Great conditions for travel.\n• Visibility is excellent\n• Road conditions are optimal\n";
        } else {
          response += `Weather conditions are ${weatherDisplay}. Drive accordingly.\n`;
        }
        if (currentWeather?.summary?.recommendation) {
          response += `\n📌 ${currentWeather.summary.recommendation}`;
        }
      }

      else if (lowerMessage.includes("traffic") || lowerMessage.includes("delay") || lowerMessage.includes("congestion")) {
        response = `🚦 Traffic analysis for ${routeName}:\n\n`;
        if (delayMinutes > 30) {
          response += `⚠️ Significant delays expected: ${delayMinutes} minutes\n`;
          response += "• Consider leaving earlier\n• Alternative route recommended\n• Check real-time traffic updates\n";
        } else if (delayMinutes > 10) {
          response += `⏱️ Moderate delays: ${delayMinutes} minutes\n`;
          response += "• Allow extra time\n• Monitor traffic conditions\n";
        } else {
          response += "✅ Clear traffic conditions\n• No major delays expected\n• Smooth travel ahead\n";
        }
        if (hasAccidentFlag) {
          response += "\n🚗 ACCIDENT REPORTED: Avoid affected area if possible.\n";
        }
        if (hasClosureFlag) {
          response += "\n🚧 ROAD CLOSURE: Take alternative route immediately!\n";
        }
      }

      else if (lowerMessage.includes("risk") || lowerMessage.includes("safe") || lowerMessage.includes("danger")) {
        const riskScore = results?.current?.riskScore || 0;
        response = `📊 Risk assessment for ${routeName}:\n\n`;
        response += `Current risk score: ${riskScore}%\n`;
        if (riskScore > 70) {
          response += "🔴 HIGH RISK - I strongly recommend:\n• Taking the optimal route\n• Checking weather conditions\n• Allowing extra travel time\n";
        } else if (riskScore > 40) {
          response += "🟡 MODERATE RISK - Recommendations:\n• Take standard precautions\n• Stay updated on conditions\n• Consider the optimal route\n";
        } else {
          response += "🟢 LOW RISK - Safe for travel\n• Continue with current route\n• Standard safety measures apply\n";
        }
        if (riskScore > 40) {
          response += `\n💡 The optimal route reduces risk by ${Math.max(riskScore - (results?.optimal?.riskScore || 0), 0)}%`;
        }
      }

      else if (lowerMessage.includes("route") || lowerMessage.includes("path") || lowerMessage.includes("way") || lowerMessage.includes("optimal") || lowerMessage.includes("best")) {
        response = `📍 Route analysis for ${routeName}:\n\n`;
        if (hasResults) {
          const currentDur = results?.current?.duration || 0;
          const optimalDur = results?.optimal?.duration || 0;
          const timeSave = Math.max(currentDur - optimalDur, 0);
          const currentRisk = results?.current?.riskScore || 0;
          const optimalRisk = results?.optimal?.riskScore || 0;
          const riskReduce = Math.max(currentRisk - optimalRisk, 0);

          response += `Current route: ${currentDur} minutes\n`;
          response += `Optimal route: ${optimalDur} minutes\n`;
          if (timeSave > 0) {
            response += `✅ You could save ${timeSave} minutes by taking the optimal route\n`;
          }
          if (riskReduce > 0) {
            response += `🛡️ Risk reduced by ${riskReduce}% with optimal route\n`;
          }
          response += `\n💡 Recommendation: ${results?.recommendation || "All clear!"}\n`;

          if (results?.alternatives?.length > 0) {
            response += `\n🔄 ${results.alternatives.length} alternative routes available\n`;
            response += `• ${results.alternatives[0]?.displayName || "Alternative 1"}: ${results.alternatives[0]?.duration || 0} min\n`;
            if (results.alternatives[1]) {
              response += `• ${results.alternatives[1]?.displayName || "Alternative 2"}: ${results.alternatives[1]?.duration || 0} min\n`;
            }
          }
        } else {
          response += `No simulation results yet for ${routeName}.\n`;
          response += "💡 Run a simulation to get AI-powered route optimization!\n";
        }
      }

      else if (lowerMessage.includes("time") || lowerMessage.includes("duration") || lowerMessage.includes("how long")) {
        if (hasResults) {
          const currentDur = results?.current?.duration || 0;
          const optimalDur = results?.optimal?.duration || 0;
          response = `⏱️ Travel time for ${routeName}:\n\n`;
          response += `Current route: ${currentDur} minutes\n`;
          response += `Optimal route: ${optimalDur} minutes\n`;
          if (currentDur > optimalDur) {
            response += `✅ You could save ${currentDur - optimalDur} minutes with optimal route\n`;
          }
          if (delayMinutes > 0) {
            response += `⚠️ ${delayMinutes} minutes of additional delay expected\n`;
          }
        } else {
          const baseDur = selectedRoute ? getDuration(selectedRoute) : 60;
          response = `⏱️ Estimated travel time for ${routeName}:\n\n`;
          response += `Base duration: ${baseDur} minutes\n`;
          if (delayMinutes > 0) {
            response += `⚠️ With ${delayMinutes} minutes of delay: ${baseDur + delayMinutes} minutes total\n`;
          }
          response += "\n💡 Run a simulation for more accurate time estimates with real conditions!";
        }
      }

      else if (lowerMessage.includes("learn") || lowerMessage.includes("history") || lowerMessage.includes("past") || lowerMessage.includes("previous")) {
        const simCount = localSavedSimulations.length;
        response = `📚 AI Learning Summary:\n\n`;
        response += `• ${simCount} simulations learned from database\n`;
        if (simCount > 0) {
          response += `• ${simCount > 1 ? 'Multiple' : 'One'} route patterns analyzed\n`;
          response += `• Weather patterns: ${Object.keys(aiService?.learnedPatterns?.weatherPatterns || {}).length || 'Analyzing...'}\n`;
          response += `\n💡 The more simulations you run, the smarter I become!\n`;
          response += `🔹 ${simCount < 5 ? 'Run more simulations for better insights' : '✓ Good amount of data collected'}\n`;
        } else {
          response += `• No simulations yet! Run a simulation to start building history.\n`;
        }
        if (aiService?.simulationHistory?.length > 0) {
          response += `\n🧠 Currently learning from ${aiService.simulationHistory.length} previous simulations.`;
        }
      }

      else {
        // Generic helpful response
        response = `🤖 I can help you with route-related questions!\n\n`;
        response += `I can tell you about:\n`;
        response += `• 🌤️ Weather conditions (ask about weather/rain/sunny)\n`;
        response += `• 🚦 Traffic and delays (ask about traffic/delay/congestion)\n`;
        response += `• 📊 Risk assessment (ask about risk/safe/danger)\n`;
        response += `• 🗺️ Route optimization (ask about route/path/best/optimal)\n`;
        response += `• ⏱️ Time estimates (ask about time/duration/how long)\n`;
        response += `• 📚 Learning history (ask about learn/history/past)\n\n`;
        response += `What would you like to know about ${routeName}?`;
      }

      // Add response with context about simulations
      if (localSavedSimulations.length > 0 && !response.includes("simulations learned")) {
        response += `\n\n📊 Based on ${localSavedSimulations.length} previous simulations.`;
      }

      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: response
      }]);

    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Sorry, I encountered an error. Please try again.",
        isError: true
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [selectedRoute, weather, delay, hasAccident, hasRoadClosure, currentWeather, localSavedSimulations, resultsRef.current]);

  /* ==========================================================
     RUN SIMULATION
  ========================================================== */

  const runSimulation = useCallback(async () => {
    if (!selectedRoute || isRunning) {
      return;
    }

    console.log("SIMULATION STARTED");

    setIsRunning(true);
    setStatusMessage("🔄 Running simulation with real-time data...");

    try {
      const originLat = selectedRoute.origin_lat || 0;
      const originLng = selectedRoute.origin_lng || 0;
      const destLat = selectedRoute.dest_lat || 0;
      const destLng = selectedRoute.dest_lng || 0;
      
      let weatherData = currentWeather;
      
      if (!weatherData || weatherData.is_mock) {
        console.log('🌤️ Fetching fresh weather data for simulation...');
        const weatherResponse = await fetch(
          `http://localhost:5000/api/weather/route?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`
        );
        if (weatherResponse.ok) {
          weatherData = await weatherResponse.json();
          setCurrentWeather(weatherData);
        }
      }

      let trafficData = null;
      try {
        const trafficResponse = await fetch(
          `http://localhost:5000/api/traffic/route?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}`
        );
        if (trafficResponse.ok) {
          trafficData = await trafficResponse.json();
          console.log('✅ Traffic data fetched:', trafficData);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch traffic data:', err.message);
      }

      const baseDuration = getDuration(selectedRoute);
      const baseDistance = getDistance(selectedRoute);
      const baseCost = getCost(selectedRoute);
      
      let totalDelay = Number(delay) || 0;
      totalDelay += Number(trafficData?.trafficDelayMinutes || 0);
      totalDelay += Number(selectedRoute.traffic_delay) || 0;
      totalDelay += baseDuration * (selectedWeather.multiplier - 1);
      
      if (hasAccident) totalDelay += 20;
      if (hasRoadClosure) totalDelay += 30;
      totalDelay = Math.max(Math.round(totalDelay), 0);

      const currentDuration = Math.round(baseDuration + totalDelay);

      let currentCost = baseCost;
      if (currentCost <= 0) {
        currentCost = baseDistance > 0 ? baseDistance * 2 : currentDuration * 3;
      }
      currentCost += totalDelay * 1.2;
      currentCost = Math.round(currentCost);

      let riskScore = 15;
      riskScore += totalDelay * 0.35;
      riskScore += selectedWeather.risk || 0;
      
      if (weatherData?.summary?.conditions?.includes('Rain')) riskScore += 15;
      if (weatherData?.summary?.conditions?.includes('Storm')) riskScore += 30;
      if (weatherData?.summary?.conditions?.includes('Snow')) riskScore += 25;
      
      if (trafficData?.hasAccident) riskScore += 25;
      if (trafficData?.hasRoadClosure) riskScore += 30;
      if (trafficData?.hasTraffic) riskScore += 10;
      
      if (hasAccident) riskScore += 20;
      if (hasRoadClosure) riskScore += 20;
      riskScore = Math.min(Math.max(Math.round(riskScore), 0), 100);

      const optimalDuration = Math.max(Math.round(baseDuration * 0.85), 1);
      const optimalCost = Math.max(Math.round(currentCost * 0.9), 1);
      const optimalRisk = Math.max(Math.round(riskScore - 30), 5);

      let alternatives = [];
      try {
        const altResponse = await fetch(
          `http://localhost:5000/api/routes/alternatives?origin_lat=${originLat}&origin_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}&origin_name=${encodeURIComponent(selectedRoute.origin_name || 'Origin')}&destination_name=${encodeURIComponent(selectedRoute.destination_name || 'Destination')}&has_accident=${hasAccident}&has_road_closure=${hasRoadClosure}`
        );
        if (altResponse.ok) {
          const altData = await altResponse.json();
          alternatives = altData.alternatives || [];
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch alternatives:', err.message);
      }

      let recommendation = '';
      if (trafficData?.hasRoadClosure) {
        recommendation = '🚧 URGENT: Road closure detected. Use alternative route immediately!';
      } else if (trafficData?.hasAccident) {
        recommendation = '🚗 Accident detected on route. Consider alternative route to avoid delays.';
      } else if (weatherData?.summary?.recommendation?.includes('Adverse')) {
        recommendation = `⚠️ ${weatherData.summary.recommendation}`;
      } else if (trafficData?.hasTraffic) {
        recommendation = `⚠️ Traffic delay of ${trafficData.trafficDelayMinutes} minutes expected. Consider alternative route.`;
      } else {
        recommendation = '✅ All clear! The current route is optimal for travel.';
      }

      const simulationResult = {
        id: `simulation-${Date.now()}`,
        routeName: getRouteName(selectedRoute),
        timestamp: new Date().toISOString(),
        params: {
          delay,
          weather,
          accident: hasAccident,
          roadClosure: hasRoadClosure,
          realWeather: weatherData,
          realTraffic: trafficData
        },
        current: {
          duration: currentDuration,
          cost: `R${currentCost.toLocaleString("en-ZA")}`,
          riskScore,
          delay: totalDelay,
        },
        optimal: {
          duration: optimalDuration,
          cost: `R${optimalCost.toLocaleString("en-ZA")}`,
          riskScore: optimalRisk,
          delay: 0,
        },
        alternatives,
        recommendation
      };

      console.log("SIMULATION RESULT:", simulationResult);

      resultsRef.current = simulationResult;
      hasRunSimulationRef.current = true;
      historyRef.current = [simulationResult, ...historyRef.current].slice(0, 10);

      setStatusMessage(`✅ Simulation complete — ${currentDuration} minutes`);
      setIsRunning(false);

      forceUpdate({});

      if (typeof onSimulationComplete === "function") {
        onSimulationComplete(simulationResult);
      }

      // Auto-trigger AI analysis after simulation
      setTimeout(() => generateAIAnalysis(), 1000);

    } catch (error) {
      console.error('❌ Simulation error:', error);
      setStatusMessage('❌ Failed to run simulation with real-time data');
      setIsRunning(false);
    }
  }, [selectedRoute, isRunning, delay, hasAccident, hasRoadClosure, selectedWeather, currentWeather, onSimulationComplete, generateAIAnalysis]);

  /* ==========================================================
     RESET
  ========================================================== */

  const resetSimulation = useCallback(() => {
    resultsRef.current = null;
    hasRunSimulationRef.current = false;
    historyRef.current = [];
    setStatusMessage("");
    setDelay(30);
    setWeather("moderate_rain");
    setHasAccident(false);
    setHasRoadClosure(false);
    setAIAnalysis(null);
    
    forceUpdate({});
  }, []);

  /* ==========================================================
     ROUTE CHANGE
  ========================================================== */

  const handleRouteChange = useCallback((event) => {
    const routeId = event.target.value;
    setSelectedRouteId(routeId);
    setStatusMessage("🔄 Loading weather for selected route...");
    
    const route = availableRoutes.find(r => getRouteId(r) === routeId);
    if (route) {
      console.log('📍 Route changed to:', route.display_name);
      fetchWeatherForRoute(route);
    }
  }, [availableRoutes, fetchWeatherForRoute]);

  /* ==========================================================
     REFRESH WEATHER
  ========================================================== */

  const refreshWeather = useCallback(() => {
    if (selectedRoute) {
      setStatusMessage("🔄 Refreshing current weather data...");
      fetchWeatherForRoute(selectedRoute);
    }
  }, [selectedRoute, fetchWeatherForRoute]);

  /* ==========================================================
     SAVE BUTTON CLICK
  ========================================================== */

  const handleSaveClick = useCallback(() => {
    if (!resultsRef.current) {
      setSaveError("No simulation results to save");
      return;
    }
    setShowSaveModal(true);
    setSaveError(null);
  }, []);

  /* ==========================================================
     SAVE SIMULATION TO DATABASE
  ========================================================== */

  const handleSave = useCallback(async (name) => {
  console.log('🔵 1. Save function called with name:', name);
  
  if (!resultsRef.current) {
    console.log('🔴 2. No results found');
    setSaveError("No simulation results to save");
    return;
  }

  console.log('🔵 3. Results:', resultsRef.current);
  setIsSaving(true);
  setSaveError(null);

  try {
    // ============================================
    // 🔥 FIX: Trim the data to avoid 413 error
    // ============================================
    
    // 1. Clean the params - remove large weather/traffic data
    const cleanParams = { ...(resultsRef.current.params || {}) };
    
    // Remove large weather data (keep only essential info)
    if (cleanParams.realWeather) {
      const weather = cleanParams.realWeather;
      cleanParams.realWeather = {
        summary: weather.summary || {},
        origin_weather: weather.origin?.current?.condition?.text || 'Unknown',
        dest_weather: weather.destination?.current?.condition?.text || 'Unknown',
        avg_temp: weather.summary?.average_temp || 0,
        conditions: weather.summary?.conditions || 'Unknown'
      };
    }
    
    // Remove large traffic data (keep only essential info)
    if (cleanParams.realTraffic) {
      const traffic = cleanParams.realTraffic;
      cleanParams.realTraffic = {
        hasTraffic: traffic.hasTraffic || false,
        hasAccident: traffic.hasAccident || false,
        hasRoadClosure: traffic.hasRoadClosure || false,
        trafficDelayMinutes: traffic.trafficDelayMinutes || 0,
        recommendation: traffic.recommendation || ''
      };
    }

    // 2. Clean the current route data
    const cleanCurrent = { ...(resultsRef.current.current || {}) };
    // Remove any large nested objects
    delete cleanCurrent.rawData;
    delete cleanCurrent.fullDetails;

    // 3. Clean the optimal route data
    const cleanOptimal = { ...(resultsRef.current.optimal || {}) };
    delete cleanOptimal.rawData;
    delete cleanOptimal.fullDetails;

    // 4. Limit alternatives to top 3 and keep only essential fields
    let cleanAlternatives = [];
    if (Array.isArray(resultsRef.current.alternatives)) {
      cleanAlternatives = resultsRef.current.alternatives
        .slice(0, 3) // Only keep top 3
        .map(alt => ({
          name: alt.displayName || alt.name || 'Alternative',
          duration: alt.duration || 0,
          distance: alt.distance || 0,
          risk_level: alt.risk_level || 'medium',
          recommendation: alt.recommendation || ''
        }));
    }

    // 5. Build the final clean data
    const simulationData = {
      name: name.trim() || resultsRef.current.routeName || 'Unnamed Simulation',
      routeId: selectedRoute ? getRouteId(selectedRoute) : null,
      routeName: resultsRef.current.routeName || 'Unknown Route',
      params: cleanParams,
      current: cleanCurrent,
      optimal: cleanOptimal,
      alternatives: cleanAlternatives,
      recommendation: (resultsRef.current.recommendation || '').slice(0, 500), // Limit length
      timestamp: new Date().toISOString()
    };

    console.log('🔵 4. Clean data size:', JSON.stringify(simulationData).length, 'bytes');
    console.log('🔵 5. Sending clean data:', simulationData);

    const response = await fetch('http://localhost:5000/api/simulations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simulationData),
    });

    console.log('🔵 6. Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('🔴 7. Error response:', errorData);
      throw new Error(errorData.error || `Failed to save simulation (${response.status})`);
    }

    const saved = await response.json();
    console.log('✅ 8. Saved successfully:', saved);
    
    setLocalSavedSimulations(prev => [saved, ...prev]);
    setShowSaveModal(false);
    setStatusMessage("✅ Simulation saved to database!");
    
  } catch (error) {
    console.error('🔴 9. Save error:', error);
    setSaveError(error.message || "Failed to save simulation");
    setStatusMessage(`❌ Save failed: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
}, [selectedRoute]);

  /* ==========================================================
     LOAD SIMULATION FROM DATABASE
  ========================================================== */

  const handleLoadSimulation = useCallback(async (simulation) => {
    try {
      console.log('📂 Loading simulation:', simulation);
      
      let fullData = simulation;
      if (simulation.id && !simulation.current_route) {
        const response = await fetch(`http://localhost:5000/api/simulations/${simulation.id}`);
        if (response.ok) {
          fullData = await response.json();
          console.log('📂 Fetched full simulation data:', fullData);
        }
      }
      
      const loadedResult = {
        id: fullData.id || `loaded-${Date.now()}`,
        routeName: fullData.route_name || fullData.routeName || 'Unknown Route',
        timestamp: fullData.created_at || fullData.timestamp || new Date().toISOString(),
        params: fullData.parameters || fullData.params || {},
        current: fullData.current_route || fullData.current || {},
        optimal: fullData.optimal_route || fullData.optimal || {},
        alternatives: fullData.alternatives || [],
        recommendation: fullData.recommendation || ''
      };

      resultsRef.current = loadedResult;
      hasRunSimulationRef.current = true;
      
      if (loadedResult.params) {
        if (loadedResult.params.delay) setDelay(loadedResult.params.delay);
        if (loadedResult.params.weather) setWeather(loadedResult.params.weather);
        if (loadedResult.params.accident !== undefined) setHasAccident(loadedResult.params.accident);
        if (loadedResult.params.roadClosure !== undefined) setHasRoadClosure(loadedResult.params.roadClosure);
      }

      setStatusMessage("📂 Simulation loaded from database!");
      forceUpdate({});

      if (typeof onLoadSimulation === 'function') {
        onLoadSimulation(loadedResult);
      }

      // Auto-trigger AI analysis on loaded simulation
      setTimeout(() => generateAIAnalysis(), 1000);
    } catch (error) {
      console.error("❌ Load error:", error);
      setStatusMessage("❌ Failed to load simulation");
    }
  }, [onLoadSimulation, generateAIAnalysis]);

  /* ==========================================================
     DELETE SIMULATION FROM DATABASE
  ========================================================== */

  const handleDeleteSimulation = useCallback(async (id) => {
    if (!id) return;
    
    if (window.confirm('Are you sure you want to delete this simulation?')) {
      try {
        console.log('🗑️ Deleting simulation:', id);
        
        const response = await fetch(`http://localhost:5000/api/simulations/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to delete simulation');
        }

        const result = await response.json();
        console.log('✅ Simulation deleted:', result);
        
        setLocalSavedSimulations(prev => prev.filter(sim => sim.id !== id));
        
        if (typeof onDeleteSimulation === 'function') {
          onDeleteSimulation(id);
        }
        
        if (resultsRef.current && resultsRef.current.id === id) {
          resultsRef.current = null;
          hasRunSimulationRef.current = false;
          forceUpdate({});
        }
        
        setStatusMessage("🗑️ Simulation deleted from database!");
        
      } catch (error) {
        console.error("❌ Delete error:", error);
        setStatusMessage(`❌ Failed to delete: ${error.message}`);
      }
    }
  }, [onDeleteSimulation]);

  /* ==========================================================
     TOGGLE SAVED LIST
  ========================================================== */

  const toggleSavedList = useCallback(() => {
    setShowSavedList(!showSavedList);
    if (!showSavedList) {
      fetchSavedSimulations();
    }
  }, [showSavedList, fetchSavedSimulations]);

  /* ==========================================================
     RENDER
  ========================================================== */

  const results = resultsRef.current;
  const hasRunSimulation = hasRunSimulationRef.current;
  const history = historyRef.current;

  const allSavedSimulations = savedSimulations.length > 0 ? savedSimulations : localSavedSimulations;

  if (routesLoading) {
    return (
      <div className="w-full bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading ...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl p-6 border border-gray-200 shadow-sm">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-2xl text-gray-900 flex items-center gap-3">
            <Zap className="w-7 h-7 text-purple-600" />
            What-If Simulation
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center gap-1">
              <Brain className="w-3 h-3" />
              AI-Powered
            </span>
            {aiInitialized && localSavedSimulations.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {localSavedSimulations.length} simulations learned
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Simulate route disruptions, weather, traffic and compare alternatives.
          </p>
          {routesError && (
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ Using default routes (API unavailable: {routesError})
            </p>
          )}
          {!routesError && routes.length > 0 && (
            <p className="text-xs text-green-600 mt-1">
              ✅ Using {routes.length} routes from optimized_routes table
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* CHAT BUTTON */}
          <button
            onClick={() => setShowChat(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI Assistant
          </button>

          <button
            onClick={toggleSavedList}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            <History className="w-4 h-4" />
            Saved ({allSavedSimulations?.length || 0})
          </button>
          
          {hasRunSimulation && (
            <span className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
              ✅ Simulation complete
            </span>
          )}
        </div>
      </div>

      {/* SAVED SIMULATIONS LIST */}
      {showSavedList && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 max-h-[600px] overflow-y-auto">
          <SavedSimulationsList
            simulations={allSavedSimulations}
            onLoad={handleLoadSimulation}
            onDelete={handleDeleteSimulation}
            loading={isLoadingSaved}
          />
        </div>
      )}

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN - Controls */}
        <div className="xl:col-span-4 space-y-5">
          {/* STATUS */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-sm ${
                statusMessage.includes("complete") || statusMessage.includes("successfully")
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : statusMessage.includes("Failed") || statusMessage.includes("failed")
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-blue-50 border border-blue-200 text-blue-700"
              }`}
            >
              {statusMessage}
            </div>
          )}

          {/* ROUTE */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Select Route
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={selectedRoute ? getRouteId(selectedRoute) : ""}
                onChange={handleRouteChange}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 rounded-xl text-sm"
              >
                {availableRoutes.map((route) => (
                  <option key={getRouteId(route)} value={getRouteId(route)}>
                    {getRouteName(route)}
                  </option>
                ))}
              </select>
            </div>
            {selectedRoute && (
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>📏 {getDistance(selectedRoute).toFixed(1)} km</span>
                <span>⏱️ {getDuration(selectedRoute)} min</span>
                <span>🚦 Traffic +{Number(selectedRoute.traffic_delay) || 0} min</span>
              </div>
            )}
          </div>

          {/* WEATHER DISPLAY - Pass the route names */}
          <WeatherDisplay 
            weather={currentWeather}
            loading={weatherLoading}
            onRefresh={refreshWeather}
            originName={selectedRoute?.origin_name}
            destinationName={selectedRoute?.destination_name}
          />

          {/* DELAY */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Additional Delay
              </label>
              <span className="text-lg font-bold text-purple-600">
                {delay} min
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={delay}
              onChange={(event) => setDelay(Number(event.target.value))}
              className="w-full accent-purple-600 h-2"
            />
          </div>

          {/* WEATHER */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Manual Weather Override
            </label>
            <div className="relative">
              {weather === "sunny" ? (
                <Sun className="absolute left-3 top-3 w-5 h-5 text-yellow-500" />
              ) : (
                <CloudRain className="absolute left-3 top-3 w-5 h-5 text-blue-500" />
              )}
              <select
                value={weather}
                onChange={(event) => setWeather(event.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 rounded-xl text-sm"
              >
                {WEATHER_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Override real weather for simulation</p>
          </div>

          {/* DISRUPTIONS */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Disruptions
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasAccident}
                  onChange={(event) => setHasAccident(event.target.checked)}
                  className="w-5 h-5 accent-purple-600"
                />
                🚗 Accident
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasRoadClosure}
                  onChange={(event) => setHasRoadClosure(event.target.checked)}
                  className="w-5 h-5 accent-purple-600"
                />
                🚧 Road Closure
              </label>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={runSimulation}
              disabled={isRunning || !selectedRoute}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
            >
              {isRunning ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Run Simulation
                </>
              )}
            </button>

            {results && (
              <button
                type="button"
                onClick={resetSimulation}
                className="px-5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Results */}
        <div className="xl:col-span-8">
          {hasRunSimulation && results ? (
            <ResultsPanel 
              results={results} 
              history={history}
              onSave={handleSaveClick}
              isSaving={isSaving}
              aiAnalysis={aiAnalysis}
              aiLoading={aiAnalysisLoading}
              onAIAnalyze={generateAIAnalysis}
            />
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12">
              <div className="text-center">
                <BarChart3 className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-xl font-medium">No simulation results yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Adjust the parameters and click "Run Simulation"
                </p>
                {aiInitialized && localSavedSimulations.length > 0 && (
                  <p className="text-xs text-purple-500 mt-3">
                    🧠 AI has learned from {localSavedSimulations.length} previous simulations
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* SAVE MODAL */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
        results={results}
        isSaving={isSaving}
        error={saveError}
      />

      {/* CHAT MODAL */}
      <AIChatModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onSendMessage={handleChatMessage}
        messages={chatMessages}
        isLoading={chatLoading}
        context={{
          routeName: selectedRoute ? getRouteName(selectedRoute) : "No route selected",
          simulationCount: localSavedSimulations.length,
          hasResults: !!resultsRef.current
        }}
      />
    </div>
  );
};

export default SimulationControls;