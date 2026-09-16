import React, { useEffect, useState } from 'react';
import {
  Activity,
  LogIn,
  LogOut,
  Eye,
  Play,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const MyActivity = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchMyActivity();
  }, [user?.id]);

  const fetchMyActivity = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', Number(user.id))
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load activity:', err);
      setError('Unable to load your activity.');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN':
        return <LogIn className="w-4 h-4" />;
      case 'LOGOUT':
        return <LogOut className="w-4 h-4" />;
      case 'PAGE_VIEW':
        return <Eye className="w-4 h-4" />;
      case 'SIMULATION_RUN':
        return <Play className="w-4 h-4" />;
      case 'ALERT_ACKNOWLEDGED':
        return <AlertTriangle className="w-4 h-4" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4" />;
      case 'CREATE':
        return <Plus className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';

    return new Date(date).toLocaleString('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Activity
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review activity associated with your account.
          </p>
        </div>
        <button
          onClick={fetchMyActivity}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Refresh activity"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-6">
        {loading && (
          <div className="flex justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-10">
            <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-700 dark:text-gray-300">
              No activity recorded yet.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Your RiskRoute activity will appear here.
            </p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {log.action?.replace(/_/g, ' ') || 'Activity'}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.created_at || log.details?.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {log.description || 'Activity recorded in RiskRoute.'}
                  </p>
                  {log.page && (
                    <p className="text-xs text-gray-400 mt-2">
                      Page: {log.page}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyActivity;