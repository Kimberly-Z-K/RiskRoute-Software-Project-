import React from 'react';
import { Clock, AlertTriangle, DollarSign, Trash2, Eye } from 'lucide-react';

const SavedSimulationsList = ({ 
  simulations, 
  onLoad, 
  onDelete, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading saved simulations...</p>
      </div>
    );
  }

  if (!simulations || simulations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No saved simulations yet</p>
        <p className="text-sm">Run a simulation and save it to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Saved Simulations ({simulations.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simulations.map((sim) => (
          <div
            key={sim.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {sim.route_name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(sim.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onLoad?.(sim)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Load this simulation"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete?.(sim.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete this simulation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="text-xs">
                <span className="text-gray-500">Duration</span>
                <p className="font-medium">{sim.current_route.duration} min</p>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Cost</span>
                <p className="font-medium">{sim.current_route.cost}</p>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Risk</span>
                <p className={`font-medium ${
                  sim.current_route.riskScore >= 70 ? 'text-red-600' :
                  sim.current_route.riskScore >= 40 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {sim.current_route.riskScore}%
                </p>
              </div>
            </div>
            
            {sim.parameters && (
              <div className="mt-2 flex flex-wrap gap-1">
                {sim.parameters.delay > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                    +{sim.parameters.delay}min
                  </span>
                )}
                {sim.parameters.accident && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    🚗 Accident
                  </span>
                )}
                {sim.parameters.roadClosure && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    🚧 Closure
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedSimulationsList;