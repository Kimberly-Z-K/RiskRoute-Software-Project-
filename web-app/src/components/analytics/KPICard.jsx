
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const KPICard = ({
  label,
  value,
  change,
  icon: Icon,
  unit = '',
  higherIsBetter = true,
}) => {
  const hasChange = typeof change === 'number' && Number.isFinite(change);
  const isNeutral = !hasChange || change === 0;
  const isPositive = hasChange && (change > 0) === higherIsBetter;

  const trendColor = isNeutral
    ? 'text-gray-500'
    : isPositive
      ? 'text-green-700'
      : 'text-red-700';

  const trendBg = isNeutral
    ? 'bg-gray-50'
    : isPositive
      ? 'bg-green-50'
      : 'bg-red-50';

  const TrendIcon = isNeutral
    ? Minus
    : change > 0
      ? TrendingUp
      : TrendingDown;

  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString(undefined, {
          maximumFractionDigits: 1,
        })
      : value ?? '—';

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-gray-100 rounded-md">
          {Icon ? (
            <Icon className="w-4 h-4 text-gray-700" />
          ) : (
            <Minus className="w-4 h-4 text-gray-700" />
          )}
        </div>

        {hasChange && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${trendBg}`}>
            <TrendIcon className={`w-3 h-3 ${trendColor}`} />
            <span className={`text-xs font-semibold ${trendColor}`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <p className="text-2xl font-bold text-gray-900 mb-1">
        {formattedValue}{unit}
      </p>

      <p className="text-xs text-gray-600 uppercase">{label}</p>
    </div>
  );
};

export default KPICard;
