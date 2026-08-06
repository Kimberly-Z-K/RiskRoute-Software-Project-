import React, { useState, useEffect } from 'react';
import {
  ThumbsUp, Zap, Clock, DollarSign, AlertTriangle, BarChart3,
  CheckCircle, TrendingDown, CloudRain, Car, Construction,
  Loader2, ArrowRight, Radio, Navigation, Layers
} from 'lucide-react';

// ---------- helpers ----------

const parseNumber = (val) => {
  if (val === null || val === undefined) return null;
  const match = String(val).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
};

const riskColor = (score) => {
  if (score > 70) return { text: 'text-red-600', bg: 'bg-red-500', ring: 'stroke-red-500' };
  if (score > 40) return { text: 'text-yellow-600', bg: 'bg-yellow-500', ring: 'stroke-yellow-500' };
  return { text: 'text-green-600', bg: 'bg-green-500', ring: 'stroke-green-500' };
};

const weatherMeta = {
  clear: { label: 'Clear skies', icon: null, tone: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
  moderate: { label: 'Moderate rain', icon: CloudRain, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  severe: { label: 'Severe storm', icon: CloudRain, tone: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20' },
};

// ---------- small building blocks ----------

// Semi-circle risk gauge, animates in on mount
const RiskGauge = ({ score = 0, label }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const circumference = 282.7; // pi * r, r = 90

  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(score), 80);
    return () => clearTimeout(t);
  }, [score]);

  const { text, ring } = riskColor(score);
  const dash = (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-28 h-auto">
        <path
          d="M10,100 A90,90 0 0,1 190,100"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className="text-gray-200 dark:text-gray-700"
        />
        <path
          d="M10,100 A90,90 0 0,1 190,100"
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          className={`${ring} transition-all duration-1000 ease-out`}
          strokeDasharray={`${dash} ${circumference}`}
        />
        <text x="100" y="92" textAnchor="middle" className={`text-2xl font-bold ${text}`} fill="currentColor">
          {score}
        </text>
      </svg>
      <p className="text-xs text-gray-500 -mt-1">{label}</p>
    </div>
  );
};

// Horizontal comparison bar for a single metric across two scenarios
const CompareBar = ({ icon: Icon, label, currentLabel, optimalLabel, currentVal, optimalVal }) => {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const hasNumbers = currentVal !== null && optimalVal !== null;
  const max = hasNumbers ? Math.max(currentVal, optimalVal, 1) : 1;
  const currentPct = hasNumbers ? Math.max((currentVal / max) * 100, 4) : 0;
  const optimalPct = hasNumbers ? Math.max((optimalVal / max) * 100, 4) : 0;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] w-12 text-gray-500 flex-shrink-0">Current</span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gray-400 transition-all duration-700 ease-out"
              style={{ width: animate ? `${currentPct}%` : '0%' }}
            />
          </div>
          <span className="text-xs font-medium w-16 text-right">{currentLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] w-12 text-gray-500 flex-shrink-0">Optimal</span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-700 ease-out delay-150"
              style={{ width: animate ? `${optimalPct}%` : '0%' }}
            />
          </div>
          <span className="text-xs font-medium w-16 text-right text-green-700 dark:text-green-500">{optimalLabel}</span>
        </div>
      </div>
    </div>
  );
};

