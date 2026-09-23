import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import * as Battery from "expo-battery";

const LOW_BATTERY_THRESHOLD = 0.20; // 15%

const BatteryContext = createContext({
  level: null,
  state: null,
  isLow: false,
  isCharging: false,
});

export function BatteryProvider({ children }) {
  const [level, setLevel] = useState(null);
  const [state, setState] = useState(null);
  const mountedRef = useRef(true);
  const alertedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const read = async () => {
      try {
        const [lvl, st] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
        ]);
        if (!mountedRef.current) return;

        const safeLevel = typeof lvl === "number" && lvl >= 0 ? lvl : null;
        setLevel(safeLevel);
        setState(st);

        console.log(
          `[Battery] level=${safeLevel != null ? Math.round(safeLevel * 100) + "%" : "unknown"} state=${st}`
        );
      } catch (e) {
        console.log("[Battery] error:", e?.message);
      }
    };

    read();
    const id = setInterval(read, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, []);

  const isCharging =
    state === Battery.BatteryState.CHARGING ||
    state === Battery.BatteryState.FULL;

  const isLow =
    typeof level === "number" &&
    level >= 0 &&
    level <= LOW_BATTERY_THRESHOLD &&
    !isCharging;

  // Alert once per low-battery episode
  useEffect(() => {
    if (isLow && !alertedRef.current) {
      alertedRef.current = true;

      Alert.alert(
        "Low Battery",
        `Your device battery is at ${Math.round(level * 100)}%. Please connect your charger to keep using the app.`,
        [
          { text: "OK", style: "default" },
        ],
        { cancelable: false }
      );
    }

    if (!isLow) {
      alertedRef.current = false;
    }
  }, [isLow, level]);

  return (
    <BatteryContext.Provider value={{ level, state, isLow, isCharging }}>
      {children}
    </BatteryContext.Provider>
  );
}

export function useBattery() {
  return useContext(BatteryContext);
}