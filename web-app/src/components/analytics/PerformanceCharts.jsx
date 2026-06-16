import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';


const PerformanceCharts = () => {
  const weeklyPerformance = [
    { day: 'Mon', onTime: 82, delayed: 18 },
    { day: 'Tue', onTime: 78, delayed: 22 },
    { day: 'Wed', onTime: 85, delayed: 15 },
    { day: 'Thu', onTime: 80, delayed: 20 },
    { day: 'Fri', onTime: 75, delayed: 25 },
    { day: 'Sat', onTime: 88, delayed: 12 },
    { day: 'Sun', onTime: 90, delayed: 10 }
  ];

  const stats = {
    onTimeRate: 78,
    delayTrend: -12,
    avgDeliveryTime: 45,
    totalDeliveries: 2847
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Delivery Performance
        </h3>
        <div className="flex gap-1">
          <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md">Weekly</button>
          <button className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">Monthly</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-green-50 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">On-Time</span>
            <span className="text-xs font-bold text-green-700">{stats.onTimeRate}%</span>
          </div>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Avg Time</span>
            <span className="text-xs font-bold text-blue-700">{stats.avgDeliveryTime}m</span>
          </div>
        </div>
        
        <div className="p-3 bg-purple-50 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Deliveries</span>
            <span className="text-xs font-bold text-purple-700">{stats.totalDeliveries}</span>
          </div>
        </div>
        
        <div className="p-3 bg-orange-50 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Delay Trend</span>
            <span className={`text-xs font-bold ${stats.delayTrend < 0 ? 'text-green-700' : 'text-red-700'}`}>
              {Math.abs(stats.delayTrend)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">Weekly Performance</p>
        <div className="space-y-2">
          {weeklyPerformance.map((day) => (
            <div key={day.day} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-700">{day.day}</span>
                <div className="flex gap-2">
                  <span className="text-green-700">{day.onTime}%</span>
                  <span className="text-red-700">{day.delayed}%</span>
                </div>
              </div>
              <div className="flex w-full h-5 rounded overflow-hidden">
                <div 
                  className="bg-green-600 h-full"
                  style={{ width: `${day.onTime}%` }}
                />
                <div 
                  className="bg-red-600 h-full"
                  style={{ width: `${day.delayed}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-700">30-Day Trend</span>
          <span className="text-xs text-green-700 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Improving
          </span>
        </div>
        <div className="relative h-14 flex items-end gap-1">
          {[65, 68, 72, 70, 74, 78, 75, 80, 82, 78, 85, 88, 86, 90, 92, 89, 93, 95, 94, 96].map((value, i) => (
            <div 
              key={i}
              className="flex-1 bg-blue-600 rounded"
              style={{ height: `${value * 0.6}%` }}
            />
          ))}
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-md">
        <p className="text-xs font-semibold text-gray-900 mb-2">Insights</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Best Day</span>
            <span className="font-medium text-green-700">Sunday (90%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Needs Improvement</span>
            <span className="font-medium text-red-700">Friday (75%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Trend</span>
            <span className="font-medium text-green-700 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


export default PerformanceCharts;