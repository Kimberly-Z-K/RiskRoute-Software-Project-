import React from 'react';
import { TrendingDown, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RiskTrends = () => {
  // Last 6 months risk incident data
  const monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Incidents',
        data: [28, 25, 23, 20, 17, 14],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        type: 'line',
        yAxisID: 'y',
      },
      {
        label: 'Risk Score',
        data: [74, 71, 68, 65, 62, 58],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        type: 'line',
        yAxisID: 'y',
      },
      {
        label: 'Response Time (min)',
        data: [45, 42, 38, 35, 32, 28],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        type: 'line',
        yAxisID: 'y1',
      }
    ]
  };

  // Weekly incident data for the current month
  const weeklyData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'This Month',
        data: [5, 4, 3, 2],
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Last Month',
        data: [7, 6, 5, 5],
        backgroundColor: 'rgba(156, 163, 175, 0.5)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 1,
        borderRadius: 6,
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
          boxWidth: 6
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.dataset.label === 'Response Time (min)') {
              label += context.parsed.y + ' minutes';
            } else if (context.dataset.label === 'Risk Score') {
              label += context.parsed.y + '/100';
            } else {
              label += context.parsed.y + ' incidents';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Incidents / Risk Score',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Response Time (minutes)',
          font: { size: 10 }
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Month',
          font: { size: 10 }
        }
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
          boxWidth: 6
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} incidents`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Incidents',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Week',
          font: { size: 10 }
        }
      }
    },
  };

  const calculatePercentageChange = (current, previous) => {
    return ((current - previous) / previous * 100).toFixed(0);
  };

  const currentMonthIncidents = 14;
  const previousMonthIncidents = 23;
  const percentageChange = calculatePercentageChange(currentMonthIncidents, previousMonthIncidents);
  const isImproving = percentageChange < 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <TrendingDown className="w-5 h-5 text-green-500" />
        Risk Trend Analysis
      </h3>
      
      {/* Monthly Trend Chart */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">6-Month Trend Analysis</p>
        <div className="h-48">
          <Line data={monthlyData} options={lineChartOptions} />
        </div>
      </div>
      
      {/* Weekly Comparison Chart */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Weekly Incident Comparison</p>
        <div className="h-40">
          <Bar data={weeklyData} options={barChartOptions} />
        </div>
      </div>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">Current Month</span>
            {isImproving ? (
              <TrendingDown className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingUp className="w-4 h-4 text-red-600" />
            )}
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentMonthIncidents}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">incidents reported</p>
        </div>
        
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">Previous Month</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{previousMonthIncidents}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">incidents reported</p>
        </div>
      </div>
      
      {/* Improvement Indicator */}
      <div className={`p-3 rounded-lg mb-3 ${isImproving ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isImproving ? (
              <TrendingDown className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingUp className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">
              {isImproving ? 'Improvement' : 'Increase'} of {Math.abs(percentageChange)}%
            </span>
          </div>
          <AlertCircle className="w-4 h-4 text-gray-500" />
        </div>
        <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
          {isImproving 
            ? 'Risk incidents have decreased significantly compared to last month' 
            : 'Risk incidents have increased compared to last month'}
        </p>
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <p className="text-gray-600 dark:text-gray-400">Best Week</p>
          <p className="font-bold text-green-600">Week 4</p>
          <p className="text-xs">2 incidents</p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <p className="text-gray-600 dark:text-gray-400">Avg Response</p>
          <p className="font-bold text-blue-600">28 min</p>
          <p className="text-xs">-38% vs last month</p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <p className="text-gray-600 dark:text-gray-400">Safety Rating</p>
          <p className="font-bold text-green-600">B+</p>
          <p className="text-xs">Up from C+</p>
        </div>
      </div>
    </div>
  );
};

export default RiskTrends;