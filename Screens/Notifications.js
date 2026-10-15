import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  Modal,
} from "react-native";
import * as Speech from "expo-speech";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useAdminNotifications } from "../context/AdminNotificationsContext";
import { getLiveTraffic, SEVERITY_ORDER } from "../utils/traffic";

const { width } = Dimensions.get("window");
const OSRM_BASE_URL = "https://router.project-osrm.org";

const geocodeCache = new Map();

const LOCATION_MAP = {
  "-26.2041,28.0473": "Johannesburg",
  "-25.7479,28.2293": "Pretoria",
  "-26.1076,28.0550": "Sandton",
  "-26.2708,28.1123": "Boksburg",
  "-26.2274,28.1674": "Germiston",
  "-26.1952,28.0340": "Braamfontein",
  "-26.1766,28.0396": "Parktown",
  "-26.1434,28.0105": "Randburg",
  "-26.1036,28.0494": "Rivonia",
  "-26.1367,28.0588": "Sunninghill",
};

const getCachedLocation = (lat, lng) => {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (LOCATION_MAP[key]) return LOCATION_MAP[key];

  for (const [mapKey, mapValue] of Object.entries(LOCATION_MAP)) {
    const [mapLat, mapLng] = mapKey.split(",").map(Number);
    if (Math.abs(mapLat - lat) < 0.05 && Math.abs(mapLng - lng) < 0.05) {
      return mapValue;
    }
  }
  return null;
};

const reverseGeocode = async (lat, lng) => {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  const cachedLocation = getCachedLocation(lat, lng);
  if (cachedLocation) {
    geocodeCache.set(cacheKey, cachedLocation);
    return cachedLocation;
  }

  const geocodingServices = [
    {
      name: "Nominatim",
      url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
      headers: { "User-Agent": "YourApp/1.0" },
      parser: (data) => {
        if (data && data.display_name) {
          const parts = data.display_name.split(",");
          const address = data.address || {};
          return (
            address.road ||
            address.suburb ||
            address.neighbourhood ||
            address.city ||
            address.town ||
            address.village ||
            address.county ||
            address.state ||
            parts[0] ||
            null
          );
        }
        return null;
      },
    },
    {
      name: "BigDataCloud",
      url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      headers: {},
      parser: (data) => {
        if (data && data.locality) {
          return data.locality || data.city || data.principalSubdivision || null;
        }
        return null;
      },
    },
  ];

  for (const service of geocodingServices) {
    try {
      const response = await fetch(service.url, { headers: service.headers });
      if (!response.ok) continue;
      const data = await response.json();
      const location = service.parser(data);
      if (location) {
        let cleanLocation = location.trim();
        if (cleanLocation.includes(",")) {
          cleanLocation = cleanLocation.split(",")[0].trim();
        }
        geocodeCache.set(cacheKey, cleanLocation);
        return cleanLocation;
      }
    } catch (error) {
      console.log(`[Geocoding] ${service.name} error:`, error.message);
    }
  }

  const fallbackName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  geocodeCache.set(cacheKey, fallbackName);
  return fallbackName;
};

const TRAFFIC_STYLE = {
  clear: { emoji: "✅", icon: "check-circle", iconColor: "#10B981", bg: "#D1FAE5" },
  light: { emoji: "🟡", icon: "traffic-light", iconColor: "#F59E0B", bg: "#FEF3C7" },
  moderate: { emoji: "🟠", icon: "traffic-light", iconColor: "#F97316", bg: "#FFEDD5" },
  heavy: { emoji: "🔴", icon: "traffic-light", iconColor: "#EF4444", bg: "#FEE2E2" },
};

