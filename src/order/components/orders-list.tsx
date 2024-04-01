"use client";
import { useEffect, useState } from "react";
import { getOrders } from "@/order/api_repository";
import { Order } from "@/order/types";
import OrderItem from "./order-item";

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    getOrders().then((response) => {
      if (response.success) {
        setOrders(response.data);
      } else {
        alert(response.message);
      }
    });
  }, []);

  const onSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  return (
    <>
      <div className="h-full border-r">
        {orders.map((order) => (
          <OrderItem
            key={order.id}
            order={order}
            isCurrent={selectedOrder?.id === order.id}
            onSelect={onSelectOrder}
          />
        ))}
      </div>
      <div>Wey</div>
    </>
  );
}
