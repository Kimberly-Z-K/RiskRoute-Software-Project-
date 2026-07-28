import { Router } from "express";
import { optimizeRouteTomTom } from "../services/tomtom.js";
import { getTrafficIncidentsTomTom, getTrafficFlowTomTom } from "../services/traffic.js";
import { supabase } from "../../lib/supabase.js";

const router = Router();
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

function isValidPoint(point) {
  return (
    point &&
    typeof point === "object" &&
    typeof point.lat === "number" &&
    typeof point.lng === "number"
  );
}

async function geocodePlace(query) {
  console.log("[geocodePlace] query:", query);

  if (!query || !query.trim()) {
    throw new Error("Geocode query is required");
  }

  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(
    query.trim()
  )}.json?key=${TOMTOM_API_KEY}&limit=1`;

  console.log("[geocodePlace] url:", url);

  const response = await fetch(url);
  console.log("[geocodePlace] status:", response.status);

  const data = await response.json();
  console.log("[geocodePlace] raw data:", JSON.stringify(data, null, 2));

  const result = data?.results?.[0];
  const position = result?.position;

  if (!position || typeof position.lat !== "number" || typeof position.lon !== "number") {
    throw new Error(`Could not geocode: ${query}`);
  }

  const resolved = {
    label: result?.address?.freeformAddress || query.trim(),
    lat: position.lat,
    lng: position.lon,
  };

  console.log("[geocodePlace] resolved:", resolved);
  return resolved;
}

async function reverseGeocode(lat, lng) {
  console.log("[reverseGeocode] lat/lng:", lat, lng);

  const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_API_KEY}&limit=1`;

  console.log("[reverseGeocode] url:", url);

  const response = await fetch(url);
  console.log("[reverseGeocode] status:", response.status);

  const data = await response.json();
  console.log("[reverseGeocode] raw data:", JSON.stringify(data, null, 2));

  const result = data?.addresses?.[0];
  const address = result?.address;

  if (!address) {
    throw new Error(`Could not reverse geocode: ${lat}, ${lng}`);
  }

  const resolved = {
    label: address?.freeformAddress || address?.streetName || `${lat}, ${lng}`,
    lat,
    lng,
    raw: result,
  };

  console.log("[reverseGeocode] resolved:", resolved);
  return resolved;
}

async function reverseGeocodeIncident(incident) {
  try {
    const coords = incident?.geometry?.coordinates || [];
    const first = coords[0];

    if (!first || first.length < 2) {
      return { ...incident, locationName: "Nearby" };
    }

    const lng = first[0];
    const lat = first[1];

    const place = await reverseGeocode(lat, lng);

    return {
      ...incident,
      locationName: place?.label || "Nearby",
    };
  } catch (error) {
    console.log("[reverseGeocodeIncident] error:", error.message);
    return {
      ...incident,
      locationName: "Nearby",
    };
  }
}

router.get("/geocode", async (req, res) => {
  console.log("=== GET /api/geocode ===");
  console.log("Query:", req.query);

  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      console.log("[/geocode] invalid query");
      return res.status(400).json({
        success: false,
        error: "query is required",
      });
    }

    const place = await geocodePlace(query);

    console.log("[/geocode] success:", place);
    return res.json({
      success: true,
      data: place,
    });
  } catch (error) {
    console.log("[/geocode] error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/reverse-geocode", async (req, res) => {
  console.log("=== GET /api/reverse-geocode ===");
  console.log("Query:", req.query);

  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.log("[/reverse-geocode] invalid lat/lng");
      return res.status(400).json({
        success: false,
        error: "lat and lng query parameters are required and must be numbers",
      });
    }

    const place = await reverseGeocode(lat, lng);

    console.log("[/reverse-geocode] success:", place);
    return res.json({
      success: true,
      data: place,
    });
  } catch (error) {
    console.log("[/reverse-geocode] error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/optimize", async (req, res) => {
  console.log("=== POST /api/optimize ===");
  console.log("Body:", JSON.stringify(req.body, null, 2));

  try {
    const { start, stops = [], constraints = {} } = req.body;

    console.log("[/optimize] parsed start:", start);
    console.log("[/optimize] parsed stops:", stops);
    console.log("[/optimize] parsed constraints:", constraints);

    if (!isValidPoint(start)) {
      console.log("[/optimize] invalid start");
      return res.status(400).json({
        success: false,
        error: "start is required and must be an object with numeric lat and lng",
      });
    }

    if (!Array.isArray(stops)) {
      console.log("[/optimize] stops not array");
      return res.status(400).json({
        success: false,
        error: "stops must be an array",
      });
    }

    for (const stop of stops) {
      if (!isValidPoint(stop)) {
        console.log("[/optimize] invalid stop:", stop);
        return res.status(400).json({
          success: false,
          error: "Each stop must be an object with numeric lat and lng",
        });
      }
    }

    console.log("[/optimize] calling TomTom optimizer...");
    const tomtomData = await optimizeRouteTomTom(start, stops, constraints);
    console.log("[/optimize] TomTom response:", JSON.stringify(tomtomData, null, 2));

    const route = tomtomData?.routes?.[0];
    const summary = route?.summary || {};
    const optimizedWaypoints = route?.optimizedWaypoints || [];

    const cleanedResult = {
      distanceKm: (summary.lengthInMeters || 0) / 1000,
      durationMin: Math.round((summary.travelTimeInSeconds || 0) / 60),
      trafficDelayMin: Math.round((summary.trafficDelayInSeconds || 0) / 60),
      optimizedWaypoints,
      geometry: route?.legs || [],
    };

    console.log("[/optimize] cleanedResult:", JSON.stringify(cleanedResult, null, 2));

    const insertPayload = {
      start_point: start,
      stops,
      constraints,
      result: cleanedResult,
    };

    console.log("[/optimize] inserting into Supabase:", JSON.stringify(insertPayload, null, 2));

    const { error } = await supabase.from("optimized_routes").insert(insertPayload);

    if (error) {
      console.log("[/optimize] Supabase insert error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    console.log("[/optimize] insert successful");

    return res.json({
      success: true,
      ...cleanedResult,
    });
  } catch (error) {
    console.log("[/optimize] failed:", error);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

router.get("/optimized-routes", async (req, res) => {
  console.log("=== GET /api/optimized-routes ===");

  try {
    const { data, error } = await supabase
      .from("optimized_routes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("[/optimized-routes] Supabase fetch error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    console.log("[/optimized-routes] count:", data?.length || 0);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.log("[/optimized-routes] failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/traffic/incidents", async (req, res) => {
  console.log("=== GET /api/traffic/incidents ===");
  console.log("Query:", req.query);

  try {
    const { bbox } = req.query;

    if (!bbox || typeof bbox !== "string") {
      return res.status(400).json({
        success: false,
        error: "bbox is required",
      });
    }

    const data = await getTrafficIncidentsTomTom(bbox);
    const incidents = data?.incidents || data?.data?.incidents || [];

    const enrichedIncidents = await Promise.all(
      incidents.map((incident) => reverseGeocodeIncident(incident))
    );

    return res.json({
      success: true,
      data: {
        incidents: enrichedIncidents,
      },
    });
  } catch (error) {
    console.log("[/traffic/incidents] error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/traffic/flow", async (req, res) => {
  console.log("=== GET /api/traffic/flow ===");
  console.log("Query:", req.query);

  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: "lat and lng are required and must be numbers",
      });
    }

    const data = await getTrafficFlowTomTom(lat, lng);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.log("[/traffic/flow] error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;