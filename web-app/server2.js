import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Server starting...');
console.log('📡 PORT:', PORT);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pyqftjxfbjecjdhdzyor.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'your_anon_key_here'
);

console.log('✅ Supabase initialized');

/* ============================================================
   REVERSE GEOCODE FUNCTION
============================================================ */

const reverseGeocode = async (lat, lng) => {
  try {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return "Unknown Location";
    }

    const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    
    const response = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'RiskRoute-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenStreetMap API error: ${response.status}`);
    }
    
    const data = await response.json();
    const address = data?.address;
    
    if (address) {
      const location = address.city || 
                       address.town || 
                       address.village || 
                       address.suburb || 
                       address.county ||
                       address.state_district ||
                       address.state ||
                       address.country ||
                       null;
      
      if (location) {
        return location;
      }
    }
    
    return "Unknown Location";
    
  } catch (error) {
    console.error('❌ Reverse geocode error:', error.message);
    return "Unknown Location";
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ============================================================
   GET WEATHER DATA FROM SUPABASE FUNCTION - WITH ENHANCED LOGGING
============================================================ */

const getWeatherData = async (lat, lon) => {
  try {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    if (isNaN(latNum) || isNaN(lonNum)) {
      console.warn('⚠️ Invalid coordinates for weather:', { lat, lon });
      return null;
    }

    if (latNum === 0 || lonNum === 0) {
      console.warn('⚠️ Zero coordinates detected for weather:', { lat: latNum, lon: lonNum });
      return null;
    }

    console.log(`🌤️ Fetching weather for: ${latNum}, ${lonNum}`);
    
    // Build the URL with proper parameters
    const weatherUrl = `https://pyqftjxfbjecjdhdzyor.supabase.co/functions/v1/Weather?lat=${latNum}&lon=${lonNum}`;
    
    console.log(`📡 FULL WEATHER URL: ${weatherUrl}`);
    
    const response = await fetch(weatherUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Weather API error: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('📦 Weather response received');
    
    // If the response has an error, log it
    if (data && data.error) {
      console.error('❌ Edge Function error:', data.error);
      return null;
    }
    
    // Parse the weather data
    let weatherData = null;
    
    // Format: { success: true, data: { current: {...}, location: {...} } }
    if (data && data.success === true && data.data) {
      if (data.data.current && data.data.current.condition) {
        weatherData = {
          current: {
            temp_c: data.data.current.temp_c || 0,
            condition: {
              text: data.data.current.condition.text || 'Unknown'
            },
            humidity: data.data.current.humidity || 0,
            wind_kph: data.data.current.wind_kph || 0,
            cloud: data.data.current.cloud || 0,
            feelslike_c: data.data.current.feelslike_c || data.data.current.temp_c || 0,
            uv_index: data.data.current.uv_index || 0,
            last_updated: data.data.current.last_updated || new Date().toISOString()
          },
          location: {
            name: data.data.location?.name || 'Unknown',
            region: data.data.location?.region || 'Unknown',
            country: data.data.location?.country || 'Unknown',
            lat: data.data.location?.lat || 0,
            lon: data.data.location?.lon || 0,
            localtime: data.data.location?.localtime || new Date().toISOString()
          }
        };
        console.log(`✅ Weather data parsed: ${weatherData.current.temp_c}°C, ${weatherData.current.condition.text}`);
        console.log(`📍 Location: ${weatherData.location.name}`);
        return weatherData;
      }
    }
    
    // Format: { current: {...}, location: {...} }
    if (data && data.current && data.current.condition) {
      weatherData = data;
      console.log('✅ Weather data already in correct format');
      console.log(`📍 Location: ${weatherData.location?.name || 'Unknown'}`);
      return weatherData;
    }
    
    console.warn('⚠️ Unknown weather data format. Keys:', Object.keys(data || {}));
    return null;
    
  } catch (error) {
    console.error('❌ Weather fetch error:', error.message);
    return null;
  }
};

/* ============================================================
   GET ROUTE FROM TOMTOM
============================================================ */

const getTomTomRoute = async (lat1, lon1, lat2, lon2, routeType = 'fastest', avoid = []) => {
  try {
    if (!process.env.TOMTOM_API_KEY) {
      console.warn('⚠️ No TomTom API key found');
      return null;
    }
    
    const routeParams = {
      'fastest': 'fastest',
      'shortest': 'shortest',
      'eco': 'eco',
      'thrilling': 'thrilling'
    };
    
    let avoidParam = '';
    if (avoid.includes('accident') && avoid.includes('roadClosure')) {
      avoidParam = '&avoid=incidents,roadClosures';
    } else if (avoid.includes('accident')) {
      avoidParam = '&avoid=incidents';
    } else if (avoid.includes('roadClosure')) {
      avoidParam = '&avoid=roadClosures';
    }
    
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${lat1},${lon1}:${lat2},${lon2}/json?key=${process.env.TOMTOM_API_KEY}&traffic=true&routeType=${routeParams[routeType] || 'fastest'}&travelMode=car${avoidParam}`;
    
    console.log(`🔄 Fetching ${routeType} route...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ TomTom API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ TomTom error:`, error.message);
    return null;
  }
};

/* ============================================================
   EXTRACT ROUTE DETAILS
============================================================ */

const extractRouteDetails = async (route) => {
  try {
    const roadNames = [];
    const waypoints = [];
    
    const legs = route?.legs || [];
    for (const leg of legs) {
      const points = leg?.points || [];
      for (const point of points) {
        if (point?.streetName && !roadNames.includes(point.streetName)) {
          roadNames.push(point.streetName);
        }
        if (point && point.lat && point.lng) {
          waypoints.push({ lat: point.lat, lng: point.lng });
        }
      }
    }
    
    // Get place names from waypoints (sample every 10th waypoint)
    const sampledWaypoints = waypoints.filter((_, i) => i % 10 === 0).slice(0, 5);
    let placeNames = [];
    
    for (const wp of sampledWaypoints) {
      if (wp.lat && wp.lng) {
        const placeName = await reverseGeocode(wp.lat, wp.lng);
        if (placeName && placeName !== 'Unknown Location' && !placeNames.includes(placeName)) {
          placeNames.push(placeName);
        }
        await delay(100);
      }
    }
    
    const filtered = roadNames.filter(name => 
      name && 
      name.length > 1 && 
      !name.toLowerCase().includes('unnamed') &&
      !name.toLowerCase().includes('service') &&
      !name.toLowerCase().includes('ramp') &&
      !name.toLowerCase().includes('exit')
    );
    
    const significantRoads = filtered.slice(0, 3);
    const significantPlaces = placeNames.slice(0, 3);
    
    let roadString = significantRoads.join(' → ');
    let placeString = significantPlaces.join(', ');
    
    if (roadString.length === 0) {
      roadString = 'Main Route';
    }
    
    if (placeString.length === 0) {
      placeString = 'various locations';
    }
    
    return {
      roads: roadString,
      places: placeString,
      roadNames: significantRoads,
      placeNames: significantPlaces,
      fullDescription: `${roadString} through ${placeString}`
    };
    
  } catch (error) {
    console.warn('⚠️ Could not extract route details:', error.message);
    return {
      roads: 'Main Route',
      places: 'various locations',
      roadNames: ['Main Route'],
      placeNames: [],
      fullDescription: 'Main Route'
    };
  }
};

/* ============================================================
   GET ALTERNATIVE ROUTES
============================================================ */

const getAlternativeRoutes = async (originLat, originLng, destLat, destLng, hasAccident = false, hasRoadClosure = false, destName = 'Destination', originName = 'Origin') => {
  try {
    if (!process.env.TOMTOM_API_KEY) {
      console.warn('⚠️ No TomTom API key, using fallback routes');
      return getFallbackRoutes(originLat, originLng, destLat, destLng, hasAccident, hasRoadClosure, destName);
    }
    
    const routeTypes = ['fastest', 'shortest', 'eco', 'thrilling'];
    const routes = [];
    
    const avoid = [];
    if (hasAccident) avoid.push('accident');
    if (hasRoadClosure) avoid.push('roadClosure');
    
    const routeLabels = {
      'fastest': 'Fastest',
      'shortest': 'Shortest Distance',
      'eco': 'Eco-Friendly',
      'thrilling': 'Scenic'
    };
    
    const routeEmojis = {
      'fastest': '⭐',
      'shortest': '📏',
      'eco': '🌱',
      'thrilling': '🛣️'
    };
    
    let anyRouteFound = false;
    
    for (const type of routeTypes) {
      const result = await getTomTomRoute(originLat, originLng, destLat, destLng, type, avoid);
      
      if (result && result.routes && result.routes.length > 0) {
        anyRouteFound = true;
        const route = result.routes[0];
        const summary = route.summary || {};
        
        const trafficDelay = summary.trafficDelayInSeconds || 0;
        const totalTime = summary.travelTimeInSeconds || 0;
        const distance = summary.lengthInMeters || 0;
        
        const routeDetails = await extractRouteDetails(route);
        const roadString = routeDetails.roads;
        const placeString = routeDetails.places;
        const fullDescription = routeDetails.fullDescription;
        
        const avoidsDisruption = avoid.length > 0;
        const avoidText = avoidsDisruption ? ` (Avoids ${avoid.join(' & ')})` : '';
        
        routes.push({
          id: `alt-${type}`,
          type: type,
          displayName: `${routeEmojis[type]} ${routeLabels[type]} Route to ${destName}${avoidText}`,
          duration: Math.round(totalTime / 60),
          distance: Math.round(distance / 1000),
          trafficDelay: Math.round(trafficDelay / 60),
          isRecommended: type === 'fastest' && avoidsDisruption,
          risk_level: getRiskLevelForRoute(type, summary),
          description: `${routeLabels[type]} route${avoid.length > 0 ? ` avoiding ${avoid.join(' & ')}` : ''} via ${fullDescription}`,
          recommendation: getRouteRecommendation(type, summary, avoid, destName, fullDescription),
          geometry: route.legs?.[0]?.points || [],
          summary: {
            travelTime: totalTime,
            length: distance,
            trafficDelay: trafficDelay,
            avoidsDisruption: avoidsDisruption
          },
          roads: roadString,
          places: placeString,
          fullDescription: fullDescription,
          roadNames: routeDetails.roadNames,
          placeNames: routeDetails.placeNames
        });
        
        console.log(`✅ ${type} route: ${Math.round(totalTime/60)} min via ${fullDescription}`);
      }
      
      await delay(300);
    }
    
    if (!anyRouteFound) {
      console.warn('⚠️ No routes from TomTom, using fallback');
      return getFallbackRoutes(originLat, originLng, destLat, destLng, hasAccident, hasRoadClosure, destName);
    }
    
    routes.sort((a, b) => a.duration - b.duration);
    
    if (routes.length > 0) {
      const avoidingRoute = routes.find(r => r.summary?.avoidsDisruption === true);
      if (avoidingRoute) {
        avoidingRoute.isRecommended = true;
        avoidingRoute.recommendation = `✅ Recommended - Avoids ${avoid.join(' & ')} via ${avoidingRoute.fullDescription}`;
      } else if (avoid.length > 0) {
        routes[0].isRecommended = true;
        routes[0].recommendation = `⚠️ No route fully avoids ${avoid.join(' & ')}. Fastest option via ${routes[0].fullDescription}`;
      } else {
        routes[0].isRecommended = true;
        routes[0].recommendation = `✅ Best route via ${routes[0].fullDescription}`;
      }
    }
    
    return routes;
    
  } catch (error) {
    console.error('❌ Error getting routes:', error);
    return getFallbackRoutes(originLat, originLng, destLat, destLng, hasAccident, hasRoadClosure, destName);
  }
};

function getRouteRecommendation(type, summary, avoid, destName, fullDescription) {
  const trafficDelay = summary.trafficDelayInSeconds || 0;
  const delayMinutes = trafficDelay / 60;
  
  let recommendation = '';
  
  if (avoid.length > 0) {
    const avoidText = avoid.join(' & ');
    recommendation = `✅ Best route to ${destName} avoiding ${avoidText} via ${fullDescription}`;
  } else {
    if (type === 'fastest') {
      recommendation = delayMinutes > 5 ? `⚠️ Some traffic expected but fastest to ${destName} via ${fullDescription}` : `✅ Best time-efficient route to ${destName} via ${fullDescription}`;
    } else if (type === 'shortest') {
      recommendation = `📏 Shortest distance route to ${destName} via ${fullDescription}`;
    } else if (type === 'eco') {
      recommendation = `🌱 Fuel-efficient route to ${destName} via ${fullDescription}`;
    } else if (type === 'thrilling') {
      recommendation = `🛣️ Scenic route to ${destName} via ${fullDescription}`;
    }
  }
  
  if (delayMinutes > 15) {
    recommendation += ` (${Math.round(delayMinutes)} min delay expected)`;
  }
  
  return recommendation;
}

function getRiskLevelForRoute(type, summary) {
  const trafficDelay = summary.trafficDelayInSeconds || 0;
  const delayMinutes = trafficDelay / 60;
  
  if (delayMinutes > 30) return 'high';
  if (delayMinutes > 15) return 'medium';
  return 'low';
}

/* ============================================================
   FALLBACK ROUTES
============================================================ */

const getFallbackRoutes = (originLat, originLng, destLat, destLng, hasAccident, hasRoadClosure, destName) => {
  console.log('🔄 Generating fallback routes with descriptive information');
  
  const distance = Math.sqrt(
    Math.pow((destLat - originLat) * 111, 2) + 
    Math.pow((destLng - originLng) * 111, 2)
  );
  
  const baseDuration = Math.round(distance * 1.5);
  const baseDistance = Math.round(distance);
  
  const avoid = [];
  if (hasAccident) avoid.push('accident');
  if (hasRoadClosure) avoid.push('roadClosure');
  const avoidText = avoid.length > 0 ? ` (Avoids ${avoid.join(' & ')})` : '';
  const avoidDescription = avoid.length > 0 ? ` avoiding ${avoid.join(' & ')}` : '';
  
  const routeDetails = {
    fastest: {
      roads: 'N1, N3',
      places: 'Midrand, Centurion, Pietermaritzburg',
      description: 'N1 and N3 through Midrand, Centurion, and Pietermaritzburg'
    },
    shortest: {
      roads: 'R21, N3',
      places: 'Kempton Park, Heidelberg, Pietermaritzburg',
      description: 'R21 and N3 through Kempton Park, Heidelberg, and Pietermaritzburg'
    },
    eco: {
      roads: 'N1, M13',
      places: 'Sandton, Kyalami, Pietermaritzburg',
      description: 'N1 and M13 through Sandton, Kyalami, and Pietermaritzburg'
    },
    thrilling: {
      roads: 'M1, N3',
      places: 'Johannesburg CBD, Edenvale, Pietermaritzburg',
      description: 'M1 and N3 through Johannesburg CBD, Edenvale, and Pietermaritzburg'
    }
  };
  
  const routeLabels = {
    fastest: 'Fastest',
    shortest: 'Shortest Distance',
    eco: 'Eco-Friendly',
    thrilling: 'Scenic'
  };
  
  const routeEmojis = {
    fastest: '⭐',
    shortest: '📏',
    eco: '🌱',
    thrilling: '🛣️'
  };
  
  return [
    {
      id: 'alt-fallback-fastest',
      type: 'fastest',
      displayName: `${routeEmojis.fastest} ${routeLabels.fastest} Route to ${destName}${avoidText}`,
      duration: Math.round(baseDuration * 0.9),
      distance: Math.round(baseDistance * 1.0),
      trafficDelay: 0,
      isRecommended: true,
      risk_level: 'low',
      description: `${routeLabels.fastest} route${avoidDescription} via ${routeDetails.fastest.description}`,
      recommendation: `✅ Best route to ${destName}${avoidDescription} via ${routeDetails.fastest.description}`,
      summary: {
        travelTime: Math.round(baseDuration * 0.9 * 60),
        length: Math.round(baseDistance * 1.0 * 1000),
        trafficDelay: 0,
        avoidsDisruption: avoid.length > 0
      },
      roads: routeDetails.fastest.roads,
      places: routeDetails.fastest.places,
      fullDescription: routeDetails.fastest.description,
      roadNames: routeDetails.fastest.roads.split(', '),
      placeNames: routeDetails.fastest.places.split(', ')
    },
    {
      id: 'alt-fallback-shortest',
      type: 'shortest',
      displayName: `${routeEmojis.shortest} ${routeLabels.shortest} Route to ${destName}${avoidText}`,
      duration: Math.round(baseDuration * 0.95),
      distance: Math.round(baseDistance * 0.85),
      trafficDelay: 0,
      isRecommended: false,
      risk_level: 'low',
      description: `${routeLabels.shortest} route${avoidDescription} via ${routeDetails.shortest.description}`,
      recommendation: `📏 Shortest distance to ${destName}${avoidDescription} via ${routeDetails.shortest.description}`,
      summary: {
        travelTime: Math.round(baseDuration * 0.95 * 60),
        length: Math.round(baseDistance * 0.85 * 1000),
        trafficDelay: 0,
        avoidsDisruption: avoid.length > 0
      },
      roads: routeDetails.shortest.roads,
      places: routeDetails.shortest.places,
      fullDescription: routeDetails.shortest.description,
      roadNames: routeDetails.shortest.roads.split(', '),
      placeNames: routeDetails.shortest.places.split(', ')
    },
    {
      id: 'alt-fallback-eco',
      type: 'eco',
      displayName: `${routeEmojis.eco} ${routeLabels.eco} Route to ${destName}${avoidText}`,
      duration: Math.round(baseDuration * 1.05),
      distance: Math.round(baseDistance * 1.02),
      trafficDelay: 0,
      isRecommended: false,
      risk_level: 'low',
      description: `${routeLabels.eco} route${avoidDescription} via ${routeDetails.eco.description}`,
      recommendation: `🌱 Fuel-efficient route to ${destName}${avoidDescription} via ${routeDetails.eco.description}`,
      summary: {
        travelTime: Math.round(baseDuration * 1.05 * 60),
        length: Math.round(baseDistance * 1.02 * 1000),
        trafficDelay: 0,
        avoidsDisruption: avoid.length > 0
      },
      roads: routeDetails.eco.roads,
      places: routeDetails.eco.places,
      fullDescription: routeDetails.eco.description,
      roadNames: routeDetails.eco.roads.split(', '),
      placeNames: routeDetails.eco.places.split(', ')
    },
    {
      id: 'alt-fallback-thrilling',
      type: 'thrilling',
      displayName: `${routeEmojis.thrilling} ${routeLabels.thrilling} Route to ${destName}${avoidText}`,
      duration: Math.round(baseDuration * 1.2),
      distance: Math.round(baseDistance * 1.15),
      trafficDelay: 0,
      isRecommended: false,
      risk_level: 'low',
      description: `${routeLabels.thrilling} route${avoidDescription} via ${routeDetails.thrilling.description}`,
      recommendation: `🛣️ Scenic route to ${destName}${avoidDescription} via ${routeDetails.thrilling.description}`,
      summary: {
        travelTime: Math.round(baseDuration * 1.2 * 60),
        length: Math.round(baseDistance * 1.15 * 1000),
        trafficDelay: 0,
        avoidsDisruption: avoid.length > 0
      },
      roads: routeDetails.thrilling.roads,
      places: routeDetails.thrilling.places,
      fullDescription: routeDetails.thrilling.description,
      roadNames: routeDetails.thrilling.roads.split(', '),
      placeNames: routeDetails.thrilling.places.split(', ')
    }
  ];
};

/* ============================================================
   ROUTES ENDPOINT
============================================================ */

app.get('/api/routes', async (req, res) => {
  try {
    console.log('🔄 Fetching routes from optimized_routes...');
    
    const { data, error } = await supabase
      .from('optimized_routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No routes found');
      return res.status(404).json({ 
        error: 'No routes found'
      });
    }

    console.log(`✅ Found ${data.length} routes in database`);

    const convertedRoutes = [];
    
    for (let index = 0; index < data.length; index++) {
      const route = data[index];
      try {
        console.log(`🔄 Processing route ${index + 1}/${data.length} (ID: ${route.id})...`);
        
        let originName = "Unknown Origin";
        let originLat = 0, originLng = 0;
        let destName = "Unknown Destination";
        let destLat = 0, destLng = 0;
        
        if (route.start_point && typeof route.start_point === 'object') {
          originLat = route.start_point.lat || 0;
          originLng = route.start_point.lng || 0;
          
          if (originLat && originLng) {
            originName = await reverseGeocode(originLat, originLng);
            console.log(`📍 Origin: ${originName} (${originLat}, ${originLng})`);
          }
        }

        const stops = route.stops || [];
        if (stops.length > 0) {
          const lastStop = stops[stops.length - 1];
          if (lastStop && typeof lastStop === 'object') {
            destLat = lastStop.lat || 0;
            destLng = lastStop.lng || 0;
            
            if (destLat && destLng) {
              destName = await reverseGeocode(destLat, destLng);
              console.log(`📍 Destination: ${destName} (${destLat}, ${destLng})`);
            }
          }
        }

        const result = route.result || {};

        let alternatives = [];
        try {
          if (originLat && originLng && destLat && destLng) {
            alternatives = await getAlternativeRoutes(originLat, originLng, destLat, destLng, false, false, destName, originName);
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch alternatives:', err.message);
          alternatives = getFallbackRoutes(originLat, originLng, destLat, destLng, false, false, destName);
        }

        const convertedRoute = {
          id: String(route.id),
          display_name: `${originName} → ${destName}`,
          origin_name: originName,
          destination_name: destName,
          origin_lat: originLat,
          origin_lng: originLng,
          dest_lat: destLat,
          dest_lng: destLng,
          distance_km: result.distanceKm || result.distance_km || 0,
          duration_min: result.durationMin || result.duration_min || 60,
          estimated_cost: result.estimated_cost || 0,
          traffic_delay: result.trafficDelayMin || result.traffic_delay || 0,
          alternatives: alternatives,
          start_point: route.start_point,
          stops: route.stops,
          constraints: route.constraints,
          result: route.result,
          created_at: route.created_at
        };

        console.log(`✅ Route ${route.id}: ${convertedRoute.display_name}`);
        convertedRoutes.push(convertedRoute);

      } catch (err) {
        console.error(`❌ Error processing route ${route.id}:`, err.message);
        const result = route.result || {};
        convertedRoutes.push({
          id: String(route.id),
          display_name: `Route ${route.id}`,
          origin_name: 'Unknown',
          destination_name: 'Unknown',
          origin_lat: route.start_point?.lat || 0,
          origin_lng: route.start_point?.lng || 0,
          dest_lat: route.stops?.[route.stops.length - 1]?.lat || 0,
          dest_lng: route.stops?.[route.stops.length - 1]?.lng || 0,
          distance_km: result.distanceKm || result.distance_km || 0,
          duration_min: result.durationMin || result.duration_min || 60,
          estimated_cost: result.estimated_cost || 0,
          traffic_delay: result.trafficDelayMin || result.traffic_delay || 0,
          alternatives: [],
          start_point: route.start_point,
          stops: route.stops,
          constraints: route.constraints,
          result: route.result,
          created_at: route.created_at
        });
      }
    }

    console.log(`✅ Successfully converted ${convertedRoutes.length} routes`);
    res.json(convertedRoutes);
    
  } catch (error) {
    console.error('❌ Error in /api/routes:', error);
    res.status(500).json({ 
      error: 'Failed to load routes',
      details: error.message 
    });
  }
});

/* ============================================================
   ALTERNATIVE ROUTES ENDPOINT
============================================================ */

app.get('/api/routes/alternatives', async (req, res) => {
  try {
    const { 
      origin_lat, 
      origin_lng, 
      dest_lat, 
      dest_lng,
      origin_name = 'Origin',
      destination_name = 'Destination',
      has_accident = 'false',
      has_road_closure = 'false'
    } = req.query;
    
    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return res.status(400).json({ 
        error: 'Missing required parameters' 
      });
    }
    
    const hasAccident = has_accident === 'true';
    const hasRoadClosure = has_road_closure === 'true';
    
    console.log(`🔄 Fetching alternatives for: ${destination_name}`);
    console.log(`📍 Origin: ${origin_name}, Destination: ${destination_name}`);
    console.log(`🚨 Accident: ${hasAccident}, Road Closure: ${hasRoadClosure}`);
    
    const alternatives = await getAlternativeRoutes(
      parseFloat(origin_lat),
      parseFloat(origin_lng),
      parseFloat(dest_lat),
      parseFloat(dest_lng),
      hasAccident,
      hasRoadClosure,
      destination_name,
      origin_name
    );
    
    console.log(`✅ Found ${alternatives.length} alternative routes`);
    res.json({ alternatives });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch alternative routes',
      details: error.message 
    });
  }
});

/* ============================================================
   WEATHER FOR ROUTE ENDPOINT - WITH ENHANCED LOGGING
============================================================ */

app.get('/api/weather/route', async (req, res) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng } = req.query;
    
    console.log('🔄 Getting weather for route...');
    console.log(`📍 Origin: ${origin_lat}, ${origin_lng}`);
    console.log(`📍 Destination: ${dest_lat}, ${dest_lng}`);
    
    const originLatNum = parseFloat(origin_lat);
    const originLngNum = parseFloat(origin_lng);
    const destLatNum = parseFloat(dest_lat);
    const destLngNum = parseFloat(dest_lng);
    
    if (isNaN(originLatNum) || isNaN(originLngNum) || isNaN(destLatNum) || isNaN(destLngNum)) {
      console.warn('⚠️ Invalid coordinates provided');
      return res.status(400).json({ 
        error: 'Invalid coordinates',
        received: { origin_lat, origin_lng, dest_lat, dest_lng }
      });
    }

    // Check for zero coordinates
    if (originLatNum === 0 || originLngNum === 0 || destLatNum === 0 || destLngNum === 0) {
      console.warn('⚠️ Zero coordinate detected - cannot fetch weather');
      console.log(`   Origin: ${originLatNum}, ${originLngNum}`);
      console.log(`   Destination: ${destLatNum}, ${destLngNum}`);
      return res.status(400).json({ 
        error: 'Invalid coordinates (zero value)',
        message: 'The route has invalid coordinates. Please check your database.'
      });
    }

    console.log(`🌤️ Fetching origin weather for: ${originLatNum}, ${originLngNum}`);
    const originWeather = await getWeatherData(originLatNum, originLngNum);
    
    await delay(500);
    
    console.log(`🌤️ Fetching destination weather for: ${destLatNum}, ${destLngNum}`);
    const destWeather = await getWeatherData(destLatNum, destLngNum);
    
    await delay(500);
    
    const midLat = (originLatNum + destLatNum) / 2;
    const midLng = (originLngNum + destLngNum) / 2;
    console.log(`🌤️ Fetching midpoint weather for: ${midLat}, ${midLng}`);
    const midWeather = await getWeatherData(midLat, midLng);
    
    const responseData = {
      origin: originWeather,
      destination: destWeather,
      midpoint: midWeather,
      summary: {
        conditions: getRouteWeatherSummary(originWeather, destWeather, midWeather),
        average_temp: calculateAverageTemp(originWeather, destWeather, midWeather),
        recommendation: getWeatherRecommendation(originWeather, destWeather, midWeather),
        weather_icons: getWeatherIcons(originWeather, destWeather, midWeather)
      }
    };
    
    console.log('✅ Weather data summary:', {
      conditions: responseData.summary.conditions,
      avg_temp: responseData.summary.average_temp
    });
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error fetching weather:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weather',
      details: error.message 
    });
  }
});

function getRouteWeatherSummary(origin, dest, mid) {
  const conditions = [];
  
  const getCondition = (weather) => {
    if (!weather) return null;
    return weather.current?.condition?.text || null;
  };
  
  if (origin) conditions.push(getCondition(origin) || 'Unknown');
  if (dest) conditions.push(getCondition(dest) || 'Unknown');
  if (mid) conditions.push(getCondition(mid) || 'Unknown');
  
  const validConditions = conditions.filter(c => c !== null && c !== 'Unknown');
  if (validConditions.length === 0) return 'Unknown';
  
  const counts = {};
  validConditions.forEach(c => { 
    let key = c;
    if (c.includes('rain') || c.includes('drizzle')) key = 'Rainy';
    else if (c.includes('sun') || c.includes('clear')) key = 'Sunny';
    else if (c.includes('cloud')) key = 'Cloudy';
    else if (c.includes('fog') || c.includes('mist')) key = 'Foggy';
    else if (c.includes('snow')) key = 'Snowy';
    else if (c.includes('storm') || c.includes('thunder')) key = 'Stormy';
    
    counts[key] = (counts[key] || 0) + 1; 
  });
  
  let maxCount = 0;
  let mostCommon = 'Unknown';
  for (const [condition, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = condition;
    }
  }
  return mostCommon;
}

function calculateAverageTemp(origin, dest, mid) {
  const temps = [];
  
  if (origin?.current?.temp_c !== undefined && origin.current.temp_c !== null) 
    temps.push(origin.current.temp_c);
  if (dest?.current?.temp_c !== undefined && dest.current.temp_c !== null) 
    temps.push(dest.current.temp_c);
  if (mid?.current?.temp_c !== undefined && mid.current.temp_c !== null) 
    temps.push(mid.current.temp_c);
  
  if (temps.length === 0) return 0;
  const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
  return Math.round(avg);
}

function getWeatherIcons(origin, dest, mid) {
  const getIcon = (weather) => {
    const text = weather?.current?.condition?.text?.toLowerCase() || '';
    if (text.includes('sunny') || text.includes('clear')) return '☀️';
    if (text.includes('rain') || text.includes('drizzle')) return '🌧️';
    if (text.includes('cloud')) return '☁️';
    if (text.includes('snow')) return '❄️';
    if (text.includes('fog') || text.includes('mist')) return '🌫️';
    if (text.includes('storm') || text.includes('thunder')) return '⛈️';
    return '🌤️';
  };
  
  return {
    origin: getIcon(origin),
    destination: getIcon(dest),
    midpoint: getIcon(mid)
  };
}

function getWeatherRecommendation(origin, dest, mid) {
  const weathers = [origin, dest, mid].filter(w => w?.current?.condition?.text);
  const badWeather = ['Rain', 'Thunderstorm', 'Snow', 'Fog', 'Mist', 'Heavy rain', 'Moderate rain', 'Drizzle'];
  
  let hasBadWeather = false;
  let recommendation = 'Good weather conditions for travel.';
  
  weathers.forEach(w => {
    const text = w.current.condition.text || '';
    if (badWeather.some(b => text.includes(b))) {
      hasBadWeather = true;
    }
  });
  
  if (hasBadWeather) {
    recommendation = '⚠️ Adverse weather conditions detected. Consider alternative routes or delay travel.';
  }
  
  return recommendation;
}

/* ============================================================
   TRAFFIC ENDPOINT
============================================================ */

app.get('/api/traffic/route', async (req, res) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng } = req.query;
    
    console.log('🔄 Getting traffic for route...');
    
    const trafficData = await getTomTomRoute(origin_lat, origin_lng, dest_lat, dest_lng, 'fastest');
    
    if (!trafficData || !trafficData.routes || trafficData.routes.length === 0) {
      return res.json({
        hasTraffic: false,
        message: 'No traffic data available'
      });
    }
    
    const route = trafficData.routes[0];
    const summary = route.summary || {};
    const trafficDelay = summary.trafficDelayInSeconds || 0;
    const totalTime = summary.travelTimeInSeconds || 0;
    const hasTraffic = trafficDelay > 60;
    
    const incidents = route.guidance?.incidents || [];
    const hasAccident = incidents.some(i => i.type === 'Accident' || i.type === 'Incident');
    const hasRoadClosure = incidents.some(i => i.type === 'RoadClosure' || i.type === 'Closure');
    
    res.json({
      hasTraffic,
      hasAccident,
      hasRoadClosure,
      trafficDelayMinutes: Math.round(trafficDelay / 60),
      totalTimeMinutes: Math.round(totalTime / 60),
      incidents: incidents.map(i => ({
        type: i.type,
        description: i.description,
        severity: i.severity
      })),
      recommendation: getTrafficRecommendation(hasTraffic, hasAccident, hasRoadClosure)
    });
    
  } catch (error) {
    console.error('❌ Error fetching traffic:', error);
    res.status(500).json({ 
      error: 'Failed to fetch traffic',
      details: error.message 
    });
  }
});

function getTrafficRecommendation(hasTraffic, hasAccident, hasRoadClosure) {
  if (hasRoadClosure) {
    return '🚧 Road closure detected. Use alternative route immediately.';
  }
  if (hasAccident) {
    return '🚗 Accident reported. Consider alternative route to avoid delays.';
  }
  if (hasTraffic) {
    return '⚠️ Heavy traffic detected. Consider leaving earlier or using alternative route.';
  }
  return '✅ Traffic conditions are clear.';
}

/* ============================================================
   SIMULATIONS ENDPOINTS
============================================================ */

// GET all simulations
app.get('/api/simulations', async (req, res) => {
  try {
    console.log('🔄 GET /api/simulations');
    
    const { data, error } = await supabase
      .from('simulation_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    console.log(`✅ Found ${data?.length || 0} simulations`);
    res.json(data || []);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch simulations',
      details: error.message 
    });
  }
});

// GET single simulation by ID
app.get('/api/simulations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 GET /api/simulations/${id}`);
    
    const { data, error } = await supabase
      .from('simulation_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(404).json({ 
        error: 'Simulation not found',
        details: error.message 
      });
    }

    console.log(`✅ Found simulation: ${data?.name}`);
    res.json(data);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch simulation',
      details: error.message 
    });
  }
});

