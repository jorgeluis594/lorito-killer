export const USER_ROLES = [
  "ADMIN",
  "CASHIER",
  "WAITER",
  "KITCHEN",
  "BARTENDER",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RESOURCES = [
  "users",
  "products",
  "categories",
  "orders",
  "payments",
  "cash_shifts",
  "tables",
  "kitchen",
  "reports",
  "company",
  "customers",
  "stock",
  "delivery",
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "export",
] as const;
export type Action = (typeof ACTIONS)[number];

export type PermissionMap = Record<
  UserRole,
  Partial<Record<Resource, readonly Action[]>>
>;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  CASHIER: "Cajero",
  WAITER: "Mozo",
  KITCHEN: "Cocinero",
  BARTENDER: "Bartender",
};
