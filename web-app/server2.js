import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Resolve .env relative to this file, not the cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION:', err);
});

const app = express();

// Use the same PORT everywhere. Frontend .env must match.
const PORT = process.env.PORT || 5000;

// AI config
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b';

// CORS — allow local dev + production frontend.
// Add your real deployed frontend URL when you go live.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server calls (no Origin header)
      if (!origin) return callback(null, true);

      // Local dev
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }

      // Any Vercel deployment
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Any Render deployment
      if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) {
        return callback(null, true);
      }

      // Explicitly listed origins
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

console.log('🚀 Server starting...');
console.log('📡 PORT:', PORT);
console.log('🤖 AI provider: Groq');
console.log('🤖 AI model:', AI_MODEL);
console.log(
  '🔑 Groq configured:',
  process.env.GROQ_API_KEY ? 'YES' : 'NO'
);

// Initialize Supabase
const supabaseUrl =
  process.env.SUPABASE_URL ||
  'https://pyqftjxfbjecjdhdzyor.supabase.co';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing Supabase API key in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/* ============================================================
   REVERSE GEOCODE FUNCTION
============================================================ */

const reverseGeocode = async (lat, lng) => {
  try {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return 'Unknown Location';
    }

    const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;

    const response = await fetch(osmUrl, {
      headers: { 'User-Agent': 'RiskRoute-App/1.0' },
    });

    if (!response.ok) {
      throw new Error(`OpenStreetMap API error: ${response.status}`);
    }

    const data = await response.json();
    const address = data?.address;

    if (address) {
      const location =
        address.city ||
        address.town ||
        address.village ||
        address.suburb ||
        address.county ||
        address.state_district ||
        address.state ||
        address.country ||
        null;

      if (location) return location;
    }

    return 'Unknown Location';
  } catch (error) {
    console.error('❌ Reverse geocode error:', error.message);
    return 'Unknown Location';
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ============================================================
   GET WEATHER DATA FROM SUPABASE FUNCTION
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
      console.warn('⚠️ Zero coordinates detected for weather');
      return null;
    }

    console.log(`🌤️ Fetching weather for: ${latNum}, ${lonNum}`);

    const weatherUrl = `https://pyqftjxfbjecjdhdzyor.supabase.co/functions/v1/Weather?lat=${latNum}&lon=${lonNum}`;

    const response = await fetch(weatherUrl, {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Weather API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();

    if (data && data.error) {
      console.error('❌ Edge Function error:', data.error);
      return null;
    }

    let weatherData = null;

    if (data && data.success === true && data.data) {
      if (data.data.current && data.data.current.condition) {
        weatherData = {
          current: {
            temp_c: data.data.current.temp_c || 0,
            condition: {
              text: data.data.current.condition.text || 'Unknown',
            },
            humidity: data.data.current.humidity || 0,
            wind_kph: data.data.current.wind_kph || 0,
            cloud: data.data.current.cloud || 0,
            feelslike_c:
              data.data.current.feelslike_c ||
              data.data.current.temp_c ||
              0,
            uv_index: data.data.current.uv_index || 0,
            last_updated:
              data.data.current.last_updated ||
              new Date().toISOString(),
          },
          location: {
            name: data.data.location?.name || 'Unknown',
            region: data.data.location?.region || 'Unknown',
            country: data.data.location?.country || 'Unknown',
            lat: data.data.location?.lat || 0,
            lon: data.data.location?.lon || 0,
            localtime:
              data.data.location?.localtime ||
              new Date().toISOString(),
          },
        };
        console.log(
          `✅ Weather parsed: ${weatherData.current.temp_c}°C, ${weatherData.current.condition.text}`
        );
        return weatherData;
      }
    }

    if (data && data.current && data.current.condition) {
      weatherData = data;
      console.log('✅ Weather data already in correct format');
      return weatherData;
    }

    console.warn(
      '⚠️ Unknown weather data format. Keys:',
      Object.keys(data || {})
    );
    return null;
  } catch (error) {
    console.error('❌ Weather fetch error:', error.message);
    return null;
  }
};

