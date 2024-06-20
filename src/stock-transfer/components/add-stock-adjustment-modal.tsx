import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Heading } from "@/shared/components/ui/heading";
import React from "react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared/components/ui/button";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";
import StockAdjustmentForm from "@/stock-transfer/components/form/stock-adjustment-form";

export default function AddStockAdjustmentModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          Agregar ajuste de stock
          <HelpTooltip text="Registra aumentos o disminuciones en el inventario." />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl sm:h-[750px] w-full flex justify-center p-0">
        <ScrollArea className="p-6 w-full">
          <div className="flex">
            <Heading
              title="Nuevo ajuste de inventario"
              description="Controla las cantidades de tu inventario registrando Aumentos o Disminuciones."
            />
          </div>
          <StockAdjustmentForm />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