const formatClock = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Builds the "ROUTE & TRAFFIC" card from real, live traffic data.
function buildTrafficNotification(traffic, from, to) {
  const s = TRAFFIC_STYLE[traffic.severity] || TRAFFIC_STYLE.clear;
  const eta = formatClock(traffic.etaIso);
  const trip = `About ${traffic.travelMin} min to go, ${traffic.distanceKm.toFixed(1)} km.`;
  const arrive = eta ? ` Arrive around ${eta}.` : "";

  const title =
    traffic.severity === "clear"
      ? `${s.emoji} Traffic is clear to ${to}`
      : `${s.emoji} ${traffic.label} to ${to}`;
  const message =
    traffic.severity === "clear"
      ? `${trip}${arrive}`
      : `Traffic is adding about ${traffic.delayMin} min. ${trip}${arrive}`;

  return {
    id: "traffic-live",
    signature: `${traffic.severity}-${Math.round(traffic.delayMin / 5)}`,
    category: "ROUTE & TRAFFIC",
    title,
    message,
    time: `Updated ${formatClock(new Date(traffic.fetchedAt).toISOString())}`,
    icon: s.icon,
    iconColor: s.iconColor,
    bg: s.bg,
    unread: true,
    from,
    to,
    duration: traffic.travelMin,
    distance: traffic.distanceKm.toFixed(1),
    delay: traffic.delayMin,
    severity: traffic.severity,
  };
}

function buildTrafficUnavailable(reason) {
  return {
    id: "traffic-live",
    signature: `unavailable-${reason}`,
    category: "ROUTE & TRAFFIC",
    title: "Live traffic unavailable",
    message: reason,
    time: `Updated ${formatClock(new Date().toISOString())}`,
    icon: "alert-circle",
    iconColor: "#F59E0B",
    bg: "#FEF3C7",
    unread: false,
    severity: "unknown",
  };
}

// Notifications created by admin actions (see driver_notifications in the database).
const ADMIN_STYLE = {
  allocation: { category: "FUEL ALERTS", icon: "cash-multiple", iconColor: "#F59E0B", bg: "#FEF3C7" },
  vehicle: { category: "VEHICLE", icon: "truck", iconColor: "#EF4444", bg: "#FEE2E2" },
  route: { category: "DELIVERIES", icon: "map-marker-path", iconColor: "#10B981", bg: "#D1FAE5" },
};

function timeAgo(iso, nowMs) {
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString();
}

function adminRowToItem(row, nowMs) {
  const s = ADMIN_STYLE[row.type] || ADMIN_STYLE.vehicle;
  return {
    id: `db-${row.id}`,
    dbId: row.id,
    category: s.category,
    title: row.title,
    message: row.message || "",
    time: timeAgo(row.created_at, nowMs),
    icon: s.icon,
    iconColor: s.iconColor,
    bg: s.bg,
    unread: !row.read,
  };
}

