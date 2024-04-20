"use client";
import { useState } from "react";
import { Order } from "@/order/types";
import OrderItem from "./order-item";
import OrderData from "./order-data";
import { useCashShiftStore } from "@/cash-shift/components/cash-shift-store-provider";
import CashShiftIsNotOpen from "@/cash-shift/components/cash-shift-is-not-open";

export default function OrderList() {
  const { cashShift, isLoading } = useCashShiftStore((state) => state);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (!cashShift) {
    return !isLoading && <CashShiftIsNotOpen />;
  }

  return (
    <>
      <div className="h-full border-r">
        {cashShift.orders.map((order) => (
          <OrderItem
            key={order.id}
            order={order}
            isCurrent={selectedOrder?.id === order.id}
            onSelect={setSelectedOrder}
          />
        ))}
      </div>
      {!cashShift.orders.length && <p>Aún no hay ventas</p>}
      {selectedOrder && <OrderData order={selectedOrder} />}
    </>
  );
}
