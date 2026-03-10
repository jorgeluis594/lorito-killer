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

interface TableSessionPanelProps {
  table: TableWithSession;
}

export function TableSessionPanel({ table }: TableSessionPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    const result = await closeTable(table.id, true);
    setLoading(false);
    if (result.success) {
      toast({ title: "Sesion cancelada" });
      router.push(`/dashboard/tables`);
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
      router.push(`/dashboard/tables`);
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
            onClick={() => router.push(`/dashboard/tables`)}
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
              <>
                <Button size="sm" className="gap-1" onClick={handleRequestBill} disabled={loading}>
                  <Receipt className="h-3.5 w-3.5" />
                  Pedir cuenta
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={handleCancel} disabled={loading}>
                  <Ban className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </>
            )}
            {session.status === "BILL_REQUESTED" && (
              <>
                <Button size="sm" className="gap-1" onClick={handleClose} disabled={loading}>
                  Cerrar mesa
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={handleCancel} disabled={loading}>
                  <Ban className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
