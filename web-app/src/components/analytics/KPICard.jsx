import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';


const KPICard = ({ label, value, change, icon: Icon, unit = '' }) => {
  const getTrendIcon = () => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change > 0) return 'text-green-700';
    if (change < 0) return 'text-red-700';
    return 'text-gray-500';
  };

  const getTrendBg = () => {
    if (change > 0) return 'bg-green-50';
    if (change < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  const formatValue = () => {
    if (typeof value === 'number') {
      if (label.includes('Score') || label.includes('Rating')) {
        return value.toFixed(1);
      }
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-gray-100 rounded-md">
          <Icon className="w-4 h-4 text-gray-700" />
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${getTrendBg()}`}>
          {getTrendIcon()}
          <span className={`text-xs font-semibold ${getTrendColor()}`}>
            {change > 0 ? `+${change}` : change}%
          </span>
        </div>
      </div>

      <p className="text-2xl font-bold text-gray-900 mb-1">
        {formatValue()}{unit}
      </p>

      <p className="text-xs text-gray-600 uppercase">{label}</p>
    </div>
  );
};


export default KPICard;