import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Filter, 
  AlertTriangle, 
  AlertOctagon, 
  RefreshCw, 
  Clock, 
  MapPin,
} from 'lucide-react';

const AlertItem = ({ alert, onAcknowledge }) => {
  const priorityConfig = {
    critical: {
      dot: 'bg-red-500',
      badge: 'text-red-600 bg-red-50',
      badgeLabel: 'Critical',
    },
    high: {
      dot: 'bg-orange-400',
      badge: 'text-orange-600 bg-orange-50',
      badgeLabel: 'High',
    },
    medium: {
      dot: 'bg-yellow-400',
      badge: 'text-yellow-600 bg-yellow-50',
      badgeLabel: 'Medium',
    },
    low: {
      dot: 'bg-blue-400',
      badge: 'text-blue-600 bg-blue-50',
      badgeLabel: 'Low',
    },
  };

  const config = priorityConfig[alert.priority];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 items-start">
      {/* Colored dot indicator */}
      <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">{alert.type}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
            {config.badgeLabel}
          </span>
          <span className="text-xs text-gray-400 ml-auto">{alert.time}</span>
        </div>

        <p className="text-sm text-gray-500 mt-1 leading-snug">{alert.msg}</p>

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{alert.distance || '0km'} ahead</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{alert.delay || 'No delay'}</span>
          </div>
        </div>
      </div>

      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="flex-shrink-0 text-xs text-blue-500 font-semibold hover:text-blue-600 transition-colors mt-0.5"
        >
          Acknowledge
        </button>
      )}
    </div>
  );
};

const AlertsPanel = ({ alerts: propAlerts, onAcknowledge }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  const DEFAULT_ALERTS = [
    {
      id: 1,
      type: 'Accident',
      priority: 'high',
      msg: 'Multi-vehicle accident reported on N3 highway near Harrismith',
      time: '5 min ago',
      acknowledged: false,
      distance: '85km',
      delay: '35 min delay',
    },
    {
      id: 2,
      type: 'Road Works',
      priority: 'medium',
      msg: 'Road maintenance with lane closures near Ladysmith',
      time: '12 min ago',
      acknowledged: false,
      distance: '156km',
      delay: '15 min delay',
    },
    {
      id: 3,
      type: 'Congestion',
      priority: 'medium',
      msg: 'Heavy traffic due to peak hour in Pietermaritzburg',
      time: '22 min ago',
      acknowledged: false,
      distance: '42km',
      delay: '20 min delay',
    },
    {
      id: 4,
      type: 'Weather Hazard',
      priority: 'high',
      msg: 'Heavy rain and reduced visibility on the route',
      time: '8 min ago',
      acknowledged: false,
      distance: '210km',
      delay: '10 min delay',
    },
    {
      id: 5,
      type: 'Accident',
      priority: 'critical',
      msg: 'Serious collision blocking two lanes near Durban',
      time: '2 min ago',
      acknowledged: false,
      distance: '15km',
      delay: '45 min delay',
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setAlerts(DEFAULT_ALERTS);
      setLastFetch(new Date());
      setLoading(false);
    }, 500);
  }, []);

  const handleAcknowledge = (alertId) => {
    setAlerts(prev =>
      prev.map(alert => alert.id === alertId ? { ...alert, acknowledged: true } : alert)
    );
    if (onAcknowledge) onAcknowledge(alertId);
  };

  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  if (loading) {
    return (
      <div className="bg-[#EEF2F7] rounded-2xl overflow-hidden flex flex-col h-[500px]">
        <div className="px-4 pt-4 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Real-time Alerts
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading alerts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#EEF2F7] rounded-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header — section label style */}
      <div className="px-4 pt-4 pb-3 flex justify-between items-center">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Real-time Alerts
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold normal-case tracking-normal">
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setAlerts(DEFAULT_ALERTS);
                setLastFetch(new Date());
                setLoading(false);
              }, 500);
            }}
            className="p-1.5 hover:bg-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <Filter className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-2 pb-3">
        {alerts.map(alert => (
          <AlertItem key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-400">
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