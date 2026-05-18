import React from 'react';
import { Shield } from 'lucide-react';

const RiskScoreCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-red-100 rounded-lg"><Shield className="w-6 h-6 text-red-600" /></div>
        <h3 className="font-bold">Overall Risk Score</h3>
      </div>
      <p className="text-3xl font-bold text-red-600">54<span className="text-lg text-gray-500">/100</span></p>
      <p className="text-sm text-gray-500 mt-2">Moderate risk level - Proactive monitoring recommended</p>
    </div>
  );
};

export default RiskScoreCard;