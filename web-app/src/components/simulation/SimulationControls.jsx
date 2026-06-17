import React from 'react';
import { Zap } from 'lucide-react';


const SimulationControls = ({ params = { delay: 30, weather: 'moderate', accident: false, roadClosure: false }, setParams, onRunSimulation }) => {
  
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
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h2 className="font-bold text-lg mb-4 text-gray-900">What-If Simulation</h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">
            Delay (minutes): <span className="font-semibold">{params.delay || 0}</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max="120" 
            value={params.delay || 0} 
            onChange={handleDelayChange} 
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>60</span>
            <span>120</span>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium block mb-2 text-gray-700">Weather</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm" 
            value={params.weather || 'moderate'} 
            onChange={handleWeatherChange}
          >
            <option value="clear">Clear</option>
            <option value="moderate">Moderate Rain</option>
            <option value="severe">Severe Storm</option>
          </select>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={params.accident || false} 
              onChange={handleAccidentChange} 
            />
            <span className="text-sm text-gray-700">Accident</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={params.roadClosure || false} 
              onChange={handleRoadClosureChange} 
            />
            <span className="text-sm text-gray-700">Road closure</span>
          </label>
        </div>
        
        <button 
          onClick={handleRunSimulation} 
          className="w-full bg-purple-600 text-white py-2 rounded-md font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Run Simulation
        </button>
      </div>
    </div>
  );
};


export default SimulationControls;