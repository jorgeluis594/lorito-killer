"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileBarChart2, MoreHorizontal } from "lucide-react";
import { CashShiftWithOutOrders } from "@/cash-shift/types";
import { useRouter } from "next/navigation";

interface CellActionProps {
  cashShift: CashShiftWithOutOrders;
}

export const CellAction: React.FC<CellActionProps> = ({ cashShift }) => {
  const router = useRouter();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>

          {cashShift.status === "closed" && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/dashboard/cash_shifts/${cashShift.id}/reports`)
              }
            >
              <FileBarChart2 className="mr-2 h-4 w-4" /> Reporte de caja
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