const DisruptionBadges = ({ params }) => {
  if (!params) return null;
  const badges = [];

  if (params.delay && params.delay > 0) {
    badges.push(
      <span key="delay" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
        <Clock className="w-3 h-3" /> +{params.delay} min delay
      </span>
    );
  }
  const w = weatherMeta[params.weather] || weatherMeta.clear;
  if (params.weather && params.weather !== 'clear') {
    badges.push(
      <span key="weather" className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${w.tone}`}>
        <CloudRain className="w-3 h-3" /> {w.label}
      </span>
    );
  }
  if (params.accident) {
    badges.push(
      <span key="accident" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
        <Car className="w-3 h-3" /> Accident reported
      </span>
    );
  }
  if (params.roadClosure) {
    badges.push(
      <span key="closure" className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
        <Construction className="w-3 h-3" /> Road closure
      </span>
    );
  }

  if (badges.length === 0) return null;

  return <div className="flex flex-wrap gap-2 mb-3">{badges}</div>;
};

// ---------- main scenario card ----------

const SimulationResultCard = ({ scenario, impact, isRecommended, routeName }) => {
  if (!impact) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg p-4 border ${
      isRecommended
        ? 'border-green-300 dark:border-green-700 bg-green-50/60 dark:bg-green-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
    }`}>
      {isRecommended && (
        <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 bg-green-600 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
          <ThumbsUp className="w-3 h-3" /> Recommended
        </span>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-sm flex items-center gap-2">
            {isRecommended ? (
              <Navigation className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            )}
            {scenario}
          </p>
          {routeName && routeName !== 'Current Route' && routeName !== 'Optimal Route' && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {routeName}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-sm">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium">{impact.time || 'N/A'}</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm">
            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium">{impact.cost || 'N/A'}</span>
          </p>
        </div>
        <RiskGauge score={impact.riskScore || 0} label="Risk score" />
      </div>
      {impact.alternative && impact.alternative !== 'N/A' && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <TrendingDown className="w-3.5 h-3.5" />
          {impact.alternative}
        </p>
      )}
    </div>
  );
};

// ---------- Alternative Routes List ----------

const AlternativeRoutesList = ({ alternatives }) => {
  if (!alternatives || alternatives.length === 0) return null;

  // Filter out the main route if it exists
  const altRoutes = alternatives.filter(alt => alt.isAlternative !== false);
  if (altRoutes.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Alternative Routes Available
      </h4>
      <div className="space-y-2">
        {altRoutes.map((alt, index) => (
          <div key={alt.id || index} className={`p-2 rounded border text-xs ${
            alt.isRecommended 
              ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
          }`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <span className="font-medium">
                  {alt.isRecommended ? '⭐ ' : ''}
                  {alt.displayName || alt.name || `Alternative ${index + 1}`}
                </span>
                {alt.name && alt.name.includes('via') && (
                  <div className="text-gray-500 text-xs mt-0.5">
                    {alt.name}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <span className="text-gray-700">{alt.duration || 'N/A'} min</span>
                <span className="text-gray-400 ml-2">{alt.distance || 'N/A'} km</span>
              </div>
            </div>
            {alt.trafficDelay > 0 && (
              <div className="text-orange-500 mt-1">
                Traffic: +{Math.round(alt.trafficDelay)} min delay
              </div>
            )}
            {alt.isRecommended && (
              <div className="text-green-600 mt-1 text-xs font-medium">
                ✅ Recommended alternative
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- top level ----------

const SimulationResults = ({ results, params, isRunning = false }) => {
  if (isRunning) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-3 text-purple-600 animate-spin" />
        <p className="font-medium text-gray-700 dark:text-gray-300">Running simulation...</p>
        <p className="text-xs text-gray-500 mt-1">Modeling delay, weather, and incident impact on your route</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center text-gray-500">
        <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Configure scenario parameters and click "Run Simulation"</p>
      </div>
    );
  }

  const current = results.current || { time: 'N/A', cost: 'N/A', riskScore: 0, alternative: 'N/A' };
  const optimal = results.optimal || { time: 'N/A', cost: 'N/A', riskScore: 0, alternative: 'N/A' };
  
  // Get route names from results
  const currentRouteName = results.currentRouteName || results.current?.routeName || 'Current Route';
  const optimalRouteName = results.optimalRouteName || results.optimal?.routeName || 'Optimal Route';
  
  // Get alternative routes list
  const alternatives = results.alternatives || [];

  const currentTime = parseNumber(current.time);
  const optimalTime = parseNumber(optimal.time);
  const currentCost = parseNumber(current.cost);
  const optimalCost = parseNumber(optimal.cost);

  const timeSaved = currentTime !== null && optimalTime !== null ? currentTime - optimalTime : null;
  const costSaved = currentCost !== null && optimalCost !== null ? currentCost - optimalCost : null;
  const riskDelta = (current.riskScore || 0) - (optimal.riskScore || 0);

  const summaryParts = [];
  if (timeSaved !== null && timeSaved > 0) summaryParts.push(`save ${timeSaved} min`);
  if (costSaved !== null && costSaved > 0) summaryParts.push(`save R${costSaved}`);
  if (riskDelta > 0) summaryParts.push(`cut risk by ${riskDelta} points`);

  const summaryText = summaryParts.length > 0
    ? `Taking the recommended route, you ${summaryParts.join(', ')} compared to the current route.`
    : 'The recommended route holds up better under these conditions than the current one.';

  // Find the recommended route name from alternatives
  const recommendedAlt = alternatives.find(alt => alt.isRecommended);
  const displayOptimalName = recommendedAlt?.displayName || optimalRouteName;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Simulation Results & Recommendations
        </h3>
        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
          <Radio className="w-3 h-3 text-green-500" /> Live scenario
        </span>
      </div>

      <DisruptionBadges params={params} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SimulationResultCard 
          scenario="Current Route (with disruption)" 
          impact={current} 
          isRecommended={false}
          routeName={currentRouteName}
        />
        <SimulationResultCard 
          scenario="Optimal Alternative Route" 
          impact={optimal} 
          isRecommended={true}
          routeName={displayOptimalName}
        />
      </div>

      {/* Show alternative routes list if available */}
      {alternatives.length > 1 && (
        <AlternativeRoutesList alternatives={alternatives} />
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <CompareBar
          icon={Clock}
          label="Delivery time"
          currentVal={currentTime}
          optimalVal={optimalTime}
          currentLabel={current.time || 'N/A'}
          optimalLabel={optimal.time || 'N/A'}
        />
        <CompareBar
          icon={DollarSign}
          label="Cost"
          currentVal={currentCost}
          optimalVal={optimalCost}
          currentLabel={current.cost || 'N/A'}
          optimalLabel={optimal.cost || 'N/A'}
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="font-semibold text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Summary
        </p>
        <p className="text-sm mt-1 flex items-start gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
          {summaryText}
        </p>
        {displayOptimalName && displayOptimalName !== 'Optimal Route' && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            Recommended: {displayOptimalName}
          </p>
        )}
      </div>
    </div>
  );
};

export default SimulationResults;