/* ============================================================
   GET ROUTE FROM TOMTOM
============================================================ */

const getTomTomRoute = async (
  lat1,
  lon1,
  lat2,
  lon2,
  routeType = 'fastest',
  avoid = []
) => {
  try {
    if (!process.env.TOMTOM_API_KEY) {
      console.warn('⚠️ No TomTom API key found');
      return null;
    }

    const routeParams = {
      fastest: 'fastest',
      shortest: 'shortest',
      eco: 'eco',
      thrilling: 'thrilling',
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

    return await response.json();
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
        if (
          point?.streetName &&
          !roadNames.includes(point.streetName)
        ) {
          roadNames.push(point.streetName);
        }
        if (point && point.lat && point.lng) {
          waypoints.push({ lat: point.lat, lng: point.lng });
        }
      }
    }

    const sampledWaypoints = waypoints
      .filter((_, i) => i % 10 === 0)
      .slice(0, 5);
    const placeNames = [];

    for (const wp of sampledWaypoints) {
      if (wp.lat && wp.lng) {
        const placeName = await reverseGeocode(wp.lat, wp.lng);
        if (
          placeName &&
          placeName !== 'Unknown Location' &&
          !placeNames.includes(placeName)
        ) {
          placeNames.push(placeName);
        }
        await delay(100);
      }
    }

    const filtered = roadNames.filter(
      (name) =>
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

    if (roadString.length === 0) roadString = 'Main Route';
    if (placeString.length === 0) placeString = 'various locations';

    return {
      roads: roadString,
      places: placeString,
      roadNames: significantRoads,
      placeNames: significantPlaces,
      fullDescription: `${roadString} through ${placeString}`,
    };
  } catch (error) {
    console.warn('⚠️ Could not extract route details:', error.message);
    return {
      roads: 'Main Route',
      places: 'various locations',
      roadNames: ['Main Route'],
      placeNames: [],
      fullDescription: 'Main Route',
    };
  }
};

/* ============================================================
   GET ALTERNATIVE ROUTES
============================================================ */

