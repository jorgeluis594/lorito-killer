"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import React, { useState } from "react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared/components/ui/button";
import StockAdjustmentForm from "@/stock-transfer/components/form/stock-adjustment-form";
import { Plus } from "lucide-react";

export default function AddStockAdjustmentModal() {
  const [open, setOpen] = useState(false);

  const onSubmit = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          Nuevo ajuste
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-full w-full justify-center p-0 sm:h-[750px] sm:max-w-6xl">
        <ScrollArea className="w-full p-6">
          <DialogHeader>
            <DialogTitle>Nuevo ajuste de inventario</DialogTitle>
            <DialogDescription>
              Registra aumentos o disminuciones en las cantidades del
              inventario.
            </DialogDescription>
          </DialogHeader>
          <StockAdjustmentForm onSubmit={onSubmit} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
