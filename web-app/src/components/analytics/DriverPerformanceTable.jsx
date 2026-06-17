import React, { useState } from 'react';
import { Users, Star, TrendingUp, TrendingDown, Award, CheckCircle, AlertTriangle, Search, ChevronUp, ChevronDown } from 'lucide-react';


const DriverPerformanceTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

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

  const filteredDrivers = driverPerformanceData.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    if (score >= 90) return 'bg-green-600';
    if (score >= 80) return 'bg-blue-600';
    if (score >= 70) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getScoreText = (score) => {
    if (score >= 90) return 'text-green-700';
    if (score >= 80) return 'text-blue-700';
    if (score >= 70) return 'text-yellow-700';
    return 'text-red-700';
  };

  const summary = {
    totalDrivers: driverPerformanceData.length,
    avgScore: (driverPerformanceData.reduce((sum, d) => sum + d.score, 0) / driverPerformanceData.length).toFixed(1)
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Driver Performance
          </h3>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-gray-100 rounded-md text-center">
              <p className="text-xs text-gray-500">Avg</p>
              <p className="text-lg font-bold text-gray-900">{summary.avgScore}</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
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
          Deliveries
        </div>
        <div className="col-span-2 text-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('rating')}>
          Rating
        </div>
        <div className="col-span-2 text-center">Trend</div>
        <div className="col-span-1 text-center">Issues</div>
      </div>

      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {sortedDrivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No drivers found</p>
          </div>
        ) : (
          sortedDrivers.map((driver, idx) => {
            const scoreColor = getScoreColor(driver.score);
            const scoreText = getScoreText(driver.score);
            return (
              <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50">
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${scoreColor} flex items-center justify-center`}>
                      <span className="text-xs font-bold text-white">
                        {driver.name.split(' ')[0][0]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{driver.name}</p>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${scoreColor} bg-opacity-10`}>
                      <Award className={`w-3 h-3 ${scoreText}`} />
                      <span className={`text-sm font-bold ${scoreText}`}>{driver.score}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className={`${scoreColor} h-1 rounded-full`}
                        style={{ width: `${driver.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">{driver.deliveries}</p>
                    <p className="text-xs text-gray-500">{driver.onTime} on-time</p>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-gray-900">{driver.rating}</span>
                    </div>
                  </div>
                </div>

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

      <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>{sortedDrivers.length} drivers</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};


export default DriverPerformanceTable;