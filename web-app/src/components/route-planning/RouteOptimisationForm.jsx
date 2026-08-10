import React, { useEffect, useState } from "react";
import { Navigation, MapPin, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const API_BASE_URL = "http://localhost:5000/api";

const RouteOptimisationForm = ({ onGenerateRoutes }) => {
  const [originPlace, setOriginPlace] = useState("");
  const [destinationPlace, setDestinationPlace] = useState("");
  const [vehicleType, setVehicleType] = useState("truck");
  const [loadWeight, setLoadWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [resolvingLoading, setResolvingLoading] = useState(false); // 🔥 NEW
  const [message, setMessage] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [originResolved, setOriginResolved] = useState(null);
  const [destinationResolved, setDestinationResolved] = useState(null);
  const [resolvedRouteLabels, setResolvedRouteLabels] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [resolvingProgress, setResolvingProgress] = useState({ current: 0, total: 0 }); // 🔥 NEW

  const log = (...args) => console.log("[RouteOptimisationForm]", ...args);

  const formatConstraints = (constraints) => {
    if (!constraints) return "No constraints set.";

    const parts = [];

    if (constraints.vehicleType) {
      parts.push(`vehicle type is ${constraints.vehicleType}`);
    }

    if (constraints.loadWeight !== null && constraints.loadWeight !== undefined) {
      parts.push(`load weight is ${constraints.loadWeight} kg`);
    }

    if (constraints.avoidTolls !== null && constraints.avoidTolls !== undefined) {
      parts.push(`${constraints.avoidTolls ? "avoid" : "allow"} toll roads`);
    }

    if (constraints.avoidHighways !== null && constraints.avoidHighways !== undefined) {
      parts.push(`${constraints.avoidHighways ? "avoid" : "allow"} highways`);
    }

    return parts.length > 0
      ? `Route requires that ${parts.join(", ")}.`
      : "No constraints set.";
  };

  const parseResponse = async (response, context) => {
    const text = await response.text();
    log(`${context} status:`, response.status);
    log(`${context} raw text:`, text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${context} returned HTML instead of JSON. Check API URL and route.`);
    }

    log(`${context} parsed JSON:`, data);
    return data;
  };

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("vehicle_id, registration_number, driver_id, route_id")
        .not("driver_id", "is", null)
        .order("vehicle_id", { ascending: true });

      if (error) throw error;

      setVehicles(
        (data || []).map((row) => ({
          id: row.vehicle_id,
          registrationNumber: row.registration_number || "",
          driverId: row.driver_id || "",
          routeId: row.route_id || "",
        }))
      );
    } catch (err) {
      setMessage(err.message || "Failed to load vehicles");
    }
  };

  const loadSavedRoutes = async () => {
    log("Loading saved routes...");
    setHistoryLoading(true);
    setMessage("");

    try {
      const url = `${API_BASE_URL}/optimized-routes`;
      const response = await fetch(url);
      const data = await parseResponse(response, "GET /optimized-routes");

      if (!response.ok) {
        throw new Error(data.error || "Failed to load saved routes");
      }

      setSavedRoutes(Array.isArray(data.data) ? data.data : []);
      log("Saved routes updated");
    } catch (error) {
      console.error("[RouteOptimisationForm] loadSavedRoutes error:", error);
      setMessage(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const geocodePlace = async (query) => {
    log("Geocoding place:", query);

    const url = `${API_BASE_URL}/geocode?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await parseResponse(response, "GET /geocode");

    if (!response.ok) {
      throw new Error(data.error || `Failed to geocode ${query}`);
    }

    return data.data;
  };

  const reverseGeocodePoint = async (lat, lng) => {
    log("Reverse geocoding point:", { lat, lng });

    try {
      const url = `${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`Reverse geocoding failed for (${lat}, ${lng}):`, response.status);
        return null;
      }

      const data = await parseResponse(response, "GET /reverse-geocode");
      
      if (!data || !data.data || !data.data.label) {
        console.warn(`No label found for (${lat}, ${lng})`);
        return null;
      }

      return data.data;
    } catch (error) {
      console.error(`Reverse geocoding error for (${lat}, ${lng}):`, error);
      return null;
    }
  };

  const resolveSavedRoutes = async () => {
    if (savedRoutes.length === 0) {
      setResolvedRouteLabels({});
      return;
    }

    log(`Resolving ${savedRoutes.length} saved routes...`);
    setResolvingLoading(true);
    setResolvingProgress({ current: 0, total: savedRoutes.length });
    
    const next = {};
    let processed = 0;

    for (const item of savedRoutes) {
      try {
        let startLabel = "Unknown";
        if (item.start_point) {
          try {
            const result = await reverseGeocodePoint(item.start_point.lat, item.start_point.lng);
            startLabel = result?.label || "Unknown location";
          } catch (error) {
            console.error(`Failed to resolve start for route ${item.id}:`, error);
            startLabel = "Unknown location";
          }
        }

        const stopLabels = [];
        if (item.stops && Array.isArray(item.stops) && item.stops.length > 0) {
          // Resolve each stop
          for (let i = 0; i < item.stops.length; i++) {
            const stop = item.stops[i];
            try {
              const result = await reverseGeocodePoint(stop.lat, stop.lng);
              if (result?.label) {
                stopLabels.push(result.label);
              } else {
                stopLabels.push(`Stop ${i + 1} (${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)})`);
              }
            } catch (error) {
              console.error(`Failed to resolve stop ${i} for route ${item.id}:`, error);
              stopLabels.push(`Stop ${i + 1} (unresolved)`);
            }
          }
        } 
        else if (item.end_point) {
          try {
            const result = await reverseGeocodePoint(item.end_point.lat, item.end_point.lng);
            if (result?.label) {
              stopLabels.push(result.label);
            } else {
              stopLabels.push(`Destination (${item.end_point.lat.toFixed(4)}, ${item.end_point.lng.toFixed(4)})`);
            }
          } catch (error) {
            console.error(`Failed to resolve end point for route ${item.id}:`, error);
            stopLabels.push("Destination (unresolved)");
          }
        }

        next[item.id] = {
          start: startLabel,
          stops: stopLabels.length > 0 ? stopLabels : ["No stops"],
        };
        
        processed++;
        setResolvingProgress({ current: processed, total: savedRoutes.length });
        
      } catch (error) {
        console.error(`[RouteOptimisationForm] Failed resolving route ${item.id}:`, error);
        next[item.id] = {
          start: "Error resolving",
          stops: ["Error resolving"],
        };
        processed++;
        setResolvingProgress({ current: processed, total: savedRoutes.length });
      }
    }

    setResolvedRouteLabels(next);
    setResolvingLoading(false);
    setResolvingProgress({ current: 0, total: 0 });
    log("Finished resolving routes");
  };

  useEffect(() => {
    loadSavedRoutes();
    loadVehicles();
  }, []);

  useEffect(() => {
    if (savedRoutes.length > 0) {
      resolveSavedRoutes();
    }
  }, [savedRoutes]);

  const assignRouteToVehicle = async (vehicleId, routeId) => {
    if (!vehicleId) {
      setMessage("Please select a vehicle with a driver first.");
      return;
    }

    if (!routeId) {
      setMessage("Route id not found.");
      return;
    }

    setAssigningLoading(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ route_id: routeId })
        .eq("vehicle_id", vehicleId);

      if (error) throw error;

      setVehicles((prev) =>
        prev.map((v) =>
          String(v.id) === String(vehicleId) ? { ...v, routeId } : v
        )
      );

      setMessage("Route assigned to vehicle successfully.");
    } catch (err) {
      setMessage(err.message || "Failed to assign route to vehicle");
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleGenerateRoutes = async () => {
    log("Generate clicked");

    if (!originPlace.trim() || !destinationPlace.trim()) {
      setMessage("Please enter both origin and destination.");
      log("Validation failed: missing origin/destination");
      return;
    }

    setLoading(true);
    setMessage("");
    setLatestResult(null);

    try {
      const origin = await geocodePlace(originPlace);
      const destination = await geocodePlace(destinationPlace);

      log("Origin resolved:", origin);
      log("Destination resolved:", destination);

      setOriginResolved(origin);
      setDestinationResolved(destination);

      const payload = {
        start: { lat: origin.lat, lng: origin.lng },
        stops: [{ lat: destination.lat, lng: destination.lng }],
        constraints: {
          vehicleType,
          loadWeight: loadWeight ? Number(loadWeight) : null,
        },
      };

      log("Optimize payload:", payload);

      if (onGenerateRoutes) {
        onGenerateRoutes({
          originPlace,
          destinationPlace,
          origin,
          destination,
          vehicleType,
          loadWeight,
        });
      }

      const response = await fetch(`${API_BASE_URL}/optimize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(response, "POST /optimize");

      if (!response.ok) {
        throw new Error(data.error || "Failed to optimize route");
      }

      setLatestResult(data);
      setMessage("Route optimized successfully.");

      const { data: latestRoute, error: latestRouteError } = await supabase
        .from("optimized_routes")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (latestRouteError) {
        throw latestRouteError;
      }

      const routeId = latestRoute?.id;
      console.log("latest route id:", routeId);

      if (routeId && selectedVehicleId) {
        await assignRouteToVehicle(selectedVehicleId, routeId);
      }

      await loadSavedRoutes();
      await loadVehicles();
    } catch (error) {
      console.error("[RouteOptimisationForm] handleGenerateRoutes error:", error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const assignedVehicles = vehicles.filter((v) => v.driverId);

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <h2 className="font-bold text-lg mb-4 text-gray-900">Route Optimisation</h2>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 block mb-1">
            <MapPin className="w-3 h-3 inline mr-1" /> Origin
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            value={originPlace}
            onChange={(e) => setOriginPlace(e.target.value)}
            placeholder="Enter a place, e.g. Sandton City, Johannesburg"
          />
          {originResolved ? (
            <p className="text-xs text-gray-500 mt-1">
              Resolved: {originResolved.label} ({originResolved.lat}, {originResolved.lng})
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Destination</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            value={destinationPlace}
            onChange={(e) => setDestinationPlace(e.target.value)}
            placeholder="Enter a place, e.g. OR Tambo International Airport"
          />
          {destinationResolved ? (
            <p className="text-xs text-gray-500 mt-1">
              Resolved: {destinationResolved.label} ({destinationResolved.lat}, {destinationResolved.lng})
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* vehicle type and load inputs intentionally kept commented out */}
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Assign to Vehicle</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            <option value="">Select vehicle with assigned driver</option>
            {assignedVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateRoutes}
          disabled={loading || assigningLoading}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Navigation className="w-4 h-4" />
          {loading ? "Generating..." : "Generate Routes"}
        </button>

        {message ? (
          <div className="text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3">
            {message}
          </div>
        ) : null}

        {latestResult ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-1">
            <h3 className="font-semibold text-blue-900">Latest Result</h3>
            <p className="text-sm text-blue-900">Distance: {latestResult.distanceKm} km</p>
            <p className="text-sm text-blue-900">Duration: {latestResult.durationMin} min</p>
            <p className="text-sm text-blue-900">Traffic delay: {latestResult.trafficDelayMin} min</p>
          </div>
        ) : null}

        <div className="pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Saved Optimized Routes</h3>
            <button 
              onClick={loadSavedRoutes} 
              disabled={historyLoading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {historyLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {resolvingLoading && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Resolving route locations...
                  </p>
                  <p className="text-xs text-blue-700">
                    {resolvingProgress.current} of {resolvingProgress.total} routes processed
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${resolvingProgress.total > 0 
                      ? (resolvingProgress.current / resolvingProgress.total) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          )}

          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading saved routes...
            </div>
          ) : savedRoutes.length === 0 ? (
            <p className="text-sm text-gray-500">No saved routes yet.</p>
          ) : (
            <div className="space-y-4">
              {savedRoutes.map((item) => {
                const labels = resolvedRouteLabels[item.id];
                const isResolving = resolvingLoading && !labels;
                
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">
                          Route #{item.id}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "Unknown date"}
                        </p>
                      </div>

                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {item.result?.distanceKm ?? "N/A"} km
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Start
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {isResolving ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Resolving...
                            </span>
                          ) : labels?.start || "Unknown"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Stops ({labels?.stops?.length || 0})
                        </p>
                        <p className="mt-1 text-sm text-gray-900">
                          {isResolving ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Resolving...
                            </span>
                          ) : labels?.stops?.length > 0 ? (
                            labels.stops.join(" → ")
                          ) : (
                            "No stops"
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Constraints
                        </p>
                        <p className="mt-1 text-sm text-gray-900">
                          {formatConstraints(item.constraints)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Timing
                        </p>
                        <p className="mt-1 text-sm text-gray-900">
                          Duration: {item.result?.durationMin ?? "N/A"} min
                        </p>
                        <p className="text-sm text-gray-900">
                          Traffic delay: {item.result?.trafficDelayMin ?? "N/A"} min
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimisationForm;