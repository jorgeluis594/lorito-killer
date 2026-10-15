import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/authorization/server";
import { hasPermission } from "@/authorization/helpers";
import { findSessionById } from "@/table/db_repository";
import { TableOrderView } from "@/table/components/table-order-view";
import { getKitchenTickets } from "@/kitchen/use-cases/get-kitchen-tickets";
import { findKitchenTickets } from "@/kitchen/db_repository";
import { DeliverySheet } from "@/delivery/components/delivery-sheet";
import { Button } from "@/shared/components/ui/button";

interface PageProps {
  params: Promise<{ subdomain: string; sessionId: string }>;
}

async function DeliveryOrderContent({ sessionId }: { sessionId: string }) {
  const auth = await requirePermission("tables", "read");
  if (!auth.success) {
    return <p className="p-4 text-destructive">{auth.message}</p>;
  }
  const result = await findSessionById(sessionId, auth.data.companyId);
  if (!result.success || result.data.tableId || !result.data.current) {
    return (
      <div className="flex flex-col items-start gap-4 p-6">
        <p>
          {result.success
            ? "Este pedido ya se cerró."
            : "No encontramos este pedido."}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/tables">Volver a mesas</Link>
        </Button>
      </div>
    );
  }
  const session = result.data;
  const delivery = session.delivery;
  const canEdit = hasPermission(auth.data.role, "tables", "update");
  const tickets = session.orderId
    ? await getKitchenTickets(
        {
          companyId: auth.data.companyId,
          userId: auth.data.id,
          role: auth.data.role,
          orderId: session.orderId,
        },
        findKitchenTickets,
      )
    : { success: true as const, data: [] };

  return (
    <TableOrderView
      key={session.id}
      session={session}
      title={
        delivery
          ? `Delivery · ${delivery.name || delivery.phone}`
          : "Para llevar"
      }
      details={
        <p className="line-clamp-2 text-xs text-muted-foreground break-words">
          {delivery
            ? [
                delivery.name ? delivery.phone : null,
                delivery.address,
                delivery.reference,
              ]
                .filter(Boolean)
                .join(" · ")
            : "Toma de pedido"}
        </p>
      }
      headerAction={
        delivery && canEdit && session.orderId && session.orderVersion ? (
          <DeliverySheet
            edit={{
              orderId: session.orderId,
              orderVersion: session.orderVersion,
              feeLocked: session.paymentStatus === "PAID",
              values: delivery,
            }}
          />
        ) : null
      }
      paymentHref={`/dashboard/tables/delivery/${session.id}/payment`}
      canEdit={canEdit}
      kitchenTickets={tickets.success ? tickets.data : []}
    />
  );
}

export default async function DeliveryOrderPage(props: PageProps) {
  const params = await props.params;
  return (
    <div className="min-h-dvh">
      <Suspense
        fallback={
          <div className="space-y-4 p-4">
            <div className="h-10 w-48 animate-pulse rounded bg-muted" />
            <div className="h-60 animate-pulse rounded bg-muted" />
          </div>
        }
      >
        <DeliveryOrderContent sessionId={params.sessionId} />
      </Suspense>
    </div>
  );
}
