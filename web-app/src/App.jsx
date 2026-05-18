import React, { useState, useEffect } from 'react';
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
  Clock as ClockIcon, Navigation, Shield, Star, Fuel 
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

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [vehicles, setVehicles] = useState(generateFleetVehicles());
  const [stats, setStats] = useState(generateStats(vehicles));
  const [alerts, setAlerts] = useState(generateAlerts());
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState('fastest');
  const [simulationParams, setSimulationParams] = useState({ delay: 30, weather: 'moderate', accident: false, roadClosure: false });
  const [simulationResults, setSimulationResults] = useState(null);
  const updateTick = useRealTimeUpdates(8000);

  useEffect(() => {
    if (updateTick > 0) {
      const newVehicles = generateFleetVehicles();
      setVehicles(newVehicles);
      setStats(generateStats(newVehicles));
      
      if (Math.random() > 0.85) {
        const newAlert = {
          id: Date.now(),
          type: 'Real-time Update',
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          msg: `Live fleet update: ${Math.random() > 0.5 ? 'Traffic pattern changed' : 'Weather alert in sector'}`,
          time: 'just now',
          acknowledged: false
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 15));
      }
    }
  }, [updateTick]);

  const acknowledgeAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const runSimulation = () => {
    const delayImpact = simulationParams.delay;
    const weatherImpact = simulationParams.weather === 'severe' ? 25 : simulationParams.weather === 'moderate' ? 12 : 0;
    const accidentImpact = simulationParams.accident ? 35 : 0;
    const roadClosureImpact = simulationParams.roadClosure ? 28 : 0;
    const totalDelay = delayImpact + weatherImpact + accidentImpact + roadClosureImpact;
    
    setSimulationResults({
      current: {
        time: `+${totalDelay} min (${Math.floor(totalDelay / 60)}h ${totalDelay % 60}min)`,
        cost: `+$${Math.floor(totalDelay * 3.5 + 50)}`,
        riskScore: Math.min(95, 45 + Math.floor(totalDelay / 3)),
        alternative: simulationParams.accident ? 'Take I-495 detour - saves 22 min' : 'Consider alternate route via BQE'
      },
      optimal: {
        time: simulationParams.accident ? '+8 min' : '+15 min',
        cost: `+$${Math.floor(simulationParams.delay * 1.8)}`,
        riskScore: Math.min(70, 28 + Math.floor(simulationParams.delay / 5)),
        alternative: 'Recommended: Safer Northern corridor - avoids incident zone'
      }
    });
  };

  const statsCards = [
    { title: 'Active Vehicles', value: stats.totalActive, icon: Truck, color: 'bg-blue-500', trend: '+2 vs yesterday', subtitle: '24/7 operational' },
    { title: 'On Time', value: stats.onTime, icon: CheckCircle, color: 'bg-green-500', trend: '78% on-time rate', subtitle: `${Math.round((stats.onTime/stats.totalActive)*100)}% of fleet` },
    { title: 'Delayed', value: stats.delayed, icon: Clock, color: 'bg-yellow-500', trend: '-3 from peak', subtitle: 'Action needed' },
    { title: 'At Risk', value: stats.atRisk, icon: AlertTriangle, color: 'bg-red-500', trend: 'Needs attention', subtitle: 'High priority' },
    { title: 'Deliveries', value: stats.completedToday, icon: Activity, color: 'bg-purple-500', trend: 'on target', subtitle: 'Today\'s progress' },
    { title: 'Active Alerts', value: stats.activeAlerts, icon: Bell, color: 'bg-orange-500', trend: '2 critical', subtitle: 'Requires review' },
  ];

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
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <Header activeTab={activeTab} navItems={navItems} />
            
            {/* Dashboard Screen */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {statsCards.map((stat, idx) => <StatCard key={idx} {...stat} />)}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <LiveFleetMap vehicles={vehicles} onSelectVehicle={setSelectedVehicle} selectedVehicle={selectedVehicle} />
                  <AlertsPanel alerts={alerts} onAcknowledge={acknowledgeAlert} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <QuickActions />
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
                    <h3 className="font-semibold mb-3">Fleet Performance Snapshot</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>On-Time Performance</span><span className="font-bold">{Math.round((stats.onTime/stats.totalActive)*100)}%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${(stats.onTime/stats.totalActive)*100}%` }}></div></div>
                      <div className="flex justify-between text-sm mt-2"><span>Fleet Utilization</span><span className="font-bold">92%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Monitoring Screen */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <VehicleTrackingMap />
                  <VehicleList vehicles={vehicles} onSelectVehicle={setSelectedVehicle} />
                </div>
                <VehicleDetailModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
              </div>
            )}
            
            {/* Route Planning Screen */}
            {activeTab === 'route-planning' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <RouteOptimisationForm onGenerateRoutes={() => {}} />
                  <div className="space-y-2">
                    <h3 className="font-medium mb-2 text-sm">Route Comparison</h3>
                    {Object.entries(routeOptions).map(([id, route]) => (
                      <RouteOptionCard key={id} route={{ id, ...route }} selected={selectedRouteId === id} onSelect={setSelectedRouteId} />
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
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="bg-orange-500 h-2 rounded-full w-[27%]"></div></div>
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
                />
                <SimulationResults results={simulationResults} />
              </div>
            )}
            
            {/* Analytics Screen */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <KPICard label="Avg Delivery Time" value={`${performanceData.avgDeliveryTime} min`} change={-5.2} icon={ClockIcon} color="bg-blue-500" />
                  <KPICard label="Route Efficiency" value={`${performanceData.routeEfficiency}%`} change={4} icon={Navigation} color="bg-green-500" />
                  <KPICard label="Driver Safety Score" value={performanceData.driverSafetyScore} change={2} icon={Shield} color="bg-purple-500" />
                  <KPICard label="Fuel Usage Trend" value={`${performanceData.fuelUsageTrend > 0 ? '+' : ''}${performanceData.fuelUsageTrend}%`} change={performanceData.fuelUsageTrend} icon={Fuel} color="bg-yellow-500" />
                  <KPICard label="Risk Incidents" value={performanceData.riskIncidentFrequency} change={-21} icon={AlertTriangle} color="bg-red-500" />
                  <KPICard label="Customer Satisfaction" value={performanceData.customerSatisfaction} change={0.3} icon={Star} color="bg-pink-500" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PerformanceCharts />
                  <DriverPerformanceTable />
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Delay Analysis & Exportable Reports</h3>
                    <button className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">📊 Export Report</button>
                  </div>
                  <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-sm">[Delay Analysis Chart - Root cause breakdown]</div>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
                    <div><p className="text-gray-500">Traffic</p><p className="font-bold">42%</p></div>
                    <div><p className="text-gray-500">Weather</p><p className="font-bold">23%</p></div>
                    <div><p className="text-gray-500">Route Issues</p><p className="font-bold">18%</p></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;