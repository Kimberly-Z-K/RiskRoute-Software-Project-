import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from './components/Login';
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
import KPICard from './components/analytics/KPICard';
import PerformanceCharts from './components/analytics/PerformanceCharts';
import DriverPerformanceTable from './components/analytics/DriverPerformanceTable';
import { generateFleetVehicles, generateStats, generateAlerts, routeOptions, performanceData } from './data/mockData';
import { useRealTimeUpdates } from './hooks/useRealTimeUpdates';
import { useRoutes } from './hooks/useRoutes';
import { 
  Truck, CheckCircle, Clock, AlertTriangle, Activity, Bell, 
  Clock as ClockIcon, Navigation, Shield, Star, Fuel, Pause, Play, 
  BarChart3, FileText, MapPin, Lightbulb
} from 'lucide-react';
import './styles/globals.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
  { id: 'route-planning', label: 'Route Planning', icon: Activity },
  { id: 'risk-analysis', label: 'Risk Analysis', icon: Activity },
  { id: 'simulation', label: 'What-If Simulation', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: Activity },
];

// Helper functions
const updateVehiclePosition = (position) => {
  if (!position) return { lat: 40.7128, lng: -74.0060 };
  return {
    lat: position.lat + (Math.random() - 0.5) * 0.002,
    lng: position.lng + (Math.random() - 0.5) * 0.002
  };
};

const updateVehicleStatus = (currentStatus) => {
  const statuses = ['active', 'idle', 'delayed', 'maintenance'];
  if (Math.random() > 0.95) {
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return newStatus === currentStatus ? 'active' : newStatus;
  }
  return currentStatus || 'active';
};

const updateVehicleSpeed = (currentSpeed) => {
  const change = (Math.random() - 0.5) * 15;
  return Math.max(0, Math.min(120, (currentSpeed || 60) + change));
};

const updateDriverScore = (currentScore) => {
  const change = (Math.random() - 0.5) * 5;
  return Math.max(60, Math.min(100, (currentScore || 85) + change));
};

// 🔥 MOVED OUTSIDE: DashboardContent as a separate component
const DashboardContent = React.memo(({ 
  darkMode, 
  sidebarOpen, 
  setSidebarOpen, 
  activeTab, 
  setActiveTab, 
  setDarkMode, 
  handleLogout,
  vehicles,
  stats,
  alerts,
  selectedVehicle,
  setSelectedVehicle,
  selectedRouteId,
  setSelectedRouteId,
  simulationParams,
  setSimulationParams,
  routes,
  routesLoading,
  isRealTimeActive,
  setIsRealTimeActive,
  runSimulation,
  acknowledgeAlert,
  statsCards
}) => {
  console.log('📋 DashboardContent rendering');

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <Header activeTab={activeTab} navItems={navItems} />
            
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
            
            {/* Dashboard */}
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
            
            {/* Monitoring */}
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
            
            {/* Route Planning */}
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
            
            {/* Risk Analysis */}
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
            
            {/* Simulation */}
            {activeTab === 'simulation' && (
              <div className="w-full">
                <SimulationControls 
                  params={simulationParams}
                  setParams={setSimulationParams}
                  onRunSimulation={runSimulation}
                  routes={routes}
                  isRoutesLoading={routesLoading}
                />
              </div>
            )}
            
            {/* Analytics */}
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
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.vehicles === nextProps.vehicles &&
    prevProps.stats === nextProps.stats &&
    prevProps.alerts === nextProps.alerts &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.isRealTimeActive === nextProps.isRealTimeActive
  );
});

