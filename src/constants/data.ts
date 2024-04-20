import { NavItem } from "@/ui/types";

export const navItems: NavItem[] = [
  {
    title: "Crear pedido",
    href: "/dashboard/orders/new",
    icon: "shoppingCart",
    label: "nuevo pedido",
  },
  {
    title: "Lista de pedidos",
    href: "/dashboard/orders",
    icon: "receipt",
    label: "pedidos",
  },
  {
    title: "Caja chica",
    href: "/dashboard/cash_shifts",
    icon: "cashRegister",
    label: "caja chica",
  },
  {
    title: "Productos",
    href: "/dashboard/products",
    icon: "blocks",
    label: "productos",
  },
];
