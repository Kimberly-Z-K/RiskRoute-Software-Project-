import React, { useState } from 'react';
import { Navigation, MapPin, Building, Warehouse, Factory } from 'lucide-react';

const RouteOptimisationForm = ({ onGenerateRoutes }) => {
  const [origin, setOrigin] = useState('Johannesburg CBD, 1 Simmonds Street, Johannesburg, 2001');
  const [destination, setDestination] = useState('Durban Port, Maydon Wharf, Durban, 4001');
  const [vehicleType, setVehicleType] = useState('truck');
  const [loadWeight, setLoadWeight] = useState('');

  const southAfricanLocations = {
    gauteng: [
      'Johannesburg CBD, 1 Simmonds Street, Johannesburg, 2001',
      'Sandton City, 83 Rivonia Road, Sandton, 2196',
      'Midrand, 1 Old Pretoria Road, Midrand, 1685',
      'Pretoria Central, Church Square, Pretoria, 0002',
      'Centurion, 265 Jean Avenue, Centurion, 0157',
      'Soweto, Vilakazi Street, Orlando West, Soweto, 1804',
      'Randburg, 234 Jan Smuts Avenue, Randburg, 2194',
      'Krugersdorp, 57 Burger Street, Krugersdorp, 1739'
    ],
    westernCape: [
      'Cape Town CBD, 1 Adderley Street, Cape Town, 8001',
      'Stellenbosch, 32 Plein Street, Stellenbosch, 7600',
      'Paarl, 216 Main Street, Paarl, 7646',
      'Somerset West, 1 Main Road, Somerset West, 7130',
      'Table View, 1 Blaauwberg Road, Table View, 7441'
    ],
    kwazuluNatal: [
      'Durban Port, Maydon Wharf, Durban, 4001',
      'Umhlanga Rocks, 1 Lighthouse Road, Umhlanga, 4320',
      'Pietermaritzburg, 351 Church Street, Pietermaritzburg, 3201',
      'Richards Bay, 1 Harbour Road, Richards Bay, 3900'
    ],
    easternCape: [
      'Port Elizabeth, 1 Strand Street, Port Elizabeth, 6001',
      'East London, 1 Oxford Street, East London, 5201',
      'Gqeberha, 102 Cape Road, Gqeberha, 6006'
    ],
    freeState: [
      'Bloemfontein, 2 President Brand Street, Bloemfontein, 9301',
      'Welkom, 45 Stateway, Welkom, 9459'
    ],
    northWest: [
      'Rustenburg, 46 Fatima Bhayat Street, Rustenburg, 0299',
      'Mahikeng, 10 Nelson Mandela Drive, Mahikeng, 2745'
    ],
    limpopo: [
      'Polokwane, 63 Dorp Street, Polokwane, 0699',
      'Tzaneen, 21 Danie Joubert Street, Tzaneen, 0850'
    ],
    mpumalanga: [
      'Nelspruit, 32 Henshall Street, Nelspruit, 1201',
      'Secunda, 6 Horwood Street, Secunda, 2302'
    ],
    northernCape: [
      'Kimberley, 1 Stockdale Street, Kimberley, 8301',
      'Upington, 36 Schroder Street, Upington, 8801'
    ]
  };

  const popularRoutes = [
    { name: 'JHB to Durban (Port Access)', origin: southAfricanLocations.gauteng[0], destination: southAfricanLocations.kwazuluNatal[0] },
    { name: 'Cape Town to PE (Garden Route)', origin: southAfricanLocations.westernCape[0], destination: southAfricanLocations.easternCape[0] },
    { name: 'Pretoria to Nelspruit (Mpumalanga)', origin: southAfricanLocations.gauteng[3], destination: southAfricanLocations.mpumalanga[0] },
    { name: 'Durban to JHB (Logistics Corridor)', origin: southAfricanLocations.kwazuluNatal[0], destination: southAfricanLocations.gauteng[0] },
    { name: 'Bloemfontein to Kimberley (N8 Route)', origin: southAfricanLocations.freeState[0], destination: southAfricanLocations.northernCape[0] },
    { name: 'Polokwane to JHB (N1 Corridor)', origin: southAfricanLocations.limpopo[0], destination: southAfricanLocations.gauteng[0] },
    { name: 'Port Elizabeth to East London (N2 Coastal)', origin: southAfricanLocations.easternCape[0], destination: southAfricanLocations.easternCape[1] },
    { name: 'Rustenburg to JHB (Mining Route)', origin: southAfricanLocations.northWest[0], destination: southAfricanLocations.gauteng[0] }
  ];

  const handleQuickRouteSelect = (route) => {
    setOrigin(route.origin);
    setDestination(route.destination);
  };

  const handleGenerateRoutes = () => {
    if (onGenerateRoutes) {
      onGenerateRoutes({
        origin,
        destination,
        vehicleType,
        loadWeight
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Navigation className="w-5 h-5 text-blue-600" /> 
        Route Optimisation - South Africa
      </h2>
      
      {/* Quick Route Selector */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">
          Popular Routes (South Africa)
        </label>
        <select 
          className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
          onChange={(e) => {
            const selectedRoute = popularRoutes[e.target.value];
            if (selectedRoute) handleQuickRouteSelect(selectedRoute);
          }}
          defaultValue=""
        >
          <option value="" disabled>Select a popular route...</option>
          {popularRoutes.map((route, idx) => (
            <option key={idx} value={idx}>{route.name}</option>
          ))}
        </select>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Origin (South Africa)
          </label>
          <input 
            type="text" 
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Enter origin location in South Africa"
          />
        </div>
        
        <div>
          <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1 flex items-center gap-1">
            <Building className="w-3 h-3" /> Destination (South Africa)
          </label>
          <input 
            type="text" 
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination location in South Africa"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
              Vehicle Type
            </label>
            <select 
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="truck">Truck (Heavy)</option>
              <option value="van">Van (Medium)</option>
              <option value="car">Car (Light)</option>
              <option value="motorcycle">Motorcycle (Courier)</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
              Load Weight (kg)
            </label>
            <input 
              type="number" 
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" 
              value={loadWeight}
              onChange={(e) => setLoadWeight(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        
        <button 
          onClick={handleGenerateRoutes} 
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Generate Routes
        </button>
      </div>
      
      {/* Additional Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-gray-600 dark:text-gray-400">
        <p className="flex items-center gap-1">
          <Warehouse className="w-3 h-3" />
          Major South African logistics corridors: N1 (JHB-CPT), N2 (CT-DBN), N3 (JHB-DBN), N4 (PTA-MPU)
        </p>
      </div>
    </div>
  );
};

export default RouteOptimisationForm;