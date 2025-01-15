import { CashShift } from "@/cash-shift/types";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { format } from "date-fns";
import { formatPrice, localizeDate, shortLocalizeDate } from "@/lib/utils";
import { getMany } from "@/document/db_repository";
import { getSession } from "@/lib/auth";
import { ArrayElement } from "@/lib/types";
import { correlative } from "@/document/utils";
import { Badge } from "@/shared/components/ui/badge";
import { getCompany } from "@/company/db_repository";
import { NextResponse } from "next/server";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

interface CashShiftReportTwProps {
  cashShift: CashShift;
}

export default async function CashShiftReportTw({
  cashShift,
}: CashShiftReportTwProps) {
  const totalExpense = cashShift.expenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const session = await getSession();
  if (!session.user) {
    return <SignOutRedirection />;
  }

  const companyResponse = await getCompany(session.user.companyId);

  if (!companyResponse.success) {
    return <p>Error cargando página, comuniquese con soporte</p>;
  }

  const documentsResponse = await getMany({
    companyId: session.user.companyId,
    orderId: cashShift.orders.map((order) => order.id!),
  });

  if (!documentsResponse.success) {
    return <p>Error cargando página, comuniquese con soporte</p>;
  }

  const documentMapper = documentsResponse.data.reduce<
    Record<string, ArrayElement<(typeof documentsResponse)["data"]>>
  >((acc, document) => {
    acc[document.orderId] = document;
    return acc;
  }, {});

  return (
    <ScrollArea className="mt-3 h-full">
      <div className="my-5">
        <h2 className="text-xl font-medium">Reporte general</h2>
      </div>
      <Table className="max-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center border" colSpan={4}>
              Reporte de ventas
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Empresa:
            </th>
            <TableCell className="border">
              {companyResponse.data.subName}
            </TableCell>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Fecha de reporte:
            </th>
            <TableCell className="text-left border">
              {format(new Date(), "dd/MM/yyyy")}
            </TableCell>
          </TableRow>

          <TableRow>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Ruc:
            </th>
            <TableCell className="border">{companyResponse.data.ruc}</TableCell>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Hora y fecha de apertura:
            </th>
            <TableCell className="text-left border">
              {shortLocalizeDate(cashShift.openedAt)}
            </TableCell>
          </TableRow>

          <TableRow>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Vendedor:
            </th>
            <TableCell className="border">{session.user.name}</TableCell>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Hora y fecha de cierre:
            </th>
            <TableCell className="text-left border">
              {cashShift.status == "closed"
                ? shortLocalizeDate(cashShift.closedAt)
                : "Caja abierta"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table className="max-w-[1100px] mt-10">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center border" colSpan={2}>
              Estados de caja
            </TableHead>
            <TableHead className="text-center border" colSpan={2}>
              Detalle de ingresos
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Saldo inicial:
            </th>
            <TableCell className="border">
              {formatPrice(cashShift.initialAmount)}
            </TableCell>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Pago en efectivo:
            </th>
            <TableCell className="text-left border">
              {formatPrice(cashShift.totalCashSales)}
            </TableCell>
          </TableRow>

          <TableRow>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Ingreso:
            </th>
            <TableCell className="border">
              {formatPrice(cashShift.totalSales)}
            </TableCell>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Pagos con billetera digital:
            </th>
            <TableCell className="text-left border">
              {formatPrice(cashShift.totalWalletSales)}
            </TableCell>
          </TableRow>

          <TableRow>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Egreso (Gastos):
            </th>
            <TableCell className="border">
              {formatPrice(totalExpense)}
            </TableCell>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Pagos con tarjeta:
            </th>
            <TableCell className="text-left border">
              {formatPrice(
                cashShift.totalDebitCardSales + cashShift.totalCreditCardSales,
              )}
            </TableCell>
          </TableRow>

          <TableRow>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Saldo final:
            </th>
            <TableCell className="border">
              {cashShift.status === "closed"
                ? formatPrice(cashShift.finalAmount)
                : "-"}
            </TableCell>
            <th className="px-4 text-end align-middle font-medium border bg-accent">
              Transferencia:
            </th>
            <TableCell className="text-left border"></TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="mt-8">
        <h2 className="text-lg font-medium">Ventas</h2>
      </div>
      <Table className="max-w-[1100px] mt-2">
        <TableCaption>
          Este cuadro representa la información general de cada venta realizada.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center border">Nº</TableHead>
            <TableHead className="text-center border">
              Hora y fecha de emisión
            </TableHead>
            <TableHead className="text-center border">
              Tipo de comprobante
            </TableHead>
            <TableHead className="text-center border">Código</TableHead>
            <TableHead className="text-center border">Vendedor</TableHead>
            <TableHead className="text-center border">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cashShift.orders.map((order, index) => (
            <TableRow key={order.id}>
              <TableCell className="border">{index + 1}</TableCell>
              <TableCell className="border flex flex-col items-start">
                {format(order.createdAt!, "dd/MM/yyyy hh:mm aa")}
                {order.status == "cancelled" && (
                  <Badge variant="destructive">Venta anulada</Badge>
                )}
              </TableCell>
              <TableCell className="border">
                {order.documentType === "receipt"
                  ? "Boleta Electrónica"
                  : order.documentType === "invoice"
                    ? "Factura Electrónica"
                    : "Nota de venta"}
              </TableCell>
              <TableCell className="border">
                {correlative(documentMapper[order.id!])}
              </TableCell>
              <TableCell className="border">{cashShift.userName}</TableCell>
              <TableCell className="border">
                {formatPrice(order.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
