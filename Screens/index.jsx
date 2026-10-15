import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// ---------- Helpers ----------
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
  const insets = useSafeAreaInsets();
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

  // ---------- Vehicle + Driver ----------
  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [driverName, setDriverName] = useState("");

  // ---------- User location (fallback map center when no trip) ----------
  const [userLocation, setUserLocation] = useState(null);

  // ---------- Pull to refresh ----------
  const [refreshing, setRefreshing] = useState(false);

  const updateTrip = useCallback((updates) => {
    setTrip((prev) => ({ ...prev, ...updates }));
  }, []);

  // ---------- Load trip via vehicle assignment ----------
  const loadTrip = useCallback(async () => {
    try {
      updateTrip({ loading: true, error: "" });

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        updateTrip({ loading: false });
        return;
      }

      const { data: veh, error: vehErr } = await supabase
        .from("vehicles")
        .select("vehicle_id, route_id, status")
        .eq("driver_id", authUser.id)
        .not("route_id", "is", null)
        .maybeSingle();

      if (vehErr) throw vehErr;

      if (!veh?.route_id) {
        updateTrip({
          loading: false,
          start: null,
          stops: [],
          startAddress: "",
          stopAddresses: [],
          routeCoords: [],
          routeInfo: null,
          routeLoading: false,
        });
        return;
      }

      const { data: loadedTrip, error: tripErr } = await supabase
        .from("optimized_routes")
        .select("id, start_point, stops")
        .eq("id", veh.route_id)
        .maybeSingle();

      if (tripErr) throw tripErr;

      if (!loadedTrip) {
        updateTrip({
          loading: false,
          start: null,
          stops: [],
          routeCoords: [],
          routeInfo: null,
          routeLoading: false,
        });
        return;
      }

      const startCoord = toCoord(loadedTrip.start_point);
      const stopCoords = Array.isArray(loadedTrip.stops)
        ? loadedTrip.stops.map(toCoord).filter(Boolean)
        : [];

      if (!startCoord) throw new Error("Invalid start_point data");

      updateTrip({
        start: startCoord,
        stops: stopCoords,
        loading: false,
      });

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
  }, [updateTrip]);

  // ---------- Load vehicle + driver ----------
  const loadVehicle = useCallback(async () => {
    if (!user?.id) return;
    setVehicleLoading(true);
    try {
      let driverId = null;
      let driverRow = null;

      const { data: byUser } = await supabase
        .from("drivers")
        .select("driver_id, driver_username")
        .eq("user_id", user.id)
        .maybeSingle();

      driverId = byUser?.driver_id ?? user.id;
      driverRow = byUser ?? null;

      if (!driverRow && user.email) {
        const { data: byEmail } = await supabase
          .from("drivers")
          .select("driver_id, driver_username")
          .eq("email", user.email)
          .maybeSingle();
        driverRow = byEmail ?? null;
        driverId = byEmail?.driver_id ?? driverId;
      }

      setDriverName(driverRow?.driver_username || "");

      const { data: veh } = await supabase
        .from("vehicles")
        .select("vehicle_id, registration_number")
        .eq("driver_id", driverId)
        .maybeSingle();

      setVehicle(veh ?? null);
    } catch (e) {
      console.warn("[RiskRoute] vehicle fetch exception:", e?.message);
      setVehicle(null);
      setDriverName("");
    } finally {
      setVehicleLoading(false);
    }
  }, [user?.id, user?.email]);

  // ---------- Fetch user location (used to center map when no trip) ----------
  const loadUserLocation = useCallback(async () => {
    try {
      const { status } =
        await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      console.warn("[RiskRoute] user location failed:", e?.message);
    }
  }, []);

  useEffect(() => {
    loadVehicle();
    loadTrip();
    loadUserLocation();
  }, [loadVehicle, loadTrip, loadUserLocation]);

  // ---------- Pull to refresh handler ----------
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadVehicle(),
        loadTrip(),
        loadUserLocation(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadVehicle, loadTrip, loadUserLocation]);

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

  const etaText = trip.routeInfo
    ? formatDuration(Math.round(trip.routeInfo.duration * 60))
    : "—";

  const destinationName =
    trip.stopAddresses[0]?.split(",").slice(-2).join(", ") || "Destination";

  // ---------- Small components ----------
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

  const vehicleRegistration = vehicle?.registration_number || "—";
  const driverDisplayName = driverName || "—";

  const topPadding =
    insets?.top > 0
      ? insets.top
      : Platform.OS === "android"
      ? StatusBar.currentHeight || 24
      : 44;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + (insets?.bottom || 0) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0A1F44"
          />
        }
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

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Support")}
            >
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
          ) : !trip.start ? (
            <View style={styles.tripLoadingRow}>
              <Ionicons name="car-outline" size={22} color="#9CA3AF" />
              <Text style={styles.tripLoadingText}>
                No active trip assigned to your vehicle.
              </Text>
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
          ) : trip.loading ? (
            <View style={[styles.miniMap, styles.mapLoading]}>
              <ActivityIndicator size="small" color="#0A1F44" />
              <Text style={styles.mapLoadingText}>Loading map...</Text>
            </View>
          ) : (
            <MapView
              style={styles.miniMap}
              initialRegion={{
                latitude: userLocation?.latitude ?? -26.2041,
                longitude: userLocation?.longitude ?? 28.0473,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
              }}
              showsUserLocation={!!userLocation}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              pointerEvents="none"
            >
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  pinColor="#0A1F44"
                  title="You"
                />
              )}
            </MapView>
          )}

          {trip.start && (
            <TouchableOpacity
              style={styles.mapOverlayBtn}
              onPress={() => navigation.navigate("Location", { tripId })}
            >
              <Ionicons name="expand-outline" size={16} color="#0A1F44" />
              <Text style={styles.mapOverlayBtnText}>Open Full Map</Text>
            </TouchableOpacity>
          )}
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
                  <Text style={styles.vehicleName} numberOfLines={1}>
                    {vehicleRegistration}
                  </Text>
                </View>
              </View>

              <View style={styles.vehicleDetailRow}>
                <Ionicons name="person-outline" size={16} color="#7a8699" />
                <Text style={styles.vehicleDetailLabel}>Driver</Text>
                <Text style={styles.vehicleDetailValue} numberOfLines={1}>
                  {driverDisplayName}
                </Text>
              </View>

              <View style={styles.vehicleDetailRow}>
                <Ionicons name="card-outline" size={16} color="#7a8699" />
                <Text style={styles.vehicleDetailLabel}>Registration</Text>
                <Text style={styles.vehicleDetailValue} numberOfLines={1}>
                  {vehicleRegistration}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
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
  vehicleDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  vehicleDetailLabel: {
    fontSize: 13,
    color: "#7a8699",
    fontWeight: "600",
    marginLeft: 10,
    flex: 1,
  },
  vehicleDetailValue: {
    fontSize: 14,
    color: "#0A1F44",
    fontWeight: "800",
    maxWidth: "55%",
    textAlign: "right",
  },

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