import React from 'react';
import { ThumbsUp, Zap, Clock, DollarSign, AlertTriangle, MapPin, BarChart3, CheckCircle, TrendingDown } from 'lucide-react';

const SimulationResultCard = ({ scenario, impact, isRecommended }) => {
  if (!impact) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border ${
      isRecommended ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex justify-between items-start">
        <p className="font-semibold text-sm">{scenario}</p>
        {isRecommended && <ThumbsUp className="w-4 h-4 text-green-600" />}
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <p className="flex justify-between">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Predicted delivery:</span>
          <span className="font-medium">{impact.time || 'N/A'}</span>
        </p>
        <p className="flex justify-between">
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Cost impact:</span>
          <span className="font-medium">{impact.cost || 'N/A'}</span>
        </p>
        <p className="flex justify-between">
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risk score:</span>
          <span className={`font-medium ${impact.riskScore > 70 ? 'text-red-600' : impact.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'}`}>
            {impact.riskScore || 0}/100
          </span>
        </p>
        <p className="flex justify-between">
          <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Recommended:</span>
          <span className="font-medium">{impact.alternative || 'N/A'}</span>
        </p>
      </div>
    </div>
  );
};

const SimulationResults = ({ results }) => {
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
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        Simulation Results & Recommendations
      </h3>
      <SimulationResultCard scenario="Current Route (with disruption)" impact={current} isRecommended={false} />
      <SimulationResultCard scenario="Optimal Alternative Route" impact={optimal} isRecommended={true} />
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
        <p className="font-semibold text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Summary
        </p>
        <p className="text-sm mt-1">By taking the recommended alternative route, you can save significant time and reduce risk.</p>
      </div>
    </div>
  );
};

export default SimulationResults;