const getAlternativeRoutes = async (
  originLat,
  originLng,
  destLat,
  destLng,
  hasAccident = false,
  hasRoadClosure = false,
  destName = 'Destination',
  originName = 'Origin'
) => {
  try {
    if (!process.env.TOMTOM_API_KEY) {
      console.warn('⚠️ No TomTom API key, using fallback routes');
      return getFallbackRoutes(
        originLat,
        originLng,
        destLat,
        destLng,
        hasAccident,
        hasRoadClosure,
        destName
      );
    }

    const routeTypes = ['fastest', 'shortest', 'eco', 'thrilling'];
    const routes = [];

    const avoid = [];
    if (hasAccident) avoid.push('accident');
    if (hasRoadClosure) avoid.push('roadClosure');

    const routeLabels = {
      fastest: 'Fastest',
      shortest: 'Shortest Distance',
      eco: 'Eco-Friendly',
      thrilling: 'Scenic',
    };

    const routeEmojis = {
      fastest: '⭐',
      shortest: '📏',
      eco: '🌱',
      thrilling: '🛣️',
    };

    let anyRouteFound = false;

    for (const type of routeTypes) {
      const result = await getTomTomRoute(
        originLat,
        originLng,
        destLat,
        destLng,
        type,
        avoid
      );

      if (result && result.routes && result.routes.length > 0) {
        anyRouteFound = true;
        const route = result.routes[0];
        const summary = route.summary || {};

        const trafficDelay = summary.trafficDelayInSeconds || 0;
        const totalTime = summary.travelTimeInSeconds || 0;
        const distance = summary.lengthInMeters || 0;

        const routeDetails = await extractRouteDetails(route);
        const avoidsDisruption = avoid.length > 0;
        const avoidText = avoidsDisruption
          ? ` (Avoids ${avoid.join(' & ')})`
          : '';

        routes.push({
          id: `alt-${type}`,
          type,
          displayName: `${routeEmojis[type]} ${routeLabels[type]} Route to ${destName}${avoidText}`,
          duration: Math.round(totalTime / 60),
          distance: Math.round(distance / 1000),
          trafficDelay: Math.round(trafficDelay / 60),
          isRecommended: type === 'fastest' && avoidsDisruption,
          risk_level: getRiskLevelForRoute(type, summary),
          description: `${routeLabels[type]} route${
            avoid.length > 0 ? ` avoiding ${avoid.join(' & ')}` : ''
          } via ${routeDetails.fullDescription}`,
          recommendation: getRouteRecommendation(
            type,
            summary,
            avoid,
            destName,
            routeDetails.fullDescription
          ),
          geometry: route.legs?.[0]?.points || [],
          summary: {
            travelTime: totalTime,
            length: distance,
            trafficDelay,
            avoidsDisruption,
          },
          roads: routeDetails.roads,
          places: routeDetails.places,
          fullDescription: routeDetails.fullDescription,
          roadNames: routeDetails.roadNames,
          placeNames: routeDetails.placeNames,
        });

        console.log(
          `✅ ${type} route: ${Math.round(totalTime / 60)} min via ${routeDetails.fullDescription}`
        );
      }

      await delay(300);
    }

    if (!anyRouteFound) {
      console.warn('⚠️ No routes from TomTom, using fallback');
      return getFallbackRoutes(
        originLat,
        originLng,
        destLat,
        destLng,
        hasAccident,
        hasRoadClosure,
        destName
      );
    }

    routes.sort((a, b) => a.duration - b.duration);

    if (routes.length > 0) {
      const avoidingRoute = routes.find(
        (r) => r.summary?.avoidsDisruption === true
      );
      if (avoidingRoute) {
        avoidingRoute.isRecommended = true;
        avoidingRoute.recommendation = `✅ Recommended - Avoids ${avoid.join(
          ' & '
        )} via ${avoidingRoute.fullDescription}`;
      } else if (avoid.length > 0) {
        routes[0].isRecommended = true;
        routes[0].recommendation = `⚠️ No route fully avoids ${avoid.join(
          ' & '
        )}. Fastest option via ${routes[0].fullDescription}`;
      } else {
        routes[0].isRecommended = true;
        routes[0].recommendation = `✅ Best route via ${routes[0].fullDescription}`;
      }
    }

    return routes;
  } catch (error) {
    console.error('❌ Error getting routes:', error);
    return getFallbackRoutes(
      originLat,
      originLng,
      destLat,
      destLng,
      hasAccident,
      hasRoadClosure,
      destName
    );
  }
};

