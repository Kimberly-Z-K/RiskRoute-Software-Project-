import React from 'react';
import { Shield, AlertTriangle, TrendingDown, FileText, MapPin } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const RiskAnalysisPanel = () => {
  const incidentData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Incidents',
        data: [28, 24, 21, 18],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Risk Score',
        data: [72, 69, 65, 62],
        borderColor: '#1E5EFF',
        backgroundColor: 'rgba(30, 94, 255, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#1E5EFF',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
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
          font: { size: 11 },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const riskZones = [
    { name: 'Downtown Theft Hotspot', probability: 32, severity: 'High', trend: '+5%' },
    { name: 'Industrial Accident Zone', probability: 28, severity: 'Medium', trend: '-3%' },
    { name: 'Weather Impact Area', probability: 24, severity: 'Medium', trend: '+8%' },
    { name: 'Road Construction Zone', probability: 18, severity: 'Low', trend: '-12%' }
  ];

  const getSeverityColor = (severity) => {
    if (severity === 'High') return 'bg-red-100 text-red-700';
    if (severity === 'Medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getProbabilityColor = (prob) => {
    if (prob > 30) return 'bg-red-500';
    if (prob > 20) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h2 className="font-bold mb-4 text-gray-900">Route Risk Analysis</h2>
      
      <div className="space-y-4">
        {/* Risk Score */}
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-gray-900">Risk Score</span>
            <span className="text-red-700 font-semibold">68/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full w-[68%]"></div>
          </div>
          <p className="text-xs mt-2 text-gray-600">Medium-High risk</p>
        </div>
        
        {/* Risk Zones */}
        <div>
          <p className="font-medium mb-3 text-gray-900">High-Risk Zones</p>
          <div className="space-y-2">
            {riskZones.map((zone, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-900">{zone.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-md ${getSeverityColor(zone.severity)}`}>
                    {zone.severity}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">{zone.probability}% probability</span>
                  <span className={zone.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'}>
                    {zone.trend}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${getProbabilityColor(zone.probability)}`}
                    style={{ width: `${zone.probability}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Chart */}
        <div>
          <p className="font-medium mb-2 text-gray-900">30-Day Trend</p>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="h-40">
              <Line data={incidentData} options={chartOptions} />
            </div>
          </div>
          <p className="mt-2 text-sm text-green-600">↓ Incidents decreased 15%</p>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">Safety Rating</p>
            <p className="font-bold text-blue-600 text-lg">B+</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">Improvement</p>
            <p className="font-bold text-green-600 text-lg">+15%</p>
          </div>
        </div>
        
        {/* Report Button */}
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium">
          <FileText className="w-4 h-4" />
          View Detailed Report
        </button>
      </div>
    </div>
  );
};


export default RiskAnalysisPanel;