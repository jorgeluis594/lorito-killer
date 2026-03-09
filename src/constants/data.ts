import { NavItem } from "@/ui/types";

export const navItems: NavItem[] = [
  {
    title: "Nueva venta",
    href: "/dashboard/orders/new",
    icon: "shoppingCart",
    label: "nuevo pedido",
    permission: { resource: "orders", action: "create" },
  },
  {
    title: "Comprobantes de venta",
    href: "/dashboard/orders",
    icon: "receipt",
    label: "pedidos",
    permission: { resource: "orders", action: "read" },
  },
  {
    title: "Reporte de ventas",
    href: "/dashboard/sales_reports",
    icon: "salesReports",
    label: "reporte de ventas",
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
    title: "Movimientos de stock",
    href: "/dashboard/stock_adjustments",
    icon: "stock_adjustments",
    label: "movimientos de stock",
    permission: { resource: "stock", action: "read" },
  },
];
