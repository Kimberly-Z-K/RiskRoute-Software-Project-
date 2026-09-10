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
  Animated,
  PanResponder,
} from "react-native";
import MapView, { Marker, Polyline, Callout } from "react-native-maps";
import * as ExpoLocation from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '../context/AuthContext';
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");
// Fallback estimate used only until the real container is measured.
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
  { id: 2, name: "BP Service Station", latitude: -26.1100, longitude: 28.0600 },
  { id: 3, name: "Engen Fuel Stop", latitude: -26.1050, longitude: 28.0530 },
  { id: 4, name: "Caltex Refuel", latitude: -26.1120, longitude: 28.0580 },
  { id: 5, name: "Total Energies", latitude: -26.1080, longitude: 28.0620 },
];

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
    location: null,
    destination: null,
    routeCoords: [],
    routeDistance: 0,
    loading: true,
    fullMap: false,
    screenReady: false,

    start: null,
    stops: [],
    startAddress: "",
    stopAddresses: [],
    tripLoading: false,
    routeLoading: false,
    tripLoaded: false,

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

  // Measured height of the info area container (below the map).
  const [infoAreaHeight, setInfoAreaHeight] = useState(0);

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

  // Finds fuel stations near sampled points along the current route.
  const findFuelStationsAlongRoute = useCallback(async (routePoints) => {
    if (!routePoints || routePoints.length < 2) {
      console.log("Not enough route points to find stations");
      return [];
    }

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
          onPress: () => {
            showNotification('success', 'Trip ended successfully!', 4000);

            setTimeout(() => {
              updateState({
                tripLoaded: false,
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
                receiptSubmitted: false,
                receiptImage: null,
                receiptAmount: '',
                fuelPurchased: 0,
                waitingForReceipt: false,
                isAtFuelStation: false,
              });
            }, 1500);
          },
        },
      ]
    );
  }, [showNotification, updateState]);

  const canEndTrip = useCallback(() => {
    return tripLoaded && !tripLoading;
  }, [tripLoaded, tripLoading]);

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

  const reverseGeocodePoint = useCallback(async (coord) => {
    try {
      const res = await ExpoLocation.reverseGeocodeAsync(coord);
      return res?.[0] || null;
    } catch {
      return null;
    }
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

      updateState({ showFuelModal: true });
    }
  }, [updateState, showNotification]);

  // ============================================
  // RECEIPT FUNCTIONS
  // ============================================
  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
      return false;
    }
    return true;
  }, []);

  // Resets the receipt-related state so the user can scan a fresh receipt.
  const resetReceiptState = useCallback(() => {
    updateState({
      receiptImage: null,
      receiptAmount: '',
      fuelPurchased: 0,
      receiptSubmitted: false,
    });
  }, [updateState]);

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

  const openReceiptModal = useCallback(() => {
    updateState({
      showReceiptModal: true,
      isAtFuelStation: true,
      waitingForReceipt: true
    });
  }, [updateState]);
 
  // BUTTON SHEET 
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

  //for the button toggle sheet
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

        // Fast swipe DOWN -> reveal the info paper underneath
        if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          snapButtonSheet(true);
          return;
        }

        // Fast swipe UP -> re-cover the info paper with the buttons
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          snapButtonSheet(false);
          return;
        }

        // Otherwise snap to whichever position is closest.
        snapButtonSheet(currentY > midpoint);
      },
    })
  ).current;
  // ============================================
  // END BUTTON SHEET
  // ============================================

  useEffect(() => {
    console.log('[location screen]', !!user);
    getLocation();

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [getLocation, user]);

  useEffect(() => {
    if (screenReady && location && !tripLoaded && !tripLoading) {
      console.log("Screen ready, loading trip data...");
      loadTrip();
    }
  }, [screenReady, location, tripLoaded, tripLoading, loadTrip]);

  useEffect(() => {
    if (tripLoaded && fuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD && !fuelWarning) {
      checkFuelAndRedirect();
    }
  }, [fuelPercent, tripLoaded, fuelWarning, checkFuelAndRedirect]);

  useEffect(() => {
    if (mapRef.current && routeCoords.length > 1) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [routeCoords]);

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

  // ============================================
  // RECEIPT MODAL
  // ============================================
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
  // ============================================
  // END RECEIPT MODAL
  // ============================================

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

  // ============================================
  // BUTTON SHEET (covers the info paper; drag down to reveal it)
  // ============================================
  const renderButtonSheet = () => (
    <Animated.View
      style={[
        styles.buttonSheet,
        {
          transform: [{ translateY: buttonSheetY }],
        },
      ]}
    >
      {/* DRAG HANDLE */}
      <View
        {...buttonSheetPanResponder.panHandlers}
        style={styles.routeSheetHandleArea}
      >
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

      {/* QUICK ACTIONS */}
      <ScrollView
        style={styles.routeSheetQuickActions}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.routeSheetSectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => updateState({ fullMap: true })}
        >
          <Ionicons name="map-outline" size={18} color="#f3a089" />
          <Text style={styles.buttonText}>Open Full Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, styles.fuelButton]}
          onPress={() => {
            updateState({ fullMap: true, showFuelModal: true });
            if (fuelStations.length === 0 && routeCoords.length > 0) {
              findFuelStationsAlongRoute(routeCoords);
            }
          }}
        >
          <Ionicons name="flame-outline" size={18} color="#f3a089" />
          <Text style={styles.buttonText}>View Fuel Stations Along Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, styles.receiptButton]}
          onPress={openReceiptModal}
        >
          <Ionicons name="receipt-outline" size={20} color="#f3a089" />
          <Text style={styles.buttonText}>Scan Fuel Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: "white", marginTop: 10 }]}
          onPress={() => {
            const doReset = () => {
              resetReceiptState();
              updateState({
                showReceiptModal: true,
                waitingForReceipt: true,
                isAtFuelStation: true,
              });
              showNotification('info', '🔄 Ready to scan a receipt', 2000);
            };

            if (receiptSubmitted || receiptImage) {
              Alert.alert(
                'Reset Receipt Scanner',
                'Reset the receipt state to scan a new receipt?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', onPress: doReset },
                ]
              );
            } else {
              doReset();
            }
          }}
        >
          <Ionicons name="refresh-outline" size={18} color="#f3a089" />
          <Text style={styles.buttonText}>Reset Receipt Scanner</Text>
        </TouchableOpacity>

        {fuelWarning && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: "#ff6f00" }]}
            onPress={() => {
              resetReceiptState();
              updateState({
                showReceiptModal: true,
                isAtFuelStation: true,
                waitingForReceipt: true,
              });
            }}
          >
            <Ionicons name="receipt-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>I've Refueled (Scan Receipt)</Text>
          </TouchableOpacity>
        )}

        {canEndTrip() && (
          <TouchableOpacity
            style={[styles.primaryButton, styles.endTripButton]}
            onPress={endTrip}
          >
            <Ionicons name="stop-circle-outline" size={20} color="red" />
            <Text style={[styles.buttonText, { color: 'red' }]}>End Trip</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </Animated.View>
  );
  // ============================================
  // END BUTTON SHEET RENDER
  // ============================================

  
  const renderRouteInfoPanel = () => (
    <ScrollView
      style={styles.routeInfoScroll}
      contentContainerStyle={styles.routeSheetContent}
      showsVerticalScrollIndicator={false}
    >
        {/* ACTIVE ROUTE */}
        <Text style={styles.routeSheetSectionTitle}>Active Route</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={loadTrip}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.routeInfoWhiteCard}>
          <View style={styles.infoCardIcon}>
            <Ionicons name="navigate-outline" size={20} color="#007bff" />
          </View>
          <View style={styles.infoCardTextContainer}>
            <Text style={styles.infoCardLabel}>Start</Text>
            <Text style={styles.infoCardValue}>
              {tripLoading ? "Loading address..." : startAddress || "Unknown address"}
            </Text>
          </View>
        </View>

        {routeLoading ? (
          <View style={styles.routeInfoWhiteCard}>
            <ActivityIndicator size="small" color="#007bff" />
            <Text style={[styles.infoCardValue, { marginLeft: 12 }]}>Building route...</Text>
          </View>
        ) : null}

        {stopAddresses.map((addr, i) => (
          <View key={i} style={styles.routeInfoWhiteCard}>
            <View style={styles.infoCardIcon}>
              <Ionicons name="location-outline" size={20} color="#007bff" />
            </View>
            <View style={styles.infoCardTextContainer}>
              <Text style={styles.infoCardLabel}>Stop {i + 1}</Text>
              <Text style={styles.infoCardValue}>{addr}</Text>
            </View>
          </View>
        ))}

        {/* FUEL STATUS */}
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
              <Text style={styles.lowFuelWarningText}>Low Fuel - Please refuel soon!</Text>
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

        {/* DISTANCE COMPARISON */}
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

        {/* RECEIPT STATUS */}
        {receiptSubmitted && (
          <View style={styles.receiptStatusCard}>
            <Text style={styles.receiptStatusTitle}>✓ Receipt Submitted</Text>
            <Text style={styles.receiptStatusText}>Amount: R{receiptAmount}</Text>
            <Text style={styles.receiptStatusText}>Fuel: {fuelPurchased.toFixed(1)}L</Text>
            <Text style={styles.receiptStatusText}>New Fuel Level: {fuelPercent.toFixed(1)}%</Text>
          </View>
        )}

        {/* ROUTE INFORMATION */}
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

              {fuelStations.length > 0 && (
                <View style={styles.routeInfoRow}>
                  <Ionicons name="flame-outline" size={20} color="#f44336" />
                  <View>
                    <Text style={styles.routeInfoSmallLabel}>Fuel Stations</Text>
                    <Text style={styles.routeInfoText}>
                      {fuelStations.length} fuel stations along route
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {/* FUEL STATIONS LIST */}
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
                    ? "⭐ Best"
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

        <View style={{ height: 140 }} />
    </ScrollView>
  );
  // ============================================
  // END ROUTE INFO PANEL RENDER
  
  if (!screenReady) {
    return renderLoading();
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderMap()}
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

  // Legacy card styles (still used for the error box / shared button styles)
  errorBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f44336",
  },
  errorText: { color: "#f44336" },
  noDataText: { color: "#666", fontStyle: "italic", marginBottom: 10 },

  // Buttons
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 15,
    justifyContent: "center",
    height:50,
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fuelButton: {
    backgroundColor: "white",
  },
  receiptButton: {
    backgroundColor: "white",
    marginTop: 15,
    padding: 16,
  },
  buttonText: { color: "#0A1F44", marginLeft: 8, fontWeight: "bold", fontSize: 15 },
  endTripButton: {
    backgroundColor: 'white',
    marginTop: 15,
  },

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
  fuelWarningText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },

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

  // Receipt Modal Styles
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
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
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
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },

 

  // Wraps both papers; sits directly below the map.
  infoAreaContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },

  //  route/fuel info. Always in place
  // revealed as the button sheet is dragged down.
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
  routeSheetTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
  },
  routeSheetSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#777",
  },
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
  sheetDivider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginTop: 20,
    marginBottom: 6,
  },

  // Active route cards
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
  infoCardTextContainer: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#777",
    marginBottom: 3,
  },
  infoCardValue: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // Fuel status
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
  fuelStatusWarning: {
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  fuelStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  fuelStatusIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#f44336",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fuelStatusTitle: {
    fontSize: 13,
    color: "#777",
    fontWeight: "600",
  },
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
  fuelRangeLabel: {
    fontSize: 12,
    color: "#777",
  },
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
  nearestStation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },
  nearestStationText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 13,
    color: "#444",
  },
  stationCountText: {
    marginTop: 10,
    color: "#777",
    fontSize: 12,
  },

  // Route information
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
  routeInfoSmallLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  routeInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginLeft: 10,
  },

  // Distance comparison
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
  comparisonLabel: {
    color: "#555",
  },
  comparisonValue: {
    fontWeight: "700",
    color: "#222",
  },
  comparisonResult: {
    fontWeight: "700",
    color: "#1b5e20",
    marginTop: 8,
  },

  // Receipt status
  receiptStatusCard: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 15,
    marginTop: 10,
  },
  receiptStatusTitle: {
    color: "#2e7d32",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
  },
  receiptStatusText: {
    color: "#333",
    marginTop: 3,
  },

  // Fuel stations list
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
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },
  stationDistance: {
    fontSize: 12,
    color: "#007bff",
    marginTop: 3,
  },
});