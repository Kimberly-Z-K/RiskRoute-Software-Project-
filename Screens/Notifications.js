import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import * as Speech from "expo-speech";
import {
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";

const OSRM_BASE_URL = "https://router.project-osrm.org";

const geocodeCache = new Map();

// Hardcoded location names for common coordinates (fallback)
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
  
  if (LOCATION_MAP[key]) {
    return LOCATION_MAP[key];
  }
  
  for (const [mapKey, mapValue] of Object.entries(LOCATION_MAP)) {
    const [mapLat, mapLng] = mapKey.split(',').map(Number);
    if (Math.abs(mapLat - lat) < 0.05 && Math.abs(mapLng - lng) < 0.05) {
      return mapValue;
    }
  }
  
  return null;
};

const reverseGeocode = async (lat, lng) => {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const cachedLocation = getCachedLocation(lat, lng);
  if (cachedLocation) {
    geocodeCache.set(cacheKey, cachedLocation);
    console.log('[Geocoding] Found in location map:', cachedLocation);
    return cachedLocation;
  }

  // Try multiple geocoding services
  const geocodingServices = [
    // Service 1: OpenStreetMap Nominatim (Free, no API key required)
    {
      name: 'Nominatim',
      url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
      headers: {
        'User-Agent': 'YourApp/1.0', // Required by Nominatim
      },
      parser: (data) => {
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          const address = data.address || {};
          return address.road || address.suburb || address.neighbourhood || 
                 address.city || address.town || address.village || 
                 address.county || address.state || parts[0] || null;
        }
        return null;
      }
    },
    // Service 2: BigDataCloud (Free, no API key required)
    {
      name: 'BigDataCloud',
      url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      headers: {},
      parser: (data) => {
        if (data && data.locality) {
          return data.locality || data.city || data.principalSubdivision || null;
        }
        return null;
      }
    },
  ];

  for (const service of geocodingServices) {
    try {
      console.log(`[Geocoding] Trying ${service.name}...`);
      
      const response = await fetch(service.url, {
        headers: service.headers,
      });

      if (!response.ok) {
        console.log(`[Geocoding] ${service.name} returned ${response.status}`);
        continue; // Try next service
      }

      const data = await response.json();
      const location = service.parser(data);
      
      if (location) {
        let cleanLocation = location.trim();
        if (cleanLocation.includes(',')) {
          cleanLocation = cleanLocation.split(',')[0].trim();
        }
        
        geocodeCache.set(cacheKey, cleanLocation);
        console.log(`[Geocoding] ${service.name} found:`, cleanLocation);
        return cleanLocation;
      }
    } catch (error) {
      console.log(`[Geocoding] ${service.name} error:`, error.message);
    }
  }

  const fallbackName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  geocodeCache.set(cacheKey, fallbackName);
  console.log('[Geocoding] Using fallback:', fallbackName);
  return fallbackName;
};

// Function to check for traffic-like conditions based on route duration
function analyzeRouteForIssues(route, index) {
  const duration = route?.duration || 0;
  const distance = route?.distance || 0;
  
  const avgSpeed = (distance / 1000) / (duration / 3600);
  

  let condition = "Normal";
  let severity = "";
  
  if (avgSpeed < 10 && avgSpeed > 0) {
    condition = "Heavy Traffic Jam";
    severity = "Severe - Speed under 10 km/h";
  } else if (avgSpeed < 25) {
    condition = "Moderate Congestion";
    severity = "Moderate - Speed under 25 km/h";
  } else if (avgSpeed < 40) {
    condition = "Slow Traffic";
    severity = "Mild - Speed under 40 km/h";
  } else if (avgSpeed === 0) {
    condition = "Road Closed / Standstill";
    severity = "Critical - No movement detected";
  }

  return {
    condition,
    severity,
    avgSpeed: avgSpeed.toFixed(1),
    duration: Math.round(duration / 60),
    distance: (distance / 1000).toFixed(1),
  };
}

