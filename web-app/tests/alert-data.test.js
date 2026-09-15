import { describe, test, expect } from "vitest";

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

describe("9. Alert data is handled", () => {
  test("processes valid alerts", () => {
    const alerts = [
      {
        id: "alert-1",
        type: "traffic",
        severity: "high",
        message:
          "Heavy traffic detected on selected route",
      },
    ];

    const result = processAlertData(alerts);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("alert-1");
    expect(result[0].severity).toBe("high");
    expect(result[0].message).toContain(
      "Heavy traffic"
    );
  });

  test("removes invalid alerts", () => {
    const alerts = [
      {
        id: "alert-1",
        severity: "high",
        message: "Traffic detected",
      },
      null,
      {},
      {
        severity: "medium",
        message: "Weather warning",
      },
    ];

    const result = processAlertData(alerts);

    expect(result).toHaveLength(2);
  });
});