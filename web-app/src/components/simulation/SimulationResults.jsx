import React from 'react';
import { ThumbsUp, Zap } from 'lucide-react';

const SimulationResultCard = ({ scenario, impact, isRecommended }) => (
  <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border ${isRecommended ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
    <div className="flex justify-between items-start">
      <p className="font-semibold text-sm">{scenario}</p>
      {isRecommended && <ThumbsUp className="w-4 h-4 text-green-600" />}
    </div>
    <div className="mt-2 space-y-1 text-xs">
      <p className="flex justify-between"><span>📦 Predicted delivery:</span><span className="font-medium">{impact.time}</span></p>
      <p className="flex justify-between"><span>💰 Cost impact:</span><span className="font-medium">{impact.cost}</span></p>
      <p className="flex justify-between"><span>⚠️ Risk score:</span><span className={`font-medium ${impact.riskScore > 70 ? 'text-red-600' : impact.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'}`}>{impact.riskScore}/100</span></p>
      <p className="flex justify-between"><span>🛣️ Recommended:</span><span className="font-medium">{impact.alternative}</span></p>
    </div>
  </div>
);

const SimulationResults = ({ results }) => {
  if (!results) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-lg text-center text-gray-500">
        <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Configure scenario parameters and click "Run Simulation"</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Simulation Results & Recommendations</h3>
      <SimulationResultCard scenario="Current Route (with disruption)" impact={results.current} isRecommended={false} />
      <SimulationResultCard scenario="Optimal Alternative Route" impact={results.optimal} isRecommended={true} />
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
        <p className="font-semibold text-sm">📊 Summary</p>
        <p className="text-sm mt-1">By taking the recommended alternative route, you can save significant time and reduce risk.</p>
      </div>
    </div>
  );
};

export default SimulationResults;