import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
  TextInput,
  Vibration,
} from "react-native";
import MapView, { Marker, Polyline, Callout } from "react-native-maps";
import * as ExpoLocation from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '../context/AuthContext';
import { supabase } from "../lib/supabase";
import { auditLog } from "../utils/auditlogger";

const { width, height } = Dimensions.get("window");
const INFO_AREA_HEIGHT_PX = height * 0.65;

const CONFIG = {
  TANK_CAPACITY: 70,
  FUEL_CONSUMPTION: 8,
  MAP_DELTA: 0.05,
  FUEL_STATION_RADIUS: 5000,
  DESTINATION_COUNTRY: "South Africa",
  STATION_SENSE_INTERVAL: 60000,
  FUEL_WARNING_THRESHOLD: 15,
  DRIVING_DISTANCE_CANDIDATES: 5,
  OSRM_BASE_URL: "https://router.project-osrm.org",
  OVERPASS_API_URL: "https://overpass-api.de/api/interpreter",
  STATIONS_ALONG_ROUTE: 10,
};

const MOCK_FUEL_STATIONS = [
  { id: 1, name: "Shell Garage", latitude: -26.1076, longitude: 28.0567 },
  { id: 2, name: "BP Service Station", latitude: -26.11, longitude: 28.06 },
  { id: 3, name: "Engen Fuel Stop", latitude: -26.105, longitude: 28.053 },
  { id: 4, name: "Caltex Refuel", latitude: -26.112, longitude: 28.058 },
  { id: 5, name: "Total Energies", latitude: -26.108, longitude: 28.062 },
];

const PAUSE_CATEGORIES = [
  {
    key: 'resting',
    label: 'Resting',
    icon: 'bed-outline',
    description: 'Taking a short break',
    color: '#7c3aed',
    subOptions: null,
    durationMs: 20 * 1000,
  },
  {
    key: 'lunch',
    label: 'Lunch',
    icon: 'restaurant-outline',
    description: 'Meal break',
    color: '#ea580c',
    subOptions: null,
    durationMs: 15 * 1000,
  },
  {
    key: 'route',
    label: 'Route Issues',
    icon: 'warning-outline',
    description: 'Traffic, delays, accidents',
    color: '#d97706',
    subOptions: [
      'Traffic Delays',
      'Stop and Go',
      'Car Accident (not on route)',
    ],
    durationMs: 10 * 1000,
  },
  {
    key: 'vehicle',
    label: 'Vehicle Issues',
    icon: 'construct-outline',
    description: 'Mechanical problems',
    color: '#dc2626',
    subOptions: [
      "Car Won't Start",
      'Tire Burst',
      'Other Vehicle Issue',
    ],
    durationMs: 25 * 1000,
  },
];

const toCoord = (p) => {
  if (!p || p.lat == null || p.lng == null) return null;
  return { latitude: Number(p.lat), longitude: Number(p.lng) };
};

