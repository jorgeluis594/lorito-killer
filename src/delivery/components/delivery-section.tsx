"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bike,
  Check,
  ChefHat,
  ChevronRight,
  CircleDashed,
  Clock,
  Loader2,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/ui/use-toast";
import { cn, formatPrice } from "@/lib/utils";
import type { TableSession } from "@/table/types";
import { closeServiceSessionAction } from "@/table/actions";
import { deliverDelivery, dispatchDelivery, openDelivery } from "../actions";
import { DeliverySheet } from "./delivery-sheet";
import {
  describeServiceSession,
  sortServiceSessions,
  type ServiceAction,
  type ServiceStage,
} from "../use-cases/describe-service-session";
import { isDeliveryOverdue } from "../use-cases/is-delivery-overdue";

const stages: Record<ServiceStage, { label: string; icon: LucideIcon }> = {
  EMPTY: { label: "Sin productos", icon: CircleDashed },
  PREPARING: { label: "Preparando", icon: ChefHat },
  ON_THE_WAY: { label: "En camino", icon: Bike },
  READY: { label: "Listo para recoger", icon: ShoppingBag },
  DELIVERED: { label: "Entregado", icon: PackageCheck },
};

const actions: Record<ServiceAction, { label: string; icon: LucideIcon }> = {
  TAKE_ORDER: { label: "Tomar pedido", icon: ChevronRight },
  DISPATCH: { label: "Despachar", icon: Bike },
  DELIVER: { label: "Entregado", icon: PackageCheck },
  CHARGE: { label: "Cobrar", icon: ReceiptText },
};

const timeFormat = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Lima",
});

/** Minutos transcurridos, refrescados cada minuto. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

export function DeliverySection({
  sessions,
  canAttend,
}: {
  sessions: TableSession[];
  canAttend: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const now = useNow();
  const [pending, setPending] = useState<string | null>(null);
  const pendingRef = useRef(false);
  if (!sessions.length) return null;

  async function run(session: TableSession, action: ServiceAction) {
    const orderHref = `/dashboard/tables/delivery/${session.id}`;
    if (action === "TAKE_ORDER") return router.push(`${orderHref}/order`);
    if (action === "CHARGE") return router.push(`${orderHref}/payment`);
    if (pendingRef.current || !session.orderId) return;
    pendingRef.current = true;
    setPending(session.id);
    try {
      const result = !session.delivery
        ? await closeServiceSessionAction(session.id)
        : await (action === "DISPATCH" ? dispatchDelivery : deliverDelivery)({
            orderId: session.orderId,
          });
      if (!result.success) {
        toast({
          title: "No se pudo actualizar el pedido",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      const closed =
        !session.delivery || ("closed" in result.data && result.data.closed);
      toast({
        title:
          action === "DISPATCH"
            ? "Pedido en camino"
            : closed
              ? "Pedido entregado y cerrado"
              : "Pedido entregado · falta cobrar",
      });
      router.refresh();
    } catch {
      toast({
        title: "No se recibió la respuesta",
        description: "Revisa el estado del pedido antes de reintentar.",
        variant: "destructive",
      });
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="delivery-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="delivery-heading" className="text-lg font-bold">
          Delivery y para llevar{" "}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {sessions.length}
          </span>
        </h2>
        <Link
          href="/dashboard/tables/delivery"
          className="flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Entregados hoy
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
        aria-label="Pedidos activos"
      >
        {sortServiceSessions(sessions).map((session) => {
          const { stage, action } = describeServiceSession(session);
          const delivery = session.delivery;
          const paid = session.paymentStatus === "PAID";
          const Stage = stages[stage].icon;
          const Action = actions[action].icon;
          const dispatchedAt = delivery?.dispatchedAt
            ? new Date(delivery.dispatchedAt)
            : null;
          const minutes = dispatchedAt
            ? Math.max(0, Math.floor((now - dispatchedAt.getTime()) / 60_000))
            : null;
          const overdue =
            !!delivery &&
            isDeliveryOverdue(
              { status: delivery.status, dispatchedAt },
              new Date(now),
            );
          const title = delivery
            ? delivery.name || delivery.phone
            : "Para llevar";
          const subtitle = delivery
            ? delivery.name
              ? delivery.phone
              : null
            : `Desde las ${timeFormat.format(new Date(session.openedAt))}`;
          const actionDisabled =
            pending !== null ||
            (!canAttend && action !== "CHARGE" && action !== "TAKE_ORDER");
          return (
            <li
              key={session.id}
              className="relative flex w-[82%] max-w-80 shrink-0 snap-start flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/60 sm:w-auto sm:max-w-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/tables/delivery/${session.id}/order`}
                    className="font-bold break-words after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                  >
                    {title}
                  </Link>
                  {subtitle ? (
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums">
                  {formatPrice(session.total ?? 0)}
                </span>
              </div>
              {delivery ? (
                <p className="line-clamp-2 text-sm break-words">
                  {delivery.address}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
                    overdue
                      ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                      : stage === "EMPTY"
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {overdue ? (
                    <Clock className="size-3.5" aria-hidden />
                  ) : (
                    <Stage className="size-3.5" aria-hidden />
                  )}
                  {stages[stage].label}
                  {minutes !== null && stage === "ON_THE_WAY" ? (
                    <span className="tabular-nums" suppressHydrationWarning>
                      · {minutes} min{overdue ? " · atrasado" : ""}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
                    paid
                      ? "border-transparent bg-lavender text-lavender-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {paid ? <Check className="size-3.5" aria-hidden /> : null}
                  {paid ? "Cobrado" : "Sin cobrar"}
                </span>
              </div>
              <Button
                variant={action === "TAKE_ORDER" ? "outline" : "default"}
                className="relative z-10 mt-auto min-h-11 w-full gap-2"
                disabled={actionDisabled}
                onClick={() => void run(session, action)}
                aria-label={`${actions[action].label}: ${title}`}
              >
                {pending === session.id ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Action aria-hidden />
                )}
                {actions[action].label}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "+ Delivery" abre la hoja; "Para llevar" crea el pedido y va a tomarlo. */
export function NewServiceButtons({ lastFee }: { lastFee: number | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function openTakeAway() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await openDelivery(null);
      if (!result.success) {
        toast({
          title: "No se pudo crear el pedido",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      router.push(`/dashboard/tables/delivery/${result.data.sessionId}/order`);
    } catch {
      toast({
        title: "No se recibió la respuesta",
        description: "Revisa la conexión y vuelve a intentarlo.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => void openTakeAway()}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <ShoppingBag aria-hidden />
        )}
        Para llevar
      </Button>
      <DeliverySheet defaultFee={lastFee} />
    </div>
  );
}
