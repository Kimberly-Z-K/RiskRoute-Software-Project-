import React from 'react';
import { Zap } from 'lucide-react';

const SimulationControls = ({ params, setParams, onRunSimulation }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-purple-600" /> What-If Scenario Controls</h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Delay (minutes)</label>
          <input 
            type="range" 
            min="0" 
            max="120" 
            value={params.delay} 
            onChange={e => setParams({...params, delay: parseInt(e.target.value)})} 
            className="w-full" 
          />
          <div className="flex justify-between text-xs mt-1"><span>0 min</span><span>{params.delay} min</span><span>120 min</span></div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Weather Severity</label>
          <select 
            className="w-full p-2 border rounded-lg dark:bg-gray-700" 
            value={params.weather} 
            onChange={e => setParams({...params, weather: e.target.value})}
          >
            <option value="clear">Clear / Sunny</option>
            <option value="moderate">Moderate Rain / Wind</option>
            <option value="severe">Severe Storm / Heavy Rain</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={params.accident} onChange={e => setParams({...params, accident: e.target.checked})} />
            <span className="text-sm">Accident on route</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={params.roadClosure} onChange={e => setParams({...params, roadClosure: e.target.checked})} />
            <span className="text-sm">Road closure</span>
          </label>
        </div>
        <button onClick={onRunSimulation} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 transition">
          Run Simulation
        </button>
      </div>
    </div>
  );
};

export default SimulationControls;