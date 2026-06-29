import { ArrowUpDown, ListFilter } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatPrice } from "@/lib/utils";
import type { SellerPerformanceRow } from "@/sale_report/types";

type SellerPerformanceTableProps = {
  rows: SellerPerformanceRow[];
  salesHrefFor: (row: SellerPerformanceRow) => string;
};

const sellerStatusLabel = {
  active: "Activo",
  inactive: "Inactivo",
  unassigned: "Sin asignar",
};

const sellerStatusVariant = {
  active: "default",
  inactive: "secondary",
  unassigned: "outline",
} as const;

export default function SellerPerformanceTable({
  rows,
  salesHrefFor,
}: SellerPerformanceTableProps) {
  return (
    <section className="rounded-md border">
      <div className="flex items-start justify-between gap-4 p-6 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Vendedores</h2>
          <p className="text-sm text-muted-foreground">
            Ordenado por total vendido de mayor a menor
          </p>
        </div>
        <ArrowUpDown className="mt-1 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Total vendido</TableHead>
              <TableHead className="text-right">Ticket promedio</TableHead>
              <TableHead className="text-right">Participacion</TableHead>
              <TableHead className="text-right">Anulaciones</TableHead>
              <TableHead>Ultima venta</TableHead>
              <TableHead className="text-right">Accion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No hay ventas para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.sellerId ?? "unassigned"}>
                  <TableCell className="min-w-48 font-medium">
                    {row.sellerName}
                  </TableCell>
                  <TableCell>{row.sellerCode ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={sellerStatusVariant[row.sellerStatus]}>
                      {sellerStatusLabel[row.sellerStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.salesCount}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(row.totalSold)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(row.averageTicket)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.participationPercent}%
                  </TableCell>
                  <TableCell className="text-right">
                    {row.cancelledSalesCount}
                  </TableCell>
                  <TableCell>
                    {row.lastSaleAt
                      ? format(row.lastSaleAt, "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={salesHrefFor(row)}>
                        <ListFilter className="mr-2 h-4 w-4" />
                        Ver ventas
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
