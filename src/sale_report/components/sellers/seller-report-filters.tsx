"use client";

import { RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { BillingCredentials } from "@/document/types";
import type { Customer } from "@/customer/types";
import type { Seller } from "@/seller/types";
import useUpdateQueryString from "@/lib/use-update-query-string";
import DateFilter from "@/sale_report/components/filter/date-filter";
import DocumentSelector from "@/sale_report/components/filter/document-selector";
import CustomerSelector from "@/sale_report/components/filter/customer-selector";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type SellerReportFiltersProps = {
  billingCredentials: BillingCredentials;
  customer?: Customer;
  sellers: Seller[];
};

const sellerValueFor = (sellerId: string | null, sellerMode: string | null) => {
  if (sellerMode === "unassigned") return "unassigned";
  if (sellerMode === "specific" && sellerId) return sellerId;
  return "all";
};

export default function SellerReportFilters({
  billingCredentials,
  customer,
  sellers,
}: SellerReportFiltersProps) {
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();
  const [sellerValue, setSellerValue] = useState(
    sellerValueFor(searchParams.get("sellerId"), searchParams.get("sellerMode")),
  );
  const [status, setStatus] = useState(searchParams.get("status") ?? "paid");

  const onSellerChange = (value: string) => {
    setSellerValue(value);

    if (value === "all") {
      updateRoute({ sellerMode: null, sellerId: null, page: null });
      return;
    }

    if (value === "unassigned") {
      updateRoute({
        sellerMode: "unassigned",
        sellerId: null,
        page: null,
      });
      return;
    }

    updateRoute({
      sellerMode: "specific",
      sellerId: value,
      page: null,
    });
  };

  const onStatusChange = (value: string) => {
    setStatus(value);
    updateRoute({ status: value === "paid" ? null : value, page: null });
  };

  const clearFilters = () => {
    setSellerValue("all");
    setStatus("paid");
    updateRoute({
      start: null,
      end: null,
      sellerMode: null,
      sellerId: null,
      status: null,
      invoice: null,
      receipt: null,
      ticket: null,
      customerId: null,
      page: null,
    });
  };

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">Filtros</h2>
        <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
      </div>

      <DateFilter
        label="Fecha de venta"
        description="Rango operativo de ventas a analizar"
      />
      <Separator className="my-5" />

      <section>
        <div className="mb-2">
          <Label>Vendedor</Label>
          <p className="text-sm text-muted-foreground">
            Filtra por vendedor o ventas sin asignar
          </p>
        </div>
        <Select value={sellerValue} onValueChange={onSellerChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vendedores</SelectItem>
            <SelectItem value="unassigned">Sin vendedor asignado</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                {seller.name || seller.email}
                {seller.sellerCode ? ` (${seller.sellerCode})` : ""}
                {!seller.active ? " - Inactivo" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <Separator className="my-5" />
      <section>
        <div className="mb-2">
          <Label>Estado de venta</Label>
          <p className="text-sm text-muted-foreground">
            Define que ventas entran al total del reporte
          </p>
        </div>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Pagadas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Pagadas</SelectItem>
            <SelectItem value="cancelled">Anuladas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <Separator className="my-5" />
      <DocumentSelector
        documentTypes={{
          ticket: true,
          invoice: !!billingCredentials.invoiceSerialNumber,
          receipt: !!billingCredentials.receiptSerialNumber,
        }}
      />

      <Separator className="my-5" />
      <CustomerSelector customer={customer} />
    </div>
  );
}
