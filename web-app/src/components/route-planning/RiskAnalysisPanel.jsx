import React, { useEffect, useRef } from 'react';
import { Shield, AlertTriangle, TrendingDown, FileText, MapPin, Activity } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RiskAnalysisPanel = () => {
  // Historical incident data for the last 30 days
  const incidentData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Incident Frequency',
        data: [28, 24, 21, 18],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Risk Score Trend',
        data: [72, 69, 65, 62],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 11
          },
          usePointStyle: true,
          boxWidth: 6
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.dataset.label === 'Incident Frequency') {
              label += context.parsed.y + ' incidents';
            } else {
              label += context.parsed.y + '/100';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        title: {
          display: true,
          text: 'Count / Risk Score',
          font: {
            size: 10
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Time Period',
          font: {
            size: 10
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Additional risk zones data
  const riskZones = [
    { name: 'Downtown Theft Hotspot', probability: 32, severity: 'High', trend: '+5%' },
    { name: 'Industrial Accident Zone', probability: 28, severity: 'Medium', trend: '-3%' },
    { name: 'Weather Impact Area', probability: 24, severity: 'Medium', trend: '+8%' },
    { name: 'Road Construction Zone', probability: 18, severity: 'Low', trend: '-12%' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Shield className="w-5 h-5 text-red-500" /> 
        Route Risk Analysis
      </h2>
      
      <div className="space-y-4">
        {/* Risk Score Section */}
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="font-bold">Route Risk Score: 68/100 (Medium-High)</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-red-500 h-2 rounded-full w-[68%]"></div>
          </div>
          <p className="text-xs mt-2 text-gray-600">
            Based on historical incidents, weather, and traffic patterns
          </p>
        </div>
        
        {/* Risk Zones Section with enhanced display */}
        <div>
          <p className="font-medium mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            High-Risk Zones on Route:
          </p>
          <div className="space-y-2">
            {riskZones.map((zone, idx) => (
              <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    {zone.name}
                  </span>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      zone.severity === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      zone.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {zone.severity}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-red-600">Risk prob: {zone.probability}%</span>
                  <span className={zone.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'}>
                    {zone.trend} trend
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div 
                    className={`h-1 rounded-full ${
                      zone.probability > 30 ? 'bg-red-500' : 
                      zone.probability > 20 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${zone.probability}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Historical Trends Section with real chart */}
        <div>
          <p className="font-medium mb-2 flex items-center gap-1">
            <TrendingDown className="w-4 h-4 text-green-500" />
            Historical Incident Trends (Last 30 days)
          </p>
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded p-3">
            <div className="h-48">
              <Line data={incidentData} options={chartOptions} />
            </div>
            <div className="mt-2 text-center text-xs text-green-600 dark:text-green-400">
              ↓ Incident frequency decreased by 15% over the last 30 days
            </div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-center">
            <p className="text-gray-600 dark:text-gray-400">Safety Rating</p>
            <p className="font-bold text-blue-600">B+</p>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
            <p className="text-gray-600 dark:text-gray-400">Improvement</p>
            <p className="font-bold text-green-600">+15%</p>
          </div>
        </div>
        
        {/* Report Button */}
        <button className="w-full border border-blue-600 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" />
          View Detailed Risk Report
        </button>
      </div>
    </div>
  );
};

export default RiskAnalysisPanel;