import React from 'react';
import { CheckCircle } from 'lucide-react';


const RouteOptionCard = ({ route, selected, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(route.id)} 
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
        selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-gray-900">{route.name}</span>
        {selected && <CheckCircle className="w-4 h-4 text-blue-600" />}
      </div>
      
      <div className="text-sm text-gray-600 mb-2">
        <span>{route.time}</span>
        <span className="mx-2">•</span>
        <span>{route.distance} km</span>
      </div>
      
      <div className="flex gap-3 text-sm">
        <span className={
          route.risk === 'Low' ? 'text-green-600' : 
          route.risk === 'Medium' ? 'text-yellow-600' : 
          'text-orange-600'
        }>
          {route.risk} risk
        </span>
        <span className="text-gray-900 font-medium">
          {route.cost}
        </span>
      </div>
    </div>
  );
};


export default RouteOptionCard;