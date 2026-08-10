import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from './components/Login'; // Make sure this path is correct
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import StatCard from './components/dashboard/StatCard';
import LiveFleetMap from './components/dashboard/LiveFleetMap';
import AlertsPanel from './components/dashboard/AlertsPanel';
import QuickActions from './components/dashboard/QuickActions';
import VehicleTrackingMap from './components/monitoring/VehicleTrackingMap';
import VehicleList from './components/monitoring/VehicleList';
import VehicleDetailModal from './components/monitoring/VehicleDetailModal';
import RouteOptimisationForm from './components/route-planning/RouteOptimisationForm';
import RouteOptionCard from './components/route-planning/RouteOptionCard';
import TrafficWeatherPanel from './components/route-planning/TrafficWeatherPanel';
import RiskAnalysisPanel from './components/route-planning/RiskAnalysisPanel';
import RiskScoreCard from './components/risk-analysis/RiskScoreCard';
import RiskHeatmap from './components/risk-analysis/RiskHeatmap';
import RiskTrends from './components/risk-analysis/RiskTrends';
import SimulationControls from './components/simulation/SimulationControls';
import SimulationResults from './components/simulation/SimulationResults';
import KPICard from './components/analytics/KPICard';
import PerformanceCharts from './components/analytics/PerformanceCharts';
import DriverPerformanceTable from './components/analytics/DriverPerformanceTable';
import { generateFleetVehicles, generateStats, generateAlerts, routeOptions, performanceData } from './data/mockData';
import { useRealTimeUpdates } from './hooks/useRealTimeUpdates';
import { 
  Truck, CheckCircle, Clock, AlertTriangle, Activity, Bell, 
  Clock as ClockIcon, Navigation, Shield, Star, Fuel, Pause, Play, BarChart3, FileText, MapPin, Lightbulb
} from 'lucide-react';
import './styles/globals.css';
import { useRoutes } from '../src/hooks/useRoutes';
import { supabase } from './components/supabaseClientforLogin'; // Import Supabase client

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
  { id: 'route-planning', label: 'Route Planning', icon: Activity },
  { id: 'risk-analysis', label: 'Risk Analysis', icon: Activity },
  { id: 'simulation', label: 'What-If Simulation', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: Activity },
];

// Helper function to update vehicle position smoothly
const updateVehiclePosition = (position) => {
  if (!position) return { lat: 40.7128, lng: -74.0060 };
  return {
    lat: position.lat + (Math.random() - 0.5) * 0.002,
    lng: position.lng + (Math.random() - 0.5) * 0.002
  };
};

// Helper function to update vehicle status
const updateVehicleStatus = (currentStatus) => {
  const statuses = ['active', 'idle', 'delayed', 'maintenance'];
  const random = Math.random();
  
  if (random > 0.95) {
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return newStatus === currentStatus ? 'active' : newStatus;
  }
  return currentStatus || 'active';
};

// Helper function to update vehicle speed
const updateVehicleSpeed = (currentSpeed) => {
  const change = (Math.random() - 0.5) * 15;
  return Math.max(0, Math.min(120, (currentSpeed || 60) + change));
};

