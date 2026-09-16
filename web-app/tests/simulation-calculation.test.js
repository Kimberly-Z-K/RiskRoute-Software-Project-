import { describe, test, expect } from "vitest";

function calculateSimulation(route, weather, traffic) {
  if (!route) {
    return null;
  }

  const weatherMultiplier =
    weather?.riskMultiplier || 1;

  const trafficDelay =
    traffic?.delay || 0;

  const adjustedDuration =
    Number(route.duration) +
    Number(route.delay || 0) +
    Number(trafficDelay);

  const riskScore = Math.min(
    100,
    Math.round(
      Number(route.delay || 0) *
        5 *
        weatherMultiplier +
        trafficDelay
    )
  );

  return {
    duration: adjustedDuration,
    riskScore,
  };
}

describe("6. Simulation calculation works", () => {
  test("calculates adjusted duration", () => {
    const route = {
      duration: 333,
      delay: 3,
    };

    const weather = {
      riskMultiplier: 1.4,
    };

    const traffic = {
      delay: 15,
    };

    const result = calculateSimulation(
      route,
      weather,
      traffic
    );

    expect(result).not.toBeNull();

    expect(result.duration).toBe(351);
  });

  test("produces a valid risk score", () => {
    const result = calculateSimulation(
      {
        duration: 333,
        delay: 3,
      },
      {
        riskMultiplier: 1.4,
      },
      {
        delay: 15,
      }
    );

    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
});