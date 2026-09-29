import React, { useEffect, useState } from 'react';
import {
  Fuel,
  User,
  Truck,
  Navigation,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle
} from 'lucide-react';

import { supabase } from '../../lib/supabase';

const FuelAllocation = () => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    driver_id: '',
    vehicle_id: '',
    route_id: '',
    allocated_amount: '',
    allocation_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // --------------------------------------------------
  // LOAD ALL DATA
  // --------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        driversResult,
        vehiclesResult,
        routesResult,
        allocationsResult
      ] = await Promise.all([
        supabase
          .from('drivers')
          .select('driver_id, driver_username, phone, email')
          .order('driver_username', { ascending: true }),

        supabase
          .from('vehicles')
          .select(
            'vehicle_id, registration_number, status, current_location, driver_id, route_id'
          )
          .order('registration_number', { ascending: true }),

        supabase
          .from('optimized_routes')
          .select('id, start_point, stops, created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('fuel_allocations')
          .select(`
            id,
            driver_id,
            vehicle_id,
            route_id,
            allocated_amount,
            amount_used,
            remaining_amount,
            status,
            allocation_date,
            notes,
            created_at
          `)
          .order('created_at', { ascending: false })
      ]);

      if (driversResult.error) {
        throw driversResult.error;
      }

      if (vehiclesResult.error) {
        throw vehiclesResult.error;
      }

      if (routesResult.error) {
        throw routesResult.error;
      }

      if (allocationsResult.error) {
        throw allocationsResult.error;
      }

      setDrivers(driversResult.data || []);
      setVehicles(vehiclesResult.data || []);
      setRoutes(routesResult.data || []);
      setAllocations(allocationsResult.data || []);
    } catch (err) {
      console.error('Error loading fuel allocation data:', err);
      setError(err.message || 'Failed to load fuel allocation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --------------------------------------------------
  // FORM HANDLING
  // --------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setMessage('');
    setError('');

    // Reset vehicle when driver changes
    if (name === 'driver_id') {
      setFormData((previous) => ({
        ...previous,
        driver_id: value,
        vehicle_id: ''
      }));
    }
  };

  // --------------------------------------------------
  // FILTER VEHICLES BY SELECTED DRIVER
  // --------------------------------------------------
  const availableVehicles = formData.driver_id
    ? vehicles.filter(
        (vehicle) => vehicle.driver_id === formData.driver_id
      )
    : vehicles;

  // --------------------------------------------------
  // SAVE ALLOCATION
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!formData.driver_id) {
      setError('Please select a driver.');
      return;
    }

    if (!formData.allocated_amount) {
      setError('Please enter a fuel allocation amount.');
      return;
    }

    const amount = Number(formData.allocated_amount);

    if (amount <= 0) {
      setError('Fuel allocation must be greater than R0.');
      return;
    }

    try {
      setSaving(true);

      const { error: insertError } = await supabase
        .from('fuel_allocations')
        .insert([
          {
            driver_id: formData.driver_id,
            vehicle_id: formData.vehicle_id || null,
            route_id: formData.route_id
              ? Number(formData.route_id)
              : null,
            allocated_amount: amount,
            amount_used: 0,
            allocation_date: formData.allocation_date,
            notes: formData.notes.trim() || null,
            status: 'Active'
          }
        ]);

      if (insertError) {
        throw insertError;
      }

      setMessage('Fuel allocation created successfully.');

      setFormData({
        driver_id: '',
        vehicle_id: '',
        route_id: '',
        allocated_amount: '',
        allocation_date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      await loadData();
    } catch (err) {
      console.error('Error creating fuel allocation:', err);
      setError(err.message || 'Failed to create fuel allocation.');
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------
  const getDriverName = (driverId) => {
    const driver = drivers.find(
      (item) => item.driver_id === driverId
    );

    return driver?.driver_username || 'Unknown Driver';
  };

  const getVehicleRegistration = (vehicleId) => {
    if (!vehicleId) {
      return 'No vehicle';
    }

    const vehicle = vehicles.find(
      (item) => item.vehicle_id === vehicleId
    );

    return vehicle?.registration_number || 'Unknown Vehicle';
  };

  const getRouteName = (routeId) => {
    if (!routeId) {
      return 'No route';
    }

    const route = routes.find(
      (item) => Number(item.id) === Number(routeId)
    );

    if (!route) {
      return `Route #${routeId}`;
    }

    return route.start_point
      ? `Route #${route.id} - ${route.start_point}`
      : `Route #${route.id}`;
  };

  const getStatusIcon = (status) => {
    if (status === 'Active') {
      return <CheckCircle size={16} />;
    }

    if (status === 'Completed') {
      return <Clock size={16} />;
    }

    return <XCircle size={16} />;
  };

  const getStatusClass = (status) => {
    if (status === 'Active') {
      return 'bg-green-100 text-green-700';
    }

    if (status === 'Completed') {
      return 'bg-blue-100 text-blue-700';
    }

    return 'bg-red-100 text-red-700';
  };

  const formatCurrency = (amount) => {
    return `R ${Number(amount || 0).toFixed(2)}`;
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="animate-spin" size={22} />
          <span>Loading fuel allocation data...</span>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <Fuel className="text-green-600" size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Fuel Allocation
              </h1>

              <p className="text-sm text-gray-500">
                Allocate and monitor fuel budgets for your drivers
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* MESSAGES */}
      {message && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
          <CheckCircle size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* CREATE ALLOCATION */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Plus size={20} className="text-green-600" />

            <h2 className="text-lg font-semibold text-gray-900">
              Create Fuel Allocation
            </h2>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            Assign a fuel budget to a specific driver.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* DRIVER */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={16} />
                Driver
              </label>

              <select
                name="driver_id"
                value={formData.driver_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select driver</option>

                {drivers.map((driver) => (
                  <option
                    key={driver.driver_id}
                    value={driver.driver_id}
                  >
                    {driver.driver_username}
                  </option>
                ))}
              </select>
            </div>

            {/* VEHICLE */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Truck size={16} />
                Vehicle
              </label>

              <select
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleChange}
                disabled={!formData.driver_id}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {formData.driver_id
                    ? 'Select vehicle'
                    : 'Select driver first'}
                </option>

                {availableVehicles.map((vehicle) => (
                  <option
                    key={vehicle.vehicle_id}
                    value={vehicle.vehicle_id}
                  >
                    {vehicle.registration_number}
                    {vehicle.status
                      ? ` - ${vehicle.status}`
                      : ''}
                  </option>
                ))}
              </select>

              {formData.driver_id &&
                availableVehicles.length === 0 && (
                  <p className="text-xs text-orange-600 mt-2">
                    No vehicle is currently assigned to this driver.
                  </p>
                )}
            </div>

            {/* ROUTE */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Navigation size={16} />
                Route
              </label>

              <select
                name="route_id"
                value={formData.route_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">No route selected</option>

                {routes.map((route) => (
                  <option
                    key={route.id}
                    value={route.id}
                  >
                    {route.start_point
                      ? `Route #${route.id} - ${route.start_point}`
                      : `Route #${route.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* AMOUNT */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign size={16} />
                Fuel Budget
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  R
                </span>

                <input
                  type="number"
                  name="allocated_amount"
                  value={formData.allocated_amount}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* DATE */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} />
                Allocation Date
              </label>

              <input
                type="date"
                name="allocation_date"
                value={formData.allocation_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* NOTES */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} />
                Notes
              </label>

              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional notes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* SUBMIT */}
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Fuel size={18} />
                  Allocate Fuel
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ALLOCATION HISTORY */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Fuel Allocation History
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            View fuel budgets assigned to drivers.
          </p>
        </div>

        {allocations.length === 0 ? (
          <div className="p-10 text-center">
            <Fuel
              size={40}
              className="mx-auto text-gray-300 mb-3"
            />

            <p className="text-gray-500">
              No fuel allocations have been created yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Driver
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Vehicle
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Route
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Allocated
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Used
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Remaining
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Date
                  </th>

                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {allocations.map((allocation) => (
                  <tr
                    key={allocation.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                          <User
                            size={17}
                            className="text-green-600"
                          />
                        </div>

                        <span className="font-medium text-gray-900">
                          {getDriverName(
                            allocation.driver_id
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      {getVehicleRegistration(
                        allocation.vehicle_id
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      {getRouteName(allocation.route_id)}
                    </td>

                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(
                        allocation.allocated_amount
                      )}
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      {formatCurrency(
                        allocation.amount_used
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(
                          allocation.remaining_amount
                        )}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {allocation.allocation_date}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(
                          allocation.status
                        )}`}
                      >
                        {getStatusIcon(
                          allocation.status
                        )}

                        {allocation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelAllocation;