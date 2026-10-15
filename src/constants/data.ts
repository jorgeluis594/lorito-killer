import { NavItem } from "@/ui/types";

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    label: "dashboard",
    permission: { resource: "reports", action: "read" },
  },
  {
    title: "Nueva venta",
    href: "/dashboard/orders/new",
    icon: "shoppingCart",
    label: "nuevo pedido",
    permission: { resource: "orders", action: "create" },
  },
  {
    title: "Ventas",
    href: "/dashboard/sales_reports",
    icon: "receipt",
    label: "ventas",
    permission: { resource: "reports", action: "read" },
  },
  {
    title: "Caja chica",
    href: "/dashboard/cash_shifts",
    icon: "cashRegister",
    label: "caja chica",
    permission: { resource: "cash_shifts", action: "read" },
  },
  {
    title: "Productos",
    href: "/dashboard/products",
    icon: "blocks",
    label: "productos",
    permission: { resource: "products", action: "create" },
  },
  {
    title: "Mesas",
    href: "/dashboard/tables",
    icon: "tables",
    label: "mesas",
    permission: { resource: "tables", action: "read" },
    feature: "restaurants",
  },
  {
    title: "Movimientos de stock",
    href: "/dashboard/stock_adjustments",
    icon: "stock_adjustments",
    label: "movimientos de stock",
    permission: { resource: "stock", action: "read" },
  },
];
