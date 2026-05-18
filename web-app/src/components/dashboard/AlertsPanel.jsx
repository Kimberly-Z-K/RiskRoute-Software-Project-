import React from 'react';
import { Bell, Filter, AlertTriangle, AlertOctagon } from 'lucide-react';

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
          <div className="flex items-center gap-2">
            {priorityIcons[alert.priority]}
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{alert.type}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</span>
            {alert.priority === 'critical' && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">CRITICAL</span>}
          </div>
          <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">{alert.msg}</p>
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

const AlertsPanel = ({ alerts, onAcknowledge }) => {
  const unreadCount = alerts.filter(a => !a.acknowledged).length;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" /> Real-time Alerts
          {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
        </h2>
        <button className="p-1 hover:bg-gray-100 rounded"><Filter className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.map(alert => <AlertItem key={alert.id} alert={alert} onAcknowledge={onAcknowledge} />)}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
        <button className="text-xs text-blue-600 hover:underline">View all alerts →</button>
      </div>
    </div>
  );
};

export default AlertsPanel;