import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Heading } from "@/shared/components/ui/heading";
import React from "react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export default function AddStockAdjustmentModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          Agregar ajuste de stock
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                Registra aumentos o disminuciones en el inventario.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
