import React from 'react';
import { CheckCircle, Clock, MapPin, AlertTriangle, DollarSign } from 'lucide-react';

const RouteOptionCard = ({ route, selected, onSelect }) => {
  // Format cost to ensure it displays as Rands
  const formatCost = (cost) => {
    if (cost.startsWith('R')) {
      return cost;
    }
    // If it comes as USD or other format, replace with Rand format
    return `R ${cost.replace(/[^0-9.]/g, '')}`;
  };

  return (
    <div 
      onClick={() => onSelect(route.id)} 
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
        selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-800 dark:text-white">{route.name}</span>
        {selected && <CheckCircle className="w-4 h-4 text-blue-500" />}
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 flex gap-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {route.time}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {route.distance} km
        </span>
      </div>
      
      <div className="flex gap-3 mt-2 text-xs">
        <span className={`flex items-center gap-1 ${
          route.risk === 'Low' ? 'text-green-600' : 
          route.risk === 'Medium' ? 'text-yellow-600' : 
          'text-orange-600'
        }`}>
          <AlertTriangle className="w-3 h-3" />
          Risk: {route.risk}
        </span>
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          {/* <DollarSign className="w-3 h-3" /> */}
          {formatCost(route.cost)}
        </span>
      </div>
    </div>
  );
};

export default RouteOptionCard;