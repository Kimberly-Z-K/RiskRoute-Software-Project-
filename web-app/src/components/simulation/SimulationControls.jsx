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
} from "lucide-react";

/* ============================================================
   DEFAULT ROUTES
============================================================ */

const DEFAULT_ROUTES = [
  {
    id: "route-19",
    display_name: "Route #19 - Johannesburg to Durban",
    origin_name: "Johannesburg",
    destination_name: "Durban",
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
   RESULTS PANEL
============================================================ */

const ResultsPanel = ({ results, history }) => {
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
        <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
          <Radio className="w-4 h-4" />
          Completed
        </span>
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
          🌦️ {results.params.weather.replace("_", " ")}
        </span>
      </div>

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

      {/* ALTERNATIVES */}
      <div className="border-2 border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-base mb-3 flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Alternative Routes
        </h4>
        <div className="space-y-3">
          {results.alternatives.map((alternative) => (
            <div
              key={alternative.id}
              className={`p-4 rounded-lg border-2 ${
                alternative.isRecommended
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-base">
                  {alternative.isRecommended ? "⭐ " : ""}
                  {alternative.displayName}
                </span>
                <span className="font-bold text-lg">
                  {alternative.duration} min
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {alternative.distance} km{" • "}
                +{alternative.trafficDelay} min traffic
              </div>
            </div>
          ))}
        </div>
      </div>

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
   MAIN COMPONENT - With Persistence Fix
============================================================ */

const SimulationControls = ({
  routes = DEFAULT_ROUTES,
  onSimulationComplete,
}) => {
  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */

  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [delay, setDelay] = useState(30);
  const [weather, setWeather] = useState("moderate_rain");
  const [hasAccident, setHasAccident] = useState(false);
  const [hasRoadClosure, setHasRoadClosure] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); // ✅ ADDED THIS

  // CRITICAL: Use refs to persist data across re-renders
  const resultsRef = useRef(null);
  const hasRunSimulationRef = useRef(false);
  const historyRef = useRef([]);
  
  // Force re-render trigger
  const [, forceUpdate] = useState({});
  
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
     RUN SIMULATION
  ========================================================== */

  const runSimulation = useCallback(() => {
    if (!selectedRoute || isRunning) {
      return;
    }

    console.log("SIMULATION STARTED");

    setIsRunning(true);
    setStatusMessage("🔄 Running simulation...");

    const baseDuration = getDuration(selectedRoute);
    const baseDistance = getDistance(selectedRoute);
    const baseCost = getCost(selectedRoute);
    const trafficDelay = Number(selectedRoute.traffic_delay) || 0;

    let totalDelay = Number(delay) || 0;
    totalDelay += trafficDelay;
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
    if (hasAccident) riskScore += 20;
    if (hasRoadClosure) riskScore += 20;
    riskScore = Math.min(Math.max(Math.round(riskScore), 0), 100);

    const optimalDuration = Math.max(Math.round(baseDuration * 0.85), 1);
    const optimalCost = Math.max(Math.round(currentCost * 0.9), 1);
    const optimalRisk = Math.max(Math.round(riskScore - 30), 5);

    const alternatives = [
      {
        id: "alt-1",
        displayName: "N1 Western Bypass",
        duration: Math.round(baseDuration * 0.85),
        distance: Math.round(baseDistance * 0.95),
        trafficDelay: Math.round(totalDelay * 0.5),
        isRecommended: true,
      },
      {
        id: "alt-2",
        displayName: "R21 Eastern Route",
        duration: Math.round(baseDuration * 0.9),
        distance: Math.round(baseDistance * 1.05),
        trafficDelay: Math.round(totalDelay * 0.65),
        isRecommended: false,
      },
      {
        id: "alt-3",
        displayName: "M1 Alternative Route",
        duration: Math.round(baseDuration * 0.95),
        distance: Math.round(baseDistance * 0.9),
        trafficDelay: Math.round(totalDelay * 0.8),
        isRecommended: false,
      },
    ];

    const simulationResult = {
      id: `simulation-${Date.now()}`,
      routeName: getRouteName(selectedRoute),
      timestamp: new Date().toISOString(),
      params: {
        delay,
        weather,
        accident: hasAccident,
        roadClosure: hasRoadClosure,
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
    };

    console.log("SIMULATION RESULT:", simulationResult);

    // Store in refs for persistence
    resultsRef.current = simulationResult;
    hasRunSimulationRef.current = true;
    historyRef.current = [simulationResult, ...historyRef.current].slice(0, 10);

    setStatusMessage(`✅ Simulation complete — ${currentDuration} minutes`);
    setIsRunning(false);

    // Force re-render to show results
    forceUpdate({});

    if (typeof onSimulationComplete === "function") {
      onSimulationComplete(simulationResult);
    }
  }, [selectedRoute, isRunning, delay, hasAccident, hasRoadClosure, selectedWeather, onSimulationComplete]);

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
    
    forceUpdate({});
  }, []);

  /* ==========================================================
     ROUTE CHANGE
  ========================================================== */

  const handleRouteChange = useCallback((event) => {
    setSelectedRouteId(event.target.value);
    setStatusMessage("Route changed. Run the simulation again to update the result.");
  }, []);

  /* ==========================================================
     RENDER - Uses refs for data
  ========================================================== */

  const results = resultsRef.current;
  const hasRunSimulation = hasRunSimulationRef.current;
  const history = historyRef.current;

  return (
    <div className="w-full bg-white rounded-xl p-6 border border-gray-200 shadow-sm">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-2xl text-gray-900 flex items-center gap-3">
            <Zap className="w-7 h-7 text-purple-600" />
            What-If Simulation
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Simulate route disruptions and compare alternatives.
          </p>
        </div>
        {hasRunSimulation && (
          <span className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
            ✅ Simulation complete
          </span>
        )}
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN - Controls */}
        <div className="xl:col-span-4 space-y-5">
          {/* STATUS - Now defined */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-sm ${
                statusMessage.includes("complete")
                  ? "bg-green-50 border border-green-200 text-green-700"
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
              Weather
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
            <ResultsPanel results={results} history={history} />
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12">
              <div className="text-center">
                <BarChart3 className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-xl font-medium">No simulation results yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Adjust the parameters and click "Run Simulation"
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SimulationControls;