function getRouteRecommendation(
  type,
  summary,
  avoid,
  destName,
  fullDescription
) {
  const trafficDelay = summary.trafficDelayInSeconds || 0;
  const delayMinutes = trafficDelay / 60;

  let recommendation = '';

  if (avoid.length > 0) {
    recommendation = `✅ Best route to ${destName} avoiding ${avoid.join(
      ' & '
    )} via ${fullDescription}`;
  } else {
    if (type === 'fastest') {
      recommendation =
        delayMinutes > 5
          ? `⚠️ Some traffic expected but fastest to ${destName} via ${fullDescription}`
          : `✅ Best time-efficient route to ${destName} via ${fullDescription}`;
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

const getFallbackRoutes = (
  originLat,
  originLng,
  destLat,
  destLng,
  hasAccident,
  hasRoadClosure,
  destName
) => {
  console.log('🔄 Generating fallback routes');

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
  const avoidDescription =
    avoid.length > 0 ? ` avoiding ${avoid.join(' & ')}` : '';

  const routeDetails = {
    fastest: {
      roads: 'N1, N3',
      places: 'Midrand, Centurion, Pietermaritzburg',
      description:
        'N1 and N3 through Midrand, Centurion, and Pietermaritzburg',
    },
    shortest: {
      roads: 'R21, N3',
      places: 'Kempton Park, Heidelberg, Pietermaritzburg',
      description:
        'R21 and N3 through Kempton Park, Heidelberg, and Pietermaritzburg',
    },
    eco: {
      roads: 'N1, M13',
      places: 'Sandton, Kyalami, Pietermaritzburg',
      description:
        'N1 and M13 through Sandton, Kyalami, and Pietermaritzburg',
    },
    thrilling: {
      roads: 'M1, N3',
      places: 'Johannesburg CBD, Edenvale, Pietermaritzburg',
      description:
        'M1 and N3 through Johannesburg CBD, Edenvale, and Pietermaritzburg',
    },
  };

  const routeLabels = {
    fastest: 'Fastest',
    shortest: 'Shortest Distance',
    eco: 'Eco-Friendly',
    thrilling: 'Scenic',
  };

  const routeEmojis = {
    fastest: '⭐',
    shortest: '📏',
    eco: '🌱',
    thrilling: '🛣️',
  };

  const build = (type, multiplier, distanceMult, isRec) => ({
    id: `alt-fallback-${type}`,
    type,
    displayName: `${routeEmojis[type]} ${routeLabels[type]} Route to ${destName}${avoidText}`,
    duration: Math.round(baseDuration * multiplier),
    distance: Math.round(baseDistance * distanceMult),
    trafficDelay: 0,
    isRecommended: isRec,
    risk_level: 'low',
    description: `${routeLabels[type]} route${avoidDescription} via ${routeDetails[type].description}`,
    recommendation: `${routeEmojis[type]} ${
      routeLabels[type]
    } route to ${destName}${avoidDescription} via ${
      routeDetails[type].description
    }`,
    summary: {
      travelTime: Math.round(baseDuration * multiplier * 60),
      length: Math.round(baseDistance * distanceMult * 1000),
      trafficDelay: 0,
      avoidsDisruption: avoid.length > 0,
    },
    roads: routeDetails[type].roads,
    places: routeDetails[type].places,
    fullDescription: routeDetails[type].description,
    roadNames: routeDetails[type].roads.split(', '),
    placeNames: routeDetails[type].places.split(', '),
  });

  return [
    build('fastest', 0.9, 1.0, true),
    build('shortest', 0.95, 0.85, false),
    build('eco', 1.05, 1.02, false),
    build('thrilling', 1.2, 1.15, false),
  ];
};

/* ============================================================
   ROUTES ENDPOINT
============================================================ */

app.get('/api/routes', async (req, res) => {
  try {
    console.log('Fetching saved routes from optimized_routes...');

    const { data, error } = await supabase
      .from('optimized_routes')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(AbortSignal.timeout(10000));

    if (error) {
      console.error('Supabase routes query failed:', error.message);
      return res.status(500).json({
        error: 'Database error',
        details: error.message,
      });
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.log('No saved routes found.');
      return res.json([]);
    }

    const convertedRoutes = data.map((route) => {
      const startPoint =
        route.start_point && typeof route.start_point === 'object'
          ? route.start_point
          : {};

      const stops = Array.isArray(route.stops) ? route.stops : [];
      const lastStop = stops.length > 0 ? stops[stops.length - 1] : {};
      const result =
        route.result && typeof route.result === 'object' ? route.result : {};

      const originLat = Number(startPoint.lat) || 0;
      const originLng = Number(startPoint.lng) || 0;
      const destLat = Number(lastStop?.lat) || 0;
      const destLng = Number(lastStop?.lng) || 0;

      const originName =
        route.origin_name ||
        startPoint.name ||
        startPoint.label ||
        'Unknown Origin';

      const destinationName =
        route.destination_name ||
        lastStop?.name ||
        lastStop?.label ||
        'Unknown Destination';

      return {
        id: String(route.id),
        display_name: `${originName} → ${destinationName}`,
        origin_name: originName,
        destination_name: destinationName,
        origin_lat: originLat,
        origin_lng: originLng,
        dest_lat: destLat,
        dest_lng: destLng,
        distance_km: result.distanceKm ?? result.distance_km ?? 0,
        duration_min: result.durationMin ?? result.duration_min ?? 60,
        estimated_cost: result.estimated_cost ?? 0,
        traffic_delay:
          result.trafficDelayMin ?? result.traffic_delay ?? 0,
        alternatives: [],
        start_point: route.start_point,
        stops: route.stops,
        constraints: route.constraints,
        result: route.result,
        created_at: route.created_at,
      };
    });

    console.log(
      `Successfully returned ${convertedRoutes.length} saved routes.`
    );

    return res.json(convertedRoutes);
  } catch (error) {
    console.error('Error in GET /api/routes:', error);
    if (res.headersSent) return;
    return res.status(500).json({
      error: 'Failed to load routes',
      details: error.message,
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
      has_road_closure = 'false',
    } = req.query;

    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return res
        .status(400)
        .json({ error: 'Missing required parameters' });
    }

    const hasAccident = has_accident === 'true';
    const hasRoadClosure = has_road_closure === 'true';

    console.log(`🔄 Fetching alternatives for: ${destination_name}`);

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
      details: error.message,
    });
  }
});

/* ============================================================
   WEATHER FOR ROUTE ENDPOINT
============================================================ */

app.get('/api/weather/route', async (req, res) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng } = req.query;

    const originLatNum = parseFloat(origin_lat);
    const originLngNum = parseFloat(origin_lng);
    const destLatNum = parseFloat(dest_lat);
    const destLngNum = parseFloat(dest_lng);

    if (
      isNaN(originLatNum) ||
      isNaN(originLngNum) ||
      isNaN(destLatNum) ||
      isNaN(destLngNum)
    ) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        received: { origin_lat, origin_lng, dest_lat, dest_lng },
      });
    }

    if (
      originLatNum === 0 ||
      originLngNum === 0 ||
      destLatNum === 0 ||
      destLngNum === 0
    ) {
      return res.status(400).json({
        error: 'Invalid coordinates (zero value)',
      });
    }

    const originWeather = await getWeatherData(originLatNum, originLngNum);
    await delay(500);
    const destWeather = await getWeatherData(destLatNum, destLngNum);
    await delay(500);

    const midLat = (originLatNum + destLatNum) / 2;
    const midLng = (originLngNum + destLngNum) / 2;
    const midWeather = await getWeatherData(midLat, midLng);

    const responseData = {
      origin: originWeather,
      destination: destWeather,
      midpoint: midWeather,
      summary: {
        conditions: getRouteWeatherSummary(
          originWeather,
          destWeather,
          midWeather
        ),
        average_temp: calculateAverageTemp(
          originWeather,
          destWeather,
          midWeather
        ),
        recommendation: getWeatherRecommendation(
          originWeather,
          destWeather,
          midWeather
        ),
        weather_icons: getWeatherIcons(
          originWeather,
          destWeather,
          midWeather
        ),
      },
    };

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching weather:', error);
    res.status(500).json({
      error: 'Failed to fetch weather',
      details: error.message,
    });
  }
});

