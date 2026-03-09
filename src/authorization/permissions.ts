import type { PermissionMap } from "./types";

export const permissions = {
  ADMIN: {
    users: ["create", "read", "update", "delete"],
    products: ["create", "read", "update", "delete", "export"],
    categories: ["create", "read", "update", "delete"],
    orders: ["create", "read", "update", "delete"],
    payments: ["create", "read"],
    cash_shifts: ["create", "read", "update"],
    tables: ["create", "read", "update", "delete"],
    kitchen: ["read", "update"],
    reports: ["read", "export"],
    company: ["read", "update"],
    customers: ["create", "read", "update"],
    stock: ["create", "read", "update"],
    delivery: ["create", "read", "update"],
  },

  CASHIER: {
    products: ["read"],
    categories: ["read"],
    orders: ["create", "read", "update", "delete"],
    payments: ["create", "read"],
    cash_shifts: ["create", "read", "update"],
    tables: ["read"],
    customers: ["create", "read", "update"],
    delivery: ["create", "read", "update"],
  },

  WAITER: {
    products: ["read"],
    categories: ["read"],
    orders: ["create", "read"],
    tables: ["read", "update"],
  },

  KITCHEN: {
    kitchen: ["read", "update"],
  },

  BARTENDER: {
    kitchen: ["read", "update"],
  },
} as const satisfies PermissionMap;
