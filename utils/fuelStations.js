const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export const REQUEST_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
  "User-Agent": "RiskRoute/1.0 (React Native fleet app)",
};

const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function cumulativeKm(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(
      cum[i - 1] +
        haversineKm(
          points[i - 1].latitude,
          points[i - 1].longitude,
          points[i].latitude,
          points[i].longitude
        )
    );
  }
  return cum;
}

export function downsampleRoute(points, spacingKm = 1.5, maxPoints = 150) {
  if (points.length <= 2) return points.slice();
  const cum = cumulativeKm(points);
  const total = cum[cum.length - 1];
  const spacing = Math.max(spacingKm, total / (maxPoints - 1));
  const out = [points[0]];
  let lastKept = 0;
  for (let i = 1; i < points.length - 1; i++) {
    if (cum[i] - lastKept >= spacing) {
      out.push(points[i]);
      lastKept = cum[i];
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export function buildOverpassQuery(points, radiusMeters, timeoutSec = 20) {
  const line = points
    .map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`)
    .join(",");
  return (
    `[out:json][timeout:${timeoutSec}];\n` +
    `nwr["amenity"="fuel"](around:${Math.round(radiusMeters)},${line});\n` +
    `out center tags;`
  );
}

function hostOf(url) {
  return url.replace(/^https?:\/\//, "").split("/")[0];
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });
}

function fetchOverpass(
  query,
  { endpoints, fetchImpl, timeoutMs, staggerMs = 4000, retries = 2, retryDelayMs = 2500 }
) {
  return new Promise((resolve, reject) => {
    const controllers = [];
    const timers = [];
    const started = new Array(endpoints.length).fill(false);
    const errors = [];
    let settled = false;
    let failed = 0;

    const cleanup = () => {
      timers.forEach(clearTimeout);
      controllers.forEach((c) => c.abort());
    };

    const succeed = (elements) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(elements);
    };

    const fail = (i, message) => {
      if (settled) return;
      errors.push(`${hostOf(endpoints[i])}: ${message}`);
      failed += 1;
      if (failed === endpoints.length) {
        settled = true;
        cleanup();
        reject(new Error(`Could not load fuel stations (${errors.join("; ")})`));
      } else {
        launch(i + 1);
      }
    };

    const launch = (i) => {
      if (settled || i >= endpoints.length || started[i]) return;
      started[i] = true;

      const controller = new AbortController();
      controllers.push(controller);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      timers.push(timer);

      if (i + 1 < endpoints.length) {
        timers.push(setTimeout(() => launch(i + 1), staggerMs));
      }

      let lastHttp = null;

      (async () => {
        for (let attempt = 0; ; attempt++) {
          const res = await fetchImpl(endpoints[i], {
            method: "POST",
            headers: REQUEST_HEADERS,
            body: "data=" + encodeURIComponent(query),
            signal: controller.signal,
          });
          const text = await res.text();

          if (TRANSIENT_STATUSES.has(res.status) && attempt < retries) {
            lastHttp = res.status;
            await sleep(retryDelayMs * (attempt + 1), controller.signal);
            continue;
          }

          if (!res.ok || text.trimStart().startsWith("<")) {
            lastHttp = res.status;
            throw new Error(`HTTP ${res.status}`);
          }
          const data = JSON.parse(text);
          if (
            (!data.elements || data.elements.length === 0) &&
            /error/i.test(data.remark || "")
          ) {
            throw new Error(`server error: ${data.remark}`);
          }
          return data.elements || [];
        }
      })().then(succeed, (e) => {
        if (settled) return;
        const secs = Math.round(timeoutMs / 1000);
        fail(
          i,
          timedOut
            ? lastHttp
              ? `HTTP ${lastHttp} (still busy after ${secs}s)`
              : `no response after ${secs}s`
            : e?.message || "network error"
        );
      });
    };

    launch(0);
  });
}

function toStation(el) {
  const latitude = el.lat ?? el.center?.lat;
  const longitude = el.lon ?? el.center?.lon;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  const t = el.tags || {};
  const street = [t["addr:housenumber"], t["addr:street"]]
    .filter(Boolean)
    .join(" ");
  return {
    id: `${el.type}-${el.id}`,
    name: t.name || t.brand || t.operator || "Fuel Station",
    latitude,
    longitude,
    address: street || t["addr:suburb"] || t["addr:city"] || "",
    brand: t.brand || null,
    openingHours: t.opening_hours || null,
  };
}

export function rankStations(
  elements,
  routePoints,
  { corridorKm = 3, maxResults = 10, driverLocation = null } = {}
) {
  const cum = cumulativeKm(routePoints);

  const nearestOnRoute = (lat, lon) => {
    let best = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < routePoints.length; i++) {
      const d = haversineKm(lat, lon, routePoints[i].latitude, routePoints[i].longitude);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    return { dist: best, idx: bestIdx };
  };

  let driverAlongKm = 0;
  if (driverLocation?.latitude != null && driverLocation?.longitude != null) {
    const { dist, idx } = nearestOnRoute(driverLocation.latitude, driverLocation.longitude);
    if (dist <= 5) driverAlongKm = cum[idx];
  }

  const seen = new Set();
  const stations = [];
  for (const el of elements) {
    const s = toStation(el);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);

    const { dist, idx } = nearestOnRoute(s.latitude, s.longitude);
    if (dist > corridorKm) continue;

    const aheadKm = cum[idx] - driverAlongKm;
    if (aheadKm < -0.3) continue; 

    stations.push({
      ...s,
      distanceToRoute: dist,
      alongRouteKm: cum[idx],
      aheadKm: Math.max(0, aheadKm),
    });
  }

  stations.sort((a, b) => a.alongRouteKm - b.alongRouteKm);
  return stations.slice(0, maxResults);
}

function routeSignature(points, corridorKm) {
  const a = points[0];
  const b = points[points.length - 1];
  return `${points.length}|${a.latitude},${a.longitude}|${b.latitude},${b.longitude}|${corridorKm}`;
}

export async function findStationsAlongRoute(routePoints, options = {}) {
  if (!Array.isArray(routePoints) || routePoints.length < 2) return [];

  const {
    corridorKm = 3,
    maxResults = 10,
    driverLocation = null,
    endpoints = OVERPASS_ENDPOINTS,
    fetchImpl = fetch,
    timeoutMs = 30000,
    staggerMs = 4000,
    retries = 2,
    retryDelayMs = 2500,
    now = Date.now,
  } = options;

  const key = routeSignature(routePoints, corridorKm);
  let elements;
  const hit = cache.get(key);
  if (hit && now() - hit.at < CACHE_TTL_MS) {
    elements = hit.elements;
  } else {
    const sampled = downsampleRoute(routePoints);
    const query = buildOverpassQuery(sampled, corridorKm * 1000);
    elements = await fetchOverpass(query, { endpoints, fetchImpl, timeoutMs, staggerMs, retries, retryDelayMs });
    cache.set(key, { at: now(), elements });
  }

  return rankStations(elements, routePoints, { corridorKm, maxResults, driverLocation });
}

const NEAR_MARGIN_KM = 1.5;

export function buildAroundPointQuery(lat, lon, radiusMeters, timeoutSec = 20) {
  return (
    `[out:json][timeout:${timeoutSec}];\n` +
    `nwr["amenity"="fuel"](around:${Math.round(radiusMeters)},${lat.toFixed(5)},${lon.toFixed(5)});\n` +
    `out center tags;`
  );
}

export function rankStationsNearPoint(elements, point, { radiusKm = 5, maxResults = 10 } = {}) {
  const seen = new Set();
  const stations = [];
  for (const el of elements) {
    const s = toStation(el);
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    const distanceKm = haversineKm(point.latitude, point.longitude, s.latitude, s.longitude);
    if (distanceKm > radiusKm) continue;
    stations.push({ ...s, distanceKm });
  }
  stations.sort((a, b) => a.distanceKm - b.distanceKm);
  return stations.slice(0, maxResults);
}

export async function findStationsNearPoint(point, options = {}) {
  if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    return [];
  }

  const {
    radiusKm = 5,
    maxRadiusKm = 20,
    maxResults = 10,
    endpoints = OVERPASS_ENDPOINTS,
    fetchImpl = fetch,
    timeoutMs = 30000,
    staggerMs = 4000,
    retries = 2,
    retryDelayMs = 2500,
    now = Date.now,
  } = options;

  const radii = maxRadiusKm > radiusKm ? [radiusKm, maxRadiusKm] : [radiusKm];

  for (const radius of radii) {

    const key = `near|${point.latitude.toFixed(2)},${point.longitude.toFixed(2)}|${radius}`;
    let elements;
    const hit = cache.get(key);
    if (hit && now() - hit.at < CACHE_TTL_MS) {
      elements = hit.elements;
    } else {
      const query = buildAroundPointQuery(
        point.latitude,
        point.longitude,
        (radius + NEAR_MARGIN_KM) * 1000
      );
      elements = await fetchOverpass(query, { endpoints, fetchImpl, timeoutMs, staggerMs, retries, retryDelayMs });
      cache.set(key, { at: now(), elements });
    }

    const ranked = rankStationsNearPoint(elements, point, { radiusKm: radius, maxResults });
    if (ranked.length > 0) return ranked;
  }
  return [];
}

export function clearStationCache() {
  cache.clear();
}