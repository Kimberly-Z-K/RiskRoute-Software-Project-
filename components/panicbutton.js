// components/PanicButton.js
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  View,
} from "react-native";
import { usePanic } from "../context/PanicButtonContext";

export default function PanicButton() {
  const { triggerPanic, isPanic } = usePanic();

  const handlePress = () => {
    Alert.alert(
      "Trigger Panic Alert?",
      "This will immediately alert your emergency contacts with your location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "TRIGGER",
          style: "destructive",
          onPress: () => triggerPanic(),
        },
      ],
      { cancelable: true }
    );
  };

  if (isPanic) return null; // hide while panic is active

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityLabel="Trigger panic alert"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>PANIC</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 110, // sits just above the bottom tab bar
    right: 20,
    zIndex: 999,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#d32f2f",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 1,
  },
});