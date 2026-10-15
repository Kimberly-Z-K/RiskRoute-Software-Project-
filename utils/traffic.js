// Live traffic for the driver's route, using the TomTom Routing API.
// It returns real traffic-aware travel times (free-flow time vs. time with
// current traffic), so delays are real, not guessed from a road-speed estimate.
//
// Needs a TomTom API key in EXPO_PUBLIC_TOMTOM_API_KEY. Without it (or if the
// service fails) this throws, and the UI says "unavailable" instead of
// pretending the roads are clear.

const ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute";
const MAX_POINTS = 100;

export class TrafficError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TrafficError";
    this.code = code; // 'no_key' | 'bad_key' | 'quota' | 'network' | 'no_route'
  }
}

export const SEVERITY_ORDER = ["clear", "light", "moderate", "heavy"];

export const SEVERITY_LABEL = {
  clear: "Clear",
  light: "Light traffic",
  moderate: "Moderate traffic",
  heavy: "Heavy traffic",
};

// delaySeconds = extra time caused by traffic, freeFlowSeconds = time with no traffic
export function classifyTraffic({ delaySeconds, freeFlowSeconds }) {
  const delayMin = Math.max(0, delaySeconds) / 60;
  const ratio = freeFlowSeconds > 0 ? Math.max(0, delaySeconds) / freeFlowSeconds : 0;

  if (delayMin >= 15 || ratio >= 0.5) return "heavy";
  if (delayMin >= 7 || ratio >= 0.25) return "moderate";
  if (delayMin >= 2 || ratio >= 0.1) return "light";
  return "clear";
}

export function buildTrafficUrl(points, key) {
  const locations = points
    .slice(0, MAX_POINTS)
    .map((p) => `${Number(p.latitude).toFixed(5)},${Number(p.longitude).toFixed(5)}`)
    .join(":");

  const params = new URLSearchParams({
    key,
    traffic: "true",
    travelMode: "car",
    computeTravelTimeFor: "all",
    routeRepresentation: "summaryOnly",
  });

  return `${ROUTING_URL}/${locations}/json?${params.toString()}`;
}

export function parseTrafficResponse(json, now = Date.now) {
  const summary = json?.routes?.[0]?.summary;
  if (!summary) throw new TrafficError("no_route", "No route found for traffic lookup");

  const travelSeconds = Number(summary.travelTimeInSeconds || 0);
  const delaySeconds = Math.max(0, Number(summary.trafficDelayInSeconds || 0));
  const freeFlowSeconds = Number(
    summary.noTrafficTravelTimeInSeconds ?? Math.max(0, travelSeconds - delaySeconds)
  );

  const severity = classifyTraffic({ delaySeconds, freeFlowSeconds });

  return {
    severity,
    label: SEVERITY_LABEL[severity],
    delayMin: Math.round(delaySeconds / 60),
    travelMin: Math.round(travelSeconds / 60),
    freeFlowMin: Math.round(freeFlowSeconds / 60),
    distanceKm: Number(summary.lengthInMeters || 0) / 1000,
    etaIso: summary.arrivalTime || new Date(now() + travelSeconds * 1000).toISOString(),
    fetchedAt: now(),
  };
}

// points: [{ latitude, longitude }, ...] starting where the driver is (or the
// last completed stop) followed by the remaining stops, in order.
export async function getLiveTraffic(points, options = {}) {
  const {
    key = 'sZ2JQMI2aVOdYm6epfHKsapsZWLCbTzI',
    fetchImpl = fetch,
    timeoutMs = 15000,
    now = Date.now,
  } = options;

  if (!Array.isArray(points) || points.length < 2) return null;
  if (!key) {
    throw new TrafficError("no_key", "Live traffic is not set up (missing TomTom key)");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(buildTrafficUrl(points, key), { signal: controller.signal });

    if (res.status === 401 || res.status === 403) {
      throw new TrafficError("bad_key", "The TomTom key was rejected");
    }
    if (res.status === 429) {
      throw new TrafficError("quota", "Traffic lookups are over the daily limit");
    }
    if (!res.ok) {
      throw new TrafficError("network", `Traffic service answered HTTP ${res.status}`);
    }

    return parseTrafficResponse(await res.json(), now);
  } catch (e) {
    if (e instanceof TrafficError) throw e;
    throw new TrafficError("network", `Could not reach the traffic service (${e?.message || "network error"})`);
  } finally {
    clearTimeout(timer);
  }
}
