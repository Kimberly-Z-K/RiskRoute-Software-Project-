import React from 'react';
import { TrendingDown } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const RiskTrends = () => {
  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Incidents',
        data: [28, 25, 23, 20, 17, 14],
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
        data: [74, 71, 68, 65, 62, 58],
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

  const weeklyData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'This Month',
        data: [5, 4, 3, 2],
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Last Month',
        data: [7, 6, 5, 5],
        backgroundColor: '#9CA3AF',
        borderColor: '#9CA3AF',
        borderWidth: 0,
        borderRadius: 4,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
        mode: 'index'
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
  };

  const barChartOptions = {
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
  };

  const currentMonthIncidents = 14;
  const previousMonthIncidents = 23;
  const percentageChange = -39;
  const isImproving = true;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h3 className="font-bold mb-4 text-gray-900">Risk Trend Analysis</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">6-Month Trend</p>
        <div className="h-40">
          <Line data={monthlyData} options={lineChartOptions} />
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Weekly Comparison</p>
        <div className="h-32">
          <Bar data={weeklyData} options={barChartOptions} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Current Month</span>
            <TrendingDown className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">{currentMonthIncidents}</p>
          <p className="text-xs text-gray-600">incidents</p>
        </div>
        
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Previous Month</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{previousMonthIncidents}</p>
          <p className="text-xs text-gray-600">incidents</p>
        </div>
      </div>
      
      <div className={`p-3 rounded-lg mb-3 ${isImproving ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-green-700" />
          <span className="font-medium text-green-700">
            {Math.abs(percentageChange)}% improvement
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Best Week</p>
          <p className="font-bold text-green-700">Week 4</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Avg Response</p>
          <p className="font-bold text-blue-700">28 min</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Safety Rating</p>
          <p className="font-bold text-green-700">B+</p>
        </div>
      </div>
    </div>
  );
};


export default RiskTrends;