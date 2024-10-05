"use client";

import { Order } from "@/order/types";
import { formatPrice, localizeDate } from "@/lib/utils";

interface OrderItemProps {
  order: Order;
  isCurrent: boolean;
  onSelect: (order: Order) => void;
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
        <div className="text-sm font-medium">{order.documentType === "receipt" ? "Boleta Electrónica" :
          order.documentType === "invoice" ? "Factura Electrónica" :
            "Nota de venta"} ({order.id!.substring(0, 8)})</div>
        <div className="text-xs text-gray-500">
          {localizeDate(order.createdAt!)}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">{formatPrice(order.total)}</div>
        <div className="text-xs text-gray-500 text-end">Pagado</div>
      </div>
    </div>
  );
}
