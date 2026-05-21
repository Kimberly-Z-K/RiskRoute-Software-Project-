import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Truck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const PerformanceCharts = () => {
  // Sample data for charts
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
    totalDeliveries: 2847,
    customerRating: 4.2
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Delivery Performance Trends
        </h3>
        <div className="flex gap-2">
          <button className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
            Weekly
          </button>
          <button className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg">
            Monthly
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium">{stats.onTimeRate}%</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">On-Time Rate</p>
        </div>
        
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">{stats.avgDeliveryTime} min</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Avg Delivery</p>
        </div>
        
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <Truck className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">{stats.totalDeliveries}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Deliveries</p>
        </div>
        
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            {stats.delayTrend < 0 ? (
              <TrendingDown className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingUp className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-xs font-medium ${stats.delayTrend < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(stats.delayTrend)}%
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Delay Trend</p>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Weekly Performance</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded"></div>
              On-Time
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded"></div>
              Delayed
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          {weeklyPerformance.map((day) => (
            <div key={day.day} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">{day.day}</span>
                <div className="flex gap-2">
                  <span className="text-green-600">{day.onTime}%</span>
                  <span className="text-red-600">{day.delayed}%</span>
                </div>
              </div>
              <div className="flex w-full h-6 rounded-lg overflow-hidden shadow-sm">
                <div 
                  className="bg-green-500 h-full transition-all duration-500 flex items-center justify-center text-xs text-white"
                  style={{ width: `${day.onTime}%` }}
                >
                  {day.onTime > 15 && `${day.onTime}%`}
                </div>
                <div 
                  className="bg-red-500 h-full transition-all duration-500 flex items-center justify-center text-xs text-white"
                  style={{ width: `${day.delayed}%` }}
                >
                  {day.delayed > 15 && `${day.delayed}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Line Chart Trend */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">30-Day Trend</span>
          <span className="text-xs text-green-600 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Improving
          </span>
        </div>
        <div className="relative h-16">
          <div className="absolute inset-0 flex items-end gap-1">
            {[65, 68, 72, 70, 74, 78, 75, 80, 82, 78, 85, 88, 86, 90, 92, 89, 93, 95, 94, 96].map((value, i) => (
              <div 
                key={i}
                className="flex-1 bg-gradient-to-t from-blue-400 to-blue-600 rounded-t hover:from-blue-500 hover:to-blue-700 transition-all cursor-pointer"
                style={{ height: `${value * 0.6}%` }}
                title={`Week ${i + 1}: ${value}% on-time`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Week 4</span>
        </div>
      </div>

      {/* Key Insights */}
      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Insights</p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Best Performing Day</span>
            <span className="font-medium text-green-600">Sunday (90% on-time)</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Needs Improvement</span>
            <span className="font-medium text-red-600">Friday (75% on-time)</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Overall Trend</span>
            <span className="font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12% improvement over 30 days
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;