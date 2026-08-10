const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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
console.log('🗺️ TomTom Key:', process.env.TOMTOM_API_KEY ? '✅ Set' : '❌ Missing');

/* ============================================================
   REVERSE GEOCODE FUNCTION
============================================================ */

const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${process.env.TOMTOM_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Try to get municipality (city/town name)
    const municipality = data?.addresses?.[0]?.address?.municipality;
    if (municipality) {
      return municipality;
    }
    
    // Fallback to freeform address
    const freeform = data?.addresses?.[0]?.address?.freeformAddress;
    if (freeform) {
      return freeform;
    }
    
    // Try to get locality or country subdivision
    const locality = data?.addresses?.[0]?.address?.countrySubdivision;
    if (locality) {
      return locality;
    }
    
    return "Unknown Location";
  } catch (error) {
    console.error('❌ Reverse geocode error:', error.message);
    return "Unknown Location";
  }
};

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

    // Convert each route with reverse geocoding
    const convertedRoutes = await Promise.all(
      data.map(async (route, index) => {
        try {
          console.log(`🔄 Processing route ${index + 1}/${data.length} (ID: ${route.id})...`);
          
          // Log the route data for debugging
          console.log(`📦 Route ${route.id}: start_point =`, route.start_point);
          console.log(`📦 Route ${route.id}: stops =`, route.stops);
          
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
            distance_km: result.distance_km || 0,
            duration_min: result.duration_min || 60,
            estimated_cost: result.estimated_cost || 0,
            traffic_delay: result.traffic_delay || 0,
            // Keep original data for reference
            start_point: route.start_point,
            stops: route.stops,
            constraints: route.constraints,
            result: route.result,
            created_at: route.created_at
          };

          console.log(`✅ Route ${route.id} converted: ${convertedRoute.display_name}`);
          return convertedRoute;

        } catch (err) {
          console.error(`❌ Error processing route ${route.id}:`, err.message);
          const result = route.result || {};
          return {
            id: String(route.id),
            display_name: `Route ${route.id}`,
            origin_name: 'Unknown',
            destination_name: 'Unknown',
            distance_km: result.distance_km || 0,
            duration_min: result.duration_min || 60,
            estimated_cost: result.estimated_cost || 0,
            traffic_delay: result.traffic_delay || 0,
            start_point: route.start_point,
            stops: route.stops,
            constraints: route.constraints,
            result: route.result,
            created_at: route.created_at
          };
        }
      })
    );

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
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});