import Link from "next/link";
import { requireRole } from "@/authorization/server";
import { loadTablePayment } from "@/table/payment-actions";
import { TablePaymentView } from "@/table/components/table-payment-view";

export default async function DeliveryPaymentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [route, auth] = await Promise.all([
    params,
    requireRole("ADMIN", "WAITER", "CASHIER"),
  ]);
  if (!auth.success)
    return (
      <p role="alert" className="p-6">
        {auth.message}
      </p>
    );
  const result = await loadTablePayment({ sessionId: route.sessionId });
  if (!result.success || result.data.tableId)
    return (
      <main className="flex flex-col gap-4 p-6">
        <h1 className="text-xl font-bold">Cobro del pedido</h1>
        <p role="alert">
          {result.success ? "Este pedido no existe." : result.message}
        </p>
        <Link href="/dashboard/tables" className="underline">
          Volver a mesas
        </Link>
      </main>
    );
  return (
    <TablePaymentView
      key={result.data.sessionId}
      initialData={result.data}
      canCollectCash={auth.data.role !== "WAITER"}
    />
  );
}
