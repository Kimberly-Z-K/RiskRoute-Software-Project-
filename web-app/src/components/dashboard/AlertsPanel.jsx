import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Filter, 
  AlertTriangle, 
  AlertOctagon, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  MapPin,
  Car,
  AlertCircle,
  X
} from 'lucide-react';

const AlertItem = ({ alert, onAcknowledge }) => {
  const priorityColors = {
    critical: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    high: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    low: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
  };
  
  const priorityIcons = {
    critical: <AlertOctagon className="w-4 h-4 text-red-500" />,
    high: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    medium: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    low: <Bell className="w-4 h-4 text-blue-500" />
  };
  
  return (
    <div className={`p-3 rounded-lg border-l-4 mb-2 transition-all hover:shadow-sm ${priorityColors[alert.priority]}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {priorityIcons[alert.priority]}
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{alert.type}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</span>
            {alert.priority === 'critical' && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">CRITICAL</span>
            )}
          </div>
          <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">{alert.msg}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{alert.distance || "0km"} ahead</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{alert.delay || "No delay"}</span>
            </div>
          </div>
        </div>
        {!alert.acknowledged && (
          <button 
            onClick={() => onAcknowledge(alert.id)} 
            className="ml-2 px-2 py-1 text-xs bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
          >
            Acknowledge
          </button>
        )}
      </div>
    </div>
  );
};

const AlertsPanel = ({ alerts: propAlerts, onAcknowledge }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  
  // Default alerts that will ALWAYS show
  const DEFAULT_ALERTS = [
    {
      id: 1,
      type: "Accident",
      priority: "high",
      msg: "Multi-vehicle accident reported on N3 highway near Harrismith",
      time: "5 min ago",
      acknowledged: false,
      distance: "85km",
      delay: "35 min delay"
    },
    {
      id: 2,
      type: "Road Works",
      priority: "medium",
      msg: "Road maintenance with lane closures near Ladysmith",
      time: "12 min ago",
      acknowledged: false,
      distance: "156km",
      delay: "15 min delay"
    },
    {
      id: 3,
      type: "Congestion",
      priority: "medium",
      msg: "Heavy traffic due to peak hour in Pietermaritzburg",
      time: "22 min ago",
      acknowledged: false,
      distance: "42km",
      delay: "20 min delay"
    },
    {
      id: 4,
      type: "Weather Hazard",
      priority: "high",
      msg: "Heavy rain and reduced visibility on the route",
      time: "8 min ago",
      acknowledged: false,
      distance: "210km",
      delay: "10 min delay"
    },
    {
      id: 5,
      type: "Accident",
      priority: "critical",
      msg: "Serious collision blocking two lanes near Durban",
      time: "2 min ago",
      acknowledged: false,
      distance: "15km",
      delay: "45 min delay"
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setAlerts(DEFAULT_ALERTS);
      setLastFetch(new Date());
      setLoading(false);
    }, 500);
  }, []);

  const handleAcknowledge = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    if (onAcknowledge) {
      onAcknowledge(alertId);
    }
  };

  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" /> Real-time Alerts
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading alerts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" /> Real-time Alerts
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setAlerts(DEFAULT_ALERTS);
                setLastFetch(new Date());
                setLoading(false);
              }, 500);
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.map(alert => (
          <AlertItem 
            key={alert.id} 
            alert={alert} 
            onAcknowledge={handleAcknowledge}
          />
        ))}
      </div>
      
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>Live traffic monitoring</span>
          </div>
          {lastFetch && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Updated: {lastFetch.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;