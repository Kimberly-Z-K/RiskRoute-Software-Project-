import axios from 'axios';

export async function getTrafficIncidentsTomTom(bbox) {
  const url = 'https://api.tomtom.com/traffic/services/5/incidentDetails';
  const response = await axios.get(url, {
    params: {
      key: process.env.TOMTOM_API_KEY,
      bbox,
      language: 'en-GB',
      timeValidityFilter: 'present',
    },
  });
  return response.data;
}

export async function getTrafficFlowTomTom(lat, lng) {
  const url = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';
  const response = await axios.get(url, {
    params: {
      key: process.env.TOMTOM_API_KEY,
      point: `${lat},${lng}`,
      language: 'en-GB',
    },
  });
  return response.data;
}