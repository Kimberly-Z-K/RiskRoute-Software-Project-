import React from 'react';
import { Zap, Clock, CloudRain, AlertTriangle, MapPin, Play } from 'lucide-react';

const SimulationControls = ({ params = { delay: 30, weather: 'moderate', accident: false, roadClosure: false }, setParams, onRunSimulation }) => {
  
  // Safe handler functions
  const handleDelayChange = (e) => {
    if (setParams) {
      setParams({ ...params, delay: parseInt(e.target.value) || 0 });
    }
  };
  
  const handleWeatherChange = (e) => {
    if (setParams) {
      setParams({ ...params, weather: e.target.value });
    }
  };
  
  const handleAccidentChange = (e) => {
    if (setParams) {
      setParams({ ...params, accident: e.target.checked });
    }
  };
  
  const handleRoadClosureChange = (e) => {
    if (setParams) {
      setParams({ ...params, roadClosure: e.target.checked });
    }
  };
  
  const handleRunSimulation = () => {
    if (onRunSimulation) {
      onRunSimulation();
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-purple-600" /> 
        What-If Scenario Controls
      </h2>
      
      <div className="space-y-4">
        {/* Delay Slider */}
        <div>
          <label className="text-sm font-medium block mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Delay (minutes): {params.delay || 0} min
          </label>
          <input 
            type="range" 
            min="0" 
            max="120" 
            value={params.delay || 0} 
            onChange={handleDelayChange} 
            className="w-full"
          />
          <div className="flex justify-between text-xs mt-1">
            <span>0 min</span>
            <span>60 min</span>
            <span>120 min</span>
          </div>
        </div>
        
        {/* Weather Selection */}
        <div>
          <label className="text-sm font-medium block mb-2 flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-500" />
            Weather Severity
          </label>
          <select 
            className="w-full p-2 border rounded-lg dark:bg-gray-700" 
            value={params.weather || 'moderate'} 
            onChange={handleWeatherChange}
          >
            <option value="clear">Clear / Sunny</option>
            <option value="moderate">Moderate Rain / Wind</option>
            <option value="severe">Severe Storm / Heavy Rain</option>
          </select>
        </div>
        
        {/* Checkboxes */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={params.accident || false} 
              onChange={handleAccidentChange} 
            />
            <span className="text-sm flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Accident on route
            </span>
          </label>
          
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={params.roadClosure || false} 
              onChange={handleRoadClosureChange} 
            />
            <span className="text-sm flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Road closure
            </span>
          </label>
        </div>
        
        {/* Run Button */}
        <button 
          onClick={handleRunSimulation} 
          className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          Run Simulation
        </button>
      </div>
    </div>
  );
};

export default SimulationControls;