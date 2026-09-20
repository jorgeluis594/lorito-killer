import { describe, expect, test } from "vitest";
import { getDefaultRouteForRole } from "../default-route";

describe("getDefaultRouteForRole", () => {
  test.for([
    { role: "ADMIN", expected: "/dashboard" },
    { role: "CASHIER", expected: "/dashboard/orders/new" },
    { role: "SELLER", expected: "/dashboard/orders/new" },
    { role: "WAITER", expected: "/dashboard/orders/new" },
    { role: "KITCHEN", expected: "/dashboard/tables" },
    { role: "BARTENDER", expected: "/dashboard/tables" },
  ] as const)("maps $role to $expected", ({ role, expected }) => {
    expect(getDefaultRouteForRole(role)).toBe(expected);
  });

  test.for([undefined, null, "", "MANAGER", 42, {}])(
    "falls back to /login for invalid role %j",
    (role) => {
      expect(getDefaultRouteForRole(role)).toBe("/login");
    },
  );
});
