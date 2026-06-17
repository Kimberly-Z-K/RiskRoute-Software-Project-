// Mock data generator for the Fleet Manager Dashboard

// Generate random coordinates around South African cities
export const generateRandomCoords = (baseLat = -26.2041, baseLng = 28.0473, radius = 0.05) => {
  return {
    lat: baseLat + (Math.random() - 0.5) * radius,
    lng: baseLng + (Math.random() - 0.5) * radius
  };
};

// Vehicle fleet data generator with South African context
export const generateFleetVehicles = () => {
  const statuses = ['on-time', 'delayed', 'at-risk', 'on-time', 'on-time', 'delayed'];
  const drivers = ['Thabo Nkosi', 'Sarah van der Merwe', 'David Naidoo', 'Lisa Patel', 'James Botha', 'Robert Dlamini', 'Emma Khumalo', 'Chris Pretorius'];
  const routes = [
    'Sandton → OR Tambo Airport', 
    'Pretoria → Midrand', 
    'Johannesburg CBD → Soweto', 
    'Centurion → Fourways', 
    'Rosebank → Randburg', 
    'Bryanston → Waterfall', 
    'Alexandra → Woodmead', 
    'Rivonia → Sunninghill'
  ];
  const riskLevels = ['low', 'medium', 'high', 'low', 'medium', 'low', 'high', 'medium'];
  
  return Array.from({ length: 24 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const risk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const alerts = [];
    if (status === 'delayed') alerts.push('Traffic congestion on N1');
    if (status === 'at-risk') alerts.push('Route deviation', 'Load shedding affecting traffic lights');
    if (risk === 'high') alerts.push('High-jacking hotspot ahead');
    if (Math.random() > 0.8) alerts.push('Low fuel warning');
    if (Math.random() > 0.7) alerts.push('Protest action reported on route');
    
    const coords = generateRandomCoords(-26.2041, 28.0473); // Johannesburg area
    return {
      id: `V${Math.floor(Math.random() * 9000) + 1000}`,
      driver: drivers[i % drivers.length],
      status: status,
      lat: coords.lat,
      lng: coords.lng,
      eta: `${Math.floor(Math.random() * 4) + 12}:${Math.floor(Math.random() * 60)}`,
      route: routes[i % routes.length],
      risk: risk,
      alerts: alerts,
      speed: Math.floor(Math.random() * 65) + 25,
      fuel: Math.floor(Math.random() * 60) + 20,
      lastUpdate: new Date().toLocaleTimeString(),
      province: ['Gauteng', 'Gauteng', 'Gauteng', 'Gauteng', 'Western Cape', 'KZN'][Math.floor(Math.random() * 6)]
    };
  });
};

// Generate statistics
export const generateStats = (vehicles) => {
  const totalActive = vehicles.length;
  const onTime = vehicles.filter(v => v.status === 'on-time').length;
  const delayed = vehicles.filter(v => v.status === 'delayed').length;
  const atRisk = vehicles.filter(v => v.status === 'at-risk').length;
  return {
    totalActive,
    onTime,
    delayed,
    atRisk,
    completedToday: 142 + Math.floor(Math.random() * 20),
    activeAlerts: vehicles.reduce((acc, v) => acc + v.alerts.length, 0)
  };
};

// Generate alerts with South African context
export const generateAlerts = () => {
  const alertTypes = [
    { type: 'Emergency Incident', priority: 'critical', msg: 'Vehicle collision reported on N1 near Rivonia off-ramp' },
    { type: 'Route Deviation', priority: 'high', msg: 'Truck V7423 off planned route in Soweto area' },
    { type: 'Weather Warning', priority: 'medium', msg: 'Heavy thunderstorms expected in Johannesburg and Pretoria' },
    { type: 'Traffic Disruption', priority: 'medium', msg: 'Major accident causing 45min delay on M1 South' },
    { type: 'Risk Warning', priority: 'high', msg: 'High-jacking hotspot active in Marlboro area' },
    { type: 'Safety Alert', priority: 'critical', msg: 'Driver fatigue detected - immediate rest recommended at Petroport' },
    { type: 'Road Closure', priority: 'high', msg: 'William Nicol Drive closed due to protest action' },
    { type: 'Load Shedding Alert', priority: 'medium', msg: 'Stage 4 load shedding affecting traffic lights along route' }
  ];
  
  return alertTypes.map((alert, idx) => ({
    id: idx + 1,
    ...alert,
    time: `${Math.floor(Math.random() * 60) + 1} min ago`,
    acknowledged: idx > 2 ? false : true
  }));
};

