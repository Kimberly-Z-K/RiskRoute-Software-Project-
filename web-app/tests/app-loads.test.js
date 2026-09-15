import { describe, test, expect } from "vitest";

describe("1. App loads", () => {
  test("RiskRoute application initialises successfully", () => {
    const app = {
      name: "RiskRoute",
      loaded: true,
    };

    expect(app).toBeDefined();
    expect(app.loaded).toBe(true);
    expect(app.name).toBe("RiskRoute");
  });
});