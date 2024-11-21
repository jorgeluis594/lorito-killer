"use client";

import { Order } from "@/order/types";
import { formatPrice, localizeDate } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface OrderItemProps {
  order: Order;
  correlative: string;
}

export default function OrderItem({ order, correlative }: OrderItemProps) {
  const path = usePathname();
  const href = `/dashboard/orders/${order.id}`;

  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors ${path == href ? "bg-gray-100" : ""}`}
    >
      <div>
        <div className="text-sm font-medium">
          {order.documentType === "receipt"
            ? "Boleta Electrónica"
            : order.documentType === "invoice"
              ? "Factura Electrónica"
              : "Nota de venta"}{" "}
          ({correlative})
        </div>
        <div className="text-xs text-gray-500">
          {localizeDate(order.createdAt!)}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">{formatPrice(order.total)}</div>
        <div
          className={`text-xs ${order.status == "cancelled" ? "text-destructive" : "text-gray-500"} text-end`}
        >
          {order.status == "cancelled" ? "Cancelado" : "Pagado"}
        </div>
      </div>
    </Link>
  );
}
