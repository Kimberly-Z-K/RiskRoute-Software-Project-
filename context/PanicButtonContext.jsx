// context/PanicContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ExpoLocation from "expo-location";
import { supabase } from "../lib/supabase"; 
import { useAuth } from "../context/AuthContext"; 

const PanicContext = createContext(null);

const DEFAULT_CONFIG = {
  CHECK_IN_INTERVAL_MS: 30000,   
  RESPONSE_TIME_MS: 30000,       
};

export function PanicProvider({ children, config = DEFAULT_CONFIG }) {
  const { user } = useAuth();
  const { CHECK_IN_INTERVAL_MS, RESPONSE_TIME_MS } = config;

  const [panicModalVisible, setPanicModalVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RESPONSE_TIME_MS / 1000);
  const [isPanic, setIsPanic] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [panicLog, setPanicLog] = useState(null);

  const checkInTimerRef = useRef(null);
  const responseTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const vibrationIntervalRef = useRef(null);

  const captureLocation = useCallback(async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const current = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      return {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
    } catch {
      return null;
    }
  }, []);

  const startGentleVibration = useCallback(() => {
    const pattern = Platform.OS === "android" ? [0, 200, 100, 200] : [200, 100, 200];
    Vibration.vibrate(pattern, false);
  }, []);

  const startPanicVibration = useCallback(() => {
    const pattern =
      Platform.OS === "android"
        ? [0, 500, 200, 500, 200, 500]
        : [500, 200, 500, 200, 500];

    Vibration.vibrate(pattern, true);

    vibrationIntervalRef.current = setInterval(() => {
      Vibration.vibrate(pattern, false);
    }, 2000);
  }, []);

  const stopPanicVibration = useCallback(() => {
    Vibration.cancel();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  }, []);

  const logPanicEvent = useCallback(async (type) => {
    const timestamp = new Date().toISOString();
    const location = await captureLocation();
    const logEntry = { type, timestamp, location };
    setPanicLog(logEntry);
    console.log("PANIC LOG:", JSON.stringify(logEntry));

    if (user?.id) {
      supabase
        .from("panic_logs")
        .insert({
          user_id: user.id,
          event: type,
          timestamp,
          location: location
            ? { latitude: location.latitude, longitude: location.longitude }
            : null,
        })
        .then(({ error }) => {
          if (error) {
            console.error("Error saving panic log:", error);
          } else {
            console.log("Panic log saved");
          }
        });
    }
  }, [captureLocation, user]);

  const resetTimers = useCallback(() => {
    if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setPanicModalVisible(false);
    setIsPanic(false);
    setTimeLeft(RESPONSE_TIME_MS / 1000);
  }, [RESPONSE_TIME_MS]);

  const startNextCheckInCycle = useCallback(() => {
    resetTimers();

    checkInTimerRef.current = setTimeout(() => {
      setPanicModalVisible(true);
      setTimeLeft(RESPONSE_TIME_MS / 1000);

      startGentleVibration();

      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(countdownIntervalRef.current);
          }
          return next;
        });
      }, 1000);

      responseTimerRef.current = setTimeout(async () => {
        setPanicModalVisible(false);
        setIsPanic(true);
        startPanicVibration();
      }, RESPONSE_TIME_MS);
    }, CHECK_IN_INTERVAL_MS);
  }, [CHECK_IN_INTERVAL_MS, RESPONSE_TIME_MS, startGentleVibration, startPanicVibration, resetTimers]);

  const handleImOkay = useCallback(async () => {
    setPanicModalVisible(false);
    setIsProcessing(true);

    await logPanicEvent("USER_CLICKED_IM_OK");

    setIsProcessing(false);
    startNextCheckInCycle();
  }, [logPanicEvent, startNextCheckInCycle]);

  const handlePanicAction = useCallback(async () => {
    stopPanicVibration();
    setIsPanic(false);
    setIsProcessing(true);

    await logPanicEvent("PANIC_TRIGGERED_NO_RESPONSE");
    console.log("SEND HELP - no response within allocated time");

    setIsProcessing(false);
    startNextCheckInCycle();
  }, [logPanicEvent, startNextCheckInCycle, stopPanicVibration]);

  useEffect(() => {
    startNextCheckInCycle();

    return () => {
      if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      stopPanicVibration();
    };
  }, []);

  const value = {
    panicModalVisible,
    timeLeft,
    isPanic,
    isProcessing,
    panicLog,
    handleImOkay,
    handlePanicAction,
  };

  return (
    <PanicContext.Provider value={value}>
      {children}
      <PanicModal />
      {isProcessing && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.processingOverlay}>
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          </View>
        </Modal>
      )}
    </PanicContext.Provider>
  );
}

export function usePanic() {
  const ctx = useContext(PanicContext);
  if (!ctx) throw new Error("usePanic must be used within PanicProvider");
  return ctx;
}

function PanicModal() {
  const { panicModalVisible, timeLeft, isPanic, handleImOkay, handlePanicAction } =
    usePanic();

  if (!isPanic && panicModalVisible) {
    return (
      <Modal visible={panicModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>Check-in Required</Text>
            <Text style={styles.subtitle}>
              Are you okay? You have {timeLeft}s to respond.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleImOkay}>
              <Text style={styles.buttonText}>I'm OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (isPanic) {
    return (
      <Modal visible={isPanic} transparent animationType="fade">
        <View style={styles.fullScreenOverlay}>
          <View style={styles.fullScreenContent}>
            <Text style={styles.panicTitle}>Panic Activated</Text>
            <Text style={styles.panicSubtitle}>
              No response received. Help is being sent.
            </Text>

            <TouchableOpacity style={styles.ackButton} onPress={handlePanicAction}>
              <Text style={styles.ackButtonText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#111",
  },
  subtitle: {
    fontSize: 15,
    color: "#444",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007bff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Full-screen panic styles
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(200, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  panicTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#b71c1c",
    marginBottom: 8,
    textAlign: "center",
  },
  panicSubtitle: {
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  ackButton: {
    backgroundColor: "#b71c1c",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  ackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },


  processingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    minWidth: 140,
  },
  processingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#333",
  },
});