function getRouteWeatherSummary(origin, dest, mid) {
  const conditions = [];
  const getCondition = (w) => w?.current?.condition?.text || null;

  if (origin) conditions.push(getCondition(origin) || 'Unknown');
  if (dest) conditions.push(getCondition(dest) || 'Unknown');
  if (mid) conditions.push(getCondition(mid) || 'Unknown');

  const validConditions = conditions.filter(
    (c) => c !== null && c !== 'Unknown'
  );
  if (validConditions.length === 0) return 'Unknown';

  const counts = {};
  validConditions.forEach((c) => {
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
  if (origin?.current?.temp_c != null) temps.push(origin.current.temp_c);
  if (dest?.current?.temp_c != null) temps.push(dest.current.temp_c);
  if (mid?.current?.temp_c != null) temps.push(mid.current.temp_c);
  if (temps.length === 0) return 0;
  return Math.round(
    temps.reduce((a, b) => a + b, 0) / temps.length
  );
}

function getWeatherIcons(origin, dest, mid) {
  const getIcon = (w) => {
    const text = w?.current?.condition?.text?.toLowerCase() || '';
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
    midpoint: getIcon(mid),
  };
}

function getWeatherRecommendation(origin, dest, mid) {
  const weathers = [origin, dest, mid].filter(
    (w) => w?.current?.condition?.text
  );
  const badWeather = [
    'Rain',
    'Thunderstorm',
    'Snow',
    'Fog',
    'Mist',
    'Heavy rain',
    'Moderate rain',
    'Drizzle',
  ];

  let hasBadWeather = false;
  let recommendation = 'Good weather conditions for travel.';

  weathers.forEach((w) => {
    const text = w.current.condition.text || '';
    if (badWeather.some((b) => text.includes(b))) {
      hasBadWeather = true;
    }
  });

  if (hasBadWeather) {
    recommendation =
      '⚠️ Adverse weather conditions detected. Consider alternative routes or delay travel.';
  }
  return recommendation;
}

/* ============================================================
   TRAFFIC ENDPOINT
============================================================ */

app.get('/api/traffic/route', async (req, res) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng } = req.query;

    const trafficData = await getTomTomRoute(
      origin_lat,
      origin_lng,
      dest_lat,
      dest_lng,
      'fastest'
    );

    if (
      !trafficData ||
      !trafficData.routes ||
      trafficData.routes.length === 0
    ) {
      return res.json({
        hasTraffic: false,
        message: 'No traffic data available',
      });
    }

    const route = trafficData.routes[0];
    const summary = route.summary || {};
    const trafficDelay = summary.trafficDelayInSeconds || 0;
    const totalTime = summary.travelTimeInSeconds || 0;
    const hasTraffic = trafficDelay > 60;

    const incidents = route.guidance?.incidents || [];
    const hasAccident = incidents.some(
      (i) => i.type === 'Accident' || i.type === 'Incident'
    );
    const hasRoadClosure = incidents.some(
      (i) => i.type === 'RoadClosure' || i.type === 'Closure'
    );

    res.json({
      hasTraffic,
      hasAccident,
      hasRoadClosure,
      trafficDelayMinutes: Math.round(trafficDelay / 60),
      totalTimeMinutes: Math.round(totalTime / 60),
      incidents: incidents.map((i) => ({
        type: i.type,
        description: i.description,
        severity: i.severity,
      })),
      recommendation: getTrafficRecommendation(
        hasTraffic,
        hasAccident,
        hasRoadClosure
      ),
    });
  } catch (error) {
    console.error('❌ Error fetching traffic:', error);
    res.status(500).json({
      error: 'Failed to fetch traffic',
      details: error.message,
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

app.get('/api/simulations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('simulation_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return res
        .status(500)
        .json({ error: 'Database error', details: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Failed to fetch simulations',
      details: error.message,
    });
  }
});

app.get('/api/simulations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('simulation_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res
        .status(404)
        .json({ error: 'Simulation not found', details: error.message });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch simulation',
      details: error.message,
    });
  }
});

