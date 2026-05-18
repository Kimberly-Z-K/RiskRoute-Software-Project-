// Mock data generator for the Fleet Manager Dashboard

// Generate random coordinates around NYC area
export const generateRandomCoords = (baseLat = 40.7128, baseLng = -74.006, radius = 0.05) => {
  return {
    lat: baseLat + (Math.random() - 0.5) * radius,
    lng: baseLng + (Math.random() - 0.5) * radius
  };
};

// Vehicle fleet data generator
export const generateFleetVehicles = () => {
  const statuses = ['on-time', 'delayed', 'at-risk', 'on-time', 'on-time', 'delayed'];
  const drivers = ['Michael Chen', 'Sarah Jones', 'David Kim', 'Lisa Wong', 'James Miller', 'Robert Taylor', 'Emma Davis', 'Chris Evans'];
  const routes = ['Brooklyn → Manhattan', 'Queens → Bronx', 'JFK → Downtown', 'Staten Island → Brooklyn', 'Harlem → LIC', 'Bronx → Yonkers', 'Brooklyn → JFK'];
  const riskLevels = ['low', 'medium', 'high', 'low', 'medium', 'low', 'high', 'medium'];
  
  return Array.from({ length: 24 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const risk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const alerts = [];
    if (status === 'delayed') alerts.push('Traffic congestion');
    if (status === 'at-risk') alerts.push('Route deviation', 'Weather warning');
    if (risk === 'high') alerts.push('High-risk zone ahead');
    if (Math.random() > 0.8) alerts.push('Low fuel warning');
    
    const coords = generateRandomCoords();
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
      lastUpdate: new Date().toLocaleTimeString()
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

// Generate alerts
export const generateAlerts = () => {
  const alertTypes = [
    { type: 'Emergency Incident', priority: 'critical', msg: 'Vehicle collision reported on I-95 near exit 12' },
    { type: 'Route Deviation', priority: 'high', msg: 'Truck V7423 off planned route by 2.3 miles' },
    { type: 'Weather Warning', priority: 'medium', msg: 'Heavy rain and thunderstorms expected in Brooklyn area' },
    { type: 'Traffic Disruption', priority: 'medium', msg: 'Major accident causing 30min delay on I-278' },
    { type: 'Risk Warning', priority: 'high', msg: 'High theft probability in Downtown zone' },
    { type: 'Safety Alert', priority: 'critical', msg: 'Driver fatigue detected - immediate rest recommended' },
    { type: 'Road Closure', priority: 'high', msg: 'Route 9A closed due to construction' }
  ];
  
  return alertTypes.map((alert, idx) => ({
    id: idx + 1,
    ...alert,
    time: `${Math.floor(Math.random() * 60) + 1} min ago`,
    acknowledged: idx > 2 ? false : true
  }));
};

// Risk zones
export const riskZones = [
  { id: 1, name: 'Downtown Theft Hotspot', lat: 40.715, lng: -74.005, severity: 'critical', probability: 0.42, description: 'High cargo theft area, security recommended' },
  { id: 2, name: 'Industrial Accident Zone', lat: 40.735, lng: -73.99, severity: 'high', probability: 0.28, description: 'Frequent accidents reported' },
  { id: 3, name: 'Weather Risk Corridor', lat: 40.705, lng: -74.02, severity: 'medium', probability: 0.18, description: 'Flooding risk during rain' },
  { id: 4, name: 'Infrastructure Risk', lat: 40.748, lng: -73.97, severity: 'high', probability: 0.23, description: 'Poor road conditions' }
];

// Route options
export const routeOptions = {
  fastest: { name: 'Fastest Route', time: '32 min', distance: 18.4, risk: 'Medium', cost: 45, coords: [[40.7128, -74.006], [40.728, -73.995], [40.742, -73.980]] },
  safest: { name: 'Safest Route', time: '41 min', distance: 21.2, risk: 'Low', cost: 52, coords: [[40.7128, -74.006], [40.720, -74.010], [40.735, -73.995], [40.745, -73.975]] },
  lowestCost: { name: 'Lowest Cost Route', time: '38 min', distance: 19.7, risk: 'Medium-Low', cost: 38, coords: [[40.7128, -74.006], [40.715, -74.015], [40.730, -74.000], [40.740, -73.985]] }
};

// Performance KPIs
export const performanceData = {
  avgDeliveryTime: 42.3,
  routeEfficiency: 87,
  driverSafetyScore: 92,
  fuelUsageTrend: -3.2,
  riskIncidentFrequency: 14,
  onTimeRate: 78,
  customerSatisfaction: 4.6,
  costPerMile: 1.82
};

// Driver performance data
export const driverPerformanceData = [
  { name: 'Michael Chen', score: 96, deliveries: 124, incidents: 0 },
  { name: 'Sarah Jones', score: 88, deliveries: 98, incidents: 1 },
  { name: 'David Kim', score: 74, deliveries: 87, incidents: 3 },
  { name: 'Lisa Wong', score: 92, deliveries: 112, incidents: 1 },
  { name: 'James Miller', score: 85, deliveries: 103, incidents: 2 }
];