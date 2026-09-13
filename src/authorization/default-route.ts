import { USER_ROLES, type UserRole } from "./types";

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  ADMIN: "/dashboard",
  CASHIER: "/dashboard/orders/new",
  SELLER: "/dashboard/orders/new",
  WAITER: "/dashboard/orders/new",
  KITCHEN: "/dashboard/kitchen",
  BARTENDER: "/dashboard/kitchen",
};

export function getDefaultRouteForRole(role: unknown): string {
  if (!USER_ROLES.includes(role as UserRole)) {
    return "/login";
  }

  return DEFAULT_ROUTE_BY_ROLE[role as UserRole];
}
