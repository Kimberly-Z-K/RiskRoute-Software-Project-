import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, change, changeType }) => {
  // Determine trend icon and color
  const getTrendIcon = () => {
    if (changeType === 'up') return <TrendingUp className="w-3 h-3" />;
    if (changeType === 'down') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (changeType === 'up') return 'text-green-600 dark:text-green-400';
    if (changeType === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  // Format value if it's a number
  const formatValue = () => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group cursor-pointer">
      <div className="flex justify-between items-start">
        {/* Left side - Text content */}
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
            {title}
          </p>
          
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {formatValue()}
            </p>
            {change && (
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${getTrendColor()}`}>
                {getTrendIcon()}
                {change}
              </span>
            )}
          </div>
          
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
          
          {trend && !change && (
            <p className="text-xs mt-2 text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {trend}
            </p>
          )}
        </div>
        
        {/* Right side - Icon */}
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      
      {/* Progress bar for certain metrics (optional) */}
      {title === 'Active Vehicles' && (
        <div className="mt-3">
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(value / 50) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Hover effect indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-xl"></div>
    </div>
  );
};

export default StatCard;