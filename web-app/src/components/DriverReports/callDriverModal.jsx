import React from 'react';

import {
  MapPin,
  Phone,
  Truck,
  User,
  X
} from 'lucide-react';

const CallDriverModal = ({
  driver,
  onClose
}) => {
  if (!driver) {
    return null;
  }

  const handleCall = () => {
    window.location.href = `tel:${driver.phone}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Contact Driver
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Confirm that you want to call this driver.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

        </div>

        {/* Driver Information */}
        <div className="p-5">

          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
                <User className="w-5 h-5 text-red-600" />
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  {driver.driver}
                </p>

                <p className="text-sm text-red-600">
                  {driver.title}
                </p>
              </div>

            </div>

          </div>

          <div className="space-y-3">

            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-gray-400" />

              <div>
                <p className="text-xs text-gray-500">
                  Vehicle
                </p>

                <p className="text-sm font-medium text-gray-900">
                  {driver.truck}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400" />

              <div>
                <p className="text-xs text-gray-500">
                  Current location
                </p>

                <p className="text-sm font-medium text-gray-900">
                  {driver.location}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mt-4">
              <p className="text-sm text-gray-700">
                {driver.message}
              </p>
            </div>

          </div>

        </div>

        {/* Buttons */}
        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            onClick={handleCall}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Call Driver
          </button>

        </div>

      </div>
    </div>
  );
};

export default CallDriverModal;