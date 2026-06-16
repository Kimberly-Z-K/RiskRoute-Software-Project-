import React, { useState } from 'react';
import { Navigation, MapPin } from 'lucide-react';


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
    ],
    westernCape: [
      'Cape Town CBD, 1 Adderley Street, Cape Town, 8001',
      'Stellenbosch, 32 Plein Street, Stellenbosch, 7600',
      'Paarl, 216 Main Street, Paarl, 7646',
      'Somerset West, 1 Main Road, Somerset West, 7130',
    ],
    kwazuluNatal: [
      'Durban Port, Maydon Wharf, Durban, 4001',
      'Umhlanga Rocks, 1 Lighthouse Road, Umhlanga, 4320',
      'Pietermaritzburg, 351 Church Street, Pietermaritzburg, 3201',
    ],
    easternCape: [
      'Port Elizabeth, 1 Strand Street, Port Elizabeth, 6001',
      'East London, 1 Oxford Street, East London, 5201',
    ],
    freeState: [
      'Bloemfontein, 2 President Brand Street, Bloemfontein, 9301',
      'Welkom, 45 Stateway, Welkom, 9459',
    ],
    northWest: [
      'Rustenburg, 46 Fatima Bhayat Street, Rustenburg, 0299',
      'Mahikeng, 10 Nelson Mandela Drive, Mahikeng, 2745',
    ],
    limpopo: [
      'Polokwane, 63 Dorp Street, Polokwane, 0699',
      'Tzaneen, 21 Danie Joubert Street, Tzaneen, 0850',
    ],
    mpumalanga: [
      'Nelspruit, 32 Henshall Street, Nelspruit, 1201',
      'Secunda, 6 Horwood Street, Secunda, 2302',
    ],
    northernCape: [
      'Kimberley, 1 Stockdale Street, Kimberley, 8301',
      'Upington, 36 Schroder Street, Upington, 8801',
    ]
  };

  const popularRoutes = [
    { name: 'JHB → Durban', origin: southAfricanLocations.gauteng[0], destination: southAfricanLocations.kwazuluNatal[0] },
    { name: 'Cape Town → PE', origin: southAfricanLocations.westernCape[0], destination: southAfricanLocations.easternCape[0] },
    { name: 'Pretoria → Nelspruit', origin: southAfricanLocations.gauteng[3], destination: southAfricanLocations.mpumalanga[0] },
    { name: 'Durban → JHB', origin: southAfricanLocations.kwazuluNatal[0], destination: southAfricanLocations.gauteng[0] },
    { name: 'Bloemfontein → Kimberley', origin: southAfricanLocations.freeState[0], destination: southAfricanLocations.northernCape[0] },
    { name: 'Polokwane → JHB', origin: southAfricanLocations.limpopo[0], destination: southAfricanLocations.gauteng[0] },
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
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h2 className="font-bold text-lg mb-4 text-gray-900">Route Optimisation</h2>
      
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Popular Routes</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            onChange={(e) => {
              const selectedRoute = popularRoutes[e.target.value];
              if (selectedRoute) handleQuickRouteSelect(selectedRoute);
            }}
            defaultValue=""
          >
            <option value="" disabled>Select a route...</option>
            {popularRoutes.map((route, idx) => (
              <option key={idx} value={idx}>{route.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-sm text-gray-600 block mb-1">
            <MapPin className="w-3 h-3 inline mr-1" /> Origin
          </label>
          <input 
            type="text" 
            className="w-full p-2 border border-gray-300 rounded-md text-sm" 
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Enter origin"
          />
        </div>
        
        <div>
          <label className="text-sm text-gray-600 block mb-1">Destination</label>
          <input 
            type="text" 
            className="w-full p-2 border border-gray-300 rounded-md text-sm" 
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Vehicle</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="truck">Truck</option>
              <option value="van">Van</option>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 block mb-1">Load (kg)</label>
            <input 
              type="number" 
              className="w-full p-2 border border-gray-300 rounded-md text-sm" 
              value={loadWeight}
              onChange={(e) => setLoadWeight(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        
        <button 
          onClick={handleGenerateRoutes} 
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Generate Routes
        </button>
      </div>
    </div>
  );
};


export default RouteOptimisationForm;