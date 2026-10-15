// Small pure helpers for stop-by-stop trip progress.
// progress looks like { 0: { status: "completed" }, 1: { status: "arrived" } }

export const STOP_DONE = ["completed", "skipped"];

// Index of the first stop that is not completed or skipped, or -1 when all are done.
export function nextStopIndex(stops, progress) {
  if (!Array.isArray(stops)) return -1;
  return stops.findIndex((_, i) => !STOP_DONE.includes(progress?.[i]?.status));
}

export function countDone(stops, progress) {
  if (!Array.isArray(stops)) return 0;
  return stops.filter((_, i) => STOP_DONE.includes(progress?.[i]?.status)).length;
}

export function stopStatusLabel(status, isCurrent) {
  if (status === "completed") return "Completed";
  if (status === "skipped") return "Skipped";
  if (status === "arrived") return "Arrived";
  return isCurrent ? "Next stop" : "Upcoming";
}

// react-native-maps pin colours
export function stopPinColor(status) {
  if (status === "completed") return "violet";
  if (status === "skipped") return "magenta";
  return "orange";
}

// Straight-line distance in metres between two {latitude, longitude} points.
export function metresBetween(a, b) {
  if (!a || !b) return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
