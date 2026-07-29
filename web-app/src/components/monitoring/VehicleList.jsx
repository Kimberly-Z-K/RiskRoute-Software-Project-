import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const pageSize = 3;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const vehiclesRes = await supabase
          .from('vehicles')
          .select('vehicle_id, registration_number, status, current_location, driver_id')
          .order('vehicle_id', { ascending: true });

        const driversRes = await supabase
          .from('drivers')
          .select('driver_id, driver_username')
          .order('driver_username', { ascending: true });

        if (vehiclesRes.error) throw vehiclesRes.error;
        if (driversRes.error) throw driversRes.error;

        setVehicles(
          (vehiclesRes.data || []).map((row) => ({
            id: row.vehicle_id,
            registrationNumber: row.registration_number || '',
            status: row.status || 'unknown',
            currentLocation: row.current_location || 'Unknown location',
            driverId: row.driver_id || '',
          }))
        );

        setDrivers(driversRes.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.toLowerCase();

    return vehicles.filter((vehicle) => {
      const selectedDriver = drivers.find(
        (d) => String(d.driver_id) === String(vehicle.driverId)
      );
      const driverName = selectedDriver?.driver_username || '';

      const matchesSearch =
        String(vehicle.id).toLowerCase().includes(q) ||
        (vehicle.registrationNumber || '').toLowerCase().includes(q) ||
        driverName.toLowerCase().includes(q);

      const assigned = Boolean(vehicle.driverId);
      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'assigned' && assigned) ||
        (statusFilter === 'unassigned' && !assigned);

      return matchesSearch && matchesFilter;
    });
  }, [vehicles, drivers, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const visibleVehicles = filteredVehicles.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const stats = {
    total: vehicles.length,
    assigned: vehicles.filter((v) => v.driverId).length,
    unassigned: vehicles.filter((v) => !v.driverId).length,
  };

  const handleAssignDriver = async (vehicleId, driverId) => {
    const previousVehicle = vehicles.find((v) => v.id === vehicleId);
    const previousDriverId = previousVehicle?.driverId || '';

    setSavingId(vehicleId);
    setError('');

    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, driverId: driverId || '' } : v))
    );

    try {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ driver_id: driverId || null })
        .eq('vehicle_id', vehicleId);

      if (updateError) throw updateError;
    } catch (err) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicleId ? { ...v, driverId: previousDriverId } : v
        )
      );
      setError(err.message || 'Failed to update vehicle');
    } finally {
      setSavingId(null);
    }
  };

  const filters = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'assigned', label: 'Assigned', count: stats.assigned },
    { key: 'unassigned', label: 'Unassigned', count: stats.unassigned },
  ];

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Vehicle Assignments
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Assign a driver to each vehicle
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
                    statusFilter === item.key
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-100 text-slate-500'
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
            placeholder="Search vehicle, registration, or driver"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading vehicles...</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600">{error}</div>
        ) : visibleVehicles.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Truck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm">No vehicles found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vehicle
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Driver
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleVehicles.map((vehicle) => {
                const selectedDriver = drivers.find(
                  (d) => String(d.driver_id) === String(vehicle.driverId)
                );

                return (
                  <tr key={vehicle.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                          <Truck className="h-4.5 w-4.5 text-slate-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            Vehicle {vehicle.registration_number}
                          </div>
                          <div className="text-sm text-slate-500">
                            {vehicle.registrationNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="min-w-[110px] text-sm text-slate-600">
                          {selectedDriver ? selectedDriver.driver_username : 'Unassigned'}
                        </span>

                        <select
                          value={vehicle.driverId || ''}
                          onChange={(e) => handleAssignDriver(vehicle.id, e.target.value)}
                          disabled={savingId === vehicle.id}
                          className="w-full max-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">Unassigned</option>
                          {drivers.map((driver) => (
                            <option key={driver.driver_id} value={driver.driver_id}>
                              {driver.driver_username}
                            </option>
                          ))}
                        </select>

                        {savingId === vehicle.id && (
                          <span className="text-xs text-slate-500">Saving...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing {visibleVehicles.length} of {filteredVehicles.length} vehicles
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={safePage === 1}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
            {safePage} of {totalPages}
          </span>

          <button
            onClick={goNext}
            disabled={safePage === totalPages}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}