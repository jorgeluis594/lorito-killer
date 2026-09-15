"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Printer } from "lucide-react";
import type { UserRole } from "@/authorization/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/components/ui/use-toast";
import { useRealtime } from "@/lib/realtime/hooks/use-realtime";
import {
  checkKitchenPrintersAction,
  getKitchenTicketsRequiringAction,
  printKitchenTicketAction,
  reprintKitchenTicketAction,
} from "../actions";
import type { KitchenPrinterAttention, KitchenTicketView } from "../types";

type KitchenEvents = {
  "printer-inventory-updated": Record<string, never>;
  "print-job-changed": Record<string, never>;
};

type KitchenAlertEvents = { "print-job-failed": Record<string, never> };

type TableEvents = {
  "table-session-changed": { tableId: string; sessionStatus: string };
  "order-item-cancelled": { orderItemId: string };
};

const reasonLabel = (ticket: KitchenTicketView) =>
  ticket.attentionReason === "NO_PRINTER_CONFIGURED"
    ? "Sin impresora configurada"
    : ticket.attentionReason === "NOT_PRINTED"
      ? "Pendiente de impresión"
      : "Falló la impresión";

export function KitchenAttentionPanel({
  userId,
  role,
}: {
  userId: string;
  role: UserRole;
}) {
  const canReadTickets = role === "ADMIN" || role === "WAITER";
  const realtime = useRealtime<KitchenEvents>("kitchen");
  const alertRealtime = useRealtime<KitchenAlertEvents>(
    role === "ADMIN" ? "kitchen-admin" : `kitchen-user-${userId}`,
  );
  const tableRealtime = useRealtime<TableEvents>("tables");
  const { toast } = useToast();
  const [printers, setPrinters] = useState<KitchenPrinterAttention[]>([]);
  const [tickets, setTickets] = useState<KitchenTicketView[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  const refreshPrinters = useCallback(async () => {
    const result = await checkKitchenPrintersAction();
    if (result.success) setPrinters(result.data);
  }, []);

  const refreshTickets = useCallback(async () => {
    if (!canReadTickets) return;
    setLoading(true);
    const result = await getKitchenTicketsRequiringAction();
    if (result.success) setTickets(result.data);
    setLoading(false);
  }, [canReadTickets]);

  useEffect(() => {
    void checkKitchenPrintersAction().then((result) => {
      if (result.success) setPrinters(result.data);
    });
  }, []);

  useEffect(() => {
    const inventory = realtime.on("printer-inventory-updated", refreshPrinters);
    const changed = realtime.on("print-job-changed", refreshTickets);
    const failed = alertRealtime.on("print-job-failed", () => {
      toast({
        title: "Una comanda requiere atención",
        description: "Abre impresiones pendientes para revisarla.",
        variant: "destructive",
      });
      void refreshTickets();
    });
    const session = tableRealtime.on("table-session-changed", refreshTickets);
    const cancellation = tableRealtime.on(
      "order-item-cancelled",
      refreshTickets,
    );
    return () => {
      inventory();
      changed();
      failed();
      session();
      cancellation();
    };
  }, [
    realtime,
    alertRealtime,
    refreshPrinters,
    refreshTickets,
    tableRealtime,
    toast,
  ]);

  async function requestPrint(ticket: KitchenTicketView) {
    setPrinting(ticket.id);
    const action = ticket.canPrint
      ? printKitchenTicketAction
      : reprintKitchenTicketAction;
    const result = await action({
      kitchenTicketId: ticket.id,
      jobId: crypto.randomUUID(),
    });
    if (!result.success)
      toast({
        title: "No se pudo imprimir",
        description: result.message,
        variant: "destructive",
      });
    await refreshTickets();
    setPrinting(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {printers.length ? (
        <Alert>
          <AlertTriangle aria-hidden />
          <AlertTitle>Revisa las impresoras</AlertTitle>
          <AlertDescription>
            {printers.map(({ id, name, reason }) => (
              <p key={id}>
                {name}:{" "}
                {reason === "MISSING_FROM_INVENTORY"
                  ? "no apareció en el último inventario"
                  : "actividad desactualizada"}
                .
              </p>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}

      {canReadTickets ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) void refreshTickets();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="self-end">
              <Printer data-icon="inline-start" aria-hidden />
              Impresiones pendientes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Impresiones pendientes</DialogTitle>
              <DialogDescription>
                Comandas vigentes que no se imprimieron o terminaron con error.
              </DialogDescription>
            </DialogHeader>
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" aria-hidden /> Cargando
                comandas…
              </p>
            ) : tickets.length ? (
              <div className="flex flex-col gap-3">
                {tickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">
                          {ticket.order.label} · {ticket.kitchen.name}
                        </p>
                        <Badge
                          variant={
                            ticket.attentionReason === "FAILED"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {reasonLabel(ticket)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ronda {ticket.round.number}
                      </p>
                    </div>
                    {ticket.canPrint || ticket.canReprint ? (
                      <Button
                        onClick={() => void requestPrint(ticket)}
                        disabled={printing !== null}
                      >
                        {printing === ticket.id ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : null}
                        {ticket.canPrint ? "Imprimir" : "Reimprimir"}
                      </Button>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No hay comandas que requieran atención.
              </p>
            )}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
