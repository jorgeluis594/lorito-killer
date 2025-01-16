"use client";

import { columns } from "@/cash-shift/components/data-table/columns";
import { DataTable } from "@/shared/components/ui/data-table";
import { useState, useEffect, useCallback } from "react";
import { CashShiftWithOutOrders } from "@/cash-shift/types";
import { getManyCashShifts } from "@/cash-shift/api_repository";
import { useToast } from "@/shared/components/ui/use-toast";
import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import OpenAndCloseButton from "@/cash-shift/components/open_and_close_button";
import { Separator } from "@/shared/components/ui/separator";

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
