import { useEffect, useRef, useState } from "react";

const HARD_BRAKING_MS2 = 3.5;             
const HARD_BRAKING_MIN_DROP_KMH = 15;     
const HARD_BRAKING_MIN_FROM_KMH = 20;     
const HARD_BRAKING_COOLDOWN_MS = 15000;   
const MIN_DT_SEC = 0.3;                   
const MAX_DT_SEC = 15;                    

export default function useHardBraking({ speedKmh, timestamp, enabled = true }) {
  const [event, setEvent] = useState(null);
  const lastRef = useRef(null);
  const lastEventAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (speedKmh == null) return;

    const now = timestamp || Date.now();

    if (lastRef.current) {
      const dtSec = (now - lastRef.current.ts) / 1000;

      if (dtSec >= MIN_DT_SEC && dtSec <= MAX_DT_SEC) {
        const dropKmh = lastRef.current.kmh - speedKmh;
        const decelMs2 = dropKmh / 3.6 / dtSec;

        const isHard =
          decelMs2 >= HARD_BRAKING_MS2 &&
          dropKmh >= HARD_BRAKING_MIN_DROP_KMH &&
          lastRef.current.kmh >= HARD_BRAKING_MIN_FROM_KMH &&
          now - lastEventAtRef.current >= HARD_BRAKING_COOLDOWN_MS;

        if (isHard) {
          lastEventAtRef.current = now;
          setEvent({
            fromKmh: Math.round(lastRef.current.kmh),
            toKmh: Math.round(speedKmh),
            decelMs2: Number(decelMs2.toFixed(2)),
            ts: now,
          });
        }
      }
    }

    lastRef.current = { kmh: speedKmh, ts: now };
  }, [speedKmh, timestamp, enabled]);

  const clear = () => setEvent(null);

  return { event, clear };
}