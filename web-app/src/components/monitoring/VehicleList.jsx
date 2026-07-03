import React, { useEffect, useMemo, useState } from 'react';
import {
  Truck,
  MapPin,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const statusMeta = {
  'on-time': {
    label: 'On time',
    tone: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    icon: CheckCircle,
  },
  delayed: {
    label: 'Delayed',
    tone: 'text-amber-700 bg-amber-50 ring-amber-200',
    icon: AlertCircle,
  },
  'at-risk': {
    label: 'At risk',
    tone: 'text-rose-700 bg-rose-50 ring-rose-200',
    icon: AlertTriangle,
  },
  unknown: {
    label: 'Unknown',
    tone: 'text-slate-600 bg-slate-100 ring-slate-200',
    icon: Truck,
  },
};

const VehicleList = ({ onSelectVehicle }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const loadVehicles = async () => {
      setLoading(true);
      setError('');

      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('vehicle_id, registration_number, status, current_location')
          .order('vehicle_id', { ascending: true });

        if (error) throw error;

        const mapped = (data || []).map((row) => ({
          id: row.vehicle_id,
          registrationNumber: row.registration_number,
          status: row.status || 'unknown',
          currentLocation: row.current_location || 'Unknown location',
        }));

        setVehicles(mapped);
      } catch (err) {
        setError(err.message || 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    loadVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        String(vehicle.id).toLowerCase().includes(q) ||
        (vehicle.registrationNumber || '').toLowerCase().includes(q) ||
        (vehicle.currentLocation || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  const stats = {
    total: vehicles.length,
    onTime: vehicles.filter((v) => v.status === 'on-time').length,
    delayed: vehicles.filter((v) => v.status === 'delayed').length,
    atRisk: vehicles.filter((v) => v.status === 'at-risk').length,
  };

  const filters = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'on-time', label: 'On time', count: stats.onTime },
    { key: 'delayed', label: 'Delayed', count: stats.delayed },
    { key: 'at-risk', label: 'At risk', count: stats.atRisk },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Vehicles
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Active fleet records from Supabase
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {filters.map((item) => (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ring-1 ${
                  statusFilter === item.key
                    ? 'bg-slate-900 text-white ring-slate-900'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`min-w-5 rounded-full px-1.5 py-0.5 text-xs ${
                    statusFilter === item.key ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicles"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
          />
        </div>
      </div>

      <div className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-slate-100" />
            <p className="text-sm">Loading vehicles...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">
            {error}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm">No vehicles found</p>
          </div>
        ) : (
          filteredVehicles.map((vehicle) => {
            const meta = statusMeta[vehicle.status] || statusMeta.unknown;
            const StatusIcon = meta.icon;

            return (
              <button
                key={vehicle.id}
                onClick={() => onSelectVehicle?.(vehicle)}
                className="group w-full text-left px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                        <Truck className="h-4.5 w-4.5 text-slate-600" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">
                            Vehicle {vehicle.id}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ring-1 ${meta.tone}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {vehicle.registrationNumber || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{vehicle.currentLocation}</span>
                    </div>
                  </div>

                  <ChevronRight className="mt-1 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500">
        Showing {filteredVehicles.length} of {vehicles.length} vehicles
      </div>
    </div>
  );
};

export default VehicleList;