const formatAddress = (addr) => {
  if (!addr) return "Unknown address";
  const parts = [addr.name, addr.street, addr.city, addr.region, addr.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown address";
};

const geojsonToCoords = (line) => {
  if (!line || !Array.isArray(line.coordinates)) return [];
  return line.coordinates
    .map(([lng, lat]) => ({ latitude: Number(lat), longitude: Number(lng) }))
    .filter((p) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const formatDistance = (dist) => {
  if (dist < 1) return `${Math.round(dist * 1000)} m`;
  return `${dist.toFixed(1)} km`;
};

const formatDuration = (seconds) => {
  if (seconds == null) return 'unknown';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const formatCountdown = (ms) => {
  if (ms == null) return '';
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatCountdownClock = (ms) => {
  if (ms == null) return '00:00';
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
};

const EVENT_TO_CATEGORY = {
  trip_started: 'other',
  trip_paused: 'other',
  trip_resumed: 'other',
  trip_ended: 'other',
  fuel_added: 'fuel_issue',
  receipt_issue: 'receipt_issue',
  route_issue: 'route_issue',
  vehicle_issue: 'vehicle_issue',
  app_issue: 'app_issue',
  safety_issue: 'safety_issue',
};

const buildReportText = (eventType, metadata = {}) => {
  switch (eventType) {
    case 'trip_started':
      return {
        title: 'Trip started',
        description: `Stops: ${metadata?.stops_count ?? 0}. Start: ${metadata?.start_address ?? 'unknown'}.`,
      };
    case 'trip_paused':
      return {
        title: `Trip paused - ${metadata?.reason ?? 'unknown'}`,
        description: `Category: ${metadata?.category ?? 'n/a'}. Notes: ${metadata?.notes || 'none'}.`,
      };
    case 'trip_resumed': {
      const dur = metadata?.pause_duration_text ?? 'unknown';
      return {
        title: 'Trip resumed',
        description: `Driver resumed the trip. Pause duration: ${dur}.`,
      };
    }
    case 'trip_ended': {
      const dur = metadata?.trip_duration_text ?? 'unknown';
      return {
        title: 'Trip ended',
        description: `Driver ended the trip. Trip duration: ${dur}.`,
      };
    }
    default:
      return {
        title: eventType,
        description: JSON.stringify(metadata ?? {}),
      };
  }
};

export default function LocationScreen({ route }) {
  const { user } = useAuth();
  const tripId = route?.params?.tripId;

  const [state, setState] = useState({
    location: null,
    locationReady: false,
    permissionDenied: false,

    destination: null,
    routeCoords: [],
    routeDistance: 0,
    fullMap: false,

    start: null,
    stops: [],
    startAddress: "",
    stopAddresses: [],
    tripLoading: false,
    routeLoading: false,
    tripResolved: false,
    hasTrip: false,
    resolvedTripId: null,

    fuelPercent: 20,
    fuelWarning: false,
    fuelStations: [],
    recommendedStation: null,
    isCalculatingStation: false,
    stationSearchFailed: false,
    destinationDistanceToStation: null,
    searchingStations: false,

    showPauseModal: false,
    pauseCategory: null,
    pauseSubReason: null,
    pauseNotes: '',
    isPaused: false,
    pauseStartTime: null,
    pauseEndsAt: null,
    pauseRemainingMs: null,
    pauseExpired: false,
    resumedFlash: false,
    tripEndedFlash: false,

    tripStartedAt: null,
    pauseStartedAt: null,
    lastPauseReportId: null,
    lastTripReportId: null,

    notification: null,
    showFuelModal: false,
    selectedFuelStation: null,
    routeInfo: null,
    error: "",
  });

  const [infoAreaHeight, setInfoAreaHeight] = useState(0);

  const mapRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const redirectingRef = useRef(false);
  const stateRef = useRef(state);
  const cachedVehicleIdRef = useRef(null);
  const pauseExpiredRef = useRef(false);
  const resumedFlashTimeoutRef = useRef(null);
  const tripEndedFlashTimeoutRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const {
    location,
    locationReady,
    permissionDenied,
    destination,
    routeCoords,
    routeDistance,
    fullMap,
    fuelPercent,
    fuelWarning,
    fuelStations,
    recommendedStation,
    notification,
    showFuelModal,
    selectedFuelStation,
    routeInfo,
    error,
    start,
    stops,
    startAddress,
    stopAddresses,
    tripLoading,
    routeLoading,
    tripResolved,
    hasTrip,
    resolvedTripId,
    isCalculatingStation,
    stationSearchFailed,
    destinationDistanceToStation,
    searchingStations,
    showPauseModal,
    pauseCategory,
    pauseSubReason,
    pauseNotes,
    isPaused,
    pauseStartTime,
    pauseEndsAt,
    pauseRemainingMs,
    pauseExpired,
    resumedFlash,
    tripEndedFlash,
    tripStartedAt,
    pauseStartedAt,
    lastPauseReportId,
    lastTripReportId,
  } = state;

  const calculateRemainingRange = useCallback(() => {
    const litresLeft = (fuelPercent / 100) * CONFIG.TANK_CAPACITY;
    return (litresLeft / CONFIG.FUEL_CONSUMPTION) * 100;
  }, [fuelPercent]);

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const showNotification = useCallback((type, message, durationMs = 4000) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    updateState({ notification: { type, message } });
    notificationTimeoutRef.current = setTimeout(() => {
      updateState({ notification: null });
    }, durationMs);
  }, [updateState]);

  const logTripEvent = useCallback(
    async (eventType, metadata = {}) => {
      const effectiveTripId = stateRef.current.resolvedTripId || tripId || null;

      try {
        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !authUser) return null;

        let vehicleId = cachedVehicleIdRef.current;
        if (!vehicleId) {
          const { data: driverById } = await supabase
            .from("drivers")
            .select("driver_id")
            .eq("user_id", authUser.id)
            .maybeSingle();

          let driverId = driverById?.driver_id ?? null;

          if (!driverId && authUser.email) {
            const { data: driverByEmail } = await supabase
              .from("drivers")
              .select("driver_id")
              .eq("email", authUser.email)
              .maybeSingle();
            driverId = driverByEmail?.driver_id ?? null;
          }

          if (driverId) {
            const { data: vehicle } = await supabase
              .from("vehicles")
              .select("vehicle_id")
              .eq("driver_id", driverId)
              .maybeSingle();
            vehicleId = vehicle?.vehicle_id ?? null;
            cachedVehicleIdRef.current = vehicleId;
          }
        }

        const current = stateRef.current;
        const loc = current.location;

        const category = EVENT_TO_CATEGORY[eventType] || "other";
        const { title, description } = buildReportText(eventType, metadata);

        const payload = {
          user_id: authUser.id,
          trip_id: effectiveTripId,
          vehicle_id: vehicleId,
          category,
          title,
          description,
          priority: "normal",
          status: "open",
          image_path: null,
          latitude: loc?.latitude != null ? Number(loc.latitude) : null,
          longitude: loc?.longitude != null ? Number(loc.longitude) : null,
          location_accuracy: loc?.accuracy != null ? Number(loc.accuracy) : null,
          location_timestamp: loc ? new Date().toISOString() : null,
        };

        const { data, error } = await supabase
          .from("user_reports")
          .insert(payload)
          .select();

        if (error) {
          console.error("[logTripEvent] INSERT FAILED:", error);
          return null;
        }

        return data?.[0] ?? null;
      } catch (err) {
        console.error("[logTripEvent] EXCEPTION:", err);
        return null;
      }
    },
    [tripId]
  );

  const resolveReport = useCallback(async (reportId, note) => {
    if (!reportId) return;
    const { error } = await supabase
      .from("user_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        admin_notes: note || null,
      })
      .eq("id", reportId);

    if (error) console.error("[resolveReport] FAILED:", error);
  }, []);

  const getLocation = useCallback(async () => {
    try {
      const { status } =
        await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        await auditLog({
          action: "LOCATION_PERMISSION_DENIED",
          page: "Location Activity",
          element: "Location Permission",
          description: "User denied location permission",
        });

        updateState({
          locationReady: true,
          permissionDenied: true,
        });
        return;
      }

      await auditLog({
        action: "LOCATION_PERMISSION_GRANTED",
        page: "Location Activity",
        element: "Location Permission",
        description: "User granted location permission",
      });

      const current =
        await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });
      updateState({
        location: {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        },
        locationReady: true,
      });
    } catch (error) {
      console.error("Location error:", error);
      updateState({ locationReady: true });
    }
  }, [updateState]);

  const fetchOSRMRoute = useCallback(async (points) => {
    if (!Array.isArray(points) || points.length < 2) return null;

    const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
    const url =
      `${CONFIG.OSRM_BASE_URL}/route/v1/driving/${coords}` +
      `?overview=full&geometries=geojson&steps=true&generate_hints=false`;

    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok) throw new Error(json?.message || "OSRM route request failed");

    const route = json?.routes?.[0];
    if (!route) throw new Error("No route found");

    const coordsArray = geojsonToCoords(route?.geometry);
    return {
      coords: coordsArray,
      distance: route.distance / 1000,
      duration: route.duration / 60,
      routeData: route,
    };
  }, []);

  const fetchRoute = useCallback(async (startPoint, endPoint) => {
    try {
      updateState({ routeLoading: true });
      const result = await fetchOSRMRoute([startPoint, endPoint]);

      if (!result || !result.coords || result.coords.length < 2) {
        const directDistance = haversineKm(
          startPoint.latitude, startPoint.longitude,
          endPoint.latitude, endPoint.longitude
        );
        updateState({
          routeCoords: [startPoint, endPoint],
          routeDistance: directDistance,
          routeInfo: {
            distance: directDistance,
            duration: (directDistance / 50) * 60,
          },
          routeLoading: false,
        });
        return;
      }

      const { coords, distance, duration } = result;
      updateState({
        routeCoords: coords,
        routeDistance: distance,
        routeInfo: { distance, duration },
        routeLoading: false,
      });
    } catch (error) {
      console.error("Route error:", error);
      updateState({
        routeLoading: false,
        error: error.message || "Failed to fetch route"
      });
    }
  }, [fetchOSRMRoute, updateState]);

  const fetchNearbyStations = useCallback(async (lat, lon) => {
    try {
      const query = `
        [out:json][5];
        (
          node["amenity"="fuel"](around:${CONFIG.FUEL_STATION_RADIUS},${lat},${lon});
        );
        out body 5;
        `;
      const response = await fetch(CONFIG.OVERPASS_API_URL, {
        method: "POST",
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const text = await response.text();
      if (text.startsWith('<')) return getMockStations(lat, lon);

      const data = JSON.parse(text);
      if (!data.elements || data.elements.length === 0) {
        return getMockStations(lat, lon);
      }

      const stations = data.elements.map(station => ({
        id: station.id,
        name: station.tags.name || station.tags.brand || "Fuel Station",
        latitude: station.lat,
        longitude: station.lon,
        address: station.tags?.['addr:street'] || station.tags?.['addr:city'] || '',
        brand: station.tags?.brand || null,
        openingHours: station.tags?.opening_hours || null,
      }));

      return [...stations].sort((a, b) => {
        const distA = haversineKm(lat, lon, a.latitude, a.longitude);
        const distB = haversineKm(lat, lon, b.latitude, b.longitude);
        return distA - distB;
      });
    } catch (error) {
      console.error("Fuel station sensing error:", error);
      return getMockStations(lat, lon);
    }
  }, []);

  const getMockStations = useCallback((lat, lon) => {
    const mockStations = MOCK_FUEL_STATIONS.map((station, index) => ({
      id: station.id || index + 100,
      name: station.name,
      latitude: lat + (station.latitude - MOCK_FUEL_STATIONS[0].latitude) * 0.01,
      longitude: lon + (station.longitude - MOCK_FUEL_STATIONS[0].longitude) * 0.01,
      address: 'Mock location',
      brand: station.name.split(' ')[0] || 'Fuel',
      openingHours: '24/7',
    }));

    return [...mockStations].sort((a, b) => {
      const distA = haversineKm(lat, lon, a.latitude, a.longitude);
      const distB = haversineKm(lat, lon, b.latitude, b.longitude);
      return distA - distB;
    });
  }, []);

  const findFuelStationsAlongRoute = useCallback(async (routePoints) => {
    if (!routePoints || routePoints.length < 2) return [];

    try {
      updateState({ searchingStations: true, stationSearchFailed: false });

      const samplePoints = [];
      const totalDistance = routePoints.reduce((acc, point, i) => {
        if (i === 0) return 0;
        return acc + haversineKm(
          routePoints[i - 1].latitude, routePoints[i - 1].longitude,
          point.latitude, point.longitude
        );
      }, 0);

      const numSamples = Math.max(5, Math.min(20, Math.ceil(totalDistance / 5)));
      const step = Math.max(1, Math.floor(routePoints.length / numSamples));

      for (let i = 0; i < routePoints.length; i += step) {
        samplePoints.push(routePoints[i]);
      }

      if (samplePoints[samplePoints.length - 1] !== routePoints[routePoints.length - 1]) {
        samplePoints.push(routePoints[routePoints.length - 1]);
      }

      const allStations = [];
      const seenStationIds = new Set();

      for (const point of samplePoints) {
        const stations = await fetchNearbyStations(point.latitude, point.longitude);

        if (stations && stations.length > 0) {
          for (const station of stations) {
            if (!seenStationIds.has(station.id)) {
              seenStationIds.add(station.id);

              let minDistToRoute = Infinity;
              for (const routePoint of routePoints) {
                const dist = haversineKm(
                  station.latitude, station.longitude,
                  routePoint.latitude, routePoint.longitude
                );
                if (dist < minDistToRoute) minDistToRoute = dist;
              }
              station.distanceToRoute = minDistToRoute;
              allStations.push(station);
            }
          }
        }
      }

      const sortedStations = allStations
        .sort((a, b) => a.distanceToRoute - b.distanceToRoute)
        .slice(0, CONFIG.STATIONS_ALONG_ROUTE);

      updateState({
        fuelStations: sortedStations,
        searchingStations: false
      });

      if (sortedStations.length > 0) {
        const bestStation = sortedStations[0];
        updateState({ recommendedStation: bestStation });

        const current = stateRef.current;
        if (current.location && current.destination) {
          const distToStation = haversineKm(
            current.location.latitude, current.location.longitude,
            bestStation.latitude, bestStation.longitude
          );
          const distToDest = haversineKm(
            current.location.latitude, current.location.longitude,
            current.destination.latitude, current.destination.longitude
          );

          updateState({
            destinationDistanceToStation: {
              station: distToStation,
              destination: distToDest,
              stationCloser: distToStation < distToDest
            }
          });
        }
      }

      return sortedStations;
    } catch (error) {
      console.error("Error finding stations along route:", error);
      updateState({ searchingStations: false, stationSearchFailed: true });
      return [];
    }
  }, [fetchNearbyStations, updateState]);

  const endTrip = useCallback(() => {
    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            const current = stateRef.current;

            const started = current.tripStartedAt
              ? new Date(current.tripStartedAt).getTime()
              : null;
            const durationSec = started
              ? Math.round((Date.now() - started) / 1000)
              : null;
            const durationText = formatDuration(durationSec);

            await logTripEvent('trip_ended', {
              trip_duration_seconds: durationSec,
              trip_duration_text: durationText,
            });

            if (current.lastTripReportId) {
              await resolveReport(
                current.lastTripReportId,
                `Trip ended. Duration: ${durationText}.`
              );
            }
            if (current.lastPauseReportId) {
              await resolveReport(
                current.lastPauseReportId,
                'Trip ended while paused.'
              );
            }

            // ---- Critical part: unassign from vehicle and VERIFY it worked ----
            try {
              const {
                data: { user: authUser },
              } = await supabase.auth.getUser();

              if (!authUser) {
                Alert.alert('Could not end trip', 'You are not signed in.');
                return;
              }

              const { data: updated, error: unassignErr } = await supabase
                .from("vehicles")
                .update({
                  driver_id: null,
                  route_id: null,
                  status: "idle",
                })
                .eq("driver_id", authUser.id)
                .select("vehicle_id, driver_id, route_id");

              if (unassignErr) {
                console.error("[endTrip] unassign failed:", unassignErr);
                Alert.alert(
                  'Could not end trip',
                  unassignErr.message || 'Please try again.'
                );
                return;
              }

              if (!updated || updated.length === 0) {
                console.error(
                  "[endTrip] no vehicle row was updated (RLS or no matching row)"
                );
                Alert.alert(
                  'Could not end trip',
                  'The vehicle could not be unassigned. Please try again or contact dispatch.'
                );
                return;
              }

              console.log(
                "[endTrip] vehicle unassigned for auth user",
                authUser.id,
                "-> rows:",
                updated.length
              );
            } catch (err) {
              console.error("[endTrip] exception while unassigning:", err);
              Alert.alert('Could not end trip', 'Please try again.');
              return;
            }

            // ---- Success: show green pill + reset state ----
            pauseExpiredRef.current = false;
            if (resumedFlashTimeoutRef.current) {
              clearTimeout(resumedFlashTimeoutRef.current);
              resumedFlashTimeoutRef.current = null;
            }
            if (tripEndedFlashTimeoutRef.current) {
              clearTimeout(tripEndedFlashTimeoutRef.current);
            }
            updateState({ tripEndedFlash: true });
            tripEndedFlashTimeoutRef.current = setTimeout(() => {
              updateState({ tripEndedFlash: false });
              tripEndedFlashTimeoutRef.current = null;
            }, 3000);

            setTimeout(() => {
              updateState({
                hasTrip: false,
                tripResolved: true,
                tripLoading: false,
                routeCoords: [],
                routeInfo: null,
                fuelStations: [],
                recommendedStation: null,
                start: null,
                stops: [],
                startAddress: '',
                stopAddresses: [],
                destination: null,
                fuelWarning: false,
                showFuelModal: false,
                showPauseModal: false,
                pauseCategory: null,
                pauseSubReason: null,
                pauseNotes: '',
                isPaused: false,
                pauseStartTime: null,
                pauseEndsAt: null,
                pauseRemainingMs: null,
                pauseExpired: false,
                resumedFlash: false,
                resolvedTripId: null,
                tripStartedAt: null,
                pauseStartedAt: null,
                lastPauseReportId: null,
                lastTripReportId: null,
              });
            }, 1500);
          },
        },
      ]
    );
  }, [updateState, logTripEvent, resolveReport]);

  const canEndTrip = useCallback(() => {
    return hasTrip && !tripLoading;
  }, [hasTrip, tripLoading]);

  const openPauseModal = useCallback(() => {
    updateState({
      showPauseModal: true,
      pauseCategory: null,
      pauseSubReason: null,
      pauseNotes: '',
    });
  }, [updateState]);

  const closePauseModal = useCallback(() => {
    updateState({
      showPauseModal: false,
      pauseCategory: null,
      pauseSubReason: null,
      pauseNotes: '',
    });
  }, [updateState]);

  const confirmPause = useCallback(() => {
    const current = stateRef.current;
    const cat = PAUSE_CATEGORIES.find((c) => c.key === current.pauseCategory);
    if (!cat) return;

    if (cat.subOptions && !current.pauseSubReason) {
      Alert.alert('Select a Reason', 'Please pick a specific reason before confirming.');
      return;
    }

    const reason = current.pauseSubReason || cat.label;
    const now = new Date().toISOString();
    const durationMs = cat.durationMs ?? null;
    const pauseEndsAt = durationMs ? Date.now() + durationMs : null;

    pauseExpiredRef.current = false;
    if (resumedFlashTimeoutRef.current) {
      clearTimeout(resumedFlashTimeoutRef.current);
      resumedFlashTimeoutRef.current = null;
    }

    updateState({
      isPaused: true,
      pauseStartTime: Date.now(),
      pauseStartedAt: now,
      pauseEndsAt,
      pauseRemainingMs: durationMs,
      pauseExpired: false,
      resumedFlash: false,
      showPauseModal: false,
      pauseCategory: null,
      pauseSubReason: null,
      pauseNotes: '',
    });

    auditLog({
      action: "TRIP_PAUSED",
      page: "Location Activity",
      description: `User paused the trip: ${reason}`,
      element: "Confirm Pause",
      targetId: tripId,
      details: {
        trip_id: tripId,
        category: cat.key,
        reason,
        notes: current.pauseNotes || '',
        paused_at: now,
        pause_duration_ms: durationMs,
        pause_ends_at: pauseEndsAt ? new Date(pauseEndsAt).toISOString() : null,
      },
    });

    logTripEvent('trip_paused', {
      category: cat.key,
      reason,
      notes: current.pauseNotes || '',
    }).then((row) => {
      if (row?.id) updateState({ lastPauseReportId: row.id });
    });
  }, [updateState, logTripEvent, tripId]);

  const resumeTrip = useCallback(() => {
    Alert.alert(
      'Resume Trip',
      'Are you ready to continue driving?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: async () => {
            const current = stateRef.current;
            const started = current.pauseStartedAt
              ? new Date(current.pauseStartedAt).getTime()
              : null;
            const durationSec = started
              ? Math.round((Date.now() - started) / 1000)
              : null;
            const durationText = formatDuration(durationSec);

            await auditLog({
              action: "TRIP_RESUMED",
              page: "Location Activity",
              description: `User resumed the trip after ${durationText}`,
              element: "Confirm Resume",
              targetId: tripId,
              details: {
                trip_id: tripId,
                pause_duration_seconds: durationSec,
                pause_duration_text: durationText,
              },
            });

            pauseExpiredRef.current = false;

            if (resumedFlashTimeoutRef.current) {
              clearTimeout(resumedFlashTimeoutRef.current);
            }

            updateState({
              isPaused: false,
              pauseStartTime: null,
              pauseStartedAt: null,
              pauseEndsAt: null,
              pauseRemainingMs: null,
              pauseExpired: false,
              resumedFlash: true,
            });

            resumedFlashTimeoutRef.current = setTimeout(() => {
              updateState({ resumedFlash: false });
              resumedFlashTimeoutRef.current = null;
            }, 3000);

            await logTripEvent('trip_resumed', {
              pause_duration_seconds: durationSec,
              pause_duration_text: durationText,
            });

            if (current.lastPauseReportId) {
              await resolveReport(
                current.lastPauseReportId,
                `Auto-resolved on resume. Duration: ${durationText}.`
              );
              updateState({ lastPauseReportId: null });
            }
          },
        },
      ]
    );
  }, [updateState, logTripEvent, resolveReport, tripId]);

  const reverseGeocodePoint = useCallback(async (coord) => {
    try {
      const res = await ExpoLocation.reverseGeocodeAsync(coord);
      return res?.[0] || null;
    } catch {
      return null;
    }
  }, []);

  const resolveTripForDriver = useCallback(async () => {
    try {
      updateState({ tripLoading: true, error: "" });

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        updateState({ tripResolved: true, hasTrip: false, tripLoading: false });
        return;
      }

      const { data: vehicle, error: vehicleErr } = await supabase
        .from("vehicles")
        .select("vehicle_id, route_id, status")
        .eq("driver_id", authUser.id)
        .not("route_id", "is", null)
        .maybeSingle();

      if (vehicleErr) throw vehicleErr;

      if (!vehicle?.route_id) {
        updateState({
          tripResolved: true,
          hasTrip: false,
          tripLoading: false,
          routeLoading: false,
          start: null,
          stops: [],
          routeCoords: [],
          routeInfo: null,
          destination: null,
          resolvedTripId: null,
        });
        return;
      }

      const { data: loadedTrip, error: tripErr } = await supabase
        .from("optimized_routes")
        .select("id, start_point, stops")
        .eq("id", vehicle.route_id)
        .maybeSingle();

      if (tripErr) throw tripErr;

      if (!loadedTrip) {
        updateState({
          tripResolved: true,
          hasTrip: false,
          tripLoading: false,
          routeLoading: false,
          start: null,
          stops: [],
          routeCoords: [],
          routeInfo: null,
          destination: null,
          resolvedTripId: null,
        });
        return;
      }

      const startCoord = toCoord(loadedTrip.start_point);
      const stopCoords = Array.isArray(loadedTrip.stops)
        ? loadedTrip.stops.map(toCoord).filter(Boolean)
        : [];

      if (!startCoord) {
        updateState({
          tripResolved: true,
          hasTrip: false,
          tripLoading: false,
          routeLoading: false,
        });
        return;
      }

      updateState({
        tripResolved: true,
        hasTrip: true,
        tripLoading: false,
        resolvedTripId: loadedTrip.id,
        start: startCoord,
        stops: stopCoords,
        destination: stopCoords[0] || null,
        tripStartedAt: new Date().toISOString(),
      });

      Promise.all([
        reverseGeocodePoint(startCoord).then((addr) =>
          updateState({ startAddress: formatAddress(addr) })
        ),
        Promise.all(
          stopCoords.map(async (c) => formatAddress(await reverseGeocodePoint(c)))
        ).then((addrs) => updateState({ stopAddresses: addrs })),
      ]).catch((e) =>
        console.warn("[loadTrip] reverse geocode failed:", e?.message)
      );

      if (stopCoords.length > 0) {
        fetchRoute(startCoord, stopCoords[0]);
      }

      logTripEvent('trip_started', {
        start_address: '',
        stops_count: stopCoords.length,
      }).then((row) => {
        if (row?.id) updateState({ lastTripReportId: row.id });
      });

    } catch (e) {
      updateState({
        error: e.message || "Failed to load trip",
        tripLoading: false,
        routeLoading: false,
        tripResolved: true,
        hasTrip: false,
      });
    }
  }, [updateState, fetchRoute, logTripEvent, reverseGeocodePoint]);

  const checkFuelAndRedirect = useCallback(async () => {
    const current = stateRef.current;

    if (
      current.fuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD &&
      !current.fuelWarning &&
      !redirectingRef.current
    ) {
      updateState({ fuelWarning: true });
      showNotification('warning', `Fuel at ${current.fuelPercent.toFixed(0)}% - Please find a fuel station.`, 5000);
      updateState({ showFuelModal: true });
    }
  }, [updateState, showNotification]);

  const BUTTON_SHEET_HANDLE_HEIGHT = 96;

  const measuredInfoAreaHeight =
    infoAreaHeight > 0 ? infoAreaHeight : INFO_AREA_HEIGHT_PX;

  const BUTTON_SHEET_MAX_DRAG = Math.max(
    0,
    measuredInfoAreaHeight - BUTTON_SHEET_HANDLE_HEIGHT
  );

  const buttonSheetY = useRef(new Animated.Value(0)).current;
  const buttonSheetStartY = useRef(0);
  const buttonSheetOpenRef = useRef(false);
  const maxDragRef = useRef(BUTTON_SHEET_MAX_DRAG);

  useEffect(() => {
    maxDragRef.current = BUTTON_SHEET_MAX_DRAG;

    if (buttonSheetOpenRef.current) {
      Animated.spring(buttonSheetY, {
        toValue: BUTTON_SHEET_MAX_DRAG,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
      buttonSheetStartY.current = BUTTON_SHEET_MAX_DRAG;
    }
  }, [BUTTON_SHEET_MAX_DRAG, buttonSheetY]);

  const snapButtonSheet = useCallback(
    (revealInfo) => {
      const maxDrag = maxDragRef.current;
      const target = revealInfo ? maxDrag : 0;

      Animated.spring(buttonSheetY, {
        toValue: target,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      buttonSheetStartY.current = target;
      buttonSheetOpenRef.current = revealInfo;
    },
    [buttonSheetY]
  );

  const buttonSheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderGrant: () => {
        buttonSheetY.stopAnimation((value) => {
          buttonSheetStartY.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const maxDrag = maxDragRef.current;
        let newY = buttonSheetStartY.current + gestureState.dy;
        newY = Math.max(0, Math.min(maxDrag, newY));
        buttonSheetY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const maxDrag = maxDragRef.current;
        const currentY = buttonSheetStartY.current + gestureState.dy;
        const midpoint = maxDrag / 2;

        if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          snapButtonSheet(true);
          return;
        }
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          snapButtonSheet(false);
          return;
        }
        snapButtonSheet(currentY > midpoint);
      },
    })
  ).current;

  useEffect(() => {
    getLocation();
    resolveTripForDriver();

    return () => {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      if (resumedFlashTimeoutRef.current) clearTimeout(resumedFlashTimeoutRef.current);
      if (tripEndedFlashTimeoutRef.current) clearTimeout(tripEndedFlashTimeoutRef.current);
    };
  }, [getLocation, resolveTripForDriver, user]);

  useEffect(() => {
    if (hasTrip && fuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD && !fuelWarning) {
      checkFuelAndRedirect();
    }
  }, [fuelPercent, hasTrip, fuelWarning, checkFuelAndRedirect]);

  useEffect(() => {
    if (mapRef.current && routeCoords.length > 1) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [routeCoords]);

  useEffect(() => {
    if (!isPaused || !pauseEndsAt) return;

    const tick = () => {
      const remaining = pauseEndsAt - Date.now();

      if (remaining <= 0) {
        if (!pauseExpiredRef.current) {
          pauseExpiredRef.current = true;
          updateState({ pauseRemainingMs: 0, pauseExpired: true });
          Vibration.vibrate([0, 500, 300, 500, 300, 700]);
          Alert.alert(
            'Break Time Over',
            'Your scheduled pause time has ended. Please resume the trip when you are ready.',
            [
              {
                text: 'Extend 10s',
                onPress: () => {
                  pauseExpiredRef.current = false;
                  updateState({
                    pauseEndsAt: Date.now() + 10 * 1000,
                    pauseRemainingMs: 10 * 1000,
                    pauseExpired: false,
                  });
                },
              },
              { text: 'OK', style: 'cancel' },
            ]
          );
        }
        return;
      }

      updateState({ pauseRemainingMs: remaining });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isPaused, pauseEndsAt, updateState]);

  const renderNotification = () => {
    if (!notification) return null;
    const bg =
      notification.type === 'warning' ? '#d32f2f' :
      notification.type === 'success' ? '#2e7d32' :
      '#0057b8';
    return (
      <View style={[styles.notificationBanner, { backgroundColor: bg }]}>
        <Text style={styles.notificationText}>{notification.message}</Text>
      </View>
    );
  };

  const renderFuelStationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.fuelItem}
      onPress={() => {
        updateState({ selectedFuelStation: item, showFuelModal: false });
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: item.latitude,
            longitude: item.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }}
    >
      <View style={styles.fuelItemContent}>
        <View style={styles.fuelIconContainer}>
          <Ionicons name="flame-outline" size={24} color="#f44336" />
        </View>
        <View style={styles.fuelItemInfo}>
          <Text style={styles.fuelItemName}>{item.name}</Text>
          <Text style={styles.fuelItemAddress}>{item.address || 'Address not available'}</Text>
          {item.brand && (
            <Text style={styles.fuelItemBrand}>Brand: {item.brand}</Text>
          )}
          <Text style={styles.fuelItemDistance}>
            {item.distanceToRoute !== undefined ?
              `${formatDistance(item.distanceToRoute)} from route` :
              formatDistance(haversineKm(
                location?.latitude || 0,
                location?.longitude || 0,
                item.latitude,
                item.longitude
              ))}
          </Text>
        </View>
        {recommendedStation?.id === item.id && (
          <View style={styles.routeBadge}>
            <Text style={styles.routeBadgeText}>Best</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPauseModal = () => {
    const activeCat = PAUSE_CATEGORIES.find((c) => c.key === pauseCategory);
    const requiresSub = !!activeCat?.subOptions;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPauseModal}
        onRequestClose={closePauseModal}
      >
        <View style={styles.receiptModalOverlay}>
          <View style={styles.receiptModalSheet}>
            <View style={styles.receiptModalHandleWrap}>
              <View style={styles.receiptModalHandle} />
            </View>

            <View style={styles.receiptModalHeader}>
              <View style={styles.receiptModalHeaderIcon}>
                <Ionicons name="pause-outline" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptModalTitle}>Pause Trip</Text>
                <Text style={styles.receiptModalSubtitleSmall}>
                  {pauseCategory
                    ? 'Select a specific reason'
                    : 'Why are you pausing?'}
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.receiptModalBody}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {!pauseCategory &&
                PAUSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={styles.pauseCategoryCard}
                    onPress={() =>
                      updateState({
                        pauseCategory: cat.key,
                        pauseSubReason: null,
                      })
                    }
                  >
                    <View
                      style={[
                        styles.pauseCategoryIcon,
                        { backgroundColor: `${cat.color}1A` },
                      ]}
                    >
                      <Ionicons name={cat.icon} size={22} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pauseCategoryLabel}>{cat.label}</Text>
                      <Text style={styles.pauseCategoryDesc}>{cat.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}

              {pauseCategory && (
                <>
                  <TouchableOpacity
                    style={styles.pauseBackBtn}
                    onPress={() =>
                      updateState({ pauseCategory: null, pauseSubReason: null })
                    }
                  >
                    <Ionicons name="arrow-back-outline" size={18} color="#0A1F44" />
                    <Text style={styles.pauseBackText}>Back</Text>
                  </TouchableOpacity>

                  {requiresSub &&
                    activeCat.subOptions.map((opt) => {
                      const active = pauseSubReason === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[
                            styles.pauseSubOption,
                            active && styles.pauseSubOptionActive,
                          ]}
                          onPress={() => updateState({ pauseSubReason: opt })}
                        >
                          <Text
                            style={[
                              styles.pauseSubOptionText,
                              active && styles.pauseSubOptionTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                          {active && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#0A1F44"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                  <View style={styles.receiptInputCard}>
                    <Text style={styles.receiptInputLabel}>Notes (optional)</Text>
                    <TextInput
                      style={styles.pauseNotesInput}
                      placeholder="Add any details..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      value={pauseNotes}
                      onChangeText={(text) => updateState({ pauseNotes: text })}
                    />
                  </View>

                  <View style={styles.receiptModalActions}>
                    <TouchableOpacity
                      style={[styles.receiptModalBtn, styles.receiptModalBtnCancel]}
                      onPress={closePauseModal}
                    >
                      <Ionicons name="close-outline" size={18} color="#0A1F44" />
                      <Text style={styles.receiptModalBtnTextCancel}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.receiptModalBtn, styles.receiptModalBtnPrimary]}
                      onPress={confirmPause}
                    >
                      <Ionicons name="pause-outline" size={18} color="#fff" />
                      <Text style={styles.receiptModalBtnTextPrimary}>
                        Confirm Pause
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFuelModal = () => (
    <Modal
      visible={showFuelModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => updateState({ showFuelModal: false })}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fuel Stations Along Route</Text>
            <TouchableOpacity
              onPress={() => updateState({ showFuelModal: false })}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {searchingStations && (
            <View style={styles.loadingModalContent}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.loadingModalText}>Searching for stations along route...</Text>
            </View>
          )}

          <FlatList
            data={fuelStations}
            renderItem={renderFuelStationItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.modalList}
            ListHeaderComponent={
              fuelStations.length > 0 && !searchingStations ? (
                <Text style={styles.fuelCountText}>
                  Found {fuelStations.length} stations along your route
                </Text>
              ) : null
            }
            ListEmptyComponent={
              fuelStations.length === 0 && !searchingStations ? (
                <View style={styles.emptyState}>
                  <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No fuel stations found along route</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      if (routeCoords.length > 0) {
                        findFuelStationsAlongRoute(routeCoords);
                      }
                    }}
                  >
                    <Text style={styles.retryButtonText}>Search Again</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </View>
      </View>
    </Modal>
  );

  const renderPauseTimerOverlay = () => {
    if (tripEndedFlash) {
      return (
        <View
          pointerEvents="none"
          style={[styles.pauseTimerPill, styles.pauseTimerPillResumed]}
        >
          <View style={[styles.pauseTimerIconWrap, styles.pauseTimerIconWrapResumed]}>
            <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pauseTimerLabel, styles.pauseTimerLabelResumed]}>
              Trip ended
            </Text>
            <Text style={[styles.pauseTimerValue, styles.pauseTimerValueResumed]}>
              Successfully
            </Text>
          </View>
        </View>
      );
    }

    if (!isPaused && resumedFlash) {
      return (
        <View
          pointerEvents="none"
          style={[styles.pauseTimerPill, styles.pauseTimerPillResumed]}
        >
          <View style={[styles.pauseTimerIconWrap, styles.pauseTimerIconWrapResumed]}>
            <Ionicons name="play-outline" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pauseTimerLabel, styles.pauseTimerLabelResumed]}>
              Trip resumed
            </Text>
            <Text style={[styles.pauseTimerValue, styles.pauseTimerValueResumed]}>
              Drive safe
            </Text>
          </View>
        </View>
      );
    }

    if (!isPaused) return null;

    const urgent =
      pauseExpired ||
      (pauseRemainingMs != null && pauseRemainingMs <= 10 * 1000);

    return (
      <View
        pointerEvents="none"
        style={[
          styles.pauseTimerPill,
          urgent && styles.pauseTimerPillUrgent,
        ]}
      >
        <View
          style={[
            styles.pauseTimerIconWrap,
            urgent && styles.pauseTimerIconWrapUrgent,
          ]}
        >
          <Ionicons
            name={pauseExpired ? 'alarm-outline' : 'time-outline'}
            size={16}
            color={urgent ? '#fff' : '#9a3412'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.pauseTimerLabel,
              urgent && styles.pauseTimerLabelUrgent,
            ]}
          >
            {pauseExpired ? 'Break time over' : 'Paused'}
          </Text>
          <Text
            style={[
              styles.pauseTimerValue,
              urgent && styles.pauseTimerValueUrgent,
            ]}
          >
            {pauseExpired
              ? 'Please resume'
              : pauseEndsAt
                ? formatCountdownClock(pauseRemainingMs ?? 0)
                : '--:--'}
          </Text>
        </View>
      </View>
    );
  };

  const renderMap = () => (
    <View style={fullMap ? styles.mapContainerFull : styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: Number(start?.latitude ?? location?.latitude ?? -26.2041),
          longitude: Number(start?.longitude ?? location?.longitude ?? 28.0473),
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsCompass
      >
        {start && (
          <Marker
            coordinate={{
              latitude: Number(start.latitude),
              longitude: Number(start.longitude),
            }}
            title="Start"
            description={startAddress}
            pinColor="green"
          />
        )}

        {stops.map((point, index) => (
          <Marker
            key={`stop-${index}`}
            coordinate={{
              latitude: Number(point.latitude),
              longitude: Number(point.longitude),
            }}
            title={`Stop ${index + 1}`}
            description={stopAddresses[index] || ""}
            pinColor="orange"
          />
        ))}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords.map(point => ({
              latitude: Number(point.latitude),
              longitude: Number(point.longitude),
            }))}
            strokeWidth={5}
            strokeColor="#ff2d2d"
          />
        )}
      </MapView>

      {routeLoading && (
        <View style={styles.mapOverlay}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.overlayText}>Building route...</Text>
        </View>
      )}

      {searchingStations && (
        <View style={styles.mapOverlay}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.overlayText}>
            Finding fuel stations along route...
          </Text>
        </View>
      )}

      {fuelWarning && (
        <View style={styles.fuelWarningOverlay}>
          <Ionicons name="warning-outline" size={24} color="#fff" />
          <Text style={styles.fuelWarningText}>Low Fuel</Text>
        </View>
      )}

      {fullMap && (
        <>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => updateState({ fullMap: false })}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.centerButton}
            onPress={() => {
              if (location && mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: Number(location.latitude),
                  longitude: Number(location.longitude),
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              }
            }}
          >
            <Ionicons name="locate-outline" size={24} color="#007bff" />
          </TouchableOpacity>

          {routeInfo && (
            <View style={styles.distanceInfo}>
              <View style={styles.distanceRow}>
                <Ionicons name="navigate-outline" size={20} color="#007bff" />
                <Text style={styles.distanceText}>
                  Total Distance: {formatDistance(routeInfo.distance)}
                </Text>
              </View>
              <View style={styles.distanceRow}>
                <Ionicons name="time-outline" size={20} color="#007bff" />
                <Text style={styles.distanceText}>
                  Estimated Time: {Math.round(routeInfo.duration)} min
                </Text>
              </View>
              {fuelStations.length > 0 && (
                <View style={styles.distanceRow}>
                  <Ionicons name="flame-outline" size={20} color="#f44336" />
                  <Text style={styles.distanceText}>
                    {fuelStations.length} stations along route
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderButtonSheet = () => (
    <Animated.View
      style={[
        styles.buttonSheet,
        { transform: [{ translateY: buttonSheetY }] },
      ]}
    >
      <View {...buttonSheetPanResponder.panHandlers} style={styles.routeSheetHandleArea}>
        <View style={styles.routeSheetHandle} />

        <View style={styles.routeSheetHeader}>
          <View>
            <Text style={styles.routeSheetTitle}>Route</Text>
            <Text style={styles.routeSheetSubtitle}>
              {buttonSheetOpenRef.current
                ? "Drag up to hide route info"
                : "Drag down to see route info"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.routeSheetExpandButton}
            onPress={() => {
              buttonSheetY.stopAnimation((value) => {
                const midpoint = maxDragRef.current / 2;
                snapButtonSheet(value < midpoint);
              });
            }}
          >
            <Ionicons
              name={buttonSheetOpenRef.current ? "chevron-up" : "chevron-down"}
              size={22}
              color="#333"
            />
          </TouchableOpacity>
        </View>

        {renderNotification()}
      </View>

      <ScrollView
        style={styles.routeSheetQuickActions}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.routeSheetSectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={async () => {
            await auditLog({
              action: "OPEN_FULL_MAP",
              page: "Location Activity",
              description: "User opened the full map",
              element: "Open Full Map",
              targetId: tripId,
              details: { trip_id: tripId },
            });

            updateState({ fullMap: true });
          }}
        >
          <Ionicons name="map-outline" size={18} color="#f3a089" />
          <Text style={styles.buttonText}>Open Full Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, styles.fuelButton]}
          onPress={async () => {
            await auditLog({
              action: "VIEW_FUEL_STATIONS",
              page: "Location Activity",
              description: "User viewed fuel stations along route",
              element: "View Fuel Stations Along Route",
              targetId: tripId,
              details: {
                trip_id: tripId,
                station_count: fuelStations.length,
              },
            });

            updateState({
              fullMap: true,
              showFuelModal: true,
            });

            if (fuelStations.length === 0 && routeCoords.length > 0) {
              findFuelStationsAlongRoute(routeCoords);
            }
          }}
        >
          <Ionicons name="flame-outline" size={18} color="#f3a089" />
          <Text style={styles.buttonText}>
            View Fuel Stations Along Route
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            styles.pauseButton,
            isPaused && styles.pauseButtonActive,
          ]}
          onPress={async () => {
            await auditLog({
              action: isPaused ? "TRIP_RESUME_OPEN" : "TRIP_PAUSE_OPEN",
              page: "Location Activity",
              description: isPaused
                ? "User opened the resume trip confirmation"
                : "User opened the pause trip modal",
              element: isPaused ? "Resume Trip" : "Pause Trip",
              targetId: tripId,
              details: {
                trip_id: tripId,
                was_paused: isPaused,
              },
            });

            if (isPaused) {
              resumeTrip();
            } else {
              openPauseModal();
            }
          }}
        >
          <Ionicons
            name={isPaused ? 'play-outline' : 'pause-outline'}
            size={20}
            color={isPaused ? '#2e7d32' : '#f3a089'}
          />
          <Text style={[styles.buttonText, isPaused && { color: '#2e7d32' }]}>
            {isPaused ? 'Resume Trip' : 'Pause Trip'}
          </Text>
        </TouchableOpacity>

        {canEndTrip() && (
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.endTripButton,
            ]}
            onPress={async () => {
              await auditLog({
                action: "TRIP_END",
                page: "Location Activity",
                description: "User ended the trip",
                element: "End Trip",
                targetId: tripId,
                details: { trip_id: tripId },
              });

              await endTrip();
            }}
          >
            <Ionicons
              name="stop-circle-outline"
              size={20}
              color="red"
            />
            <Text style={[styles.buttonText, { color: "red" }]}>
              End Trip
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </Animated.View>
  );

  const renderRouteInfoPanel = () => (
    <ScrollView
      style={styles.routeInfoScroll}
      contentContainerStyle={styles.routeSheetContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.routeSheetSectionTitle}>Active Route</Text>

      {isPaused && (
        <View
          style={[
            styles.pausedBanner,
            pauseExpired && styles.pausedBannerExpired,
          ]}
        >
          <Ionicons
            name={pauseExpired ? 'alarm-outline' : 'pause-circle'}
            size={22}
            color={pauseExpired ? '#7f1d1d' : '#9a3412'}
          />
          <Text
            style={[
              styles.pausedBannerText,
              pauseExpired && { color: '#7f1d1d' },
            ]}
          >
            {pauseExpired
              ? 'Trip paused • break time is over — please resume'
              : pauseEndsAt
                ? `Trip paused • ends in ${formatCountdown(pauseRemainingMs ?? 0)}`
                : pauseStartTime
                  ? `Trip paused • started ${Math.max(
                      1,
                      Math.round((Date.now() - pauseStartTime) / 60000)
                    )} min ago`
                  : 'Trip paused'}
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={resolveTripForDriver}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {tripResolved && !hasTrip && !error ? (
        <View style={styles.emptyTripCard}>
          <View style={styles.emptyTripIconWrap}>
            <Ionicons name="car-outline" size={26} color="#0A1F44" />
          </View>
          <Text style={styles.emptyTripTitle}>No active trip</Text>
          <Text style={styles.emptyTripSubtitle}>
            You don't have a trip assigned to your vehicle right now.
            It will appear here as soon as dispatch assigns one.
          </Text>
        </View>
      ) : null}

      {(hasTrip || tripLoading) && (
        <View style={styles.routeInfoWhiteCard}>
          <View style={styles.infoCardIcon}>
            <Ionicons name="navigate-outline" size={20} color="#007bff" />
          </View>
          <View style={styles.infoCardTextContainer}>
            <Text style={styles.infoCardLabel}>Start</Text>
            {startAddress ? (
              <Text style={styles.infoCardValue}>{startAddress}</Text>
            ) : (
              <View style={styles.skeletonLine} />
            )}
          </View>
        </View>
      )}

      {routeLoading && hasTrip ? (
        <View style={styles.routeInfoWhiteCard}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={[styles.infoCardValue, { marginLeft: 12 }]}>Building route...</Text>
        </View>
      ) : null}

      {stops.map((_, i) => (
        <View key={i} style={styles.routeInfoWhiteCard}>
          <View style={styles.infoCardIcon}>
            <Ionicons name="location-outline" size={20} color="#007bff" />
          </View>
          <View style={styles.infoCardTextContainer}>
            <Text style={styles.infoCardLabel}>Stop {i + 1}</Text>
            {stopAddresses[i] ? (
              <Text style={styles.infoCardValue}>{stopAddresses[i]}</Text>
            ) : (
              <View style={styles.skeletonLine} />
            )}
          </View>
        </View>
      ))}

      {hasTrip && (
        <>
          <Text style={styles.routeSheetSectionTitle}>Fuel Status</Text>

          <View style={[styles.fuelStatusCard, fuelWarning ? styles.fuelStatusWarning : null]}>
            <View style={styles.fuelStatusHeader}>
              <View style={styles.fuelStatusIcon}>
                <Ionicons name="flame" size={22} color="#fff" />
              </View>
              <View>
                <Text style={styles.fuelStatusTitle}>Fuel Level</Text>
                <Text style={styles.fuelPercentage}>{fuelPercent.toFixed(1)}%</Text>
              </View>
            </View>

            <View style={styles.fuelProgressBackground}>
              <View
                style={[
                  styles.fuelProgress,
                  { width: `${Math.max(0, Math.min(100, fuelPercent))}%` },
                ]}
              />
            </View>

            <View style={styles.fuelRangeRow}>
              <View>
                <Text style={styles.fuelRangeLabel}>Estimated Range</Text>
                <Text style={styles.fuelRangeValue}>{calculateRemainingRange().toFixed(1)} km</Text>
              </View>
              <Ionicons name="speedometer-outline" size={24} color="#007bff" />
            </View>

            {fuelWarning && (
              <View style={styles.lowFuelWarning}>
                <Ionicons name="warning-outline" size={18} color="#fff" />
                <Text style={styles.lowFuelWarningText}>Low Fuel - Please refuel soon.</Text>
              </View>
            )}

            {recommendedStation && (
              <View style={styles.nearestStation}>
                <Ionicons name="location" size={18} color="#007bff" />
                <Text style={styles.nearestStationText}>
                  Nearest: {recommendedStation.name} ({formatDistance(
                    recommendedStation.distanceToRoute || haversineKm(
                      location?.latitude || 0,
                      location?.longitude || 0,
                      recommendedStation.latitude,
                      recommendedStation.longitude
                    )
                  )} from route)
                </Text>
              </View>
            )}

            {fuelStations.length > 0 && (
              <Text style={styles.stationCountText}>
                {fuelStations.length} stations found along route
              </Text>
            )}
          </View>

          {destinationDistanceToStation && (
            <View style={styles.distanceComparisonCard}>
              <Text style={styles.distanceComparisonTitle}>Distance Comparison</Text>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>To station</Text>
                <Text style={styles.comparisonValue}>
                  {destinationDistanceToStation.station.toFixed(1)} km
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>To destination</Text>
                <Text style={styles.comparisonValue}>
                  {destinationDistanceToStation.destination.toFixed(1)} km
                </Text>
              </View>
              <Text style={styles.comparisonResult}>
                {destinationDistanceToStation.stationCloser
                  ? "Station is closer than destination"
                  : "Destination is closer than station"}
              </Text>
            </View>
          )}

          {routeInfo && (
            <>
              <Text style={styles.routeSheetSectionTitle}>Route Information</Text>

              <View style={styles.routeInformationCard}>
                <View style={styles.routeInfoHeader}>
                  <Ionicons name="map-outline" size={22} color="#007bff" />
                  <Text style={styles.routeInfoTitle}>Route Information</Text>
                </View>

                <View style={styles.routeInfoRow}>
                  <Ionicons name="navigate-circle-outline" size={20} color="#007bff" />
                  <View>
                    <Text style={styles.routeInfoSmallLabel}>Total Distance</Text>
                    <Text style={styles.routeInfoText}>{formatDistance(routeInfo.distance)}</Text>
                  </View>
                </View>

                <View style={styles.routeInfoRow}>
                  <Ionicons name="time-outline" size={20} color="#007bff" />
                  <View>
                    <Text style={styles.routeInfoSmallLabel}>Estimated Time</Text>
                    <Text style={styles.routeInfoText}>{Math.round(routeInfo.duration)} min</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          <Text style={styles.routeSheetSectionTitle}>Fuel Stations Along Route</Text>

          {searchingStations ? (
            <View style={styles.routeInfoWhiteCard}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={[styles.infoCardValue, { marginLeft: 12 }]}>Searching for stations...</Text>
            </View>
          ) : fuelStations.length > 0 ? (
            fuelStations.slice(0, 5).map((station, i) => (
              <View key={station.id || i} style={styles.stationCard}>
                <View style={styles.stationIcon}>
                  <Ionicons name="flame" size={20} color="#f44336" />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{station.name}</Text>
                  <Text style={styles.stationDistance}>
                    {recommendedStation?.id === station.id
                      ? "Best match"
                      : formatDistance(
                          station.distanceToRoute || haversineKm(
                            location?.latitude || 0,
                            location?.longitude || 0,
                            station.latitude,
                            station.longitude
                          )
                        )}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No stations found along route</Text>
          )}
        </>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderMap()}
      {renderPauseTimerOverlay()}
      {!fullMap && (
        <View
          style={styles.infoAreaContainer}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - infoAreaHeight) > 1) {
              setInfoAreaHeight(h);
            }
          }}
        >
          {renderRouteInfoPanel()}
          {renderButtonSheet()}
        </View>
      )}
      {renderFuelModal()}
      {renderPauseModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  mapContainer: {
    width: "100%",
    height: 300,
    overflow: "hidden",
  },
  mapContainerFull: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 10,
  },
  map: {
    width: "100%",
    height: "100%",
  },

  errorBox: {
    backgroundColor: "#fff",
    padding: 13,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f44336",
  },
  errorText: { color: "#f44336" },
  noDataText: { color: "#666", fontStyle: "italic", marginBottom: 10 },

  primaryButton: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 15,
    justifyContent: "center",
    height: 50,
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fuelButton: { backgroundColor: "white" },
  receiptButton: { backgroundColor: "white", marginTop: 15, padding: 16 },
  buttonText: { color: "#0A1F44", marginLeft: 8, fontWeight: "bold", fontSize: 15 },
  endTripButton: { backgroundColor: 'white', marginTop: 15 },

  pauseButton: { backgroundColor: 'white', marginTop: 10 },
  pauseButtonActive: {
    borderWidth: 1,
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e9',
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 30,
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  centerButton: {
    position: "absolute",
    bottom: 140,
    right: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  distanceInfo: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  distanceText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  notificationBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  notificationText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  mapOverlay: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overlayText: { marginLeft: 8, color: "#333", fontWeight: "600" },

  fuelWarningOverlay: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#d32f2f",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fuelWarningText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },

  pauseTimerPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 50,
  },
  pauseTimerPillUrgent: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  pauseTimerPillResumed: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  pauseTimerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pauseTimerIconWrapUrgent: {
    backgroundColor: '#dc2626',
  },
  pauseTimerIconWrapResumed: {
    backgroundColor: '#2e7d32',
  },
  pauseTimerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a3412',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  pauseTimerLabelUrgent: {
    color: '#7f1d1d',
  },
  pauseTimerLabelResumed: {
    color: '#1b5e20',
  },
  pauseTimerValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A1F44',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  pauseTimerValueUrgent: {
    color: '#7f1d1d',
  },
  pauseTimerValueResumed: {
    color: '#1b5e20',
  },

  currentLocationMarker: { alignItems: "center", justifyContent: "center" },
  currentLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#007bff",
    borderWidth: 3,
    borderColor: "#fff",
  },
  fuelMarker: {
    backgroundColor: "white",
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#f44336",
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedFuelMarker: { borderColor: "#FF6B00", borderWidth: 3 },
  calloutView: { padding: 8, maxWidth: 200 },
  calloutTitle: { fontWeight: "bold", fontSize: 14, marginBottom: 4 },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1a1a1a" },
  modalCloseButton: { padding: 4 },
  modalList: { padding: 16 },
  fuelCountText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  loadingModalContent: { padding: 40, alignItems: "center" },
  loadingModalText: { marginTop: 12, fontSize: 16, color: "#666" },
  fuelItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  fuelItemContent: { flexDirection: "row", alignItems: "center" },
  fuelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f44336",
  },
  fuelItemInfo: { flex: 1, marginLeft: 12 },
  fuelItemName: { fontSize: 14, fontWeight: "bold", color: "#1a1a1a" },
  fuelItemAddress: { fontSize: 12, color: "#666", marginTop: 2 },
  fuelItemBrand: { fontSize: 12, color: "#888", marginTop: 2 },
  fuelItemDistance: { fontSize: 12, color: "#007bff", marginTop: 2 },
  routeBadge: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  emptyState: { alignItems: "center", padding: 40 },
  emptyStateText: { marginTop: 12, fontSize: 16, color: "#999" },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#007bff",
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontWeight: "bold" },

  receiptModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 31, 68, 0.55)",
    justifyContent: "flex-end",
  },
  receiptModalSheet: {
    backgroundColor: "#ebf2ff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: height * 0.82,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    overflow: "hidden",
  },
  receiptModalHandleWrap: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: "center",
    backgroundColor: "#ebf2ff",
  },
  receiptModalHandle: {
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#c9c9c9",
  },
  receiptModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A1F44",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: 8,
  },
  receiptModalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  receiptModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  receiptModalSubtitleSmall: {
    fontSize: 12,
    color: "#aebbd3",
    marginTop: 3,
  },
  receiptModalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  receiptInputCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  receiptInputLabel: {
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
    marginBottom: 8,
  },

  receiptModalActions: {
    flexDirection: "row",
    gap: 10,
  },
  receiptModalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 15,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptModalBtnPrimary: {
    backgroundColor: "#0A1F44",
  },
  receiptModalBtnCancel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c9c9c9",
  },
  receiptModalBtnTextPrimary: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },
  receiptModalBtnTextCancel: {
    color: "#0A1F44",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },

  pauseCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  pauseCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pauseCategoryLabel: { fontSize: 15, fontWeight: '800', color: '#0A1F44' },
  pauseCategoryDesc: { fontSize: 12, color: '#7a8699', marginTop: 2 },

  pauseBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 6,
  },
  pauseBackText: { marginLeft: 6, color: '#0A1F44', fontWeight: '700' },

  pauseSubOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e7f3',
  },
  pauseSubOptionActive: {
    borderColor: '#0A1F44',
    backgroundColor: '#eef2ff',
  },
  pauseSubOptionText: { fontSize: 14, fontWeight: '600', color: '#333' },
  pauseSubOptionTextActive: { color: '#0A1F44', fontWeight: '800' },

  pauseNotesInput: {
    backgroundColor: '#f3f6fc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e7f3',
    fontSize: 15,
    color: '#0A1F44',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  pausedBannerExpired: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  pausedBannerText: {
    flex: 1,
    marginLeft: 8,
    color: '#9a3412',
    fontWeight: '700',
    fontSize: 13,
  },

  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#e5e9f0",
    marginTop: 4,
    width: "70%",
  },
  emptyTripCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e9f0",
  },
  emptyTripIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#eef6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTripTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A1F44",
    marginBottom: 4,
  },
  emptyTripSubtitle: {
    fontSize: 12,
    color: "#7a8699",
    textAlign: "center",
    lineHeight: 18,
  },

  infoAreaContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    marginBottom: 50
  },
  routeInfoScroll: {
    flex: 1,
    backgroundColor: "#ebf2ff",
  },
  buttonSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 20,
  },
  routeSheetHandleArea: {
    backgroundColor: "#0A1F44",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  routeSheetHandle: {
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#c9c9c9",
    alignSelf: "center",
    marginBottom: 12,
  },
  routeSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeSheetTitle: { fontSize: 24, fontWeight: "800", color: "white" },
  routeSheetSubtitle: { marginTop: 3, fontSize: 13, color: "#777" },
  routeSheetExpandButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  routeSheetQuickActions: {
    flex: 1,
    backgroundColor: "#e4ecff",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  routeSheetContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  routeSheetSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171717",
    marginTop: 14,
    marginBottom: 10,
  },

  routeInfoWhiteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 15,
    marginBottom: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoCardTextContainer: { flex: 1 },
  infoCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#777",
    marginBottom: 3,
  },
  infoCardValue: { fontSize: 14, color: "#333", lineHeight: 20 },

  fuelStatusCard: {
    backgroundColor: "#fff",
    padding: 17,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  fuelStatusWarning: { borderWidth: 1, borderColor: "#ff6b6b" },
  fuelStatusHeader: { flexDirection: "row", alignItems: "center" },
  fuelStatusIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#f44336",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fuelStatusTitle: { fontSize: 13, color: "#777", fontWeight: "600" },
  fuelPercentage: {
    fontSize: 23,
    fontWeight: "800",
    color: "#222",
    marginTop: 1,
  },
  fuelProgressBackground: {
    height: 9,
    backgroundColor: "#eeeeee",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 16,
  },
  fuelProgress: {
    height: "100%",
    backgroundColor: "#007bff",
    borderRadius: 5,
  },
  fuelRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },
  fuelRangeLabel: { fontSize: 12, color: "#777" },
  fuelRangeValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginTop: 2,
  },
  lowFuelWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d32f2f",
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  lowFuelWarningText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
    flex: 1,
  },
  nearestStation: { flexDirection: "row", alignItems: "center", marginTop: 13 },
  nearestStationText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 13,
    color: "#444",
  },
  stationCountText: { marginTop: 10, color: "#777", fontSize: 12 },

  routeInformationCard: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  routeInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  routeInfoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
    marginLeft: 9,
  },
  routeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  routeInfoSmallLabel: { fontSize: 11, color: "#888", marginBottom: 2 },
  routeInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginLeft: 10,
  },

  distanceComparisonCard: {
    backgroundColor: "#e9f7ed",
    padding: 16,
    borderRadius: 15,
    marginTop: 10,
  },
  distanceComparisonTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1b5e20",
    marginBottom: 10,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  comparisonLabel: { color: "#555" },
  comparisonValue: { fontWeight: "700", color: "#222" },
  comparisonResult: {
    fontWeight: "700",
    color: "#1b5e20",
    marginTop: 8,
  },

  stationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 13,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff1f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stationInfo: { flex: 1 },
  stationName: { fontSize: 14, fontWeight: "700", color: "#222" },
  stationDistance: { fontSize: 12, color: "#007bff", marginTop: 3 },
});