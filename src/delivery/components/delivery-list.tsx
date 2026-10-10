import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import type { DeliveryListItem } from "../db_repository";

const STATUS_LABELS = {
  PENDING: "Pendiente",
  DISPATCHED: "Despachado",
  DELIVERED: "Entregado",
} as const;

export default function DeliveryList({ items }: { items: DeliveryListItem[] }) {
  if (items.length === 0)
    return (
      <p className="py-8 text-center text-muted-foreground">
        No hay pedidos con estos filtros.
      </p>
    );
  return (
    <ul className="grid gap-3" aria-label="Pedidos de Delivery">
      {items.map((item) => (
        <li key={item.orderId}>
          <Link
            href={`/dashboard/orders/${item.orderId}`}
            className={`block rounded-lg border p-3 hover:bg-accent ${
              item.isOverdue
                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 font-medium break-words">
                {item.name}
              </span>
              <span className="font-semibold">{formatPrice(item.total)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground break-words">
              {item.address} · {item.phone}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{STATUS_LABELS[item.status]}</Badge>
              <Badge variant="outline">
                {item.paymentStatus === "PAID" ? "Cobrado" : "Sin cobrar"}
              </Badge>
              {item.isOverdue && (
                <Badge className="bg-amber-500 text-black hover:bg-amber-500">
                  Atrasado · en la calle desde las{" "}
                  {formatInTimeZone(
                    new Date(item.dispatchedAt!),
                    "America/Lima",
                    "HH:mm",
                  )}
                </Badge>
              )}
              <span className="text-muted-foreground">
                {formatInTimeZone(
                  new Date(item.createdAt),
                  "America/Lima",
                  "HH:mm",
                )}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