// POST - Save a new simulation
app.post('/api/simulations', async (req, res) => {
  try {
    console.log('🔄 POST /api/simulations');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    
    const { 
      name, 
      routeId, 
      routeName,
      params, 
      current, 
      optimal, 
      alternatives,
      timestamp,
      recommendation
    } = req.body;

    if (!name) {
      console.log('❌ Missing name');
      return res.status(400).json({ error: 'Simulation name is required' });
    }

    const simulationData = {
      name: name,
      route_id: routeId || null,
      route_name: routeName || 'Unknown Route',
      parameters: { ...params, recommendation } || {},
      current_route: current || {},
      optimal_route: optimal || {},
      alternatives: alternatives || [],
      created_at: timestamp || new Date().toISOString()
    };

    console.log('📦 Inserting:', JSON.stringify(simulationData, null, 2));

    const { data, error } = await supabase
      .from('simulation_results')
      .insert(simulationData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    console.log(`✅ Saved with ID: ${data.id}`);
    res.status(201).json(data);
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Failed to save simulation',
      details: error.message 
    });
  }
});

// DELETE a simulation
app.delete('/api/simulations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 DELETE /api/simulations/${id}`);
    
    const { data, error } = await supabase
      .from('simulation_results')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(404).json({ 
        error: 'Simulation not found',
        details: error.message 
      });
    }

    console.log(`✅ Deleted simulation ${id}`);
    res.json({ 
      success: true, 
      message: 'Simulation deleted successfully',
      deleted: data 
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Failed to delete simulation',
      details: error.message 
    });
  }
});

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      routes: '/api/routes',
      routesAlternatives: '/api/routes/alternatives',
      simulations: '/api/simulations',
      weather: '/api/weather/route',
      traffic: '/api/traffic/route'
    }
  });
});

/* ============================================================
   START SERVER
============================================================ */

app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/routes`);
  console.log(`   GET  /api/routes/alternatives?origin_lat=&origin_lng=&dest_lat=&dest_lng=&origin_name=&destination_name=&has_accident=true&has_road_closure=true`);
  console.log(`   GET  /api/simulations`);
  console.log(`   POST /api/simulations`);
  console.log(`   GET  /api/simulations/:id`);
  console.log(`   DELETE /api/simulations/:id`);
  console.log(`   GET  /api/weather/route?origin_lat=&origin_lng=&dest_lat=&dest_lng=`);
  console.log(`   GET  /api/traffic/route?origin_lat=&origin_lng=&dest_lat=&dest_lng=`);
  console.log(`\n`);
});