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
  Image,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline, Callout } from "react-native-maps";
import * as ExpoLocation from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '../context/AuthContext';
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");

// Constants
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
  STATIONS_ALONG_ROUTE: 10, // Number of stations to find along route
};

// Mock fuel stations for when API fails
const MOCK_FUEL_STATIONS = [
  { id: 1, name: "Shell Garage", latitude: -26.1076, longitude: 28.0567 },
  { id: 2, name: "BP Service Station", latitude: -26.1100, longitude: 28.0600 },
  { id: 3, name: "Engen Fuel Stop", latitude: -26.1050, longitude: 28.0530 },
  { id: 4, name: "Caltex Refuel", latitude: -26.1120, longitude: 28.0580 },
  { id: 5, name: "Total Energies", latitude: -26.1080, longitude: 28.0620 },
];

// Utility Functions
const toCoord = (p) => {
  if (!p || p.lat == null || p.lng == null) return null;
  return {
    latitude: Number(p.lat),
    longitude: Number(p.lng),
  };
};

const formatAddress = (addr) => {
  if (!addr) return "Unknown address";
  const parts = [addr.name, addr.street, addr.city, addr.region, addr.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown address";
};

const geojsonToCoords = (line) => {
  if (!line || !Array.isArray(line.coordinates)) return [];
  return line.coordinates
    .map(([lng, lat]) => ({
      latitude: Number(lat),
      longitude: Number(lng),
    }))
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
  if (dist < 1) {
    return `${Math.round(dist * 1000)} m`;
  }
  return `${dist.toFixed(1)} km`;
};

export default function LocationScreen({ route }) {
  const { user } = useAuth();
  const tripId = route?.params?.tripId;

  const [state, setState] = useState({
    // Location & Route
    location: null,
    destination: null,
    routeCoords: [],
    routeDistance: 0,
    loading: true,
    fullMap: false,
    screenReady: false,
    
    // Trip Data
    start: null,
    stops: [],
    startAddress: "",
    stopAddresses: [],
    tripLoading: false,
    routeLoading: false,
    tripLoaded: false,
    
    // Fuel Management
    fuelPercent: 20,
    fuelWarning: false,
    fuelStations: [],
    recommendedStation: null,
    isCalculatingStation: false,
    stationSearchFailed: false,
    destinationDistanceToStation: null,
    searchingStations: false,
    
    // Receipt
    showReceiptModal: false,
    receiptImage: null,
    receiptAmount: '',
    fuelPurchased: 0,
    receiptSubmitted: false,
    waitingForReceipt: false,
    isAtFuelStation: false,
    
    // UI
    notification: null,
    showFuelModal: false,
    selectedFuelStation: null,
    routeInfo: null,
    error: "",
  });

  const mapRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const redirectingRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const {
    location,
    destination,
    routeCoords,
    loading,
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
    screenReady,
    tripLoaded,
    isCalculatingStation,
    stationSearchFailed,
    destinationDistanceToStation,
    showReceiptModal,
    receiptImage,
    receiptAmount,
    fuelPurchased,
    receiptSubmitted,
    waitingForReceipt,
    isAtFuelStation,
    searchingStations,
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

  // ============ LOCATION FUNCTIONS ============
  const getLocation = useCallback(async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable location permissions");
        updateState({ loading: false, screenReady: true });
        return;
      }
      const current = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const newLocation = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      updateState({
        location: newLocation,
        loading: false,
        screenReady: true,
      });
    } catch (error) {
      console.error("Location error:", error);
      updateState({ loading: false, screenReady: true });
    }
  }, [updateState]);

  // ============ OSRM ROUTE FUNCTIONS ============
  const fetchOSRMRoute = useCallback(async (points) => {
    if (!Array.isArray(points) || points.length < 2) return null;

    const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(";");
    const url =
      `${CONFIG.OSRM_BASE_URL}/route/v1/driving/${coords}` +
      `?overview=full&geometries=geojson&steps=true&generate_hints=false`;

    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.message || "OSRM route request failed");
    }

    const route = json?.routes?.[0];
    if (!route) throw new Error("No route found");

    const geometry = route?.geometry;
    const coordsArray = geojsonToCoords(geometry);
    const distanceKm = route.distance / 1000;
    const durationMin = route.duration / 60;

    return {
      coords: coordsArray,
      distance: distanceKm,
      duration: durationMin,
      routeData: route,
    };
  }, []);

  const fetchRoute = useCallback(async (startPoint, endPoint) => {
    try {
      updateState({ routeLoading: true });
      
      const result = await fetchOSRMRoute([startPoint, endPoint]);
      
      if (!result || !result.coords || result.coords.length < 2) {
        console.log("Route not found, using direct path");
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
        // Still try to find stations along route using the two points
        await findFuelStationsAlongRoute([startPoint, endPoint]);
        return;
      }

      const { coords, distance, duration } = result;

      updateState({
        routeCoords: coords,
        routeDistance: distance,
        routeInfo: { distance, duration },
        routeLoading: false,
      });

      // Find fuel stations along the route
      await findFuelStationsAlongRoute(coords);

    } catch (error) {
      console.error("Route error:", error);
      updateState({ 
        routeLoading: false,
        error: error.message || "Failed to fetch route" 
      });
    }
  }, [fetchOSRMRoute, updateState]);

  // ============ FUEL STATIONS ALONG ROUTE ============
  const findFuelStationsAlongRoute = useCallback(async (routePoints) => {
    if (!routePoints || routePoints.length < 2) {
      console.log("Not enough route points to find stations");
      return;
    }

    try {
      updateState({ searchingStations: true });

      // Sample points along the route (every ~5km)
      const samplePoints = [];
      const totalDistance = routePoints.reduce((acc, point, i) => {
        if (i === 0) return 0;
        return acc + haversineKm(
          routePoints[i-1].latitude, routePoints[i-1].longitude,
          point.latitude, point.longitude
        );
      }, 0);

      // Get points every ~5km or at least 5 points
      const numSamples = Math.max(5, Math.min(20, Math.ceil(totalDistance / 5)));
      const step = Math.max(1, Math.floor(routePoints.length / numSamples));

      for (let i = 0; i < routePoints.length; i += step) {
        samplePoints.push(routePoints[i]);
      }
      // Always include the last point
      if (samplePoints[samplePoints.length - 1] !== routePoints[routePoints.length - 1]) {
        samplePoints.push(routePoints[routePoints.length - 1]);
      }

      console.log(`Sampling ${samplePoints.length} points along route for fuel stations`);

      // Fetch stations around each sample point
      const allStations = [];
      const seenStationIds = new Set();

      for (const point of samplePoints) {
        const stations = await fetchNearbyStations(point.latitude, point.longitude);
        
        if (stations && stations.length > 0) {
          // Deduplicate stations
          for (const station of stations) {
            if (!seenStationIds.has(station.id)) {
              seenStationIds.add(station.id);
              // Calculate distance from route (minimum distance to any route point)
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

      // Sort stations by distance to route (closest first)
      const sortedStations = allStations
        .sort((a, b) => a.distanceToRoute - b.distanceToRoute)
        .slice(0, CONFIG.STATIONS_ALONG_ROUTE);

      console.log(`Found ${sortedStations.length} unique fuel stations along route`);

      // Find the best station (closest to route and within range)
      updateState({ 
        fuelStations: sortedStations,
        searchingStations: false 
      });

      // Find the best station (closest to route)
      if (sortedStations.length > 0) {
        const bestStation = sortedStations[0];
        updateState({ recommendedStation: bestStation });
        
        // Check if any station is closer than destination
        if (location && destination) {
          const station = sortedStations[0];
          const distToStation = haversineKm(
            location.latitude, location.longitude,
            station.latitude, station.longitude
          );
          const distToDest = haversineKm(
            location.latitude, location.longitude,
            destination.latitude, destination.longitude
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
  }, [fetchNearbyStations, location, destination, updateState]);

  // ============ TRIP LOADING FROM DATABASE ============
  const loadTrip = useCallback(async () => {
    try {
      updateState({ tripLoading: true, routeLoading: true, error: "" });

      let query = supabase.from("optimized_routes").select("id, start_point, stops");

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
      const stopCoords = Array.isArray(loadedTrip.stops) ? loadedTrip.stops.map(toCoord).filter(Boolean) : [];

      if (!startCoord) throw new Error("Invalid start_point data");

      updateState({
        start: startCoord,
        stops: stopCoords,
        destination: stopCoords[0] || null,
      });

      // Get addresses
      const startAddr = await reverseGeocodePoint(startCoord);
      const stopAddrList = await Promise.all(
        stopCoords.map(async (coord) => {
          const addr = await reverseGeocodePoint(coord);
          return formatAddress(addr);
        })
      );

      updateState({
        startAddress: formatAddress(startAddr),
        stopAddresses: stopAddrList,
        tripLoaded: true,
      });

      // If there are stops, fetch route from start to first stop
      if (stopCoords.length > 0 && startCoord) {
        await fetchRoute(startCoord, stopCoords[0]);
      }

    } catch (e) {
      updateState({ 
        error: e.message || "Failed to load trip",
        tripLoading: false,
        routeLoading: false,
        tripLoaded: true,
      });
    } finally {
      updateState({ tripLoading: false });
    }
  }, [tripId, fetchRoute, updateState]);

  // ============ REVERSE GEOCODING ============
  const reverseGeocodePoint = useCallback(async (coord) => {
    try {
      const res = await ExpoLocation.reverseGeocodeAsync(coord);
      return res?.[0] || null;
    } catch {
      return null;
    }
  }, []);

  // ============ FUEL STATION FUNCTIONS ============
  const fetchNearbyStations = useCallback(async (lat, lon) => {
    try {
      const query = `
[out:json][timeout:5];
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
      
      if (text.startsWith('<')) {
        console.log("Overpass API returned HTML, using mock data");
        return getMockStations(lat, lon);
      }

      const data = JSON.parse(text);
      
      if (!data.elements || data.elements.length === 0) {
        console.log("No stations found, using mock data");
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

      const sorted = [...stations].sort((a, b) => {
        const distA = haversineKm(lat, lon, a.latitude, a.longitude);
        const distB = haversineKm(lat, lon, b.latitude, b.longitude);
        return distA - distB;
      });

      return sorted;
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

  const checkFuelAndRedirect = useCallback(async () => {
    const current = stateRef.current;

    if (
      current.fuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD &&
      !current.fuelWarning &&
      !redirectingRef.current
    ) {
      console.log("Low fuel warning:", current.fuelPercent.toFixed(1), "%");
      
      updateState({
        fuelWarning: true,
      });
      
      showNotification('warning', `Fuel at ${current.fuelPercent.toFixed(0)}% - Please find a fuel station!`, 5000);

      // Show fuel stations modal to help user find one
      updateState({ showFuelModal: true });
    }
  }, [updateState, showNotification]);

  // ============ RECEIPT FUNCTIONS ============
  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
      return false;
    }
    return true;
  }, []);

  const scanReceipt = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        updateState({
          receiptImage: result.assets[0].uri,
        });
        
        Alert.prompt(
          'Enter Fuel Amount',
          'Please enter the total amount spent on fuel (in ZAR):',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                updateState({ receiptImage: null });
              }
            },
            {
              text: 'Submit',
              onPress: (amount) => {
                if (amount && !isNaN(parseFloat(amount))) {
                  const parsedAmount = parseFloat(amount);
                  const litresPurchased = parsedAmount / 22;
                  const fuelAdded = (litresPurchased / CONFIG.TANK_CAPACITY) * 100;
                  const newFuelPercent = Math.min(fuelPercent + fuelAdded, 100);
                  
                  updateState({
                    receiptAmount: parsedAmount.toFixed(2),
                    fuelPurchased: litresPurchased,
                    receiptSubmitted: true,
                    fuelPercent: newFuelPercent,
                    waitingForReceipt: false,
                    isAtFuelStation: false,
                    fuelWarning: false,
                    showReceiptModal: false,
                  });
                  
                  showNotification(
                    'success', 
                    `Receipt submitted! R${parsedAmount.toFixed(2)} (${litresPurchased.toFixed(1)}L)`, 
                    5000
                  );
                  
                  // Check if fuel is still low after refueling
                  if (newFuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD) {
                    setTimeout(() => {
                      checkFuelAndRedirect();
                    }, 1000);
                  }
                } else {
                  Alert.alert('Invalid Amount', 'Please enter a valid amount.');
                }
              },
            },
          ],
          'plain-text'
        );
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera.');
    }
  }, [requestCameraPermission, fuelPercent, updateState, showNotification, checkFuelAndRedirect]);

  const pickReceiptImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to upload receipts.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        updateState({
          receiptImage: result.assets[0].uri,
        });
        
        Alert.prompt(
          'Enter Fuel Amount',
          'Please enter the total amount spent on fuel (in ZAR):',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                updateState({ receiptImage: null });
              }
            },
            {
              text: 'Submit',
              onPress: (amount) => {
                if (amount && !isNaN(parseFloat(amount))) {
                  const parsedAmount = parseFloat(amount);
                  const litresPurchased = parsedAmount / 22;
                  const fuelAdded = (litresPurchased / CONFIG.TANK_CAPACITY) * 100;
                  const newFuelPercent = Math.min(fuelPercent + fuelAdded, 100);
                  
                  updateState({
                    receiptAmount: parsedAmount.toFixed(2),
                    fuelPurchased: litresPurchased,
                    receiptSubmitted: true,
                    fuelPercent: newFuelPercent,
                    waitingForReceipt: false,
                    isAtFuelStation: false,
                    fuelWarning: false,
                    showReceiptModal: false,
                  });
                  
                  showNotification(
                    'success', 
                    `Receipt submitted! R${parsedAmount.toFixed(2)} (${litresPurchased.toFixed(1)}L)`, 
                    5000
                  );
                  
                  if (newFuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD) {
                    setTimeout(() => {
                      checkFuelAndRedirect();
                    }, 1000);
                  }
                } else {
                  Alert.alert('Invalid Amount', 'Please enter a valid amount.');
                }
              },
            },
          ],
          'plain-text'
        );
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery.');
    }
  }, [fuelPercent, updateState, showNotification, checkFuelAndRedirect]);

  // ============ EFFECTS ============
  // First effect: Set page ready and get location
  useEffect(() => {
    console.log('[location screen]', !!user);
    getLocation();
    
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [getLocation, user]);

  // Second effect: Load trip data once screen is ready and location is available
  useEffect(() => {
    if (screenReady && location && !tripLoaded && !tripLoading) {
      console.log("Screen ready, loading trip data...");
      loadTrip();
    }
  }, [screenReady, location, tripLoaded, tripLoading, loadTrip]);

  // Third effect: Check fuel status
  useEffect(() => {
    if (tripLoaded && fuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD && !fuelWarning) {
      checkFuelAndRedirect();
    }
  }, [fuelPercent, tripLoaded, fuelWarning, checkFuelAndRedirect]);

  // Fourth effect: Fit map to route
  useEffect(() => {
    if (mapRef.current && routeCoords.length > 1) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [routeCoords]);

  // ============ RENDER FUNCTIONS ============
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007bff" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

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

  const renderReceiptModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showReceiptModal}
      onRequestClose={() => {
        if (!receiptSubmitted && waitingForReceipt) {
          Alert.alert(
            'Scan Receipt',
            'Please scan your receipt to continue.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          updateState({ showReceiptModal: false });
        }
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Scan Fuel Receipt</Text>
          
          <Text style={styles.modalSubtitle}>
            {receiptSubmitted ? 'Receipt submitted successfully!' : 'Please scan or upload your fuel receipt'}
          </Text>
          
          {receiptImage ? (
            <View style={styles.receiptImageContainer}>
              <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
              {receiptSubmitted && (
                <View style={styles.receiptSubmittedBadge}>
                  <Text style={styles.receiptSubmittedText}>Submitted</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.receiptPlaceholder}>
              <Ionicons name="document-text-outline" size={60} color="#999" />
              <Text style={styles.receiptPlaceholderText}>No receipt scanned yet</Text>
            </View>
          )}

          {receiptAmount && receiptSubmitted && (
            <View style={styles.receiptDetails}>
              <Text style={styles.receiptDetailText}>
                Amount: R{receiptAmount}
              </Text>
              <Text style={styles.receiptDetailText}>
                Fuel Purchased: {fuelPurchased.toFixed(1)}L
              </Text>
              <Text style={styles.receiptDetailText}>
                New Fuel Level: {fuelPercent.toFixed(1)}%
              </Text>
            </View>
          )}

          <View style={styles.modalButtonContainer}>
            {!receiptSubmitted ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.scanButton]}
                  onPress={scanReceipt}
                >
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Scan Receipt</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.uploadButton]}
                  onPress={pickReceiptImage}
                >
                  <Ionicons name="images-outline" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Upload Photo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.modalButton, styles.continueButton]}
                onPress={() => {
                  updateState({ showReceiptModal: false });
                }}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>

          {!receiptSubmitted && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                Alert.alert(
                  'Skip Receipt',
                  'Are you sure you want to skip scanning the receipt?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Skip',
                      onPress: () => {
                        updateState({ 
                          showReceiptModal: false,
                          waitingForReceipt: false,
                          isAtFuelStation: false,
                        });
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

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

  const renderMap = () => (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => updateState({ fullMap: true })}
      style={fullMap ? styles.fullMap : styles.halfMap}
    >
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: start?.latitude || location?.latitude || -26.2041,
          longitude: start?.longitude || location?.longitude || 28.0473,
          latitudeDelta: CONFIG.MAP_DELTA,
          longitudeDelta: CONFIG.MAP_DELTA,
        }}
        showsUserLocation
        showsCompass
      >
        {/* Start Point */}
        {start && (
          <Marker
            coordinate={start}
            title="Start"
            description={startAddress}
            pinColor="green"
          />
        )}
        
        {/* Stops */}
        {stops.map((point, index) => (
          <Marker
            key={`${point.latitude}-${point.longitude}-${index}`}
            coordinate={point}
            title={`Stop ${index + 1}`}
            description={stopAddresses[index] || ""}
            pinColor="orange"
          >
            <Callout>
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>Stop {index + 1}</Text>
                <Text>{stopAddresses[index] || "Stop location"}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
        
        {/* Current Location */}
        {location && !start && (
          <Marker coordinate={location} title="You">
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>
        )}
        
        {/* Route */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="#ff2d2d"
          />
        )}
        
        {/* Fuel Stations Along Route */}
        {fuelStations.slice(0, 10).map((station) => (
          <Marker
            key={station.id}
            coordinate={{ 
              latitude: station.latitude, 
              longitude: station.longitude 
            }}
            title={station.name}
            description={station.address || 'Fuel Station'}
          >
            <View style={[
              styles.fuelMarker,
              recommendedStation?.id === station.id && styles.recommendedFuelMarker
            ]}>
              <Ionicons 
                name="flame-outline" 
                size={16} 
                color={recommendedStation?.id === station.id ? "#FF6B00" : "#f44336"} 
              />
            </View>
            <Callout>
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>{station.name}</Text>
                <Text>{station.address || 'Address not available'}</Text>
                {station.brand && <Text>Brand: {station.brand}</Text>}
                {station.openingHours && (
                  <Text>Hours: {station.openingHours}</Text>
                )}
                {station.distanceToRoute !== undefined && (
                  <Text>Distance from route: {formatDistance(station.distanceToRoute)}</Text>
                )}
                {recommendedStation?.id === station.id && (
                  <Text style={{ color: '#FF6B00', fontWeight: 'bold' }}>⭐ Recommended</Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Map Overlay for Loading */}
      {routeLoading && (
        <View style={styles.mapOverlay}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.overlayText}>Building route...</Text>
        </View>
      )}

      {/* Searching Stations Overlay */}
      {searchingStations && (
        <View style={styles.mapOverlay}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.overlayText}>Finding fuel stations along route...</Text>
        </View>
      )}

      {/* Fuel Warning Overlay */}
      {fuelWarning && (
        <View style={styles.fuelWarningOverlay}>
          <Ionicons name="warning-outline" size={24} color="#fff" />
          <Text style={styles.fuelWarningText}>Low Fuel!</Text>
        </View>
      )}

      {/* Full Map Controls */}
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
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              }
            }}
          >
            <Ionicons name="locate-outline" size={24} color="#007bff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fuelSearchButton}
            onPress={() => {
              updateState({ showFuelModal: true });
              if (fuelStations.length === 0 && routeCoords.length > 0) {
                findFuelStationsAlongRoute(routeCoords);
              }
            }}
          >
            <Ionicons name="flame-outline" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Route Info */}
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
    </TouchableOpacity>
  );

  const renderInfoPanel = () => (
    <ScrollView
      style={styles.infoBox}
      contentContainerStyle={styles.infoContent}
    >
      {renderNotification()}

      <Text style={styles.routeTitle}>Active Route</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={loadTrip}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.heading}>Start</Text>
        <Text style={styles.alertText}>
          {tripLoading ? "Loading address..." : startAddress || "Unknown address"}
        </Text>
      </View>

      {routeLoading ? (
        <View style={styles.smallCard}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={{ marginTop: 8, color: "#444" }}>Building route...</Text>
        </View>
      ) : null}

      {stopAddresses.map((addr, i) => (
        <View key={i} style={styles.smallCard}>
          <Text style={{ fontWeight: "bold" }}>Stop {i + 1}</Text>
          <Text style={{ color: "#444" }}>{addr}</Text>
        </View>
      ))}

      {/* Fuel Status Card */}
      <View style={[styles.card, fuelWarning ? styles.warningCard : null]}>
        <Text style={styles.heading}>Fuel Status</Text>
        <Text style={styles.alertText}>Fuel: {fuelPercent.toFixed(1)}%</Text>
        <Text style={styles.alertText}>Range: {calculateRemainingRange().toFixed(1)} km</Text>
        {fuelWarning && (
          <Text style={[styles.alertText, { fontWeight: 'bold', marginTop: 5 }]}>
            ⚠️ Low Fuel - Please refuel soon!
          </Text>
        )}
        {recommendedStation && (
          <Text style={[styles.alertText, { marginTop: 5 }]}>
            Nearest: {recommendedStation.name} ({formatDistance(
              recommendedStation.distanceToRoute || haversineKm(
                location?.latitude || 0,
                location?.longitude || 0,
                recommendedStation.latitude,
                recommendedStation.longitude
              )
            )} from route)
          </Text>
        )}
        {fuelStations.length > 0 && (
          <Text style={[styles.alertText, { marginTop: 5 }]}>
            {fuelStations.length} stations found along route
          </Text>
        )}
      </View>

      {destinationDistanceToStation && (
        <View style={[styles.card, { backgroundColor: '#2e7d32' }]}>
          <Text style={styles.heading}>Distance Comparison</Text>
          <Text style={styles.alertText}>
            To station: {destinationDistanceToStation.station.toFixed(1)} km
          </Text>
          <Text style={styles.alertText}>
            To destination: {destinationDistanceToStation.destination.toFixed(1)} km
          </Text>
          <Text style={[styles.alertText, { fontWeight: 'bold', marginTop: 5 }]}>
            {destinationDistanceToStation.stationCloser 
              ? 'Station is closer than destination' 
              : 'Destination is closer than station'}
          </Text>
        </View>
      )}

      {receiptSubmitted && (
        <View style={[styles.card, { backgroundColor: '#2e7d32' }]}>
          <Text style={styles.heading}>✓ Receipt Submitted</Text>
          <Text style={styles.alertText}>Amount: R{receiptAmount}</Text>
          <Text style={styles.alertText}>Fuel: {fuelPurchased.toFixed(1)}L</Text>
          <Text style={styles.alertText}>New Fuel Level: {fuelPercent.toFixed(1)}%</Text>
        </View>
      )}

      {routeInfo && (
        <View style={styles.routeInfoCard}>
          <Text style={styles.routeInfoTitle}>Route Information</Text>
          <View style={styles.routeInfoRow}>
            <Ionicons name="navigate-circle-outline" size={20} color="#007bff" />
            <Text style={styles.routeInfoText}>
              Total Distance: {formatDistance(routeInfo.distance)}
            </Text>
          </View>
          <View style={styles.routeInfoRow}>
            <Ionicons name="time-outline" size={20} color="#007bff" />
            <Text style={styles.routeInfoText}>
              Estimated Time: {Math.round(routeInfo.duration)} min
            </Text>
          </View>
          {fuelStations.length > 0 && (
            <View style={styles.routeInfoRow}>
              <Ionicons name="flame-outline" size={20} color="#f44336" />
              <Text style={styles.routeInfoText}>
                {fuelStations.length} fuel stations along route
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Fuel Stations Along Route</Text>
      {searchingStations ? (
        <View style={styles.smallCard}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={{ marginTop: 8, color: "#444" }}>Searching for stations...</Text>
        </View>
      ) : fuelStations.length > 0 ? (
        fuelStations.slice(0, 5).map((station, i) => (
          <View key={station.id || i} style={styles.smallCard}>
            <Text>{station.name}</Text>
            <Text style={styles.distanceText}>
              {recommendedStation?.id === station.id ? '⭐ Best' : 
                formatDistance(station.distanceToRoute || haversineKm(
                  location?.latitude || 0,
                  location?.longitude || 0,
                  station.latitude,
                  station.longitude
                ))}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No stations found along route</Text>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => updateState({ fullMap: true })}
      >
        <Ionicons name="map-outline" size={18} color="#fff" />
        <Text style={styles.buttonText}>Open Full Map</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, styles.fuelButton]}
        onPress={() => {
          updateState({ fullMap: true });
          updateState({ showFuelModal: true });
          if (fuelStations.length === 0 && routeCoords.length > 0) {
            findFuelStationsAlongRoute(routeCoords);
          }
        }}
      >
        <Ionicons name="flame-outline" size={18} color="#fff" />
        <Text style={styles.buttonText}>View Fuel Stations Along Route</Text>
      </TouchableOpacity>

      {fuelWarning && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: '#ff6f00' }]}
          onPress={() => {
            updateState({ 
              showReceiptModal: true,
              isAtFuelStation: true,
              waitingForReceipt: true 
            });
          }}
        >
          <Ionicons name="receipt-outline" size={18} color="#fff" />
          <Text style={styles.buttonText}>I've Refueled (Scan Receipt)</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // Show loading only if screen is not ready
  if (!screenReady) {
    return renderLoading();
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderMap()}
      {!fullMap && renderInfoPanel()}
      {renderReceiptModal()}
      {renderFuelModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666" },
  halfMap: { height: "35%", width: "100%" },
  fullMap: { ...StyleSheet.absoluteFillObject },
  infoBox: { flex: 1, padding: 16, backgroundColor: "#f8f9fa" },
  infoContent: { paddingBottom: 120 },
  
  // Cards
  card: { backgroundColor: "#000068", padding: 16, borderRadius: 15, marginBottom: 10 },
  warningCard: { backgroundColor: "#d32f2f" },
  smallCard: { 
    padding: 12, 
    backgroundColor: "white", 
    borderRadius: 10, 
    marginBottom: 8, 
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  heading: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  alertText: { color: "#fff", marginTop: 5 },
  noDataText: { color: "#666", fontStyle: "italic", marginBottom: 10 },
  
  routeTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 12, color: "#1a1a1a" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginTop: 15, marginBottom: 10, color: "#1a1a1a" },
  
  // Route Info
  routeInfoCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  routeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  routeInfoText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#555",
  },
  
  distanceText: { color: "#666", fontSize: 12 },
  
  // Buttons
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 25,
    justifyContent: "center",
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fuelButton: {
    backgroundColor: "#f44336",
  },
  buttonText: { color: "#fff", marginLeft: 8, fontWeight: "bold", fontSize: 15 },
  
  // Map Controls
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
  fuelSearchButton: {
    position: "absolute",
    bottom: 200,
    right: 20,
    backgroundColor: "#f44336",
    padding: 12,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  
  // Distance Info
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
  
  // Notification
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
  
  // Map Overlay
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
  
  // Fuel Warning Overlay
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
  fuelWarningText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  
  // Error
  errorBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f44336",
  },
  errorText: { color: "#f44336" },
  
  // Map Markers
  currentLocationMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
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
  recommendedFuelMarker: {
    borderColor: "#FF6B00",
    borderWidth: 3,
  },
  calloutView: {
    padding: 8,
    maxWidth: 200,
  },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4,
  },
  
  // Fuel Modal
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    padding: 16,
  },
  fuelCountText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  loadingModalContent: {
    padding: 40,
    alignItems: "center",
  },
  loadingModalText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  fuelItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  fuelItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
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
  fuelItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fuelItemName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  fuelItemAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  fuelItemBrand: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  fuelItemDistance: {
    fontSize: 12,
    color: "#007bff",
    marginTop: 2,
  },
  routeBadge: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  routeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#007bff",
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  
  // Receipt Modal
  receiptImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  receiptSubmittedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  receiptSubmittedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  receiptPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  receiptPlaceholderText: {
    color: '#999',
    marginTop: 10,
  },
  receiptDetails: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 15,
  },
  receiptDetailText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
  modalButtonContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  modalButton: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  scanButton: {
    backgroundColor: '#007bff',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
  },
  continueButton: {
    backgroundColor: '#FF6B00',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 10,
  },
  skipButton: {
    marginTop: 15,
    padding: 10,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },
});