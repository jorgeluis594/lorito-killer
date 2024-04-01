import { NavItem } from "@/ui/types";

export const navItems: NavItem[] = [
  {
    title: "Productos",
    href: "/dashboard/products",
    icon: "blocks",
    label: "productos",
  },
  {
    title: "Crear pedido",
    href: "/dashboard/orders/new",
    icon: "shoppingCart",
    label: "nuevo pedido",
  },
  {
    title: "Pedidos",
    href: "/dashboard/orders",
    icon: "shoppingCart",
    label: "pedidos",
  },
];
