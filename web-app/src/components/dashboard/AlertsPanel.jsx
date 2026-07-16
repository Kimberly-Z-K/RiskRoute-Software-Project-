import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Filter, RefreshCw, Clock, MapPin } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const typeMap = {
  1: 'Accident',
  2: 'Fog',
  3: 'Dangerous Conditions',
  4: 'Rain',
  5: 'Ice',
  6: 'Jam',
  7: 'Lane Closed',
  8: 'Road Closed',
  9: 'Road Works',
  10: 'Wind',
  11: 'Flooding',
  14: 'Broken Down Vehicle',
};

const priorityMap = {
  1: 'high',
  2: 'medium',
  3: 'high',
  4: 'medium',
  5: 'medium',
  6: 'medium',
  7: 'high',
  8: 'critical',
  9: 'medium',
  10: 'medium',
  11: 'high',
  14: 'high',
};

const delayTextMap = {
  1: 'Accident reported',
  2: 'Fog affecting visibility',
  3: 'Dangerous conditions',
  4: 'Rain causing slow traffic',
  5: 'Ice on road',
  6: 'Traffic jam',
  7: 'Lane closed',
  8: 'Road closed',
  9: 'Road works in progress',
  10: 'Wind warning',
  11: 'Flooding reported',
  14: 'Broken down vehicle',
};

function formatIncident(incident, index) {
  const iconCategory = incident?.properties?.iconCategory ?? 0;
  const coords = incident?.geometry?.coordinates ?? [];
  const first = coords[0];

  return {
    id: `${iconCategory}-${index}`,
    type: typeMap[iconCategory] || 'Traffic Incident',
    priority: priorityMap[iconCategory] || 'low',
    msg: delayTextMap[iconCategory] || 'Traffic incident reported nearby',
    time: 'Just now',
    acknowledged: false,
    location:
      incident?.locationName ||
      incident?.properties?.locationName ||
      'Nearby',
    delay:
      iconCategory === 8
        ? 'Road closed'
        : iconCategory === 6
        ? 'Traffic jam'
        : 'No delay data',
  };
}

function AlertItem({ alert, onAcknowledge }) {
  const cfg =
    {
      critical: { dot: 'bg-red-500', badge: 'text-red-600 bg-red-50', label: 'Critical' },
      high: { dot: 'bg-orange-400', badge: 'text-orange-600 bg-orange-50', label: 'High' },
      medium: { dot: 'bg-yellow-400', badge: 'text-yellow-600 bg-yellow-50', label: 'Medium' },
      low: { dot: 'bg-blue-400', badge: 'text-blue-600 bg-blue-50', label: 'Low' },
    }[alert.priority] || {
      dot: 'bg-blue-400',
      badge: 'text-blue-600 bg-blue-50',
      label: 'Low',
    };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 items-start">
      <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">{alert.type}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-gray-400 ml-auto">{alert.time}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 leading-snug">{alert.msg}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{alert.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{alert.delay}</span>
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
}

export default function AlertsPanel({ onAcknowledge }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(null);

  const bbox = '28.0,-26.3,28.1,-26.2';

  const loadTrafficAlerts = async () => {
    setLoading(true);
    setError('');

    try {
      const url = `${API_BASE_URL}/api/traffic/incidents?bbox=${encodeURIComponent(bbox)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();

      if (response.status === 404) {
        throw new Error(`404: route not found at ${url}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      if (!contentType.includes('application/json')) {
        throw new Error(`Expected JSON but got ${contentType}: ${body.slice(0, 200)}`);
      }

      const result = JSON.parse(body);
      const incidents = result?.data?.incidents || [];
      setAlerts(incidents.map(formatIncident));
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrafficAlerts();
    const interval = setInterval(loadTrafficAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = (alertId) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)));
    onAcknowledge?.(alertId);
  };

  const unreadCount = useMemo(() => alerts.filter((a) => !a.acknowledged).length, [alerts]);

  return (
    <div className="bg-[#EEF2F7] rounded-2xl overflow-hidden flex flex-col h-[500px]">
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
            onClick={loadTrafficAlerts}
            className="p-1.5 hover:bg-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <Filter className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-2 pb-3">
        {loading && (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Loading alerts...
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex items-center justify-center text-sm text-red-500 text-center px-4">
            {error}
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-400 gap-2">
            <div>No live traffic alerts found</div>
          </div>
        )}

        {!loading && !error && alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
        ))}
      </div>

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
}