function App() {
  console.log('🔄 App rendering');

  // State
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
  const [simulationParams, setSimulationParams] = useState({ 
    delay: 30, 
    weather: 'moderate', 
    accident: false, 
    roadClosure: false 
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Hooks
  const { updateSignal, isActive: isRealTimeActive, setIsActive: setIsRealTimeActive } = useRealTimeUpdates(8000);
  const { routes, loading: routesLoading, error: routesError } = useRoutes();

  // 🔥 CRITICAL FIX: Use refs to prevent infinite loops
  const updateCounter = useRef(0);
  const prevVehiclesRef = useRef([]);
  const isInitializedRef = useRef(false);
  const mountedRef = useRef(false);
  const statsUpdateTimeout = useRef(null);

  // Check authentication - runs once
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    mountedRef.current = true;
  }, []);

  // Handle login/logout - stable references
  const handleLogin = useCallback((userData) => {
    setIsAuthenticated(true);
    localStorage.setItem('token', 'authenticated');
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // 🔥 FIX: Initialize data - runs only once
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('🚀 Initializing fleet data...');
      const initialVehicles = generateFleetVehicles();
      setVehicles(initialVehicles);
      setStats(generateStats(initialVehicles));
      setAlerts(generateAlerts());
      setIsInitialized(true);
      isInitializedRef.current = true;
    }
  }, []);

  // 🔥 FIX: Update vehicles - ONLY when updateSignal changes, with strict equality check
  useEffect(() => {
    // Skip if not ready
    if (!isInitialized || !isRealTimeActive || updateSignal === 0) {
      return;
    }

    // 🔥 CRITICAL: Prevent processing the same signal twice
    if (updateCounter.current === updateSignal) {
      console.log('⏭️ Skipping duplicate signal:', updateSignal);
      return;
    }
    updateCounter.current = updateSignal;

    console.log('📡 Updating vehicles (signal:', updateSignal, ')');

    // Update vehicles
    setVehicles(prevVehicles => {
      if (!prevVehicles || prevVehicles.length === 0) {
        return prevVehicles;
      }
      
      const updated = prevVehicles.map(vehicle => ({
        ...vehicle,
        position: updateVehiclePosition(vehicle.position),
        status: updateVehicleStatus(vehicle.status),
        speed: updateVehicleSpeed(vehicle.speed),
        driverScore: updateDriverScore(vehicle.driverScore),
        lastUpdate: new Date().toLocaleTimeString()
      }));
      
      return updated;
    });
  }, [updateSignal, isRealTimeActive, isInitialized]);

  // 🔥 FIX: Update stats with debouncing and deep comparison
  useEffect(() => {
    if (!isInitialized || vehicles.length === 0) {
      return;
    }

    // Clear any pending update
    if (statsUpdateTimeout.current) {
      clearTimeout(statsUpdateTimeout.current);
    }

    statsUpdateTimeout.current = setTimeout(() => {
      // 🔥 Deep comparison: check if vehicles array content actually changed
      const currentIds = vehicles.map(v => v.id).join(',');
      const prevIds = prevVehiclesRef.current.map(v => v.id).join(',');
      
      if (currentIds !== prevIds) {
        console.log('📊 Updating stats...');
        const newStats = generateStats(vehicles);
        setStats(newStats);
        prevVehiclesRef.current = vehicles;
      } else {
        console.log('⏭️ Skipping stats update - no vehicle changes');
      }
    }, 200);
  }, [vehicles, isInitialized]);

  // 🔥 FIX: Generate alerts with throttling - only once every 10 signals
  useEffect(() => {
    if (!isInitialized || !isRealTimeActive || updateSignal === 0) {
      return;
    }

    // Only generate alerts on every 5th update
    if (updateSignal % 5 !== 0) {
      return;
    }

    if (Math.random() > 0.3) {
      return;
    }

    const alertTypes = ['Traffic', 'Weather', 'Accident', 'Delay', 'Maintenance'];
    const priorities = ['low', 'medium', 'high'];
    
    const newAlert = {
      id: Date.now() + Math.random(),
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      msg: `Alert: ${alertTypes[Math.floor(Math.random() * alertTypes.length)]} in sector ${Math.floor(Math.random() * 10) + 1}`,
      time: 'just now',
      acknowledged: false
    };
    
    setAlerts(prev => {
      const updated = [newAlert, ...prev].slice(0, 15);
      return updated;
    });
  }, [updateSignal, isRealTimeActive, isInitialized]);

  const acknowledgeAlert = useCallback((id) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, acknowledged: true } : a
    ));
  }, []);

  // 🔥 FIX: Memoize simulation function with useMemo to prevent recreation
  const runSimulation = useCallback(() => {
    if (routes.length === 0) {
      alert('Please wait for routes to load from the database');
      return;
    }

    const delayImpact = simulationParams.delay;
    const weatherImpact = simulationParams.weather === 'severe' ? 25 : 
                          simulationParams.weather === 'moderate' ? 12 : 0;
    const accidentImpact = simulationParams.accident ? 35 : 0;
    const roadClosureImpact = simulationParams.roadClosure ? 28 : 0;
    
    const currentRoute = routes[0];
    const alternativeRoute = routes.find(r => r.id !== currentRoute?.id);
    
    const baseTime = currentRoute?.estimated_time || 30;
    const baseCost = currentRoute?.estimated_cost || 10;
    
    const timeMultiplier = 1 + (delayImpact / 60) + (weatherImpact / 100) + 
                          (accidentImpact / 100) + (roadClosureImpact / 100);
    const newTime = Math.round(baseTime * timeMultiplier);
    
    const costMultiplier = 1 + (delayImpact / 120) + (weatherImpact / 150);
    const newCost = Math.round((baseCost * costMultiplier) * 100) / 100;
    
    let riskScore = 0;
    if (simulationParams.weather === 'severe') riskScore += 30;
    if (simulationParams.weather === 'moderate') riskScore += 15;
    if (simulationParams.accident) riskScore += 25;
    if (simulationParams.roadClosure) riskScore += 20;
    riskScore += Math.min(delayImpact / 2, 25);
    riskScore = Math.min(riskScore, 95);
    
    const optimalTime = Math.round(newTime * 0.7);
    const optimalCost = Math.round((newCost * 0.75) * 100) / 100;
    const optimalRisk = Math.min(Math.round(riskScore * 0.5), 70);
    
    // This doesn't trigger a re-render loop since it's a user action
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

  // Stats cards - memoized to prevent recreation
  const statsCards = useMemo(() => [
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
  ], [stats]);

  // Loading screen
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

  // Main render with routing
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <DashboardContent 
                darkMode={darkMode}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setDarkMode={setDarkMode}
                handleLogout={handleLogout}
                vehicles={vehicles}
                stats={stats}
                alerts={alerts}
                selectedVehicle={selectedVehicle}
                setSelectedVehicle={setSelectedVehicle}
                selectedRouteId={selectedRouteId}
                setSelectedRouteId={setSelectedRouteId}
                simulationParams={simulationParams}
                setSimulationParams={setSimulationParams}
                routes={routes}
                routesLoading={routesLoading}
                isRealTimeActive={isRealTimeActive}
                setIsRealTimeActive={setIsRealTimeActive}
                runSimulation={runSimulation}
                acknowledgeAlert={acknowledgeAlert}
                statsCards={statsCards}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;