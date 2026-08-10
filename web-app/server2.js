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

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🚀 Server starting...');
console.log('📡 Supabase URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('🔑 Supabase Key:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

/* ============================================================
   REVERSE GEOCODE FUNCTION - Using OpenStreetMap Nominatim (Free)
============================================================ */

const reverseGeocode = async (lat, lng) => {
  try {
    // Use OpenStreetMap Nominatim (free, no API key required)
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RiskRoute-App/1.0' // Required by Nominatim
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Try to get city/town name from the address
    const address = data?.address;
    if (address) {
      // Try different fields in order of preference
      return address.city || 
             address.town || 
             address.village || 
             address.suburb || 
             address.county ||
             address.state_district ||
             address.state ||
             "Unknown Location";
    }
    
    return "Unknown Location";
  } catch (error) {
    console.error('❌ Reverse geocode error:', error.message);
    return "Unknown Location";
  }
};

// Delay function to respect rate limits (1 request per second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ============================================================
   GET ROUTES FROM OPTIMIZED_ROUTES TABLE
============================================================ */

app.get('/api/routes', async (req, res) => {
  try {
    console.log('🔄 Fetching routes from optimized_routes...');
    
    // Fetch all routes from optimized_routes table
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
      console.log('⚠️ No routes found in optimized_routes table');
      return res.status(404).json({ 
        error: 'No routes found',
        message: 'The optimized_routes table is empty'
      });
    }

    console.log(`✅ Found ${data.length} routes in database`);

    // Convert each route with reverse geocoding - with delays to respect rate limits
    const convertedRoutes = [];
    
    for (let index = 0; index < data.length; index++) {
      const route = data[index];
      try {
        console.log(`🔄 Processing route ${index + 1}/${data.length} (ID: ${route.id})...`);
        
        // Add delay between requests to respect rate limits (1 second between calls)
        await delay(1000);
        
        // Get origin name from start_point
        let origin = "Unknown Origin";
        if (route.start_point && route.start_point.lat && route.start_point.lng) {
          origin = await reverseGeocode(
            route.start_point.lat,
            route.start_point.lng
          );
        } else {
          console.warn(`⚠️ Route ${route.id} has no start_point`);
        }

        // Add another delay before the second request
        await delay(1000);
        
        // Get destination from last stop
        let destination = "Unknown Destination";
        const stops = route.stops || [];
        
        if (stops.length > 0) {
          const lastStop = stops[stops.length - 1];
          if (lastStop && lastStop.lat && lastStop.lng) {
            destination = await reverseGeocode(
              lastStop.lat,
              lastStop.lng
            );
          } else {
            console.warn(`⚠️ Route ${route.id} has invalid last stop`);
          }
        } else {
          console.warn(`⚠️ Route ${route.id} has no stops`);
        }

        // Get data from result field or use defaults
        const result = route.result || {};

        // Return in format SimulationControls expects
        const convertedRoute = {
          id: String(route.id),
          display_name: `${origin} → ${destination}`,
          origin_name: origin,
          destination_name: destination,
          distance_km: result.distanceKm || result.distance_km || 0,
          duration_min: result.durationMin || result.duration_min || 60,
          estimated_cost: result.estimated_cost || 0,
          traffic_delay: result.trafficDelayMin || result.traffic_delay || 0,
          // Keep original data for reference
          start_point: route.start_point,
          stops: route.stops,
          constraints: route.constraints,
          result: route.result,
          created_at: route.created_at
        };

        console.log(`✅ Route ${route.id} converted: ${convertedRoute.display_name}`);
        convertedRoutes.push(convertedRoute);

      } catch (err) {
        console.error(`❌ Error processing route ${route.id}:`, err.message);
        const result = route.result || {};
        convertedRoutes.push({
          id: String(route.id),
          display_name: `Route ${route.id}`,
          origin_name: 'Unknown',
          destination_name: 'Unknown',
          distance_km: result.distanceKm || result.distance_km || 0,
          duration_min: result.durationMin || result.duration_min || 60,
          estimated_cost: result.estimated_cost || 0,
          traffic_delay: result.trafficDelayMin || result.traffic_delay || 0,
          start_point: route.start_point,
          stops: route.stops,
          constraints: route.constraints,
          result: route.result,
          created_at: route.created_at
        });
      }
    }

    console.log(`✅ Successfully converted ${convertedRoutes.length} routes`);
    
    // Log the first route for debugging
    if (convertedRoutes.length > 0) {
      console.log('📋 First converted route:', convertedRoutes[0]);
    }
    
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
   TEST TABLE STRUCTURE ENDPOINT
============================================================ */

app.get('/api/test-table', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('optimized_routes')
      .select('*')
      .limit(1);

    if (error) {
      return res.json({ error: error.message });
    }

    res.json({
      hasData: data && data.length > 0,
      structure: data && data.length > 0 ? Object.keys(data[0]) : [],
      sample: data && data.length > 0 ? data[0] : null
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/* ============================================================
   START SERVER
============================================================ */

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 Routes endpoint: http://localhost:${PORT}/api/routes`);
  console.log(`📡 Test table endpoint: http://localhost:${PORT}/api/test-table`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🗺️ Using OpenStreetMap Nominatim for geocoding (free, no API key required)`);
});