app.post('/api/simulations', async (req, res) => {
  try {
    const {
      name,
      routeId,
      routeName,
      params,
      current,
      optimal,
      alternatives,
      timestamp,
      recommendation,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Simulation name is required' });
    }

    const simulationData = {
      name,
      route_id: routeId || null,
      route_name: routeName || 'Unknown Route',
      parameters: { ...params, recommendation } || {},
      current_route: current || {},
      optimal_route: optimal || {},
      alternatives: alternatives || [],
      created_at: timestamp || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('simulation_results')
      .insert(simulationData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return res
        .status(500)
        .json({ error: 'Database error', details: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Failed to save simulation',
      details: error.message,
    });
  }
});

app.delete('/api/simulations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('simulation_results')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res
        .status(404)
        .json({ error: 'Simulation not found', details: error.message });
    }

    res.json({
      success: true,
      message: 'Simulation deleted successfully',
      deleted: data,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete simulation',
      details: error.message,
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
    aiProvider: 'groq',
    aiModel: AI_MODEL,
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    endpoints: {
      health: '/health',
      routes: '/api/routes',
      routesAlternatives: '/api/routes/alternatives',
      simulations: '/api/simulations',
      weather: '/api/weather/route',
      traffic: '/api/traffic/route',
      aiAnalyze: '/api/ai/analyze',
      aiAsk: '/api/ai/ask',
    },
  });
});

