import React from "react";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import { getSession } from "@/lib/auth";
import OrderItem from "@/order/components/order-item";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { getMany } from "@/document/db_repository";
import { ArrayElement } from "@/lib/types";
import { correlative } from "@/document/utils";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

export default async function OrdersIndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.user) return <SignOutRedirection />;

  const cashShiftResponse = await getLastOpenCashShift(session.user.id);

  if (!cashShiftResponse.success) {
    return <div>No tienes una caja abierta</div>;
  }

  const documentsResponse = await getMany({
    companyId: session.user.companyId,
    orderId: cashShiftResponse.data.orders.map((order) => order.id!),
  });

  if (!documentsResponse.success) {
    return <p>Error cargando página, comuniquese con soporte</p>;
  }

  const documentMapper = documentsResponse.data.reduce<
    Record<string, ArrayElement<(typeof documentsResponse)["data"]>>
  >((acc, document) => {
    acc[document.orderId] = document;
    return acc;
  }, {});

  return (
    <ScrollArea>
      <div className="h-[calc(100vh-theme(space.14))]">
        <div className="grid grid-cols-[380px_1fr] h-full">
          <div className="h-full border-r">
            {cashShiftResponse.data.orders.map((order) => (
              <OrderItem
                key={order.id}
                order={order}
                correlative={correlative(documentMapper[order.id!])}
              />
            ))}
          </div>
          <div className="h-full">{children}</div>
        </div>
      </div>
    </ScrollArea>
  );
}
