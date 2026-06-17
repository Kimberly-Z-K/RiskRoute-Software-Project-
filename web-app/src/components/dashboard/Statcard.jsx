import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, change, changeType }) => {
  const getTrendIcon = () => {
    if (changeType === 'up') return <TrendingUp className="w-3 h-3" />;
    if (changeType === 'down') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (changeType === 'up') return 'text-green-600';
    if (changeType === 'down') return 'text-red-500';
    return 'text-gray-400';
  };

  const formatValue = () => {
    if (typeof value === 'number') return value.toLocaleString();
    return value;
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
      <div className="flex justify-between items-start">
        {/* Left side */}
        <div className="flex-1">
          {/* Section label style — small, muted, uppercase, tracked */}
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {title}
          </p>

          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <p className="text-3xl font-semibold text-gray-800">
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
            <p className="text-xs text-gray-400 mt-1">
              {subtitle}
            </p>
          )}

          {trend && !change && (
            <p className="text-xs mt-2 text-gray-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
              {trend}
            </p>
          )}
        </div>

        {/* Right side — icon in rounded square with gray styling */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
      </div>

      {/* Progress bar */}
      {title === 'Active Vehicles' && (
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div
              className="bg-blue-400 h-1 rounded-full transition-all duration-500"
              style={{ width: `${(value / 50) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;