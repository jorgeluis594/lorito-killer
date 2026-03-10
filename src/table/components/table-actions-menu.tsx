"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import {
  DoorOpen,
  Receipt,
  X,
  UserRoundPlus,
  UtensilsCrossed,
  Ban,
} from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import type { TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";
import { TableStatusBadge } from "./table-status-badge";
import {
  openTable,
  closeTable,
  requestBillAction,
  transferTableAction,
} from "../actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface TableActionsMenuProps {
  table: TableWithSession;
  waiters: Array<{ id: string; name: string | null }>;
  subdomain?: string;
  open: boolean;
  onClose: () => void;
  onAction: () => void;
}

export function TableActionsMenu({
  table,
  waiters,
  open,
  onClose,
  onAction,
}: TableActionsMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transferWaiterId, setTransferWaiterId] = useState<string>("");
  const status = getTableDerivedStatus(table);
  const session = table.activeSession;

  const handleOpen = async () => {
    setLoading(true);
    const result = await openTable(table.id);
    setLoading(false);
    if (result.success) {
      toast({ title: `Mesa ${table.number} abierta` });
      onAction();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
    }
  };

  const hasOrderItems = session?.currentRound !== undefined && session.currentRound > 0;

  const handleRequestBill = async () => {
    setLoading(true);
    const result = await requestBillAction(table.id);
    setLoading(false);
    if (result.success) {
      toast({ title: "Cuenta solicitada" });
      onAction();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
    }
  };

  const handleClose = async (cancelled: boolean) => {
    setLoading(true);
    const result = await closeTable(table.id, cancelled);
    setLoading(false);
    if (result.success) {
      toast({ title: cancelled ? "Sesion cancelada" : "Mesa cerrada" });
      onAction();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
    }
  };

  const handleTransfer = async () => {
    if (!transferWaiterId) return;
    setLoading(true);
    const result = await transferTableAction(table.id, transferWaiterId);
    setLoading(false);
    if (result.success) {
      toast({ title: "Mesa transferida" });
      onAction();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
    }
  };

  const handleGoToOrder = () => {
    router.push(`/dashboard/tables/${table.id}/order`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Mesa {table.label || table.number}
            <TableStatusBadge status={status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {status === "AVAILABLE" && (
            <Button
              className="w-full justify-start gap-2"
              onClick={handleOpen}
              disabled={loading}
            >
              <DoorOpen className="h-4 w-4" />
              Abrir mesa
            </Button>
          )}

          {status === "OCCUPIED" && (
            <>
              <Button
                className="w-full justify-start gap-2"
                onClick={handleGoToOrder}
              >
                <UtensilsCrossed className="h-4 w-4" />
                Tomar pedido
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={handleRequestBill}
                disabled={loading || !hasOrderItems}
                title={!hasOrderItems ? "Agrega productos antes de pedir la cuenta" : ""}
              >
                <Receipt className="h-4 w-4" />
                Pedir cuenta
                {!hasOrderItems && (
                  <span className="ml-auto text-xs text-muted-foreground">(sin items)</span>
                )}
              </Button>
              <div className="flex gap-2">
                <Select value={transferWaiterId} onValueChange={setTransferWaiterId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Transferir a..." />
                  </SelectTrigger>
                  <SelectContent>
                    {waiters
                      .filter((w) => w.id !== session?.waiterId)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name || w.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleTransfer}
                  disabled={!transferWaiterId || loading}
                >
                  <UserRoundPlus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full justify-start gap-2"
                variant="destructive"
                onClick={() => handleClose(true)}
                disabled={loading}
              >
                <Ban className="h-4 w-4" />
                Cancelar sesion
              </Button>
            </>
          )}

          {status === "BILL_REQUESTED" && (
            <>
              <Button
                className="w-full justify-start gap-2"
                onClick={handleGoToOrder}
              >
                <UtensilsCrossed className="h-4 w-4" />
                Ver pedido
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                <X className="h-4 w-4" />
                Cerrar mesa
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="destructive"
                onClick={() => handleClose(true)}
                disabled={loading}
              >
                <Ban className="h-4 w-4" />
                Cancelar sesion
              </Button>
            </>
          )}

          {session && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              {session.waiter?.name && (
                <p><span className="font-medium">Mozo:</span> {session.waiter.name}</p>
              )}
              {session.guestCount && (
                <p><span className="font-medium">Comensales:</span> {session.guestCount}</p>
              )}
              {session.notes && (
                <p><span className="font-medium">Notas:</span> {session.notes}</p>
              )}
              {session.currentRound > 0 && (
                <p><span className="font-medium">Rondas:</span> {session.currentRound}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
