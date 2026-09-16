import { describe, test, expect } from "vitest";

function processRouteData(route) {
  if (!route) {
    return null;
  }

  return {
    id: route.id,
    name: route.display_name,
  };
}

function processWeatherData(weather) {
  if (!weather) {
    return {
      condition: "unknown",
      riskMultiplier: 1,
    };
  }

  return {
    condition: weather.condition || "unknown",
    riskMultiplier: weather.riskMultiplier || 1,
  };
}

function processTrafficData(traffic) {
  if (!traffic) {
    return {
      level: "unknown",
      delay: 0,
    };
  }

  return {
    level: traffic.level || "unknown",
    delay: Number(traffic.delay || 0),
  };
}

function processAlertData(alerts) {
  if (!Array.isArray(alerts)) {
    return [];
  }

  return alerts.filter(
    (alert) =>
      alert &&
      alert.message &&
      alert.severity
  );
}

describe("10. Invalid/missing data is handled correctly", () => {
  test("handles missing route data", () => {
    expect(processRouteData(null)).toBeNull();
    expect(processRouteData(undefined)).toBeNull();
  });

  test("handles missing weather data", () => {
    const result = processWeatherData(null);

    expect(result.condition).toBe("unknown");
    expect(result.riskMultiplier).toBe(1);
  });

  test("handles missing traffic data", () => {
    const result = processTrafficData(undefined);

    expect(result.level).toBe("unknown");
    expect(result.delay).toBe(0);
  });

  test("handles invalid alert data", () => {
    expect(processAlertData(null)).toEqual([]);
    expect(processAlertData(undefined)).toEqual([]);
    expect(processAlertData("invalid")).toEqual([]);
  });

  test("handles an empty alert array", () => {
    expect(processAlertData([])).toEqual([]);
  });
});