// Risk zones in South Africa
export const riskZones = [
  { id: 1, name: 'Marlboro High-jacking Hotspot', lat: -26.091, lng: 28.092, severity: 'critical', probability: 0.42, description: 'High cargo theft area, avoid between 6pm-6am' },
  { id: 2, name: 'N1 Highway Accident Zone', lat: -26.035, lng: 28.008, severity: 'high', probability: 0.38, description: 'Frequent accidents reported, drive cautiously' },
  { id: 3, name: 'Alexandra Risk Corridor', lat: -26.107, lng: 28.091, severity: 'high', probability: 0.35, description: 'High crime area, security escort recommended' },
  { id: 4, name: 'CBD High Risk Area', lat: -26.204, lng: 28.045, severity: 'critical', probability: 0.45, description: 'High pedestrian activity and crime risk' },
  { id: 5, name: 'N3 Flood Risk Zone', lat: -26.245, lng: 28.120, severity: 'medium', probability: 0.28, description: 'Flooding risk during heavy rain' },
  { id: 6, name: 'Midrand Theft Hotspot', lat: -25.999, lng: 28.128, severity: 'high', probability: 0.32, description: 'Cargo theft syndicate active' }
];

// In your mockData.js file

export const routeOptions = {
  fastest: {
    id: 'fastest',
    name: 'Fastest Route',
    time: '2h 15min',
    distance: 185,
    risk: 'Medium',
    cost: 'R 1,450'
  },
  economical: {
    id: 'economical',
    name: 'Economical Route',
    time: '2h 45min',
    distance: 165,
    risk: 'Low',
    cost: 'R 950'
  },
  safest: {
    id: 'safest',
    name: 'Safest Route',
    time: '3h 10min',
    distance: 195,
    risk: 'Low',
    cost: 'R 1,520'
  },
  scenic: {
    id: 'scenic',
    name: 'Scenic Coastal Route',
    time: '3h 45min',
    distance: 220,
    risk: 'Low',
    cost: 'R 1,710'
  }
};

// Performance KPIs
export const performanceData = {
  avgDeliveryTime: 48.3,
  routeEfficiency: 82,
  driverSafetyScore: 88,
  fuelUsageTrend: -2.5,
  riskIncidentFrequency: 18,
  onTimeRate: 74,
  customerSatisfaction: 4.3,
  costPerKm: 12.85
};

// Driver performance data with South African names
export const driverPerformanceData = [
  { name: 'Thabo Nkosi', score: 96, deliveries: 124, incidents: 0, region: 'Gauteng' },
  { name: 'Sarah van der Merwe', score: 88, deliveries: 98, incidents: 1, region: 'Gauteng' },
  { name: 'David Naidoo', score: 74, deliveries: 87, incidents: 3, region: 'KZN' },
  { name: 'Lisa Patel', score: 92, deliveries: 112, incidents: 1, region: 'Gauteng' },
  { name: 'James Botha', score: 85, deliveries: 103, incidents: 2, region: 'Western Cape' },
  { name: 'Robert Dlamini', score: 90, deliveries: 115, incidents: 1, region: 'Gauteng' },
  { name: 'Emma Khumalo', score: 94, deliveries: 108, incidents: 0, region: 'KZN' },
  { name: 'Chris Pretorius', score: 82, deliveries: 95, incidents: 2, region: 'Gauteng' }
];

// Additional South African specific data
export const tollRoutes = [
  { name: 'N1 Western Bypass', cost: 'R45', congestion: 'High', bestTime: '10am-2pm' },
  { name: 'N3 Eastern Bypass', cost: 'R38', congestion: 'Medium', bestTime: 'Before 6am or after 7pm' },
  { name: 'M1 North/South', cost: 'R0', congestion: 'Extreme', bestTime: 'Avoid peak hours' }
];

export const fuelStations = [
  { name: 'Engen Sandton', location: 'Sandton', price: 'R23.50/L', hasTruckStop: true },
  { name: 'Shell Midrand', location: 'Midrand', price: 'R23.45/L', hasTruckStop: true },
  { name: 'BP Fourways', location: 'Fourways', price: 'R23.55/L', hasTruckStop: false },
  { name: 'Caltex Johannesburg', location: 'CBD', price: 'R23.40/L', hasTruckStop: true }
];

export const restStops = [
  { name: 'Petroport Midrand', location: 'N1 North', facilities: ['Restaurant', 'Showers', 'Parking', 'Security'] },
  { name: 'Total Energies', location: 'N3 South', facilities: ['Cafe', 'Restrooms', 'Parking'] },
  { name: 'Ultra City', location: 'N1 South', facilities: ['Restaurant', 'Showers', 'Parking', 'Security', 'Truck Wash'] }
];