async function buildTrafficNotification(routeData, index, coordinates, startLocation, endLocation) {
  const analysis = analyzeRouteForIssues(routeData, index);
  
  // Use provided location names or fallback to coordinates
  const from = startLocation || `${coordinates[0][1].toFixed(4)}, ${coordinates[0][0].toFixed(4)}`;
  const to = endLocation || `${coordinates[1][1].toFixed(4)}, ${coordinates[1][0].toFixed(4)}`;
  
  let message = "";
  let title = "";
  
  if (analysis.condition === "Normal") {
    title = `Route from ${from} to ${to} is clear`;
    message = `Distance: ${analysis.distance}km, Estimated time: ${analysis.duration} minutes, Speed: ${analysis.avgSpeed}km/h`;
  } else {
    title = `${analysis.emoji} ${analysis.condition} on route from ${from} to ${to}`;
    message = `${analysis.severity}. Distance: ${analysis.distance}km, Est. time: ${analysis.duration}min, Speed: ${analysis.avgSpeed}km/h`;
  }

  return {
    id: `traffic-route-${Date.now()}-${index}`,
    category: "ROUTE & TRAFFIC",
    title: title,
    message: message,
    time: "Just now",
    icon: analysis.condition === "Normal" ? "check-circle" : "traffic-light",
    iconColor: analysis.condition === "Normal" ? "#10B981" : "#3B82F6",
    bg: analysis.condition === "Normal" ? "#D1FAE5" : "#DBEAFE",
    unread: true,
    routeData: routeData,
    from: from,
    to: to,
    condition: analysis.condition,
    duration: analysis.duration,
    distance: analysis.distance,
    speed: analysis.avgSpeed,
    emoji: analysis.emoji,
  };
}

