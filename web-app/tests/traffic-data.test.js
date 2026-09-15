import { describe, test, expect } from "vitest";

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

describe("8. Traffic data is handled", () => {
  test("handles heavy traffic", () => {
    const result = processTrafficData({
      level: "heavy",
      delay: 15,
    });

    expect(result.level).toBe("heavy");
    expect(result.delay).toBe(15);
  });

  test("handles missing traffic data", () => {
    const result = processTrafficData(null);

    expect(result.level).toBe("unknown");
    expect(result.delay).toBe(0);
  });
});