// Helper function to update driver score
const updateDriverScore = (currentScore) => {
  const change = (Math.random() - 0.5) * 5;
  return Math.max(60, Math.min(100, (currentScore || 85) + change));
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    onTime: 0,
    delayed: 0,
    atRisk: 0,
    completedToday: 0,
    activeAlerts: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState('fastest');
  const [simulationParams, setSimulationParams] = useState({ delay: 30, weather: 'moderate', accident: false, roadClosure: false });
  const [simulationResults, setSimulationResults] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // ============ ADDED: Authentication State ============
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const { updateSignal, isActive: isRealTimeActive, setIsActive: setIsRealTimeActive } = useRealTimeUpdates(8000);
  const { routes, loading: routesLoading, error: routesError } = useRoutes(); 

  // ============ ADDED: Check if user is already logged in ============
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // ============ ADDED: Handle login ============
  // ============ ADDED: Handle login ============
const handleLogin = (userData) => {
  setIsAuthenticated(true);
  localStorage.setItem('token', 'authenticated');
  localStorage.setItem('user', JSON.stringify(userData));
  console.log('✅ User logged in:', userData);
};

  // ============ ADDED: Handle logout ============
  const handleLogout = () => {
  setIsAuthenticated(false);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('👋 User logged out');
};

  // Initialize data only once
  useEffect(() => {
    if (!isInitialized) {
      const initialVehicles = generateFleetVehicles();
      setVehicles(initialVehicles);
      setStats(generateStats(initialVehicles));
      setAlerts(generateAlerts());
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Incremental update effect - NO MORE FULL RELOAD
  useEffect(() => {
    if (updateSignal > 0 && isRealTimeActive && isInitialized && vehicles.length > 0) {
      setVehicles(prevVehicles => {
        if (!prevVehicles || prevVehicles.length === 0) return prevVehicles;
        
        return prevVehicles.map(vehicle => {
          if (!vehicle) return vehicle;
          return {
            ...vehicle,
            position: updateVehiclePosition(vehicle.position),
            status: updateVehicleStatus(vehicle.status),
            speed: updateVehicleSpeed(vehicle.speed),
            driverScore: updateDriverScore(vehicle.driverScore),
            lastUpdate: new Date().toLocaleTimeString()
          };
        });
      });
    }
  }, [updateSignal, isRealTimeActive, isInitialized, vehicles.length]);

  // Update stats based on new vehicle data
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      const newStats = generateStats(vehicles);
      setStats(newStats);
    }
  }, [vehicles]);

  // Generate occasional alerts (reduced frequency)
  useEffect(() => {
    if (updateSignal > 0 && isRealTimeActive && isInitialized && Math.random() > 0.92) {
      const alertTypes = ['Traffic', 'Weather', 'Accident', 'Delay', 'Maintenance'];
      const priorities = ['low', 'medium', 'high'];
      const newAlert = {
        id: Date.now(),
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        msg: `Real-time update: ${alertTypes[Math.floor(Math.random() * alertTypes.length)]} alert in sector ${Math.floor(Math.random() * 10) + 1}`,
        time: 'just now',
        acknowledged: false
      };
      setAlerts(prev => prev ? [newAlert, ...prev].slice(0, 15) : [newAlert]);
    }
  }, [updateSignal, isRealTimeActive, isInitialized]);

  const acknowledgeAlert = useCallback((id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);

  const runSimulation = useCallback(() => {
  // Check if routes are loaded
  if (routes.length === 0) {
    alert('Please wait for routes to load from the database');
    return;
  }

  const delayImpact = simulationParams.delay;
  const weatherImpact = simulationParams.weather === 'severe' ? 25 : simulationParams.weather === 'moderate' ? 12 : 0;
  const accidentImpact = simulationParams.accident ? 35 : 0;
  const roadClosureImpact = simulationParams.roadClosure ? 28 : 0;
  const totalDelay = delayImpact + weatherImpact + accidentImpact + roadClosureImpact;
  
  // Get the current route (first route or selected route)
  const currentRoute = routes[0];
  // Find an alternative route (could be the second route or any other)
  const alternativeRoute = routes.find(r => r.id !== currentRoute?.id);
  
  // Calculate base values from route data or use defaults
  const baseTime = currentRoute?.estimated_time || currentRoute?.duration || 30;
  const baseCost = currentRoute?.estimated_cost || currentRoute?.cost || 10;
  
  // Calculate impact on time based on parameters
  const timeMultiplier = 1 + (delayImpact / 60) + (weatherImpact / 100) + (accidentImpact / 100) + (roadClosureImpact / 100);
  const newTime = Math.round(baseTime * timeMultiplier);
  
  // Calculate cost impact
  const costMultiplier = 1 + (delayImpact / 120) + (weatherImpact / 150);
  const newCost = Math.round((baseCost * costMultiplier) * 100) / 100;
  
  // Calculate risk score
  let riskScore = 0;
  if (simulationParams.weather === 'severe') riskScore += 30;
  if (simulationParams.weather === 'moderate') riskScore += 15;
  if (simulationParams.accident) riskScore += 25;
  if (simulationParams.roadClosure) riskScore += 20;
  riskScore += Math.min(delayImpact / 2, 25);
  riskScore = Math.min(riskScore, 95);
  
  // Calculate optimal route values (assuming 20-30% improvement)
  const optimalTime = Math.round(newTime * 0.7);
  const optimalCost = Math.round((newCost * 0.75) * 100) / 100;
  const optimalRisk = Math.min(Math.round(riskScore * 0.5), 70);
  
  setSimulationResults({
    current: {
      time: `${newTime} min (${Math.floor(newTime / 60)}h ${newTime % 60}min)`,
      cost: `R${newCost.toFixed(2)}`,
      riskScore: riskScore,
      alternative: simulationParams.accident 
        ? `Take ${alternativeRoute?.name || 'alternative route'} - saves ${Math.round(newTime - optimalTime)} min` 
        : `Consider alternate route via ${alternativeRoute?.name || 'BQE'}`
    },
    optimal: {
      time: `${optimalTime} min`,
      cost: `R${optimalCost.toFixed(2)}`,
      riskScore: optimalRisk,
      alternative: `Recommended: ${alternativeRoute?.name || 'Safer Northern corridor'} - avoids incident zone`
    }
  });
}, [simulationParams, routes]);

// In your App.js, update the statsCards array:

const statsCards = [
  { 
    title: 'Active Vehicles', 
    value: stats.totalActive, 
    icon: Truck, 
    color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    trend: '+2 vs yesterday',
    subtitle: '24/7 operational',
    change: '+4.2%',
    changeType: 'up'
  },
  { 
    title: 'On Time', 
    value: stats.onTime, 
    icon: CheckCircle, 
    color: 'bg-gradient-to-br from-green-500 to-green-600',
    trend: '78% on-time rate',
    subtitle: `${Math.round((stats.onTime/stats.totalActive)*100)}% of fleet`,
    change: '+5.1%',
    changeType: 'up'
  },
  { 
    title: 'Delayed', 
    value: stats.delayed, 
    icon: Clock, 
    color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    trend: '-3 from peak',
    subtitle: 'Action needed',
    change: '-2.3%',
    changeType: 'down'
  },
  { 
    title: 'At Risk', 
    value: stats.atRisk, 
    icon: AlertTriangle, 
    color: 'bg-gradient-to-br from-red-500 to-red-600',
    trend: 'Needs attention',
    subtitle: 'High priority',
    change: '+8.5%',
    changeType: 'up'
  },
  { 
    title: 'Deliveries', 
    value: stats.completedToday, 
    icon: Activity, 
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    trend: 'on target',
    subtitle: 'Today\'s progress',
    change: '+12%',
    changeType: 'up'
  },
  { 
    title: 'Active Alerts', 
    value: stats.activeAlerts, 
    icon: Bell, 
    color: 'bg-gradient-to-br from-orange-500 to-orange-600',
    trend: '2 critical',
    subtitle: 'Requires review',
    change: '-15%',
    changeType: 'down'
  },
];

  // Don't render until initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  // ============ MOVED: Dashboard Content into a variable ============
  const DashboardContent = () => (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onLogout={handleLogout} // Pass logout to sidebar
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <Header activeTab={activeTab} navItems={navItems} />
            
            {/* Real-time Status Indicator */}
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setIsRealTimeActive(!isRealTimeActive)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isRealTimeActive 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {isRealTimeActive ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <Play size={14} />
                    Live Updates On
                  </>
                ) : (
                  <>
                    <Pause size={14} />
                    Live Updates Paused
                  </>
                )}
              </button>
            </div>
            
            {/* Dashboard Screen */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {statsCards.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                  ))}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <LiveFleetMap 
                    vehicles={vehicles || []} 
                    onSelectVehicle={setSelectedVehicle} 
                    selectedVehicle={selectedVehicle} 
                  />
                  <AlertsPanel 
                    alerts={alerts || []} 
                    onAcknowledge={acknowledgeAlert} 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <QuickActions />
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
                    <h3 className="font-semibold mb-3">Fleet Performance Snapshot</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>On-Time Performance</span>
                        <span className="font-bold">
                          {stats.totalActive > 0 ? Math.round((stats.onTime / stats.totalActive) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${stats.totalActive > 0 ? (stats.onTime / stats.totalActive) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span>Fleet Utilization</span>
                        <span className="font-bold">92%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Monitoring Screen */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <VehicleTrackingMap vehicles={vehicles || []} />
                  <VehicleList 
                    vehicles={vehicles || []} 
                    onSelectVehicle={setSelectedVehicle} 
                  />
                </div>
                {selectedVehicle && (
                  <VehicleDetailModal 
                    vehicle={selectedVehicle} 
                    onClose={() => setSelectedVehicle(null)} 
                  />
                )}
              </div>
            )}
            
            {/* Route Planning Screen */}
            {activeTab === 'route-planning' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <RouteOptimisationForm onGenerateRoutes={() => {}} />
                  <div className="space-y-2">
                    <h3 className="font-medium mb-2 text-sm">Route Comparison</h3>
                    {routeOptions && Object.entries(routeOptions).map(([id, route]) => (
                      <RouteOptionCard 
                        key={id} 
                        route={{ id, ...route }} 
                        selected={selectedRouteId === id} 
                        onSelect={setSelectedRouteId} 
                      />
                    ))}
                  </div>
                  <TrafficWeatherPanel />
                </div>
                <RiskAnalysisPanel />
              </div>
            )}
            
            {/* Risk Analysis Screen */}
            {activeTab === 'risk-analysis' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <RiskScoreCard />
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
                    <h3 className="font-semibold mb-2">Theft Probability Index</h3>
                    <p className="text-2xl font-bold text-orange-600">27%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-orange-500 h-2 rounded-full w-[27%]" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Above regional average by 8%</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
                    <h3 className="font-semibold mb-2">Accident-Prone Zones</h3>
                    <p className="text-2xl font-bold text-yellow-600">12</p>
                    <p className="text-sm text-gray-500">Active high-severity zones</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RiskHeatmap />
                  <RiskTrends />
                </div>
              </div>
            )}
            
            {/* Simulation Screen */}
{activeTab === 'simulation' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <SimulationControls 
      params={simulationParams}
      setParams={setSimulationParams}
      onRunSimulation={runSimulation}
      routes={routes}  // Pass routes to the component
      isRoutesLoading={routesLoading}
    />
    <SimulationResults results={simulationResults} />
  </div>
)}
            
            {/* Analytics Screen */}
            {activeTab === 'analytics' && performanceData && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <KPICard 
                    label="Avg Delivery Time" 
                    value={performanceData.avgDeliveryTime || 45} 
                    unit=" min"
                    change={-5.2} 
                    icon={ClockIcon} 
                    color="bg-blue-500"
                    subtitle="Target: 42 min"
                    target="42"
                  />

                  <KPICard 
                    label="Route Efficiency" 
                    value={performanceData.routeEfficiency || 85} 
                    unit="%"
                    change={4} 
                    icon={Navigation} 
                    color="bg-green-500"
                    subtitle="Above industry average"
                    target="90"
                  />

                  <KPICard 
                    label="Driver Safety Score" 
                    value={performanceData.driverSafetyScore || 88} 
                    change={2} 
                    icon={Shield} 
                    color="bg-purple-500"
                    subtitle="Fleet average"
                    target="85"
                  />

                  <KPICard 
                    label="Fuel Usage Trend" 
                    value={Math.abs(performanceData.fuelUsageTrend) || 5} 
                    unit="%"
                    change={performanceData.fuelUsageTrend || 0} 
                    icon={Fuel} 
                    color="bg-yellow-500"
                    subtitle="vs last month"
                  />

                  <KPICard 
                    label="Risk Incidents" 
                    value={performanceData.riskIncidentFrequency || 12} 
                    change={-21} 
                    icon={AlertTriangle} 
                    color="bg-red-500"
                    subtitle="30-day rolling"
                    target="10"
                  />

                  <KPICard 
                    label="Customer Satisfaction" 
                    value={performanceData.customerSatisfaction || 4.2} 
                    change={0.3} 
                    icon={Star} 
                    color="bg-pink-500"
                    subtitle="Out of 5"
                    target="4.5"
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PerformanceCharts />
                  <DriverPerformanceTable />
                </div>
                
<div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 shadow-sm">
  <div className="flex justify-between items-center mb-4">
    <div>
      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        Delay Analysis & Exportable Reports
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Root cause breakdown and performance metrics
      </p>
    </div>
    <button className="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-sm hover:shadow-md">
      <FileText className="w-4 h-4" />
      Export Report
    </button>
  </div>

  {/* Delay Analysis Chart */}
  <div className="mb-4">
    <div className="h-56 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg p-4">
      {/* Donut Chart Visualization */}
      <div className="flex items-center justify-center h-full gap-8 flex-wrap">
        {/* Donut Chart */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Traffic - 42% */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="15" 
              strokeDasharray={`${42 * 2.51} ${100 * 2.51}`} strokeDashoffset="0" 
              transform="rotate(-90 50 50)" />
            {/* Weather - 23% */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="15" 
              strokeDasharray={`${23 * 2.51} ${100 * 2.51}`} strokeDashoffset={`-${42 * 2.51}`} 
              transform="rotate(-90 50 50)" />
            {/* Route Issues - 18% */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="15" 
              strokeDasharray={`${18 * 2.51} ${100 * 2.51}`} strokeDashoffset={`-${(42 + 23) * 2.51}`} 
              transform="rotate(-90 50 50)" />
            {/* Other - 17% */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="15" 
              strokeDasharray={`${17 * 2.51} ${100 * 2.51}`} strokeDashoffset={`-${(42 + 23 + 18) * 2.51}`} 
              transform="rotate(-90 50 50)" />
            <circle cx="50" cy="50" r="25" fill="white" className="dark:fill-gray-800" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">100%</p>
              <p className="text-xs text-gray-500">Total Delays</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Traffic</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">42%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Weather</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">23%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Route Issues</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">18%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Other Factors</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">17%</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* Root Cause Breakdown */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p className="text-xs text-gray-600 dark:text-gray-400">Traffic Delays</p>
      <p className="text-xl font-bold text-red-600">42%</p>
      <div className="w-full bg-red-200 rounded-full h-1 mt-1">
        <div className="bg-red-500 h-1 rounded-full" style={{ width: '42%' }} />
      </div>
      <p className="text-xs text-gray-500 mt-1">+5% vs last month</p>
    </div>
    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
      <p className="text-xs text-gray-600 dark:text-gray-400">Weather Related</p>
      <p className="text-xl font-bold text-orange-600">23%</p>
      <div className="w-full bg-orange-200 rounded-full h-1 mt-1">
        <div className="bg-orange-500 h-1 rounded-full" style={{ width: '23%' }} />
      </div>
      <p className="text-xs text-gray-500 mt-1">-2% vs last month</p>
    </div>
    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
      <p className="text-xs text-gray-600 dark:text-gray-400">Route Issues</p>
      <p className="text-xl font-bold text-purple-600">18%</p>
      <div className="w-full bg-purple-200 rounded-full h-1 mt-1">
        <div className="bg-purple-500 h-1 rounded-full" style={{ width: '18%' }} />
      </div>
      <p className="text-xs text-gray-500 mt-1">-3% vs last month</p>
    </div>
    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
      <p className="text-xs text-gray-600 dark:text-gray-400">Other Factors</p>
      <p className="text-xl font-bold text-green-600">17%</p>
      <div className="w-full bg-green-200 rounded-full h-1 mt-1">
        <div className="bg-green-500 h-1 rounded-full" style={{ width: '17%' }} />
      </div>
      <p className="text-xs text-gray-500 mt-1">+1% vs last month</p>
    </div>
  </div>

  {/* Additional Metrics */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Average Delay per Trip</span>
        <Clock className="w-3 h-3 text-gray-400" />
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">23.5 min</p>
      <p className="text-xs text-green-600">-4.2 min improvement</p>
    </div>
    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Peak Delay Hour</span>
        <AlertTriangle className="w-3 h-3 text-gray-400" />
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">5:00 PM - 7:00 PM</p>
      <p className="text-xs text-gray-500">Evening rush hour</p>
    </div>
    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Most Affected Route</span>
        <MapPin className="w-3 h-3 text-gray-400" />
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">N1 Highway</p>
      <p className="text-xs text-red-600">+38% delay rate</p>
    </div>
  </div>

  {/* Recommendations */}
  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <div className="flex items-start gap-2">
      <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Recommendations</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Based on delay analysis, consider rerouting N1 traffic during peak hours and 
          implementing weather monitoring systems for better route planning.
        </p>
      </div>
    </div>
  </div>
</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );

  // ============ CHANGED: Return with proper routing ============
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route 
          path="/login" 
          element={<Login onLogin={handleLogin} />} 
        />
        
        {/* Protected Routes - Only show if authenticated */}
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <DashboardContent />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;