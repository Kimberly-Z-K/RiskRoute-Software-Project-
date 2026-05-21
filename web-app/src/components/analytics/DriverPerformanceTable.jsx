import React, { useState } from 'react';
import { Users, Star, TrendingUp, TrendingDown, Award, Clock, CheckCircle, AlertTriangle, Search, ChevronUp, ChevronDown } from 'lucide-react';

const DriverPerformanceTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

  // Sample driver performance data if not provided
  const driverPerformanceData = [
    { name: 'Thabo Nkosi', score: 94, deliveries: 156, onTime: 148, rating: 4.8, trend: '+5%', incidents: 2 },
    { name: 'Sarah van der Merwe', score: 88, deliveries: 142, onTime: 125, rating: 4.5, trend: '+3%', incidents: 3 },
    { name: 'David Naidoo', score: 76, deliveries: 128, onTime: 97, rating: 4.1, trend: '-2%', incidents: 7 },
    { name: 'Lisa Patel', score: 92, deliveries: 149, onTime: 137, rating: 4.7, trend: '+4%', incidents: 2 },
    { name: 'James Botha', score: 81, deliveries: 135, onTime: 109, rating: 4.3, trend: '+1%', incidents: 5 },
    { name: 'Robert Dlamini', score: 69, deliveries: 118, onTime: 81, rating: 3.8, trend: '-5%', incidents: 9 },
    { name: 'Emma Khumalo', score: 95, deliveries: 162, onTime: 154, rating: 4.9, trend: '+6%', incidents: 1 },
    { name: 'Chris Pretorius', score: 84, deliveries: 138, onTime: 116, rating: 4.4, trend: '+2%', incidents: 4 }
  ];

  // Filter drivers based on search
  const filteredDrivers = driverPerformanceData.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort drivers
  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'score') comparison = a.score - b.score;
    if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
    if (sortBy === 'deliveries') comparison = a.deliveries - b.deliveries;
    if (sortBy === 'rating') comparison = a.rating - b.rating;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-100 dark:bg-green-900/30' };
    if (score >= 80) return { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100 dark:bg-blue-900/30' };
    if (score >= 70) return { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100 dark:bg-red-900/30' };
  };

  const getRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];
    for (let i = 0; i < fullStars; i++) stars.push('★');
    if (hasHalfStar) stars.push('½');
    return stars.join('');
  };

  // Calculate summary statistics
  const summary = {
    totalDrivers: driverPerformanceData.length,
    avgScore: (driverPerformanceData.reduce((sum, d) => sum + d.score, 0) / driverPerformanceData.length).toFixed(1),
    topPerformer: driverPerformanceData.reduce((best, current) => current.score > best.score ? current : best),
    totalDeliveries: driverPerformanceData.reduce((sum, d) => sum + d.deliveries, 0)
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Driver Performance Analysis
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Real-time driver metrics and performance tracking</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-sm text-center">
              <p className="text-xs text-gray-500">Avg Score</p>
              <p className="text-lg font-bold text-blue-600">{summary.avgScore}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-sm text-center">
              <p className="text-xs text-gray-500">Top Driver</p>
              <p className="text-sm font-bold text-green-600">{summary.topPerformer.name.split(' ')[0]}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
        <div className="col-span-3 cursor-pointer hover:text-gray-900" onClick={() => handleSort('name')}>
          <div className="flex items-center gap-1">
            Driver
            {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </div>
        </div>
        <div className="col-span-2 text-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('score')}>
          <div className="flex items-center justify-center gap-1">
            Score
            {sortBy === 'score' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </div>
        </div>
        <div className="col-span-2 text-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('deliveries')}>
          <div className="flex items-center justify-center gap-1">
            Deliveries
            {sortBy === 'deliveries' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </div>
        </div>
        <div className="col-span-2 text-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('rating')}>
          <div className="flex items-center justify-center gap-1">
            Rating
            {sortBy === 'rating' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
          </div>
        </div>
        <div className="col-span-2 text-center">Trend</div>
        <div className="col-span-1 text-center">Issues</div>
      </div>

      {/* Driver List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
        {sortedDrivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No drivers found</p>
          </div>
        ) : (
          sortedDrivers.map((driver, idx) => {
            const scoreStyle = getScoreColor(driver.score);
            return (
              <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                {/* Driver Name */}
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${scoreStyle.light} flex items-center justify-center`}>
                      <span className={`text-xs font-bold ${scoreStyle.text}`}>
                        {driver.name.split(' ')[0][0]}{driver.name.split(' ')[1][0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{driver.name}</p>
                      <p className="text-xs text-gray-500">{driver.deliveries} total trips</p>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-2">
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${scoreStyle.light}`}>
                      <Award className={`w-3 h-3 ${scoreStyle.text}`} />
                      <span className={`text-sm font-bold ${scoreStyle.text}`}>{driver.score}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className={`${scoreStyle.bg} h-1 rounded-full transition-all duration-500`}
                        style={{ width: `${driver.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Deliveries */}
                <div className="col-span-2">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{driver.deliveries}</p>
                    <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle className="w-2 h-2" />
                      {driver.onTime} on-time
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="col-span-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{driver.rating}</span>
                    </div>
                    <p className="text-xs text-gray-500">{getRatingStars(driver.rating)}</p>
                  </div>
                </div>

                {/* Trend */}
                <div className="col-span-2">
                  <div className="text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      driver.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {driver.trend.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {driver.trend}
                    </span>
                  </div>
                </div>

                {/* Issues */}
                <div className="col-span-1">
                  <div className="text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      driver.incidents === 0 ? 'text-green-600' : driver.incidents <= 3 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      {driver.incidents}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 text-center">
        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
          <span>Showing {sortedDrivers.length} of {driverPerformanceData.length} drivers</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default DriverPerformanceTable;