import React from 'react';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, CheckCircle, Info } from 'lucide-react';

const RiskScoreCard = () => {
  const riskScore = 54;
  const maxScore = 100;
  const percentage = (riskScore / maxScore) * 100;
  
  // Determine risk level and colors
  const getRiskLevel = (score) => {
    if (score >= 70) return { level: 'Critical', color: 'red', icon: AlertTriangle, message: 'Immediate action required' };
    if (score >= 50) return { level: 'Moderate', color: 'orange', icon: AlertTriangle, message: 'Proactive monitoring recommended' };
    if (score >= 30) return { level: 'Low', color: 'yellow', icon: Info, message: 'Regular monitoring advised' };
    return { level: 'Minimal', color: 'green', icon: CheckCircle, message: 'Standard operations continue' };
  };
  
  const riskInfo = getRiskLevel(riskScore);
  const RiskIcon = riskInfo.icon;
  
  // Previous score comparison (mock data)
  const previousScore = 62;
  const scoreChange = previousScore - riskScore;
  const isImproving = scoreChange > 0;
  
  // Risk factors breakdown
  const riskFactors = [
    { name: 'Accident History', score: 68, weight: 'High', color: 'red' },
    { name: 'Theft Probability', score: 45, weight: 'Medium', color: 'orange' },
    { name: 'Weather Impact', score: 52, weight: 'Medium', color: 'orange' },
    { name: 'Route Safety', score: 38, weight: 'Low', color: 'yellow' },
    { name: 'Driver Behavior', score: 42, weight: 'Medium', color: 'orange' }
  ];
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            riskInfo.color === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
            riskInfo.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
            riskInfo.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
            'bg-green-100 dark:bg-green-900/30'
          }`}>
            <Shield className={`w-6 h-6 ${
              riskInfo.color === 'red' ? 'text-red-600' :
              riskInfo.color === 'orange' ? 'text-orange-600' :
              riskInfo.color === 'yellow' ? 'text-yellow-600' :
              'text-green-600'
            }`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Overall Risk Score</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time fleet risk assessment</p>
          </div>
        </div>
        
        {/* Trend Indicator */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
          isImproving ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        }`}>
          {isImproving ? (
            <TrendingDown className="w-4 h-4 text-green-600" />
          ) : (
            <TrendingUp className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-xs font-medium ${
            isImproving ? 'text-green-600' : 'text-red-600'
          }`}>
            {Math.abs(scoreChange)}% vs last month
          </span>
        </div>
      </div>
      
      {/* Main Score Display */}
      <div className="text-center mb-4">
        <div className="relative inline-block">
          <svg className="w-32 h-32 mx-auto">
            <circle
              className="text-gray-200 dark:text-gray-700"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="56"
              cx="64"
              cy="64"
            />
            <circle
              className={`${
                riskInfo.color === 'red' ? 'text-red-600' :
                riskInfo.color === 'orange' ? 'text-orange-500' :
                riskInfo.color === 'yellow' ? 'text-yellow-500' :
                'text-green-500'
              }`}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 56}
              strokeDashoffset={2 * Math.PI * 56 * (1 - percentage / 100)}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="56"
              cx="64"
              cy="64"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{riskScore}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">/ {maxScore}</p>
          </div>
        </div>
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            riskInfo.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
            riskInfo.color === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
            riskInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          }`}>
            <RiskIcon className="w-3 h-3" />
            {riskInfo.level} Risk Level
          </span>
        </div>
      </div>
      
      {/* Risk Message */}
      <div className={`mb-4 p-3 rounded-lg ${
        riskInfo.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
        riskInfo.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
        riskInfo.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
        'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
      }`}>
        <p className={`text-sm font-medium ${
          riskInfo.color === 'red' ? 'text-red-700 dark:text-red-300' :
          riskInfo.color === 'orange' ? 'text-orange-700 dark:text-orange-300' :
          riskInfo.color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
          'text-green-700 dark:text-green-300'
        }`}>
          {riskInfo.message}
        </p>
      </div>
      
      {/* Risk Factors Breakdown */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Risk Factors Breakdown</p>
        {riskFactors.map((factor, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{factor.name}</span>
              <div className="flex gap-2">
                <span className="text-gray-500 dark:text-gray-500">{factor.weight}</span>
                <span className={`font-medium ${
                  factor.score >= 70 ? 'text-red-600' :
                  factor.score >= 50 ? 'text-orange-600' :
                  factor.score >= 30 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {factor.score}/100
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${
                  factor.score >= 70 ? 'bg-red-500' :
                  factor.score >= 50 ? 'bg-orange-500' :
                  factor.score >= 30 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Action Button */}
      <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" />
        View Detailed Risk Report
      </button>
    </div>
  );
};

export default RiskScoreCard;