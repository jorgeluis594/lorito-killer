import React from "react";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import { getSession } from "@/lib/auth";
import OrderItem from "@/order/components/order-item";

export default async function OrdersIndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const cashShiftResponse = await getLastOpenCashShift(session.user.id);

  return (
    <div className="h-[calc(100vh-theme(space.14))]">
      <div className="grid grid-cols-[380px_1fr] h-full">
        <div className="h-full border-r">
          {cashShiftResponse.success &&
            cashShiftResponse.data.orders.map((order) => (
              <OrderItem key={order.id} order={order} />
            ))}
        </div>
        <div className="h-full">{children}</div>
      </div>
    </div>
  );
}
