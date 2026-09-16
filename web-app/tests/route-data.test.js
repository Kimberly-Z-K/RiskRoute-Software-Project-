import { describe, test, expect } from "vitest";

function processRouteData(route) {
  if (!route) {
    return null;
  }

  return {
    id: route.id,
    name: route.display_name,
    distance: Number(route.distance),
    duration: Number(route.duration),
    cost: Number(route.cost),
    delay: Number(route.delay),
  };
}

describe("4. Route data is processed", () => {
  test("processes route information correctly", () => {
    const route = {
      id: "route-19",
      display_name: "Johannesburg to Durban",
      distance: 570.29,
      duration: 333,
      cost: 950,
      delay: 3,
    };

    const result = processRouteData(route);

    expect(result.id).toBe("route-19");
    expect(result.name).toBe("Johannesburg to Durban");
    expect(result.distance).toBe(570.29);
    expect(result.duration).toBe(333);
    expect(result.cost).toBe(950);
    expect(result.delay).toBe(3);
  });
});