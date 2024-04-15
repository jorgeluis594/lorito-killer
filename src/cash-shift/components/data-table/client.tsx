"use client";

import { columns } from "@/cash-shift/components/data-table/columns";
import { DataTable } from "@/components/ui/data-table";
import { useState, useEffect } from "react";
import { CashShiftWithOutOrders } from "@/cash-shift/types";

export default function TableClient() {
  const [loading, isLoading] = useState(false);
  const [cashShifts, setCashShifts] = useState<CashShiftWithOutOrders[]>([]);

  useEffect(() => {
    async function fetchData() {}

    fetchData();
  }, []);

  return (
    <DataTable
      searchKey="name"
      columns={columns}
      data={cashShifts}
      isLoading={loading}
    />
  );
}