export default function Notifications() {
  const { user, session } = useAuth();

  useEffect(() => {
    console.log("[noti screen AUTH]", !!user);
  }, [user]);

  const [notifications, setNotifications] = useState([
    {
      id: Date.now() + 1,
      category: "FUEL ALERTS",
      title: "Fuel at 38% — refill recommended",
      message: "2 stations detected on your route",
      time: "12 minutes ago",
      icon: "gas-station",
      iconColor: "#F59E0B",
      bg: "#FEF3C7",
      unread: true,
    },
    {
      id: Date.now() + 2,
      category: "FUEL ALERTS",
      title: "Fuel expense approved — R 1,245",
      message: "Shell Rosebank • Ref: SH-8812",
      time: "2h ago",
      icon: "receipt",
      iconColor: "#F59E0B",
      bg: "#FEF3C7",
      unread: false,
    },
    {
      id: Date.now() + 3,
      category: "ROUTE & TRAFFIC",
      title: "N3 congestion — route updated via R24",
      message: "Estimated time saving: 8 minutes",
      time: "28 minutes ago",
      icon: "map-marker-path",
      iconColor: "#3B82F6",
      bg: "#DBEAFE",
      unread: true,
    },
    {
      id: Date.now() + 4,
      category: "DELIVERIES",
      title: "Drop 4 confirmed — client signed",
      message: "Germiston Hub • DL-7721",
      time: "1h ago",
      icon: "package-variant",
      iconColor: "#10B981",
      bg: "#D1FAE5",
      unread: false,
    },
    {
      id: Date.now() + 5,
      category: "DELIVERIES",
      title: "3 deliveries pending on current route",
      message: "Next: OR Tambo, Bay 12",
      time: "3h ago",
      icon: "truck-delivery",
      iconColor: "#10B981",
      bg: "#D1FAE5",
      unread: false,
    },
    {
      id: Date.now() + 6,
      category: "VEHICLE",
      title: "Service due in 2 300 km",
      message: "Book at depot • Ref: SVC-445",
      time: "Yesterday",
      icon: "wrench",
      iconColor: "#EF4444",
      bg: "#FEE2E2",
      unread: false,
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Track last speech time to avoid spamming
  const [lastSpeechTime, setLastSpeechTime] = useState(0);

  const fetchTrafficUpdates = async () => {
    try {
      // Define coordinates for a route (example: Johannesburg to Pretoria)
      // Format: [longitude, latitude]
      const coordinates = [
        [28.0473, -26.2041], // Johannesburg
        [28.2293, -25.7479], // Pretoria
      ];

      // Geocode start and end locations
      console.log('[fetchTrafficUpdates] Geocoding locations...');
      const startLocation = await reverseGeocode(coordinates[0][1], coordinates[0][0]);
      const endLocation = await reverseGeocode(coordinates[1][1], coordinates[1][0]);
      
      console.log('[fetchTrafficUpdates] Locations:', { startLocation, endLocation });

      // Build OSRM route URL
      const coordsString = coordinates
        .map(coord => `${coord[0]},${coord[1]}`)
        .join(';');
      
      const url = `${OSRM_BASE_URL}/route/v1/driving/${coordsString}?overview=false&steps=false&annotations=true`;
      
      console.log('[fetchTrafficUpdates] Fetching from OSRM:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[fetchTrafficUpdates] OSRM Response received');

      // Check if route exists
      if (result.code === "Ok" && result.routes && result.routes.length > 0) {
        const routes = result.routes;
        console.log('[fetchTrafficUpdates] Number of routes found:', routes.length);

        // Build notifications from route data with location names
        const trafficNotifications = [];
        
        for (let i = 0; i < routes.length; i++) {
          const notification = await buildTrafficNotification(
            routes[i], 
            i, 
            coordinates, 
            startLocation, 
            endLocation
          );
          trafficNotifications.push(notification);
          
          console.log(`[fetchTrafficUpdates] Route ${i + 1}:`, {
            from: startLocation,
            to: endLocation,
            condition: notification.condition,
            speed: notification.speed,
            duration: notification.duration,
            distance: notification.distance,
          });
        }

        // Add simulated alternative route suggestion if traffic detected
        const firstRouteAnalysis = analyzeRouteForIssues(routes[0], 0);
        if (firstRouteAnalysis.condition !== "Normal") {
          const alternativeRoute = {
            id: `traffic-alt-${Date.now()}`,
            category: "ROUTE & TRAFFIC",
            title: `🔄 Alternative route available with less traffic`,
            message: `Suggested detour from ${startLocation} to ${endLocation}: ${(routes[0].distance / 1000 * 1.15).toFixed(1)}km, estimated ${Math.round(routes[0].duration / 60 * 1.2)} minutes (15% longer but less traffic)`,
            time: "Just now",
            icon: "map-marker-path",
            iconColor: "#10B981",
            bg: "#D1FAE5",
            unread: true,
            from: startLocation,
            to: endLocation,
          };
          trafficNotifications.push(alternativeRoute);
        }

        console.log('[fetchTrafficUpdates] Final notifications:', trafficNotifications.length);

        // Update notifications state
        setNotifications((prev) => {
          const nonTraffic = prev.filter((n) => n.category !== "ROUTE & TRAFFIC");
          const updated = [...trafficNotifications, ...nonTraffic];
          
          console.log('[fetchTrafficUpdates] Updated state:', {
            total: updated.length,
            traffic: trafficNotifications.length,
            nonTraffic: nonTraffic.length
          });
          
          return updated;
        });

        // SPEECH FOR EVERY UPDATE - Speak all traffic alerts
        const now = Date.now();
        if (now - lastSpeechTime > 5000) { // Prevent spamming (min 5 seconds between speech)
          setLastSpeechTime(now);
          
          // Speak all traffic alerts one by one
          for (let i = 0; i < trafficNotifications.length; i++) {
            const alert = trafficNotifications[i];
            // Add a slight delay between each speech
            await new Promise(resolve => setTimeout(resolve, i * 2000));
            
            Speech.speak(`${alert.title}. ${alert.message}`, {
              rate: 0.9,
              pitch: 1.0,
              language: 'en',
            });
            
            console.log('[Speech] Spoke alert:', alert.title);
          }
        }

      } else {
        console.log('[fetchTrafficUpdates] No routes found or API error:', result.code);
        // Fallback notification with location names
        const startLocation = await reverseGeocode(coordinates[0][1], coordinates[0][0]);
        const endLocation = await reverseGeocode(coordinates[1][1], coordinates[1][0]);
        
        const fallbackNotification = {
          id: `traffic-fallback-${Date.now()}`,
          category: "ROUTE & TRAFFIC",
          title: `📍 Route update: ${startLocation} to ${endLocation}`,
          message: "No route data available. Please check your connection.",
          time: "Just now",
          icon: "info",
          iconColor: "#F59E0B",
          bg: "#FEF3C7",
          unread: true,
          from: startLocation,
          to: endLocation,
        };
        
        setNotifications((prev) => {
          const nonTraffic = prev.filter((n) => n.category !== "ROUTE & TRAFFIC");
          return [fallbackNotification, ...nonTraffic];
        });

        // Speak fallback notification
        const now = Date.now();
        if (now - lastSpeechTime > 5000) {
          setLastSpeechTime(now);
          Speech.speak(`Route update. ${fallbackNotification.title}`, {
            rate: 0.9,
            pitch: 1.0,
          });
        }
      }

    } catch (error) {
      console.error('[fetchTrafficUpdates] Error:', error);
      
      // Create error notification with location names if possible
      try {
        const coordinates = [
          [28.0473, -26.2041],
          [28.2293, -25.7479],
        ];
        const startLocation = await reverseGeocode(coordinates[0][1], coordinates[0][0]);
        const endLocation = await reverseGeocode(coordinates[1][1], coordinates[1][0]);
        
        const errorNotification = {
          id: `traffic-error-${Date.now()}`,
          category: "ROUTE & TRAFFIC",
          title: `⚠️ Route update unavailable: ${startLocation} to ${endLocation}`,
          message: "Unable to fetch traffic data. Please try again later.",
          time: "Just now",
          icon: "alert-circle",
          iconColor: "#EF4444",
          bg: "#FEE2E2",
          unread: true,
          from: startLocation,
          to: endLocation,
        };
        
        setNotifications((prev) => {
          const nonTraffic = prev.filter((n) => n.category !== "ROUTE & TRAFFIC");
          return [errorNotification, ...nonTraffic];
        });
      } catch (e) {
        console.error('[fetchTrafficUpdates] Error creating fallback:', e);
      }
    }
  };

  // Fetch traffic updates on mount and every 60 seconds
  useEffect(() => {
    fetchTrafficUpdates();
    const interval = setInterval(fetchTrafficUpdates, 60000);
    return () => clearInterval(interval);
  }, []);

  // Mock notifications for other categories
  useEffect(() => {
    let mockInterval = null;
    
    // Add mock notifications occasionally
    const addMockNotification = () => {
      const mockNotifications = [
        {
          category: "DELIVERIES",
          title: "📦 New delivery assigned",
          message: "Johannesburg → Pretoria • Expected time: 45 min",
          icon: "truck-fast",
          iconColor: "#10B981",
          bg: "#D1FAE5",
        },
        {
          category: "FUEL ALERTS",
          title: "⛽ Fuel price update",
          message: "Price decreased by R0.15 at nearest station",
          icon: "gas-station",
          iconColor: "#F59E0B",
          bg: "#FEF3C7",
        },
      ];

      // Pick a random mock notification
      const randomIndex = Math.floor(Math.random() * mockNotifications.length);
      const mock = mockNotifications[randomIndex];
      
      const uniqueItem = {
        ...mock,
        id: Date.now() + Math.random() * 1000,
        time: "Just now",
        unread: true,
      };

      setNotifications((prev) => [uniqueItem, ...prev]);
      
      // Speak the mock notification
      Speech.speak(`${mock.title}. ${mock.message}`, {
        rate: 0.9,
        pitch: 1.0,
      });
    };

    // Add a mock notification every 2 minutes (but only if no traffic alerts recently)
    mockInterval = setInterval(() => {
      // Check if there are recent traffic alerts (in the last 30 seconds)
      const recentTraffic = notifications.some(n => 
        n.category === "ROUTE & TRAFFIC" && 
        n.time === "Just now"
      );
      
      if (!recentTraffic) {
        addMockNotification();
      }
    }, 120000); // Every 2 minutes

    return () => clearInterval(mockInterval);
  }, [notifications]);

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        unread: false,
      }))
    );
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
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

        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id.toString()}
            style={[
              styles.card,
              item.unread && styles.unreadCard,
              index === 0 && styles.firstCard,
              index === items.length - 1 && styles.lastCard,
            ]}
            onPress={() => markAsRead(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={item.iconColor}
              />
            </View>

            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={3}>
                  {item.title}
                </Text>
                {item.unread && <View style={styles.unreadDot} />}
              </View>

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
                    ⏱ {item.duration} min • {item.distance} km • {item.speed} km/h
                  </Text>
                </View>
              )}

              <View style={styles.timeContainer}>
                <Feather name="clock" size={12} color="#9CA3AF" />
                <Text style={styles.time}>{item.time}</Text>
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
        colors={["#1E40AF", "#3B82F6"]}
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
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  firstCard: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastCard: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  unreadCard: {
    backgroundColor: "#F8FAFF",
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "600",
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginLeft: 8,
    flexShrink: 0,
  },
  message: {
    color: "#6B7280",
    marginTop: 3,
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
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  time: {
    color: "#9CA3AF",
    fontSize: 12,
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
});