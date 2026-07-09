
import React, { useEffect,  useState } from 'react';
import { Text,ScrollView, StyleSheet,TouchableOpacity,View } from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from '../context/AuthContext';

const FuelScreen=({navigation})=>{
const { user, session } = useAuth();
 useEffect(() => {
  console.log('[fuel screen AUTH]', !!user);
}, [user])
return(

 <ScrollView
    style={styles.container}
    contentContainerStyle={{ paddingBottom: 30 }}
    showsVerticalScrollIndicator={false}
  >
  <View style={styles.fuelTopsection}>
    <Text style={styles.fuelH}>Fuel & Expenses</Text>

    <Text style={styles.month}>May 2025</Text>

    <Text style={styles.label}>TOTAL FUEL SPEND</Text>

    <Text style={styles.amount}>R5 000</Text>

    <Text style={styles.change}>↑ 12% vs previous month</Text>

    <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.monthContainer}
>
      <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Jan</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Feb</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Mar</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Apr</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.activeMonth}>
    <Text style={styles.activeMonthText}>May</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Jun</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Jul</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Aug</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Sep</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Oct</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Nov</Text>
  </TouchableOpacity>

  <TouchableOpacity style={styles.monthButton}>
    <Text style={styles.monthButtonText}>Dec</Text>
  </TouchableOpacity>
   </ScrollView>
  </View>


  <Text style={styles.sectionTitle}>This Month</Text>
 <View style={styles.statsContainer}>
    <View style={styles.card}>
        <Text style={styles.cardTitle}>LITRES USED</Text>
        <Text style={styles.cardValue}>183 L</Text>
        <Text style={styles.cardSub}>11.2 L/100km</Text>
    </View>

    <View style={styles.card}>
        <Text style={styles.cardTitle}>COST / TRIP</Text>
        <Text style={styles.cardValue}>R482</Text>
        <Text style={styles.cardSub}>avg per trip</Text>
    </View>

    <View style={styles.card}>
        <Text style={styles.cardTitle}>REFILLS</Text>
        <Text style={styles.cardValue}>7</Text>
        <Text style={styles.cardSub}>this month</Text>
    </View>

    <View style={styles.card}>
        <Text style={styles.cardTitle}>EFFICIENCY</Text>
        <Text style={styles.cardValue}>B+</Text>
        <Text style={styles.cardSub}>fleet avg: B</Text>
    </View>
</View>
<Text style={styles.sectionTitle}>Vehicle Efficiency</Text>

<View style={styles.efficiencyCard}>
  <View style={styles.vehicleHeader}>
    <Text style={styles.vehicleName}>
      Toyota Quantum GP 22-34 FM
    </Text>

    <View style={styles.goodBadge}>
      <Text style={styles.goodText}>Good</Text>
    </View>
  </View>

  {/* Progress Bar */}
  <View style={styles.progressBackground}>
    <View style={styles.progressFill} />
  </View>

  <View style={styles.scoreRow}>
    <Text style={styles.score}>Score 74/100</Text>
    <Text style={styles.actual}>11.2 L/100km</Text>
  </View>

  <Text style={styles.target}>
    Fleet target: 10.4 L/100km
  </Text>
</View>

  
<Text style={styles.sectionTitle}>Refill History</Text>

<View style={styles.historyCard}>
  <View style={styles.historyTop}>
    <Text style={styles.station}>ENGEN Boksburg</Text>
    <Text style={styles.price}>R1 245</Text>
  </View>

  <View style={styles.historyBottom}>
    <Text>45L</Text>
    <Text>10:38 Today</Text>
  </View>
</View>

<View style={styles.historyCard}>
  <View style={styles.historyTop}>
    <Text style={styles.station}>Shell Rosebank</Text>
    <Text style={styles.price}>R1 380</Text>
  </View>

  <View style={styles.historyBottom}>
    <Text>50L</Text>
    <Text>2 days ago</Text>
  </View>
</View>

<View style={styles.historyCard}>
  <View style={styles.historyTop}>
    <Text style={styles.station}>Sasol Eastgate</Text>
    <Text style={styles.price}>R1 380</Text>
  </View>

  <View style={styles.historyBottom}>
    <Text>45L</Text>
    <Text>10 days ago</Text>
  </View>
</View>
</ScrollView>



)


};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    marginBottom: 70,
  },

  fuelTopsection: {
    width: "100%",
    backgroundColor: "#0A1F44",
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  fuelH: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },

  month: {
    fontSize: 16,
    color: "#D7DCE5",
    marginBottom: 25,
  },

  label: {
    fontSize: 13,
    color: "#AEB8C8",
    letterSpacing: 1,
    fontWeight: "600",
  },

  amount: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },

  change: {
    color: "#5BE37D",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 25,
    fontWeight: "600",
  },
monthContainer: {
  flexDirection: "row",
  alignItems: "center",
  paddingRight: 20,
},

 monthButton: {
  backgroundColor: "rgba(255,255,255,0.12)",
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 20,
  marginRight: 12,
},

activeMonth: {
  backgroundColor: "#3B82F6",
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 20,
  marginRight: 12,
},

  activeMonth: {
    backgroundColor: "#3B82F6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  monthButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  activeMonthText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
},

card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
    elevation: 4,
},

cardTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
},

cardValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0A1F44",
    marginVertical: 8,
},

cardSub: {
    color: "#666",
},
sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0A1F44",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
},
efficiencyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
},
historyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 16,
    padding: 18,
    elevation: 2,
},
sectionTitle: {
  fontSize: 22,
  fontWeight: "bold",
  color: "#000075",
  marginHorizontal: 20,
  marginTop: 30,
  marginBottom: 15,
},

efficiencyCard: {
  backgroundColor: "#fff",
  marginHorizontal: 20,
  borderRadius: 20,
  padding: 20,
  elevation: 4,
},

vehicleHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

vehicleName: {
  fontSize: 16,
  fontWeight: "bold",
  color: "orange",
  width: "75%",
},

goodBadge: {
  backgroundColor: "#DFF7E5",
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 20,
},

goodText: {
  color: "#1b8634",
  fontWeight: "bold",
},

progressBackground: {
  height: 12,
  backgroundColor: "#E5E5E5",
  borderRadius: 10,
  marginTop: 20,
  overflow: "hidden",
},

progressFill: {
  width: "74%",
  height: "100%",
  backgroundColor: "#28A745",
  borderRadius: 10,
},

scoreRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 15,
},

score: {
  fontWeight: "bold",
  color: "#0A1F44",
},

actual: {
  color: "#666",
},

target: {
  color: "#888",
  marginTop: 8,
},

historyCard: {
  backgroundColor: "#fff",
  marginHorizontal: 20,
  marginBottom: 15,
  borderRadius: 18,
  padding: 18,
  elevation: 3,
},

historyTop: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 8,
},

historyBottom: {
  flexDirection: "row",
  justifyContent: "space-between",
},

station: {
  fontWeight: "bold",
  fontSize: 16,
  color: "#0A1F44",
},

price: {
  fontWeight: "bold",
  color: "#007AFF",
  fontSize: 16,
},
});
export default FuelScreen;