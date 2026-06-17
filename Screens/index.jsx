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

const RiskRouteScreen = ({ navigation }) => {
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
    <LinearGradient colors={["#c0daf1", "#a0e2e6"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Risk Route</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

       {/* overwiew buttons */}
        <View style={styles.overviewCard}>
          <Text style={styles.heading}>📊 Today's Overview</Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Location")}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.actionText}>Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="car" size={18} color="#fff" />
              <Text style={styles.actionText}>Fuel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="help-circle" size={18} color="#fff" />
              <Text style={styles.actionText}>Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="notifications" size={18} color="#fff" />
              <Text style={styles.actionText}>Alerts</Text>
            </TouchableOpacity>

          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>

            <View style={styles.statBox}>
              <Text style={styles.statTitle}>Trips Done</Text>
              <Text style={styles.statValue}>12 / 15</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statTitle}>KM Driven</Text>
              <Text style={styles.statValue}>248 km</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statTitle}>Fuel Spent</Text>
              <Text style={styles.statValue}>R 1,240</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statTitle}>Deliveries</Text>
              <Text style={styles.statValue}>18 / 25</Text>
            </View>

          </View>
        </View>

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
            <Ionicons name="map" size={28} color="white" />
            <Text style={styles.mapText}>Route Preview</Text>
          </View>
        </View>

        

         {/* Vehicle Status */}
<View style={styles.vehicleCard}>

  <Text style={styles.vehicleTitle}>🚗 Vehicle Status</Text>

  <Text style={styles.vehicleName}>Toyota Quantum</Text>
  <Text style={styles.vehicleSub}>2023 · Diesel · GPS Active</Text>

  {/* Number Plate */}
  <View style={styles.plateOuter}>
    <Text style={styles.plateText}>GP 22-34 FM</Text>
  </View>

  {/* Fuel */}
  <Text style={styles.label}>Fuel</Text>
  <View style={styles.barBackground}>
    <View style={[styles.barFill, { width: "38%", backgroundColor: "#f4a300" }]} />
  </View>
  <Text style={styles.percentText}>38%</Text>

  {/* Engine */}
  <Text style={styles.label}>Engine</Text>
  <View style={styles.barBackground}>
    <View style={[styles.barFill, { width: "90%", backgroundColor: "#2ecc71" }]} />
  </View>
  <Text style={styles.percentText}>Good</Text>

  {/* Tyres */}
  <Text style={styles.label}>Tyres</Text>
  <View style={styles.barBackground}>
    <View style={[styles.barFill, { width: "75%", backgroundColor: "#3498db" }]} />
  </View>
  <Text style={styles.percentText}>75%</Text>

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
    backgroundColor: "#000068",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  heading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
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
    backgroundColor: "#113065",
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
    color: "white",
    fontWeight: "600",
    marginLeft: 5,
  },

  

  overviewCard: {
    backgroundColor: "#000050",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 15,
  },

  actionBtn: {
    backgroundColor: "#113065",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    width: "23%",
  },

  actionText: {
    color: "#fff",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statBox: {
    backgroundColor: "#113065",
    width: "48%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  statTitle: {
    color: "#bbb",
    fontSize: 12,
  },

  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
  vehicleCard: {
  backgroundColor: "#fff",
  borderRadius: 18,
  padding: 16,
  marginBottom: 16,
},

vehicleTitle: {
  color: "#0B1F3A",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 10,
},

vehicleName: {
  color: "#0B1F3A",
  fontSize: 18,
  fontWeight: "bold",
},

vehicleSub: {
  color: "#666",
  fontSize: 13,
  marginBottom: 10,
},

/* number plate styling*/
plateOuter: {
  borderWidth: 2,
  borderColor: "#0b60f4",
  backgroundColor: "#fff",
  paddingVertical: 6,
  paddingHorizontal: 12,
  alignSelf: "flex-start",
  borderRadius: 6,
  marginBottom: 14,
},

plateText: {
  color: "#0b60f4",
  fontWeight: "bold",
  letterSpacing: 1,
},


label: {
  color: "#0B1F3A",
  fontSize: 12,
  marginTop: 8,
  marginBottom: 4,
  fontWeight: "600",
},


barBackground: {
  height: 8,
  width: "100%",
  backgroundColor: "#E6EAF0",
  borderRadius: 10,
  overflow: "hidden",
},

barFill: {
  height: "100%",
  borderRadius: 10,
},

percentText: {
  fontSize: 12,
  color: "#555",
  marginTop: 4,
},
});

export default RiskRouteScreen;