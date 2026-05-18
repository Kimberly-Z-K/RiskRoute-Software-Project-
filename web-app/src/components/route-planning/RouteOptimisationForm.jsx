import React, { useState } from 'react';
import { Navigation } from 'lucide-react';

const RouteOptimisationForm = ({ onGenerateRoutes }) => {
  const [origin, setOrigin] = useState('Warehouse A, 123 Industrial Pkwy, Brooklyn, NY');
  const [destination, setDestination] = useState('Downtown Distribution Center, Manhattan, NY');
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Navigation className="w-5 h-5 text-blue-600" /> Route Optimisation</h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Origin</label>
          <input 
            type="text" 
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">Destination</label>
          <input 
            type="text" 
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        <button onClick={() => onGenerateRoutes()} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
          Generate Routes
        </button>
      </div>
    </div>
  );
};

export default RouteOptimisationForm;