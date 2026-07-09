import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  TextInput
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import * as ExpoLocation from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '../context/AuthContext';

export default function Location() {
  const { user, session } = useAuth();
  useEffect(() => {
    console.log('[location screen AUTH]', !!user);
  }, [user])

  const [fullMap, setFullMap] = useState(false);
  const [location, setLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);

  const mapRef = useRef(null);
  const simulationRef = useRef(null);
  const hasStartedRef = useRef(false);

  /*sandton coordinates
  const destination = {
    latitude: -26.1076,
    longitude: 28.0567, 
  };*/
  const [destinationName, setDestinationName] = useState("");
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    getLocation();

    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);


 

  // gets your current location
  async function getLocation() {
    try {
      setLoading(true);

      const { status } =
        await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Enable location permissions");
        setLoading(false);
        return;
      }

      const current = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setLocation(coords);

     // await fetchRoute(coords, destination);

      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  }


  async function searchDestination() {
  try {
    if (!destinationName.trim()) {
      alert("Enter a destination");
      return;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${destinationName},South Africa&format=json&limit=1`
    );

    const data = await response.json();

    if (data.length === 0) {
      alert("Destination not found");
      return;
    }

    const coords = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };

    setDestination(coords);

    if (location) {
      await fetchRoute(location, coords);
    }
  } catch (error) {
    console.log("Search error:", error);
  }
}

  // shows the route line
  async function fetchRoute(start, end) {
    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${start.longitude},${start.latitude};${end.longitude},${end.latitude}` +
        `?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes?.length) {
        console.log("Route not found");
        return;
      }

      const coords = data.routes[0].geometry.coordinates.map((c) => ({
        latitude: c[1],
        longitude: c[0],
      }));

      setRouteCoords(coords);

    /*  if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        startSimulation(coords);
      }*/
     if (simulationRef.current) {
  clearInterval(simulationRef.current);
}

startSimulation(coords);

    } catch (err) {
      console.log("route error", err);
    }
  }

  // simulation of the moving vehicle
  function startSimulation(coords) {
    if (!coords || coords.length < 2) return;

    let i = 0;
    let forward = true;

    simulationRef.current = setInterval(() => {
      const point = coords[i];

      setLocation(point);
      setStepIndex(i);

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: point.latitude,
            longitude: point.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          600
        );
      }

      
      if (forward) {
        i++;
        if (i >= coords.length - 1) forward = false;
      } else {
        i--;
        if (i <= 0) forward = true;
      }
    }, 1200);
  }

  //data used by the driver on the road
  const routeSteps = [
    "Auckland Park",
    "Turn right onto N1 South",
    "Take R24 — avoid N3 congestion",
    "Shell EnGen Garage on rightt",
    "Exit toward Sandton",
    "Arrive at destination",
  ];

  const fuelStations = [
    { name: "Shell Sandton", distance: "1.2 km" },
    { name: "BP Rivonia", distance: "2.8 km" },
    { name: "Engen Midrand", distance: "5.1 km" },
  ];

  const history = [
    { name: "Rosebank Mall", time: "Yesterday" },
    { name: "Fourways", time: "2 days ago" },
    { name: "Johannesburg CBD", time: "Last week" },
  ];


  if (loading || !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Finding your location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* full map */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setFullMap(true)}
        style={fullMap ? styles.fullMap : styles.halfMap}
      >
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
        >
          <Marker coordinate={location} title="You" />
          {destination && (
  <Marker
    coordinate={destination}
    pinColor="blue"
    title={destinationName}
  />
)}

          {routeCoords.length > 0 && (
  <Polyline
    coordinates={routeCoords}
    strokeWidth={5}
    strokeColor="#ff2d2d"
  />
)}
        </MapView>

        {fullMap && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setFullMap(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      
      {!fullMap && (

        
        <ScrollView
          style={styles.infoBox}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View style={styles.searchContainer}>
  <TextInput
    style={styles.input}
    placeholder="Enter destination"
    value={destinationName}
    onChangeText={setDestinationName}
  />

  <TouchableOpacity
    style={styles.searchButton}
    onPress={searchDestination}
  >
    <Text style={{ color: "#fff" }}>Search</Text>
  </TouchableOpacity>
</View>
          
          <Text style={styles.routeTitle}>Active Route</Text>
          <Text style={styles.routeText}>
  {destinationName
    ? `Current Destination: ${destinationName}`
    : "No destination selected"}
</Text>

          {/* Road Alerts*/}
          <View style={styles.card}>
            <Text style={styles.heading}>Alerts</Text>
            <Text style={styles.alertText}>
              Heavy traffic ahead (4km)
            </Text>
          </View>

          {/* routes taken by the driver*/}
          <Text style={styles.sectionTitle}>Route Steps</Text>

          {routeSteps.map((step, i) => (
            <View key={i} style={styles.stepCard}>
              <Text>{i + 1}. {step}</Text>
              {i === stepIndex && <Text style={{ color: "green" }}>● Now</Text>}
            </View>
          ))}

          {/* shows fuel stations */}
          <Text style={styles.sectionTitle}>Fuel Stations</Text>

          {fuelStations.map((f, i) => (
            <View key={i} style={styles.smallCard}>
              <Text>{f.name}</Text>
              <Text style={{ color: "#666" }}>{f.distance}</Text>
            </View>
          ))}

          {/* history of stops made by the driver */}
          <Text style={styles.sectionTitle}>History Stops</Text>

          {history.map((h, i) => (
            <View key={i} style={styles.smallCard}>
              <Text>{h.name}</Text>
              <Text style={{ color: "green" }}>{h.time}</Text>
            </View>
          ))}

          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setFullMap(true)}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.buttonText}>Start Navigation</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  halfMap: {
    height: "35%",
    width: "100%",
  },

  fullMap: {
    ...StyleSheet.absoluteFillObject,
  },

  infoBox: {
    flex: 1,
    padding: 16,
    backgroundColor: "#eee",
  },

  routeTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },

  routeText: {
    color: "red",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#000068",
    padding: 16,
    borderRadius: 15,
    marginBottom: 10,
  },

  heading: {
    color: "#fff",
    fontWeight: "bold",
  },

  alertText: {
    color: "#fff",
    marginTop: 5,
  },

  stepCard: {
    padding: 12,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  smallCard: {
    padding: 12,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 8,
  },

  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 25,
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 40, 
  },

  buttonText: {
    color: "#fff",
    marginLeft: 5,
    fontWeight: "bold",
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 20,
  },

  backText: {
    color: "#fff",
    marginLeft: 5,
  },
  searchContainer: {
  flexDirection: "row",
  marginBottom: 15,
},

input: {
  flex: 1,
  backgroundColor: "#fff",
  borderRadius: 10,
  paddingHorizontal: 12,
  marginRight: 10,
  height: 45,
},

searchButton: {
  backgroundColor: "#007bff",
  paddingHorizontal: 15,
  justifyContent: "center",
  borderRadius: 10,
},
});