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
  TextInput,
} from "react-native";
import MapView, { Marker, Polyline, Callout } from "react-native-maps";
import * as ExpoLocation from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '../context/AuthContext';
import { supabase } from "../lib/supabase";

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
  { id: 2, name: "BP Service Station", latitude: -26.1100, longitude: 28.0600 },
  { id: 3, name: "Engen Fuel Stop", latitude: -26.1050, longitude: 28.0530 },
  { id: 4, name: "Caltex Refuel", latitude: -26.1120, longitude: 28.0580 },
  { id: 5, name: "Total Energies", latitude: -26.1080, longitude: 28.0620 },
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

    // Amount Input Modal (OCR confirm / manual entry)
    showAmountModal: false,
    amountInput: '',
    pendingReceiptUri: null,
    isProcessingOCR: false,
    autoDetectedAmount: null,
    showOCRConfirmation: false,

    // UI
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
    showAmountModal,
    amountInput,
    pendingReceiptUri,
    isProcessingOCR,
    autoDetectedAmount,
    showOCRConfirmation,
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
                showAmountModal: false,
                amountInput: '',
                pendingReceiptUri: null,
                isProcessingOCR: false,
                autoDetectedAmount: null,
                showOCRConfirmation: false,
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

      updateState({ fuelWarning: true });

      showNotification('warning', `Fuel at ${current.fuelPercent.toFixed(0)}% - Please find a fuel station!`, 5000);

      updateState({ showFuelModal: true });
    }
  }, [updateState, showNotification]);

  // ============================================
  // OCR INTEGRATION (base64 → Supabase Edge Function)
  // ============================================
  const extractReceiptWithEasyOCR = useCallback(async (imageUri) => {
    try {
      updateState({ isProcessingOCR: true });

      const supabaseUrl = 'https://pyqftjxfbjecjdhdzyor.supabase.co';
      const supabaseAnonKey = 'sb_publishable_iFcMrb7-9eJ86p0KU2PWyg_UZ77LRFF';

      console.log('📸 Starting OCR request...');

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      const filename = imageUri.split('/').pop() || 'receipt.jpg';

      const response = await fetch(`${supabaseUrl}/functions/v1/easyocr-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${base64}`,
          filename: filename,
        }),
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || `HTTP ${response.status}`);
      }

      const rawText = data.text || '';

      const patterns = [
        /(?:total|amount|grand\s*total|amount\s*due|balance\s*due|total\s*amount|total\s*due|subtotal|total\s*including\s*vat)[:\s]*R?\s*([\d,]+[.,]\d{2})/i,
        /R\s*([\d,]+[.,]\d{2})/i,
        /([\d,]+[.,]\d{2})\s*(?:total|amount|due|balance)/i,
      ];

      let total = null;
      for (const pattern of patterns) {
        const match = rawText.match(pattern);
        if (match && match[1]) {
          const cleanAmount = match[1].replace(/,/g, '').replace(/,/g, '.');
          total = parseFloat(cleanAmount);
          if (total) break;
        }
      }

      const taxMatch = rawText.match(/(?:vat|tax)[:\s]*R?\s*([\d,]+[.,]\d{2})/i);
      let tax = null;
      if (taxMatch && taxMatch[1]) {
        tax = parseFloat(taxMatch[1].replace(/,/g, '').replace(/,/g, '.'));
      }

      const dateMatch = rawText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      const date = dateMatch ? dateMatch[1] : null;

      updateState({ isProcessingOCR: false });

      return { total, tax, date, rawText, success: total !== null && total > 0 };
    } catch (error) {
      console.error('❌ EasyOCR error:', error);
      updateState({ isProcessingOCR: false });
      return {
        total: null,
        tax: null,
        date: null,
        rawText: '',
        success: false,
        error: error.message || 'OCR processing failed',
      };
    }
  }, [updateState]);

  // ============================================
  // RECEIPT FUNCTIONS
  // ============================================
  const uploadReceiptToSupabase = useCallback(async (uri, userId) => {
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const timestamp = Date.now();
      const fileName = `${userId}/receipt-${timestamp}.jpg`;

      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        Alert.alert('Upload Error', error.message);
        return null;
      }

      return data.path;
    } catch (error) {
      Alert.alert('Error', 'Failed to upload receipt.');
      return null;
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
      return false;
    }
    return true;
  }, []);

  const resetReceiptState = useCallback(() => {
    updateState({
      receiptImage: null,
      receiptAmount: '',
      fuelPurchased: 0,
      receiptSubmitted: false,
      waitingForReceipt: true,
      isAtFuelStation: true,
      pendingReceiptUri: null,
      isProcessingOCR: false,
      autoDetectedAmount: null,
      showOCRConfirmation: false,
      amountInput: '',
    });
  }, [updateState]);

  const handleSubmitReceipt = useCallback(async (localUri, parsedAmount) => {
    let userId = 'temp-user';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch (e) {}

    const receiptPath = await uploadReceiptToSupabase(localUri, userId);
    if (!receiptPath) {
      Alert.alert('Upload Error', 'Failed to upload receipt image. Please try again.');
      return;
    }

    const litresPurchased = parsedAmount / 22;
    const fuelAdded = (litresPurchased / CONFIG.TANK_CAPACITY) * 100;
    const newFuelPercent = Math.min(fuelPercent + fuelAdded, 100);

    try {
      const { error: dbError } = await supabase
        .from('receipts')
        .insert({
          user_id: userId,
          receipt_amount: parsedAmount,
          fuel_purchased: litresPurchased,
          receipt_image_path: receiptPath,
          fuel_percent_before: fuelPercent,
          fuel_percent_after: newFuelPercent,
        })
        .select();

      if (dbError) {
        Alert.alert('Database Error', 'Receipt image uploaded but failed to save record.');
        return;
      }
    } catch (dbError) {
      Alert.alert('Database Error', 'Failed to save receipt record.');
      return;
    }

    updateState({
      receiptAmount: parsedAmount.toFixed(2),
      fuelPurchased: litresPurchased,
      receiptImage: localUri,
      receiptSubmitted: true,
      fuelPercent: newFuelPercent,
      waitingForReceipt: false,
      isAtFuelStation: false,
      fuelWarning: false,
      showReceiptModal: true,
      showAmountModal: false,
      amountInput: '',
      pendingReceiptUri: null,
      showOCRConfirmation: false,
      autoDetectedAmount: null,
      isProcessingOCR: false,
    });

    showNotification(
      'success',
      `✅ Receipt uploaded! R${parsedAmount.toFixed(2)} (${litresPurchased.toFixed(1)}L)`,
      5000
    );

    if (newFuelPercent <= CONFIG.FUEL_WARNING_THRESHOLD) {
      setTimeout(() => { checkFuelAndRedirect(); }, 1000);
    }
  }, [fuelPercent, updateState, showNotification, checkFuelAndRedirect, uploadReceiptToSupabase]);

  const showFuelAmountInput = useCallback((localUri, prefillAmount = null) => {
    updateState({
      pendingReceiptUri: localUri,
      receiptImage: localUri,
      showAmountModal: true,
      amountInput: prefillAmount ? prefillAmount.toString() : '',
      autoDetectedAmount: prefillAmount,
      isProcessingOCR: false,
    });
  }, [updateState]);

  const handleFuelModalSubmit = useCallback(async () => {
    const { amountInput, pendingReceiptUri } = stateRef.current;

    if (!amountInput || isNaN(parseFloat(amountInput))) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    const parsedAmount = parseFloat(amountInput);
    await handleSubmitReceipt(pendingReceiptUri, parsedAmount);
  }, [handleSubmitReceipt]);

  const scanReceipt = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const localUri = result.assets[0].uri;

        updateState({
          receiptImage: localUri,
          pendingReceiptUri: localUri,
        });

        const ocrResult = await extractReceiptWithEasyOCR(localUri);

        if (ocrResult.success && ocrResult.total > 0) {
          Alert.alert(
            '💰 Amount Detected',
            `EasyOCR found R${ocrResult.total.toFixed(2)} on your receipt.`,
            [
              { text: '✅ Use This', onPress: () => showFuelAmountInput(localUri, ocrResult.total) },
              { text: '✏️ Enter Manually', onPress: () => showFuelAmountInput(localUri, null), style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            '✏️ Manual Entry Required',
            'Could not automatically detect the amount. Please enter it manually.',
            [{ text: 'OK', onPress: () => showFuelAmountInput(localUri, null) }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera.');
    }
  }, [requestCameraPermission, extractReceiptWithEasyOCR, showFuelAmountInput, updateState]);

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
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const localUri = result.assets[0].uri;

        updateState({
          receiptImage: localUri,
          pendingReceiptUri: localUri,
        });

        const ocrResult = await extractReceiptWithEasyOCR(localUri);

        if (ocrResult.success && ocrResult.total > 0) {
          Alert.alert(
            '💰 Amount Detected',
            `EasyOCR found R${ocrResult.total.toFixed(2)} on your receipt.`,
            [
              { text: '✅ Use This', onPress: () => showFuelAmountInput(localUri, ocrResult.total) },
              { text: '✏️ Enter Manually', onPress: () => showFuelAmountInput(localUri, null), style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            '✏️ Manual Entry Required',
            'Could not automatically detect the amount. Please enter it manually.',
            [{ text: 'OK', onPress: () => showFuelAmountInput(localUri, null) }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open gallery.');
    }
  }, [extractReceiptWithEasyOCR, showFuelAmountInput, updateState]);

  const openReceiptModal = useCallback(() => {
    updateState({
      showReceiptModal: true,
      isAtFuelStation: true,
      waitingForReceipt: true
    });
  }, [updateState]);

  // ============================================
  // BUTTON SHEET
  // ============================================
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
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [getLocation, user]);

  useEffect(() => {
    if (screenReady && location && !tripLoaded && !tripLoading) {
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
  // AMOUNT INPUT MODAL (restyled)
  // ============================================
  const renderAmountInputModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showAmountModal}
      onRequestClose={() => {
        resetReceiptState();
        updateState({ showAmountModal: false, amountInput: '', pendingReceiptUri: null });
      }}
    >
      <View style={styles.receiptModalOverlay}>
        <View style={styles.receiptModalSheet}>
          <View style={styles.receiptModalHandleWrap}>
            <View style={styles.receiptModalHandle} />
          </View>

          <View style={styles.receiptModalHeader}>
            <View style={styles.receiptModalHeaderIcon}>
              <Ionicons name="cash-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.receiptModalTitle}>Enter Fuel Amount</Text>
              <Text style={styles.receiptModalSubtitleSmall}>
                {isProcessingOCR
                  ? "Processing receipt..."
                  : autoDetectedAmount
                  ? "Confirm or adjust detected amount"
                  : "Enter the amount spent on fuel"}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.receiptModalBody}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.receiptModalSectionTitle}>
              {isProcessingOCR
                ? "⏳ Analyzing receipt..."
                : autoDetectedAmount
                ? `🤖 EasyOCR detected R${autoDetectedAmount.toFixed(2)}`
                : "📝 Enter total amount (ZAR)"}
            </Text>

            {pendingReceiptUri && (
              <View style={styles.receiptPreviewCard}>
                <Image
                  source={{ uri: pendingReceiptUri }}
                  style={styles.receiptPreviewImage}
                />
              </View>
            )}

            {isProcessingOCR && (
              <View style={styles.receiptLoadingCard}>
                <ActivityIndicator size="large" color="#0A1F44" />
                <Text style={styles.receiptLoadingText}>Reading your receipt...</Text>
              </View>
            )}

            {!isProcessingOCR && (
              <>
                <View style={styles.receiptInputCard}>
                  <Text style={styles.receiptInputLabel}>Amount (ZAR)</Text>
                  <View style={styles.receiptInputWrapper}>
                    <Text style={styles.receiptInputPrefix}>R</Text>
                    <TextInput
                      style={styles.receiptInput}
                      placeholder="0.00"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={amountInput}
                      onChangeText={(text) => updateState({ amountInput: text })}
                      autoFocus={true}
                    />
                  </View>
                </View>

                <View style={styles.receiptModalActions}>
                  <TouchableOpacity
                    style={[styles.receiptModalBtn, styles.receiptModalBtnCancel]}
                    onPress={() => {
                      resetReceiptState();
                      updateState({
                        showAmountModal: false,
                        amountInput: '',
                        pendingReceiptUri: null,
                      });
                    }}
                  >
                    <Ionicons name="close-outline" size={18} color="#0A1F44" />
                    <Text style={styles.receiptModalBtnTextCancel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.receiptModalBtn, styles.receiptModalBtnPrimary]}
                    onPress={handleFuelModalSubmit}
                  >
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    <Text style={styles.receiptModalBtnTextPrimary}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ============================================
  // RECEIPT MODAL (restyled)
  // ============================================
  const renderReceiptModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showReceiptModal}
      onRequestClose={() => {
        if (!receiptSubmitted && waitingForReceipt) {
          Alert.alert(
            "Scan Receipt",
            "Please scan your receipt to continue.",
            [{ text: "OK", style: "default" }]
          );
        } else {
          resetReceiptState();
          updateState({ showReceiptModal: false });
        }
      }}
    >
      <View style={styles.receiptModalOverlay}>
        <View style={styles.receiptModalSheet}>
          <View style={styles.receiptModalHandleWrap}>
            <View style={styles.receiptModalHandle} />
          </View>

          <View style={styles.receiptModalHeader}>
            <View style={styles.receiptModalHeaderIcon}>
              <Ionicons
                name={receiptSubmitted ? "checkmark-circle" : "receipt-outline"}
                size={22}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.receiptModalTitle}>
                {receiptSubmitted ? "Receipt Submitted" : "Scan Fuel Receipt"}
              </Text>
              <Text style={styles.receiptModalSubtitleSmall}>
                {receiptSubmitted
                  ? "Your fuel level has been updated"
                  : "Snap or upload your fuel receipt"}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.receiptModalBody}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {receiptImage ? (
              <View style={styles.receiptPreviewCard}>
                <Image
                  source={{ uri: receiptImage }}
                  style={styles.receiptPreviewImage}
                />
                {receiptSubmitted && (
                  <View style={styles.receiptSubmittedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.receiptSubmittedBadgeText}>Submitted</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.receiptEmptyCard}>
                <Ionicons name="document-text-outline" size={54} color="#9CA3AF" />
                <Text style={styles.receiptEmptyTitle}>No receipt yet</Text>
                <Text style={styles.receiptEmptySubtitle}>
                  Take a photo or upload one from your gallery
                </Text>
              </View>
            )}

            {isProcessingOCR && (
              <View style={styles.receiptLoadingCard}>
                <ActivityIndicator size="large" color="#0A1F44" />
                <Text style={styles.receiptLoadingText}>
                  Analyzing receipt with AI...
                </Text>
              </View>
            )}

            {receiptAmount && receiptSubmitted && (
              <View style={styles.receiptSuccessCard}>
                <Text style={styles.receiptSuccessTitle}>✓ Receipt Recorded</Text>
                <View style={styles.receiptSuccessRow}>
                  <Text style={styles.receiptSuccessLabel}>Amount</Text>
                  <Text style={styles.receiptSuccessValue}>R{receiptAmount}</Text>
                </View>
                <View style={styles.receiptSuccessRow}>
                  <Text style={styles.receiptSuccessLabel}>Fuel Purchased</Text>
                  <Text style={styles.receiptSuccessValue}>
                    {fuelPurchased.toFixed(1)} L
                  </Text>
                </View>
                <View style={styles.receiptSuccessRow}>
                  <Text style={styles.receiptSuccessLabel}>New Fuel Level</Text>
                  <Text style={styles.receiptSuccessValue}>
                    {fuelPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}

            {!receiptSubmitted ? (
              <>
                <TouchableOpacity
                  style={[styles.receiptModalBtn, styles.receiptModalBtnPrimary, { marginBottom: 10 }]}
                  onPress={scanReceipt}
                  disabled={isProcessingOCR}
                >
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.receiptModalBtnTextPrimary}>Scan Receipt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.receiptModalBtn, styles.receiptModalBtnSecondary, { marginBottom: 10 }]}
                  onPress={pickReceiptImage}
                  disabled={isProcessingOCR}
                >
                  <Ionicons name="images-outline" size={20} color="#0A1F44" />
                  <Text style={styles.receiptModalBtnTextCancel}>
                    Upload from Gallery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.receiptSkipBtn}
                  onPress={() => {
                    Alert.alert(
                      "Skip Receipt",
                      "Are you sure you want to skip scanning the receipt?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Skip",
                          onPress: () => {
                            resetReceiptState();
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
                  disabled={isProcessingOCR}
                >
                  <Text style={styles.receiptSkipBtnText}>Skip for now</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.receiptModalBtn, styles.receiptModalBtnPrimary, { marginBottom: 10 }]}
                  onPress={() => {
                    resetReceiptState();
                    updateState({
                      showReceiptModal: false,
                      waitingForReceipt: false,
                      isAtFuelStation: false,
                    });
                    showNotification("info", "Ready for next receipt", 1500);
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.receiptModalBtnTextPrimary}>Continue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.receiptModalBtn, styles.receiptModalBtnSecondary]}
                  onPress={() => {
                    resetReceiptState();
                    showNotification("info", "📸 Ready to scan a new receipt", 1500);
                  }}
                >
                  <Ionicons name="camera-outline" size={20} color="#0A1F44" />
                  <Text style={styles.receiptModalBtnTextCancel}>
                    Scan New Receipt
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
          <Text style={styles.fuelWarningText}>Low Fuel!</Text>
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

  const renderRouteInfoPanel = () => (
    <ScrollView
      style={styles.routeInfoScroll}
      contentContainerStyle={styles.routeSheetContent}
      showsVerticalScrollIndicator={false}
    >
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

      {receiptSubmitted && (
        <View style={styles.receiptStatusCard}>
          <Text style={styles.receiptStatusTitle}>✓ Receipt Submitted</Text>
          <Text style={styles.receiptStatusText}>Amount: R{receiptAmount}</Text>
          <Text style={styles.receiptStatusText}>Fuel: {fuelPurchased.toFixed(1)}L</Text>
          <Text style={styles.receiptStatusText}>New Fuel Level: {fuelPercent.toFixed(1)}%</Text>
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
      {renderAmountInputModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666" },

  // Map containers
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
    padding: 12,
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
  fuelWarningText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },

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

  // ============================================
  // FUEL MODAL (unchanged, still uses modalContainer etc.)
  // ============================================
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

  // ============================================
  // RECEIPT MODAL - CONSISTENT WITH APP STYLING
  // ============================================
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
  receiptModalSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171717",
    marginTop: 4,
    marginBottom: 12,
  },

  receiptPreviewCard: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  receiptPreviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  receiptSubmittedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e7d32",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  receiptSubmittedBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 4,
  },

  receiptEmptyCard: {
    width: "100%",
    minHeight: 180,
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  receiptEmptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#0A1F44",
  },
  receiptEmptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#7a8699",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  receiptLoadingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  receiptLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#0A1F44",
    fontWeight: "600",
  },

  receiptSuccessCard: {
    backgroundColor: "#e8f5e9",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  receiptSuccessTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2e7d32",
    marginBottom: 12,
  },
  receiptSuccessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  receiptSuccessLabel: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  receiptSuccessValue: {
    fontSize: 14,
    color: "#1b5e20",
    fontWeight: "800",
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
  receiptInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f6fc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e7f3",
  },
  receiptInputPrefix: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A1F44",
    marginRight: 6,
  },
  receiptInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#0A1F44",
    padding: 0,
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
  receiptModalBtnSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#0A1F44",
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
  receiptSkipBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  receiptSkipBtnText: {
    color: "#7a8699",
    fontSize: 13,
    fontWeight: "600",
  },

  // ============================================
  // ROUTE INFO PANEL / BUTTON SHEET
  // ============================================
  infoAreaContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
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
  sheetDivider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginTop: 20,
    marginBottom: 6,
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
  receiptStatusText: { color: "#333", marginTop: 3 },

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