/* ============================================================
   AI ENDPOINTS (Groq)
============================================================ */

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { route, simulation, weather, traffic } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Groq API key not configured',
      });
    }

    const prompt = `You are a route risk analysis expert. Analyze this route simulation and return ONLY valid JSON.

Route: ${JSON.stringify(route || {})}
Simulation: ${JSON.stringify(simulation || {})}
Weather: ${JSON.stringify(weather?.summary || {})}
Traffic: ${JSON.stringify(traffic || {})}

Return JSON with this EXACT structure:
{
  "summary": "Brief 2-sentence analysis",
  "confidence": 85,
  "insights": [
    {"icon": "⏱️", "label": "Time Impact", "value": "12 min delay"},
    {"icon": "🌦️", "label": "Weather Risk", "value": "Moderate"},
    {"icon": "🚗", "label": "Traffic Risk", "value": "Low"},
    {"icon": "💰", "label": "Cost Impact", "value": "R150 extra"}
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "riskFactors": [
    {"label": "Heavy rain", "level": "high"},
    {"label": "Peak hour traffic", "level": "medium"}
  ],
  "historicalEvidence": "Based on 5 similar simulations"
}

Return ONLY JSON, no markdown, no explanation.`;

    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a route analysis AI. Return ONLY valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq error:', response.status, errorText);
      return res.status(response.status).json({
        success: false,
        error: `Groq API error: ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res
        .status(500)
        .json({ success: false, error: 'Empty AI response' });
    }

    // Strip code fences that Groq sometimes wraps around JSON
    content = content.trim();
    if (content.startsWith('```')) {
      content = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
    }

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseErr) {
      const first = content.indexOf('{');
      const last = content.lastIndexOf('}');
      if (first !== -1 && last > first) {
        analysis = JSON.parse(content.slice(first, last + 1));
      } else {
        throw parseErr;
      }
    }

    res.json({ success: true, analysis, historical: { count: 0 } });
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai/ask', async (req, res) => {
  try {
    const { question, route, simulation, weather, traffic } = req.body;

    if (!question) {
      return res
        .status(400)
        .json({ success: false, error: 'Question is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Groq API key not configured',
      });
    }

    const context = `
Route: ${JSON.stringify(route || {})}
Simulation: ${JSON.stringify(simulation || {})}
Weather: ${JSON.stringify(weather?.summary || {})}
Traffic: ${JSON.stringify(traffic || {})}
`;

    const response = await fetch(GROQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a helpful route assistant. Answer questions about the user's route based on this context:\n${context}\n\nKeep answers concise (2-4 sentences) and practical.`,
          },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq error:', response.status, errorText);
      return res.status(response.status).json({
        success: false,
        error: `Groq API error: ${response.status}`,
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return res
        .status(500)
        .json({ success: false, error: 'Empty AI response' });
    }

    res.json({ success: true, answer });
  } catch (error) {
    console.error('AI ask error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ============================================================
   START SERVER
============================================================ */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`🤖 AI: Groq | Model: ${AI_MODEL}`);
  console.log(`🔑 Groq configured: ${process.env.GROQ_API_KEY ? 'YES' : 'NO'}`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/routes`);
  console.log(`   GET  /api/routes/alternatives?...`);
  console.log(`   GET  /api/simulations`);
  console.log(`   POST /api/simulations`);
  console.log(`   GET  /api/simulations/:id`);
  console.log(`   DELETE /api/simulations/:id`);
  console.log(`   GET  /api/weather/route?...`);
  console.log(`   GET  /api/traffic/route?...`);
  console.log(`   POST /api/ai/analyze`);
  console.log(`   POST /api/ai/ask\n`);
});