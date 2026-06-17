import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';


const RiskScoreCard = () => {
  const riskScore = 54;
  const maxScore = 100;
  const percentage = (riskScore / maxScore) * 100;
  
  const getRiskLevel = (score) => {
    if (score >= 70) return { level: 'Critical', color: 'red', message: 'Immediate action required' };
    if (score >= 50) return { level: 'Moderate', color: 'orange', message: 'Proactive monitoring recommended' };
    if (score >= 30) return { level: 'Low', color: 'yellow', message: 'Regular monitoring advised' };
    return { level: 'Minimal', color: 'green', message: 'Standard operations continue' };
  };
  
  const riskInfo = getRiskLevel(riskScore);
  
  const previousScore = 62;
  const scoreChange = previousScore - riskScore;
  const isImproving = scoreChange > 0;
  
  const riskFactors = [
    { name: 'Accident History', score: 68 },
    { name: 'Theft Probability', score: 45 },
    { name: 'Weather Impact', score: 52 },
    { name: 'Route Safety', score: 38 },
    { name: 'Driver Behavior', score: 42 }
  ];
  
  const getFactorColor = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 50) return 'bg-orange-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskTextColor = (color) => {
    if (color === 'red') return 'text-red-700';
    if (color === 'orange') return 'text-orange-700';
    if (color === 'yellow') return 'text-yellow-700';
    return 'text-green-700';
  };

  const getRiskBgColor = (color) => {
    if (color === 'red') return 'bg-red-100';
    if (color === 'orange') return 'bg-orange-100';
    if (color === 'yellow') return 'bg-yellow-100';
    return 'bg-green-100';
  };
  
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${getRiskBgColor(riskInfo.color)}`}>
            <Shield className={`w-5 h-5 ${getRiskTextColor(riskInfo.color)}`} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Overall Risk Score</h3>
            <p className="text-xs text-gray-500">Real-time fleet assessment</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${
          isImproving ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <span className={`text-xs font-medium ${
            isImproving ? 'text-green-700' : 'text-red-700'
          }`}>
            {Math.abs(scoreChange)}%
          </span>
        </div>
      </div>
      
      <div className="text-center mb-4">
        <div className="relative inline-block">
          <svg className="w-28 h-28 mx-auto">
            <circle
              className="text-gray-200"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="52"
              cx="56"
              cy="56"
            />
            <circle
              className={riskInfo.color === 'red' ? 'text-red-600' : riskInfo.color === 'orange' ? 'text-orange-500' : riskInfo.color === 'yellow' ? 'text-yellow-500' : 'text-green-500'}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - percentage / 100)}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="52"
              cx="56"
              cy="56"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-2xl font-bold text-gray-900">{riskScore}</p>
            <p className="text-xs text-gray-500">/ {maxScore}</p>
          </div>
        </div>
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getRiskBgColor(riskInfo.color)} ${getRiskTextColor(riskInfo.color)}`}>
            {riskInfo.level} Risk
          </span>
        </div>
      </div>
      
      <div className={`mb-4 p-3 rounded-md ${riskInfo.color === 'red' ? 'bg-red-50 border border-red-200' : riskInfo.color === 'orange' ? 'bg-orange-50 border border-orange-200' : riskInfo.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
        <p className={`text-sm font-medium ${getRiskTextColor(riskInfo.color)}`}>
          {riskInfo.message}
        </p>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Risk Factors</p>
        {riskFactors.map((factor, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">{factor.name}</span>
              <span className={factor.score >= 70 ? 'text-red-600' : factor.score >= 50 ? 'text-orange-600' : factor.score >= 30 ? 'text-yellow-600' : 'text-green-600'}>
                {factor.score}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${getFactorColor(factor.score)}`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" />
        View Risk Report
      </button>
    </div>
  );
};


export default RiskScoreCard;