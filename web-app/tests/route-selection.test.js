import { describe, test, expect } from "vitest";

function selectRoute(routes, routeId) {
  if (!Array.isArray(routes)) {
    return null;
  }

  return (
    routes.find((route) => route.id === routeId) ||
    null
  );
}

describe("5. Route selection works", () => {
  const routes = [
    {
      id: "route-19",
      display_name: "Johannesburg to Durban",
    },
    {
      id: "route-18",
      display_name: "OR Tambo to Sandton",
    },
  ];

  test("selects the correct route", () => {
    const selected = selectRoute(routes, "route-18");

    expect(selected).not.toBeNull();
    expect(selected.id).toBe("route-18");
    expect(selected.display_name).toBe(
      "OR Tambo to Sandton"
    );
  });

  test("returns null for a route that does not exist", () => {
    const selected = selectRoute(
      routes,
      "route-999"
    );

    expect(selected).toBeNull();
  });
});