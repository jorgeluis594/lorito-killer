"use client";

import { Order } from "@/order/types";
import { formatPrice } from "@/lib/utils";

interface OrderItemProps {
  order: Order;
  isCurrent: boolean;
  onSelect: (order: Order) => void;
}

function localizeDate(data: Date) {
  return data.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderItem({
  order,
  onSelect,
  isCurrent,
}: OrderItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors ${isCurrent ? "bg-gray-100" : ""}`}
      onClick={() => onSelect(order)}
    >
      <div>
        <div className="text-sm font-medium">{order.id!.substring(0, 8)}</div>
        <div className="text-xs text-gray-500">
          {localizeDate(order.createdAt!)}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">{formatPrice(order.total)}</div>
        <div className="text-xs text-gray-500">{order.status}</div>
      </div>
    </div>
  );
}
