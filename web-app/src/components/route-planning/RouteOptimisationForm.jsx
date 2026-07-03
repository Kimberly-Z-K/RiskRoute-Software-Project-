import React, { useEffect, useState } from "react";
import { Navigation, MapPin } from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const RouteOptimisationForm = ({ onGenerateRoutes }) => {
  const [originPlace, setOriginPlace] = useState("");
  const [destinationPlace, setDestinationPlace] = useState("");
  const [vehicleType, setVehicleType] = useState("truck");
  const [loadWeight, setLoadWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [latestResult, setLatestResult] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [originResolved, setOriginResolved] = useState(null);
  const [destinationResolved, setDestinationResolved] = useState(null);
  const [resolvedRouteLabels, setResolvedRouteLabels] = useState({});

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

  const loadSavedRoutes = async () => {
    log("Loading saved routes...");
    setHistoryLoading(true);
    setMessage("");

    try {
      const url = `${API_BASE_URL}/optimized-routes`;
      log("GET URL:", url);

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
    log("Geocode URL:", url);

    const response = await fetch(url);
    const data = await parseResponse(response, "GET /geocode");

    if (!response.ok) {
      throw new Error(data.error || `Failed to geocode ${query}`);
    }

    return data.data;
  };

  const reverseGeocodePoint = async (lat, lng) => {
    log("Reverse geocoding point:", { lat, lng });

    const url = `${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`;
    log("Reverse geocode URL:", url);

    const response = await fetch(url);
    const data = await parseResponse(response, "GET /reverse-geocode");

    if (!response.ok) {
      throw new Error(data.error || "Reverse geocoding failed");
    }

    return data.data;
  };

  const resolveSavedRoutes = async () => {
    log("Resolving saved route labels...");
    const next = {};

    for (const item of savedRoutes) {
      try {
        const startLabel = item.start_point
          ? await reverseGeocodePoint(item.start_point.lat, item.start_point.lng)
          : null;

        const stopLabels = Array.isArray(item.stops)
          ? await Promise.all(
              item.stops.map((stop) => reverseGeocodePoint(stop.lat, stop.lng))
            )
          : [];

        next[item.id] = {
          start: startLabel?.label || "Unknown",
          stops: stopLabels.map((s) => s.label),
        };

        log(`Resolved labels for route ${item.id}:`, next[item.id]);
      } catch (error) {
        console.error(`[RouteOptimisationForm] Failed resolving route ${item.id}:`, error);
        next[item.id] = {
          start: "Unknown",
          stops: [],
        };
      }
    }

    setResolvedRouteLabels(next);
  };

  useEffect(() => {
    loadSavedRoutes();
  }, []);

  useEffect(() => {
    if (savedRoutes.length > 0) {
      resolveSavedRoutes();
    }
  }, [savedRoutes]);

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
      log("Optimization success:", data);

      await loadSavedRoutes();
    } catch (error) {
      console.error("[RouteOptimisationForm] handleGenerateRoutes error:", error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

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
          <div>
            <label className="text-sm text-gray-600 block mb-1">Vehicle</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="truck">Truck</option>
              <option value="van">Van</option>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Load (kg)</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={loadWeight}
              onChange={(e) => setLoadWeight(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateRoutes}
          disabled={loading}
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
            <button onClick={loadSavedRoutes} className="text-sm text-blue-600 hover:text-blue-700">
              Refresh
            </button>
          </div>

          {historyLoading ? (
            <p className="text-sm text-gray-500">Loading saved routes...</p>
          ) : savedRoutes.length === 0 ? (
            <p className="text-sm text-gray-500">No saved routes yet.</p>
          ) : (
          <div className="space-y-4">
            {savedRoutes.map((item) => (
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
                      {resolvedRouteLabels[item.id]?.start || "Resolving..."}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Stops
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {resolvedRouteLabels[item.id]?.stops?.length > 0
                        ? resolvedRouteLabels[item.id].stops.join(", ")
                        : "Resolving..."}
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
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimisationForm;