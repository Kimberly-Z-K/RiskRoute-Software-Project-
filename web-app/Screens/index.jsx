import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const RiskRouteScreen = () => {
  const riskLevel = "Low";

  const getRiskColor = () => {
    switch (riskLevel) {
      case "High":
        return "#ff4d4d";
      case "Medium":
        return "#ffa500";
      default:
        return "#2ecc71";
    }
  };

  return (
    <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Risk Route</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Trip Summary */}
        <View style={styles.card}>
          <Text style={styles.heading}>🚛Trip Summary</Text>
          <Text style={styles.detail}>Destination: Port of Durban</Text>
          <Text style={styles.detail}>Cargo: Petrol</Text>
          <Text style={styles.detail}>ETA: 2h 15m</Text>

          <Text style={[styles.risk, { color: getRiskColor() }]}>
            Risk Level: {riskLevel}
          </Text>

          <View style={styles.mapPreview}>
            <Ionicons name="map" size={28} color="#888" />
            <Text style={styles.mapText}>Route Preview</Text>
          </View>
        </View>

        {/* Alerts & Actions */}
        <View style={styles.card}>
          <Text style={styles.heading}>⚠️Alerts</Text>

          <View style={styles.alertBox}>
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={styles.alertText}> Weather advisory ahead (12km)</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="checkmark-circle" size={18} color="#333" />
              <Text style={styles.secondaryText}> Check-in</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton}>
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.buttonText}> Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.card}>
          <Text style={styles.heading}>🛣️Route Details</Text>

          <View style={styles.mapLarge}>
            <Ionicons name="location" size={32} color="#666" />
            <Text style={styles.mapText}>Full Route & Safety Overview</Text>
          </View>

          <Text style={styles.detail}>⚠️ Incident nearby</Text>
          <Text style={styles.detail}>➡️ Use alternate route via N2</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 50,
    paddingBottom: 16,
    alignItems: "center",
  },

  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },

  scrollContent: {
    padding: 16,
  },

  card: {
    backgroundColor: "#ffffffee",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  heading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },

  detail: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },

  risk: {
    fontSize: 14,
    fontWeight: "bold",
    marginVertical: 8,
  },

  mapPreview: {
    height: 110,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  mapLarge: {
    height: 200,
    backgroundColor: "#e8e8e8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },

  mapText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },

  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
  },

  alertText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ddd",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
  },

  secondaryText: {
    color: "#333",
    fontWeight: "600",
    marginLeft: 5,
  },
});

export default RiskRouteScreen;
