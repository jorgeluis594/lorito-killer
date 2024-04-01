"use client";
import { useEffect, useState } from "react";
import { getOrders } from "@/order/api_repository";
import { Order } from "@/order/types";
import OrderItem from "./order-item";

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    getOrders().then((response) => {
      if (response.success) {
        setOrders(response.data);
      } else {
        alert(response.message);
      }
    });
  }, []);

  return (
    <>
      <div className="h-full border-r">
        {orders.map((order) => (
          <OrderItem
            key={order.id}
            order={order}
            onSelect={(order: Order) => console.log(order)}
          />
        ))}
      </div>
      <div>Wey</div>
    </>
  );
}
