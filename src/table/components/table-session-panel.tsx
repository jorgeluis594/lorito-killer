"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Receipt, Ban, ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import { useRouter } from "next/navigation";
import type { TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";
import { TableStatusBadge } from "./table-status-badge";
import { SESSION_STATUS_LABELS } from "../constants";
import { requestBillAction, closeTable } from "../actions";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";

interface TableSessionPanelProps {
  table: TableWithSession;
}

export function TableSessionPanel({ table }: TableSessionPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const status = getTableDerivedStatus(table);
  const session = table.activeSession;

  const handleRequestBill = async () => {
    setLoading(true);
    const result = await requestBillAction(table.id);
    setLoading(false);
    if (result.success) {
      toast({ title: "Cuenta solicitada" });
      router.refresh();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    const reason = cancellationReason.trim();
    if (!reason) return;
    setLoading(true);
    const result = await closeTable(table.id, true, reason);
    setLoading(false);
    if (result.success) {
      toast({ title: "Sesion cancelada" });
      router.back();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleClose = async () => {
    setLoading(true);
    const result = await closeTable(table.id, false);
    setLoading(false);
    if (result.success) {
      toast({ title: "Mesa cerrada" });
      router.back();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            Mesa {table.label || table.number}
          </h1>
          <TableStatusBadge status={status} />
        </div>
      </div>

      {session && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {session.waiter?.name && (
              <div>
                <span className="text-muted-foreground">Mozo:</span>{" "}
                <span className="font-medium">{session.waiter.name}</span>
              </div>
            )}
            {session.guestCount && (
              <div>
                <span className="text-muted-foreground">Comensales:</span>{" "}
                <span className="font-medium">{session.guestCount}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Rondas:</span>{" "}
              <span className="font-medium">{session.currentRound}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>{" "}
              <span className="font-medium">
                {SESSION_STATUS_LABELS[session.status]}
              </span>
            </div>
          </div>

          {session.notes && (
            <p className="text-sm text-muted-foreground">
              Notas: {session.notes}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {session.status === "OPEN" && (
              <Button size="sm" className="gap-1" onClick={handleRequestBill} disabled={loading}>
                <Receipt className="h-3.5 w-3.5" />
                Pedir cuenta
              </Button>
            )}
            {session.status === "BILL_REQUESTED" && (
              <Button size="sm" className="gap-1" onClick={handleClose} disabled={loading}>
                Cerrar mesa
              </Button>
            )}
            {(session.status === "OPEN" || session.status === "BILL_REQUESTED") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="gap-1" disabled={loading}>
                    <Ban className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar sesión</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Indica el motivo antes de confirmar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="order-cancellation-reason" className="text-sm font-medium">
                      Motivo de cancelación
                    </label>
                    <Textarea
                      id="order-cancellation-reason"
                      value={cancellationReason}
                      onChange={(event) => setCancellationReason(event.target.value)}
                      maxLength={500}
                      required
                      placeholder="Describe el motivo (obligatorio)"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={loading || !cancellationReason.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancelar sesión
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
