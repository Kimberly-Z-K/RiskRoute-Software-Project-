// hooks/useSpeedFromLocation.js
import { useEffect, useRef, useState } from "react";

const MS_TO_KMH = 3.6;
const SPIKE_FILTER_KMH = 200;
const MIN_DT_SEC = 0.5;

const metresBetween = (a, b) => {
  const R = 6371000;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

export default function useSpeedFromLocation(location) {
  const [speedKmh, setSpeedKmh] = useState(0);
  const lastRef = useRef(null);

  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;

    const now = location.timestamp || Date.now();
    const nativeSpeed = location.speed;

    let kmh = 0;

    if (
      nativeSpeed != null &&
      nativeSpeed >= 0 &&
      nativeSpeed * MS_TO_KMH < SPIKE_FILTER_KMH
    ) {
      kmh = nativeSpeed * MS_TO_KMH;
    } else if (lastRef.current) {
      const dt = (now - lastRef.current.ts) / 1000;
      if (dt >= MIN_DT_SEC) {
        const distM = metresBetween(lastRef.current, {
          latitude: location.latitude,
          longitude: location.longitude,
        });
        kmh = (distM / dt) * MS_TO_KMH;
        if (kmh > SPIKE_FILTER_KMH) kmh = 0;
      }
    }

    lastRef.current = {
      latitude: location.latitude,
      longitude: location.longitude,
      ts: now,
    };

    setSpeedKmh(Math.max(0, Math.round(kmh)));
  }, [
    location?.latitude,
    location?.longitude,
    location?.speed,
    location?.timestamp,
  ]);

  return speedKmh;
}