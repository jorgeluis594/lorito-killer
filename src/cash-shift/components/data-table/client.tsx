"use client";

import { columns } from "@/cash-shift/components/data-table/columns";
import { DataTable } from "@/components/ui/data-table";
import { useState, useEffect, useCallback } from "react";
import { CashShiftWithOutOrders } from "@/cash-shift/types";
import { getManyCashShifts } from "@/cash-shift/api_repository";
import { useToast } from "@/components/ui/use-toast";
import BreadCrumb from "@/components/breadcrumb";
import { Heading } from "@/components/ui/heading";
import OpenAndCloseButton from "@/cash-shift/components/open_and_close_button";
import { Separator } from "@/components/ui/separator";

export default function TableClient() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [cashShifts, setCashShifts] = useState<CashShiftWithOutOrders[]>([]);

  const fetchData = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <div className="flex items-start justify-between">
        <Heading title="Caja chica" description="Gestiona tus cajas chicas!" />
        <OpenAndCloseButton onActionPerform={fetchData} />
      </div>
      <Separator />
      <DataTable columns={columns} data={cashShifts} isLoading={loading} />;
    </>
  );
}
