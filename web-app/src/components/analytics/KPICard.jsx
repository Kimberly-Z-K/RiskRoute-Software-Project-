import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

const KPICard = ({ label, value, change, icon: Icon, color, subtitle, target, unit = '' }) => {
  // Determine trend icon and color
  const getTrendIcon = () => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  // Format value based on type
  const formatValue = () => {
    if (typeof value === 'number') {
      if (label.includes('Score') || label.includes('Rating')) {
        return value.toFixed(1);
      }
      return value.toLocaleString();
    }
    return value;
  };

  // Get gradient based on color prop
  const getGradient = () => {
    switch(color) {
      case 'bg-blue-500': return 'from-blue-500 to-blue-600';
      case 'bg-green-500': return 'from-green-500 to-green-600';
      case 'bg-purple-500': return 'from-purple-500 to-purple-600';
      case 'bg-yellow-500': return 'from-yellow-500 to-yellow-600';
      case 'bg-red-500': return 'from-red-500 to-red-600';
      case 'bg-pink-500': return 'from-pink-500 to-pink-600';
      case 'bg-orange-500': return 'from-orange-500 to-orange-600';
      case 'bg-indigo-500': return 'from-indigo-500 to-indigo-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Gradient top bar */}
      <div className={`h-1 bg-gradient-to-r ${getGradient()}`} />
      
      <div className="p-4">
        {/* Header with icon and change */}
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${getGradient()} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getTrendColor()} bg-opacity-10 ${
            change > 0 ? 'bg-green-100 dark:bg-green-900/30' : 
            change < 0 ? 'bg-red-100 dark:bg-red-900/30' : 
            'bg-gray-100 dark:bg-gray-700'
          }`}>
            {getTrendIcon()}
            <span className="text-xs font-semibold">
              {change > 0 ? `+${change}` : change}%
            </span>
          </div>
        </div>

        {/* Value */}
        <div className="mb-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatValue()}{unit}
          </p>
        </div>

        {/* Label */}
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </p>

        {/* Subtitle if provided */}
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {subtitle}
          </p>
        )}

        {/* Target if provided */}
        {target && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Target</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{target}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
              <div 
                className={`h-1 rounded-full bg-gradient-to-r ${getGradient()}`}
                style={{ width: `${Math.min(100, (parseFloat(value) / parseFloat(target)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Hover info tooltip */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Info className="w-3 h-3" />
            <span>Click for detailed analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPICard;