import { describe, test, expect } from "vitest";

function processWeatherData(weather) {
  if (!weather) {
    return {
      condition: "unknown",
      riskMultiplier: 1,
    };
  }

  return {
    condition: weather.condition || "unknown",
    temperature: weather.temperature ?? null,
    riskMultiplier: weather.riskMultiplier || 1,
  };
}

describe("7. Weather data is handled", () => {
  test("handles rainy weather", () => {
    const result = processWeatherData({
      condition: "rain",
      temperature: 18,
      riskMultiplier: 1.4,
    });

    expect(result.condition).toBe("rain");
    expect(result.temperature).toBe(18);
    expect(result.riskMultiplier).toBe(1.4);
  });

  test("handles missing weather data", () => {
    const result = processWeatherData(null);

    expect(result.condition).toBe("unknown");
    expect(result.riskMultiplier).toBe(1);
  });
});