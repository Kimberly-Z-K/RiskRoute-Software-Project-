import axios from 'axios';

export async function optimizeRouteTomTom(start, stops, constraints = {}) {
  const waypoints = [start, ...stops];

  const waypointString = waypoints.map(p => `${p.lat},${p.lng}`).join(':');

  const params = {
    key: process.env.TOMTOM_API_KEY,
    computeBestOrder: true,
    traffic: true,
    routeType: 'fastest'
  };

  if (constraints.avoidTolls) params.avoid = 'tollRoads';
  if (constraints.avoidHighways) {
    params.avoid = params.avoid ? `${params.avoid},limitedAccessHighways` : 'limitedAccessHighways';
  }

  const url = `https://api.tomtom.com/routing/1/calculateRoute/${waypointString}/json`;
  const response = await axios.get(url, { params });

  return response.data;
}