export default function Notifications() {
  const { user } = useAuth();

  useEffect(() => {
    console.log("[noti screen AUTH]", !!user);
  }, [user]);

  // Live traffic card (built on this screen) + admin notifications (from the database).
  const [trafficNotifications, setTrafficNotifications] = useState([]);
  const {
    items: adminRows,
    markRead: markAdminRead,
    markAllRead: markAllAdminRead,
    reload: reloadAdmin,
  } = useAdminNotifications();

  // keep "5 min ago" labels fresh
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // refresh from the database each time the screen is opened
  useEffect(() => {
    reloadAdmin();
  }, [reloadAdmin]);

  const adminNotifications = useMemo(
    () => adminRows.map((r) => adminRowToItem(r, Date.now())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminRows, tick]
  );

  const notifications = useMemo(
    () => [...trafficNotifications, ...adminNotifications],
    [trafficNotifications, adminNotifications]
  );

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const lastSpokenSeverityRef = useRef("clear");

  const unreadCount = notifications.filter((n) => n.unread).length;

  // ============================================================
  // Resolve the current user's vehicle -> route -> coordinates
  // ============================================================
  const resolveRouteCoordinates = useCallback(async () => {
    if (!user?.id) {
      console.log("[resolveRoute] No user, using fallback");
      return { coordinates: [], routeId: null };
    }

    try {
      // 1. Find the driver row via user_id (with driver_id fallback)
      let driverId = null;

      const { data: byUser, error: byUserErr } = await supabase
        .from("drivers")
        .select("driver_id")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[resolveRoute] driver by user_id:", {
        driverId: byUser?.driver_id,
        error: byUserErr?.message,
        code: byUserErr?.code,
      });

      driverId = byUser?.driver_id ?? null;
      if (!driverId) driverId = user.id;

      // 2. Find the vehicle assigned to that driver
      const { data: veh, error: vehErr } = await supabase
        .from("vehicles")
        .select("vehicle_id, route_id, registration_number")
        .eq("driver_id", driverId)
        .maybeSingle();

      console.log("[resolveRoute] vehicle:", {
        vehicleId: veh?.vehicle_id,
        routeId: veh?.route_id,
        registration: veh?.registration_number,
        error: vehErr?.message,
        code: vehErr?.code,
      });

      const routeId = veh?.route_id ?? null;
      if (!routeId) {
        console.log("[resolveRoute] No route assigned to vehicle, using fallback");
        return { coordinates: [], routeId: null };
      }

      // 3. Fetch the route
      const { data: routeRow, error: routeErr } = await supabase
        .from("optimized_routes")
        .select("id, start_point, stops")
        .eq("id", routeId)
        .maybeSingle();

      console.log("[resolveRoute] route row:", {
        id: routeRow?.id,
        start: routeRow?.start_point,
        stopsCount: Array.isArray(routeRow?.stops) ? routeRow.stops.length : 0,
        error: routeErr?.message,
        code: routeErr?.code,
      });

      if (!routeRow) {
        console.log("[resolveRoute] Route not found, using fallback");
        return { coordinates: [], routeId };
      }

      // 4. Convert to [lng, lat] coordinate pairs for OSRM
      const startCoord = routeRow.start_point;
      const stopCoords = Array.isArray(routeRow.stops) ? routeRow.stops : [];

      const chain = [];
      if (startCoord?.lat != null && startCoord?.lng != null) {
        chain.push([Number(startCoord.lng), Number(startCoord.lat)]);
      }
      for (const s of stopCoords) {
        if (s?.lat != null && s?.lng != null) {
          chain.push([Number(s.lng), Number(s.lat)]);
        }
      }

      if (chain.length < 2) {
        console.log("[resolveRoute] Not enough coordinates, using fallback");
        return { coordinates: [], routeId };
      }

      console.log("[resolveRoute] coordinates chain:", chain.length, "points");
      return { coordinates: chain, routeId };
    } catch (e) {
      console.warn("[resolveRoute] exception:", e?.message);
      return { coordinates: [], routeId: null };
    }
  }, [user]);

  const fetchTrafficUpdates = useCallback(async () => {
    try {
      // coordinates = [start, stop 1, stop 2, ...] as [lng, lat]
      const { coordinates, routeId } = await resolveRouteCoordinates();

      if (!routeId || coordinates.length < 2) {
        setTrafficNotifications([]); // no route assigned: nothing to report
        return;
      }

      const start = { latitude: coordinates[0][1], longitude: coordinates[0][0] };
      const stops = coordinates
        .slice(1)
        .map((c) => ({ latitude: c[1], longitude: c[0] }));

      // Only look at the part of the route still ahead (skip finished stops).
      const done = new Set();
      if (user?.id) {
        const { data: progress } = await supabase
          .from("trip_stop_progress")
          .select("stop_index, status")
          .eq("route_id", String(routeId))
          .eq("user_id", user.id);
        (progress || []).forEach((p) => {
          if (p.status === "completed" || p.status === "skipped") done.add(p.stop_index);
        });
      }

      const next = stops.findIndex((_, i) => !done.has(i));
      if (next === -1) {
        setTrafficNotifications([]); // every stop is done
        return;
      }

      const from = next > 0 ? stops[next - 1] : start;
      const ahead = [from, ...stops.slice(next)];
      const last = ahead[ahead.length - 1];

      const traffic = await getLiveTraffic(ahead);
      if (!traffic) return;

      const [fromName, toName] = await Promise.all([
        reverseGeocode(from.latitude, from.longitude),
        reverseGeocode(last.latitude, last.longitude),
      ]);

      const item = buildTrafficNotification(traffic, fromName, toName);

      // keep "read" if nothing meaningful changed since the last check
      setTrafficNotifications((prev) => [
        prev[0] && prev[0].signature === item.signature
          ? { ...item, unread: prev[0].unread }
          : item,
      ]);

      // speak only when traffic gets worse to moderate/heavy, not on every refresh
      const before = SEVERITY_ORDER.indexOf(lastSpokenSeverityRef.current);
      const now = SEVERITY_ORDER.indexOf(traffic.severity);
      lastSpokenSeverityRef.current = traffic.severity;
      if (now > before && now >= SEVERITY_ORDER.indexOf("moderate")) {
        Speech.speak(`${item.title}. ${item.message}`, {
          rate: 0.9,
          pitch: 1.0,
          language: "en",
        });
      }
    } catch (error) {
      console.warn("[fetchTrafficUpdates]", error?.message);
      setTrafficNotifications([
        buildTrafficUnavailable(error?.message || "Could not load traffic right now."),
      ]);
    }
  }, [resolveRouteCoordinates, user]);

  useEffect(() => {
    fetchTrafficUpdates();
    const interval = setInterval(fetchTrafficUpdates, 180000);
    return () => clearInterval(interval);
  }, [fetchTrafficUpdates]);

  const markAllRead = () => {
    setTrafficNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    markAllAdminRead();
  };

  const markAsRead = (id) => {
    const adminItem = adminNotifications.find((n) => n.id === id);
    if (adminItem) {
      markAdminRead(adminItem.dbId);
      return;
    }
    setTrafficNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const openNotification = (item) => {
    setSelectedNotification(item);
    setModalVisible(true);
    if (item.unread) {
      markAsRead(item.id);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedNotification(null), 300);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "FUEL ALERTS":
        return "#F59E0B";
      case "ROUTE & TRAFFIC":
        return "#3B82F6";
      case "DELIVERIES":
        return "#10B981";
      case "VEHICLE":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const renderCategory = (category) => {
    const items = notifications.filter((n) => n.category === category);
    if (!items.length) return null;

    const categoryColor = getCategoryColor(category);

    return (
      <View key={category} style={styles.categoryContainer}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={styles.section}>{category}</Text>
        </View>

        {items.map((item) => (
          <TouchableOpacity
            key={item.id.toString()}
            style={[styles.card, item.unread && styles.unreadCard]}
            onPress={() => openNotification(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <View style={styles.timeTag}>
                <Text style={styles.timeTagText}>{item.time}</Text>
              </View>
              {item.unread && (
                <View style={styles.newTag}>
                  <Text style={styles.newTagText}>NEW</Text>
                </View>
              )}
            </View>

            <View style={styles.cardMiddle}>
              <View style={styles.cardTextCol}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.message} numberOfLines={3}>
                  {item.message}
                </Text>

                {item.from && item.to && (
                  <View style={styles.locationContainer}>
                    <Feather name="map-pin" size={12} color="#9CA3AF" />
                    <Text style={styles.locationText}>
                      {item.from} → {item.to}
                    </Text>
                  </View>
                )}

                {item.duration && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailText}>
                      {`⏱ ${item.duration} min • ${item.distance} km${item.delay > 0 ? ` • +${item.delay} min delay` : ""}`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.bigIcon, { backgroundColor: item.bg }]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={28}
                  color={item.iconColor}
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <LinearGradient
        colors={["#0A1F44", "#0A1F44"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="bell-ring"
              size={28}
              color="#FFFFFF"
            />
            <Text style={styles.heading}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.readAll}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {notifications.length > 0 ? (
          <>
            {renderCategory("FUEL ALERTS")}
            {renderCategory("ROUTE & TRAFFIC")}
            {renderCategory("DELIVERIES")}
            {renderCategory("VEHICLE")}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="bell-off-outline"
              size={80}
              color="#D1D5DB"
            />
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateText}>
              You're all caught up! Check back later for updates.
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconBox,
                      { backgroundColor: selectedNotification.bg },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={selectedNotification.icon}
                      size={32}
                      color={selectedNotification.iconColor}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={closeModal}
                  >
                    <Feather name="x" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalCategoryTag}>
                  <View
                    style={[
                      styles.modalCategoryDot,
                      {
                        backgroundColor: getCategoryColor(
                          selectedNotification.category
                        ),
                      },
                    ]}
                  />
                  <Text style={styles.modalCategoryText}>
                    {selectedNotification.category}
                  </Text>
                </View>

                <Text style={styles.modalTitle}>
                  {selectedNotification.title}
                </Text>

                <Text style={styles.modalMessage}>
                  {selectedNotification.message}
                </Text>

                {selectedNotification.from && selectedNotification.to && (
                  <View style={styles.modalRouteBox}>
                    <View style={styles.modalRouteRow}>
                      <View style={styles.modalRouteDot} />
                      <View style={styles.modalRouteLine} />
                      <View style={styles.modalRouteDotEnd} />
                    </View>
                    <View style={styles.modalRouteTexts}>
                      <View style={styles.modalRouteItem}>
                        <Text style={styles.modalRouteLabel}>From</Text>
                        <Text style={styles.modalRouteValue}>
                          {selectedNotification.from}
                        </Text>
                      </View>
                      <View style={styles.modalRouteItem}>
                        <Text style={styles.modalRouteLabel}>To</Text>
                        <Text style={styles.modalRouteValue}>
                          {selectedNotification.to}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedNotification.duration && (
                  <View style={styles.modalStatsRow}>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatValue}>
                        {selectedNotification.duration}
                      </Text>
                      <Text style={styles.modalStatLabel}>Minutes</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatValue}>
                        {selectedNotification.distance}
                      </Text>
                      <Text style={styles.modalStatLabel}>KM</Text>
                    </View>
                    <View style={styles.modalStatBox}>
                      <Text style={styles.modalStatValue}>
                        {selectedNotification.delay ?? 0}
                      </Text>
                      <Text style={styles.modalStatLabel}>DELAY (MIN)</Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalFooter}>
                  <Feather name="clock" size={13} color="#9CA3AF" />
                  <Text style={styles.modalTime}>
                    {selectedNotification.time}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={closeModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalActionText}>Got it</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 70,
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 0 : 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 10,
  },
  badgeContainer: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
    minWidth: 22,
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  readAll: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  section: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  unreadCard: {
    backgroundColor: "#F8FAFF",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  timeTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeTagText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  newTag: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newTagText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardMiddle: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTextCol: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontWeight: "700",
    fontSize: 15,
    color: "#111827",
    lineHeight: 20,
  },
  message: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  locationText: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "500",
  },
  detailRow: {
    marginTop: 4,
  },
  detailText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "400",
  },
  bigIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    minHeight: 300,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCategoryTag: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modalCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  modalCategoryText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 26,
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 16,
  },
  modalRouteBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  modalRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modalRouteDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  modalRouteLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 6,
  },
  modalRouteDotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  modalRouteTexts: {
    gap: 10,
  },
  modalRouteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalRouteLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  modalRouteValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  modalStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  modalStatBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalStatLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  modalTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalActionBtn: {
    backgroundColor: "#0A1F44",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  modalActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});