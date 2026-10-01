import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// ---------- Helpers (same as LocationScreen) ----------
const toCoord = (p) => {
  if (!p || p.lat == null || p.lng == null) return null;
  return { latitude: Number(p.lat), longitude: Number(p.lng) };
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (dist) => {
  if (dist == null) return "—";
  if (dist < 1) return `${Math.round(dist * 1000)} m`;
  return `${dist.toFixed(1)} km`;
};

const formatDuration = (seconds) => {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const OSRM_BASE_URL = "https://router.project-osrm.org";

const fetchOSRMRoute = async (points) => {
  if (!Array.isArray(points) || points.length < 2) return null;
  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "OSRM route request failed");
  const route = json?.routes?.[0];
  if (!route) throw new Error("No route found");
  const coordsArray = (route.geometry?.coordinates || [])
    .map(([lng, lat]) => ({ latitude: Number(lat), longitude: Number(lng) }))
    .filter((p) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));
  return {
    coords: coordsArray,
    distance: route.distance / 1000,
    duration: route.duration / 60,
  };
};

const RiskRouteScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const tripId = route?.params?.tripId;
  const mapRef = useRef(null);

  // ---------- Trip state (non-blocking) ----------
  const [trip, setTrip] = useState({
    loading: true,
    error: "",
    start: null,
    stops: [],
    startAddress: "",
    stopAddresses: [],
    routeCoords: [],
    routeInfo: null,
    routeLoading: false,
  });

  // ---------- Driver + Vehicle ----------
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);

  const updateTrip = useCallback((updates) => {
    setTrip((prev) => ({ ...prev, ...updates }));
  }, []);

  // ---------- Load trip (same source as LocationScreen) ----------
  const loadTrip = useCallback(async () => {
    try {
      updateTrip({ loading: true, error: "" });

      let query = supabase
        .from("optimized_routes")
        .select("id, start_point, stops");

      if (tripId) {
        query = query.eq("id", tripId).maybeSingle();
      } else {
        query = query.order("created_at", { ascending: false }).limit(1);
      }

      const { data, error } = await query;
      if (error) throw error;

      const loadedTrip = tripId ? data : data?.[0];
      if (!loadedTrip) throw new Error("No trip data found");

      const startCoord = toCoord(loadedTrip.start_point);
      const stopCoords = Array.isArray(loadedTrip.stops)
        ? loadedTrip.stops.map(toCoord).filter(Boolean)
        : [];

      if (!startCoord) throw new Error("Invalid start_point data");

      // Show map markers as soon as we have coords — don't wait for geocoding
      updateTrip({
        start: startCoord,
        stops: stopCoords,
        loading: false,
      });

      // Reverse geocode start + stops (doesn't block UI)
      try {
        const startRes = await ExpoLocation.reverseGeocodeAsync(startCoord);
        const startAddr = startRes?.[0];
        const startText = startAddr
          ? [
              startAddr.name,
              startAddr.street,
              startAddr.city,
              startAddr.region,
              startAddr.country,
            ]
              .filter(Boolean)
              .join(", ")
          : "Unknown address";

        const stopTexts = await Promise.all(
          stopCoords.map(async (c) => {
            try {
              const r = await ExpoLocation.reverseGeocodeAsync(c);
              const a = r?.[0];
              return a
                ? [a.name, a.street, a.city, a.region, a.country]
                    .filter(Boolean)
                    .join(", ")
                : "Unknown address";
            } catch {
              return "Unknown address";
            }
          })
        );

        updateTrip({
          startAddress: startText,
          stopAddresses: stopTexts,
        });
      } catch (e) {
        console.warn("[RiskRoute] reverse geocode failed:", e?.message);
      }

      // Fetch route (doesn't block UI)
      if (stopCoords.length > 0) {
        updateTrip({ routeLoading: true });
        try {
          const result = await fetchOSRMRoute([startCoord, stopCoords[0]]);
          if (result && result.coords.length > 1) {
            updateTrip({
              routeCoords: result.coords,
              routeInfo: {
                distance: result.distance,
                duration: result.duration,
              },
              routeLoading: false,
            });
          } else {
            const direct = haversineKm(
              startCoord.latitude,
              startCoord.longitude,
              stopCoords[0].latitude,
              stopCoords[0].longitude
            );
            updateTrip({
              routeCoords: [startCoord, stopCoords[0]],
              routeInfo: { distance: direct, duration: (direct / 50) * 60 },
              routeLoading: false,
            });
          }
        } catch (err) {
          const direct = haversineKm(
            startCoord.latitude,
            startCoord.longitude,
            stopCoords[0].latitude,
            stopCoords[0].longitude
          );
          updateTrip({
            routeCoords: [startCoord, stopCoords[0]],
            routeInfo: { distance: direct, duration: (direct / 50) * 60 },
            routeLoading: false,
          });
        }
      }
    } catch (e) {
      updateTrip({
        error: e.message || "Failed to load trip",
        loading: false,
        routeLoading: false,
      });
    }
  }, [tripId, updateTrip]);

  // ---------- Load driver + vehicle (exactly like ProfileScreen) ----------
  const loadDriverAndVehicle = useCallback(async () => {
    if (!user?.id) return;
    setVehicleLoading(true);
    try {
      // 1. Find the driver row via user_id (with fallback to auth uid)
      let driverId = null;

      const { data: byUser, error: byUserErr } = await supabase
        .from("drivers")
        .select("driver_id")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[RiskRoute] driver by user_id:", {
        driverId: byUser?.driver_id,
        error: byUserErr?.message,
        code: byUserErr?.code,
      });

      driverId = byUser?.driver_id ?? null;

      // Fallback: driver_id already equals auth uid in some setups
      if (!driverId) {
        driverId = user.id;
      }

      // Best-effort: fetch driver profile details for display
      if (byUser?.driver_id) {
        const { data: driverRow } = await supabase
          .from("drivers")
          .select("driver_id, driver_username, phone, license_number")
          .eq("driver_id", byUser.driver_id)
          .maybeSingle();
        if (driverRow) setDriver(driverRow);
      } else if (user.email) {
        const { data: driverByEmail } = await supabase
          .from("drivers")
          .select("driver_id, driver_username, phone, license_number")
          .eq("email", user.email)
          .maybeSingle();
        if (driverByEmail) setDriver(driverByEmail);
      }

      console.log("[RiskRoute] resolved driverId:", driverId);

      // 2. Look up the vehicle by driver_id — same columns as ProfileScreen
      const { data: veh, error: vehErr } = await supabase
        .from("vehicles")
        .select(
          "vehicle_id, registration_number, status, current_location, route_id"
        )
        .eq("driver_id", driverId)
        .maybeSingle();

      console.log("[RiskRoute] vehicle lookup:", {
        vehicleId: veh?.vehicle_id,
        registration: veh?.registration_number,
        error: vehErr?.message,
        code: vehErr?.code,
        details: vehErr?.details,
        hint: vehErr?.hint,
      });

      setVehicle(veh ?? null);
    } catch (e) {
      console.warn("[RiskRoute] driver/vehicle fetch exception:", e?.message);
      setVehicle(null);
    } finally {
      setVehicleLoading(false);
    }
  }, [user?.id, user?.email]);

  // Kick off both loads in parallel immediately on mount
  useEffect(() => {
    loadDriverAndVehicle();
    loadTrip();
  }, [loadDriverAndVehicle, loadTrip]);

  // Fit map to route whenever routeCoords change
  useEffect(() => {
    if (mapRef.current && trip.routeCoords.length > 1) {
      mapRef.current.fitToCoordinates(trip.routeCoords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [trip.routeCoords]);

  // ---------- Derived ----------
  const riskLevel = "Low";
  const getRiskColor = () => {
    switch (riskLevel) {
      case "High":
        return "#dc2626";
      case "Medium":
        return "#d97706";
      default:
        return "#2e7d32";
    }
  };
  const getRiskIcon = () => {
    switch (riskLevel) {
      case "High":
        return "alert-circle";
      case "Medium":
        return "warning";
      default:
        return "shield-checkmark";
    }
  };

  const getInitials = (name) => {
    if (!name) return "DR";
    return name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const etaText = trip.routeInfo
    ? formatDuration(Math.round(trip.routeInfo.duration * 60))
    : "—";

  const destinationName =
    trip.stopAddresses[0]?.split(",").slice(-2).join(", ") || "Destination";

  // ---------- Small components ----------
  const ProgressBar = ({ value, color }) => (
    <View style={styles.barBackground}>
      <View
        style={[
          styles.barFill,
          {
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );

  const DetailRow = ({ icon, label, value, iconColor = "#007bff" }) => (
    <View style={styles.detailRow}>
      <View
        style={[styles.detailIconWrap, { backgroundColor: `${iconColor}1A` }]}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || "—"}</Text>
      </View>
    </View>
  );

  // ---------- Render (no full-screen blocking spinner) ----------
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Risk Route</Text>
            <Text style={styles.headerSubtitle}>Today's overview & safety</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerBell}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewHeading}>Quick Actions</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Location", { tripId })}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="navigate" size={18} color="#fff" />
              </View>
              <Text style={styles.actionText}>Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Fuel")}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="car" size={18} color="#fff" />
              </View>
              <Text style={styles.actionText}>Fuel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="help-circle" size={18} color="#fff" />
              </View>
              <Text style={styles.actionText}>Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Notifications")}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="notifications" size={18} color="#fff" />
              </View>
              <Text style={styles.actionText}>Alerts</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid — trip-dependent values show "—" until loaded */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="checkmark-done" size={14} color="#7dd3fc" />
                <Text style={styles.statTitle}>Stops</Text>
              </View>
              <Text style={styles.statValue}>
                {trip.loading ? "—" : trip.stops.length}
              </Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="speedometer" size={14} color="#7dd3fc" />
                <Text style={styles.statTitle}>Distance</Text>
              </View>
              <Text style={styles.statValue}>
                {trip.routeInfo
                  ? formatDistance(trip.routeInfo.distance)
                  : "—"}
              </Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="time" size={14} color="#7dd3fc" />
                <Text style={styles.statTitle}>ETA</Text>
              </View>
              <Text style={styles.statValue}>
                {trip.routeInfo ? etaText : "—"}
              </Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="car-sport" size={14} color="#7dd3fc" />
                <Text style={styles.statTitle}>Vehicle</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1}>
                {vehicleLoading
                  ? "—"
                  : vehicle?.registration_number || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Summary */}
        <Text style={styles.sectionTitle}>Trip Summary</Text>

        <View style={styles.card}>
          {trip.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{trip.error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadTrip}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : trip.loading ? (
            <View style={styles.tripLoadingRow}>
              <ActivityIndicator size="small" color="#0A1F44" />
              <Text style={styles.tripLoadingText}>Loading trip...</Text>
            </View>
          ) : (
            <>
              <View style={styles.tripSummaryHeader}>
                <View style={styles.tripIconWrap}>
                  <Ionicons name="flag-outline" size={20} color="#007bff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripTitle} numberOfLines={1}>
                    {destinationName}
                  </Text>
                  <Text style={styles.tripSubtitle} numberOfLines={1}>
                    Start: {trip.startAddress || "Unknown"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.riskPill,
                    {
                      backgroundColor: `${getRiskColor()}1A`,
                      borderColor: getRiskColor(),
                    },
                  ]}
                >
                  <Text
                    style={[styles.riskPillText, { color: getRiskColor() }]}
                  >
                    {riskLevel}
                  </Text>
                </View>
              </View>

              <View style={styles.tripDivider} />

              <View style={styles.tripMetaRow}>
                <View style={styles.tripMetaItem}>
                  <Ionicons
                    name="navigate-outline"
                    size={16}
                    color="#007bff"
                  />
                  <Text style={styles.tripMetaText}>
                    {trip.routeInfo
                      ? formatDistance(trip.routeInfo.distance)
                      : "—"}
                  </Text>
                </View>
                <View style={styles.tripMetaItem}>
                  <Ionicons name="time-outline" size={16} color="#007bff" />
                  <Text style={styles.tripMetaText}>{etaText}</Text>
                </View>
                <View style={styles.tripMetaItem}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color="#007bff"
                  />
                  <Text style={styles.tripMetaText}>
                    {trip.stops.length} stops
                  </Text>
                </View>
              </View>

              {trip.stopAddresses.length > 0 && (
                <>
                  <View style={styles.tripDivider} />
                  {trip.stopAddresses.slice(0, 3).map((addr, i) => (
                    <View key={i} style={styles.stopRow}>
                      <View style={styles.stopDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopLabel}>Stop {i + 1}</Text>
                        <Text style={styles.stopValue} numberOfLines={2}>
                          {addr}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* Mini Map */}
        <Text style={styles.sectionTitle}>Route Preview</Text>

        <View style={styles.mapCard}>
          {trip.start ? (
            <MapView
              ref={mapRef}
              style={styles.miniMap}
              initialRegion={{
                latitude: trip.start.latitude,
                longitude: trip.start.longitude,
                latitudeDelta: 1.5,
                longitudeDelta: 1.5,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              pointerEvents="none"
            >
              {trip.routeCoords.length > 1 && (
                <Polyline
                  coordinates={trip.routeCoords}
                  strokeWidth={5}
                  strokeColor="#ff2d2d"
                />
              )}
              <Marker coordinate={trip.start} pinColor="green" title="Start" />
              {trip.stops.map((s, i) => (
                <Marker
                  key={`stop-${i}`}
                  coordinate={s}
                  pinColor="orange"
                  title={`Stop ${i + 1}`}
                />
              ))}
            </MapView>
          ) : (
            <View style={[styles.miniMap, styles.mapLoading]}>
              <ActivityIndicator size="small" color="#0A1F44" />
              <Text style={styles.mapLoadingText}>
                {trip.error ? "No route data" : "Loading map..."}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.mapOverlayBtn}
            onPress={() => navigation.navigate("Location", { tripId })}
          >
            <Ionicons name="expand-outline" size={16} color="#0A1F44" />
            <Text style={styles.mapOverlayBtnText}>Open Full Map</Text>
          </TouchableOpacity>
        </View>

        {/* Driver Details */}
        <Text style={styles.sectionTitle}>Driver Details</Text>

        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(driver?.driver_username || user?.email)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                {driver?.driver_username || "Driver"}
              </Text>
              <Text style={styles.profileSub}>
                {driver?.driver_id
                  ? `ID ${driver.driver_id}`
                  : "Driver profile"}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.ratingText}>4.8 · 128 trips</Text>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>On Duty</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.tripDivider} />

          <DetailRow icon="call-outline" label="Phone" value={driver?.phone} />
          <DetailRow
            icon="mail-outline"
            label="Email"
            value={driver?.email || user?.email}
          />
          <DetailRow
            icon="card-outline"
            label="License"
            value={driver?.license_number}
            iconColor="#7c3aed"
          />
        </View>

        {/* Vehicle Details */}
        <Text style={styles.sectionTitle}>Vehicle Details</Text>

        <View style={styles.card}>
          {vehicleLoading ? (
            <View style={styles.vehicleLoadingRow}>
              <ActivityIndicator size="small" color="#0A1F44" />
              <Text style={styles.vehicleLoadingText}>Loading vehicle...</Text>
            </View>
          ) : !vehicle ? (
            <View style={styles.vehicleEmptyRow}>
              <Ionicons name="car-outline" size={22} color="#9CA3AF" />
              <Text style={styles.vehicleEmptyText}>
                No vehicle assigned to your profile yet.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleIconWrap}>
                  <MaterialCommunityIcons
                    name="car"
                    size={22}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleName}>
                    {vehicle.registration_number || "Assigned Vehicle"}
                  </Text>
                  <Text style={styles.vehicleSub}>
                    {vehicle.status
                      ? `Status: ${vehicle.status}`
                      : "GPS Active"}
                  </Text>
                </View>
                {vehicle.status && (
                  <View style={styles.vehicleStatusBadge}>
                    <Text style={styles.vehicleStatusText}>
                      {vehicle.status}
                    </Text>
                  </View>
                )}
              </View>

              {/* Number Plate */}
              <View style={styles.plateOuter}>
                <Text style={styles.plateText}>
                  {vehicle.registration_number || "—"}
                </Text>
              </View>

              {/* Health bars */}
              <View style={styles.healthBlock}>
                <View style={styles.healthRow}>
                  <Text style={styles.label}>Fuel</Text>
                  <Text style={styles.percentText}>38%</Text>
                </View>
                <ProgressBar value={38} color="#f4a300" />
              </View>

              <View style={styles.healthBlock}>
                <View style={styles.healthRow}>
                  <Text style={styles.label}>Engine</Text>
                  <Text style={styles.percentText}>90%</Text>
                </View>
                <ProgressBar value={90} color="#2ecc71" />
              </View>

              <View style={styles.healthBlock}>
                <View style={styles.healthRow}>
                  <Text style={styles.label}>Tyres</Text>
                  <Text style={styles.percentText}>75%</Text>
                </View>
                <ProgressBar value={75} color="#3498db" />
              </View>

              <View style={styles.tripDivider} />

              <DetailRow
                icon="location-outline"
                label="Current Location"
                value={vehicle.current_location}
              />
              <DetailRow
                icon="git-branch-outline"
                label="Route"
                value={vehicle.route_id}
                iconColor="#7c3aed"
              />
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ebf2ff" },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#0A1F44", fontWeight: "600" },

  // ---------- Header ----------
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A1F44",
    paddingTop: 16,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSubtitle: { color: "#aebbd3", fontSize: 12, marginTop: 2 },
  headerBell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ---------- Scroll ----------
  scrollContent: { padding: 16, paddingTop: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A1F44",
    marginTop: 18,
    marginBottom: 10,
  },

  // ---------- Risk Banner ----------
  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  riskBannerLeft: { flexDirection: "row", alignItems: "center" },
  riskIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  riskBannerLabel: { color: "#aebbd3", fontSize: 12, fontWeight: "600" },
  riskBannerValue: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  riskBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  riskBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // ---------- Overview ----------
  overviewCard: {
    backgroundColor: "#0A1F44",
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  overviewHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    width: "23%",
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    width: "48%",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statTitle: {
    color: "#aebbd3",
    fontSize: 11,
    marginLeft: 5,
    fontWeight: "600",
  },
  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },

  // ---------- Card ----------
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },

  // ---------- Trip Summary ----------
  tripSummaryHeader: { flexDirection: "row", alignItems: "center" },
  tripIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eef6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tripTitle: { fontSize: 16, fontWeight: "800", color: "#0A1F44" },
  tripSubtitle: { fontSize: 12, color: "#7a8699", marginTop: 2 },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  riskPillText: { fontSize: 11, fontWeight: "800" },
  tripDivider: { height: 1, backgroundColor: "#eef2f7", marginVertical: 14 },
  tripMetaRow: { flexDirection: "row", justifyContent: "space-around" },
  tripMetaItem: { flexDirection: "row", alignItems: "center" },
  tripMetaText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
    marginTop: 6,
    marginRight: 10,
  },
  stopLabel: { fontSize: 11, color: "#7a8699", fontWeight: "700" },
  stopValue: {
    fontSize: 13,
    color: "#0A1F44",
    fontWeight: "600",
    marginTop: 2,
  },
  tripLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  tripLoadingText: {
    marginLeft: 10,
    fontSize: 13,
    color: "#7a8699",
    fontWeight: "600",
  },

  errorBox: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#dc2626", fontWeight: "600" },
  retryBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#0A1F44",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "700" },

  // ---------- Map ----------
  mapCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  miniMap: { width: "100%", height: 200 },
  mapLoading: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  mapLoadingText: { marginTop: 8, color: "#7a8699", fontWeight: "600" },
  mapOverlayBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  mapOverlayBtnText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#0A1F44",
  },

  // ---------- Driver Profile ----------
  profileHeader: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0A1F44",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
  profileName: { fontSize: 17, fontWeight: "800", color: "#0A1F44" },
  profileSub: { fontSize: 12, color: "#7a8699", marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  ratingText: { marginLeft: 5, fontSize: 12, color: "#333", fontWeight: "600" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2e7d32",
    marginRight: 4,
  },
  statusText: { fontSize: 10, color: "#2e7d32", fontWeight: "700" },

  // ---------- Detail Row ----------
  detailRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: "#7a8699",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    color: "#0A1F44",
    fontWeight: "600",
    marginTop: 1,
  },

  // ---------- Vehicle ----------
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  vehicleIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#0A1F44",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleName: { fontSize: 17, fontWeight: "800", color: "#0A1F44" },
  vehicleSub: { fontSize: 12, color: "#7a8699", marginTop: 2 },
  vehicleStatusBadge: {
    backgroundColor: "#DFF7E5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },
  vehicleStatusText: {
    color: "#1b8634",
    fontWeight: "700",
    fontSize: 10,
    textTransform: "capitalize",
  },
  plateOuter: {
    borderWidth: 2,
    borderColor: "#0b60f4",
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    borderRadius: 8,
    marginBottom: 16,
  },
  plateText: {
    color: "#0b60f4",
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 14,
  },
  healthBlock: { marginBottom: 12 },
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: { color: "#0B1F3A", fontSize: 12, fontWeight: "700" },
  percentText: { fontSize: 12, color: "#555", fontWeight: "700" },
  barBackground: {
    height: 8,
    width: "100%",
    backgroundColor: "#E6EAF0",
    borderRadius: 10,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 10 },

  vehicleLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  vehicleLoadingText: { marginLeft: 10, fontSize: 13, color: "#6B7280" },
  vehicleEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  vehicleEmptyText: {
    marginLeft: 10,
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
});

export default RiskRouteScreen;