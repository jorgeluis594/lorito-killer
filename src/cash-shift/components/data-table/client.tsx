"use client";

import { columns } from "@/cash-shift/components/data-table/columns";
import { DataTable } from "@/components/ui/data-table";
import { useState, useEffect } from "react";
import { CashShiftWithOutOrders } from "@/cash-shift/types";
import { getManyCashShifts } from "@/cash-shift/api_repository";
import { useToast } from "@/components/ui/use-toast";

export default function TableClient() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [cashShifts, setCashShifts] = useState<CashShiftWithOutOrders[]>([]);

  useEffect(() => {
    async function fetchData() {
      const response = await getManyCashShifts();
      if (!response.success) {
        toast({
          title: "Error",
          description:
            "Ocurrió un error al cargar las cajas: " + response.message,
          variant: "destructive",
        });
        return;
      } else {
        setCashShifts(response.data);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  return <DataTable columns={columns} data={cashShifts} isLoading={loading} />;
}
