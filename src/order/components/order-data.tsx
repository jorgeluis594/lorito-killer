import { Order } from "@/order/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  formatPrice,
  localizeDate,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";
import { FileCode,Printer } from "lucide-react";
import { buttonVariants } from "@/shared/components/ui/button";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { fullName } from "@/customer/utils";
import { differenceInHours } from "date-fns";
import CancelOrderButton from "@/order/components/cancel-order-button";
import { findBillingDocumentFor } from "@/document/db_repository";
import { correlative } from "@/document/utils";
import { Badge } from "@/shared/components/ui/badge";
import { getXmlDocument } from "../actions";

export default async function OrderData({ order }: { order: Order }) {
  const documentResponse = await findBillingDocumentFor(order.id!);

  if(!documentResponse.success) {
    return <p>No se encontro el documento</p>
  }

  const xmlDocument = await getXmlDocument(documentResponse.data);

  if(!xmlDocument.success) {
    return <h1>No se logro realizar la consula de documento.</h1>
  }

  const hasADiscount = order.orderItems.some((orderItem) => orderItem.discountAmount > 0);

  return (
    <div className="h-full mt-8 flex justify-center">
      <Card className={"w-screen md:w-11/12"}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
          <CardTitle className="flex flex-col items-start">
            <span>
              {order.documentType === "receipt"
                ? "Boleta Electrónica"
                : order.documentType === "invoice"
                  ? "Factura Electrónica"
                  : "Nota de venta"}{" "}
              {documentResponse.success
                ? correlative(documentResponse.data)
                : "documento no encontrado"}
            </span>
            {order.status === "cancelled" && (
              <Badge variant="destructive" className="mt-2">
                Venta anulada
              </Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            <a
              className={buttonVariants({variant: "ghost", size: "icon"})}
              href={`/api/orders/${order.id}/documents`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer className="cursor-pointer"/>
            </a>

            <a
              className={buttonVariants({variant: "ghost", size: "icon"})}
              href={`${xmlDocument.data.archivos.xml}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileCode/>
            </a>

            {differenceInHours(new Date(), order.createdAt!) < 168 &&
              order.status === "completed" && (
                <CancelOrderButton
                  order={order}
                  document={
                    documentResponse.success ? documentResponse.data : undefined
                  }
                />
              )}
          </div>
        </CardHeader>
        <CardContent>
          <table className="table-auto border w-full">
            <tbody>
            <tr>
              <td className="pl-2 border w-13 py-1 bg-slate-100 font-light w-56">
                Cliente
              </td>
                <td className="pl-2 border py-1">
                  {order.customer ? fullName(order.customer) : "-"}
                </td>
              </tr>
              <tr>
                <td className="pl-2 border w-13 py-1 bg-slate-100 font-light w-56">
                  Email
                </td>
                <td className="pl-2 border py-1">
                  {order.customer?.email || "No disponible"}
                </td>
              </tr>
              <tr>
                <td className="pl-2 border w-13 py-1 bg-slate-100 font-light w-56">
                  Teléfono
                </td>
                <td className="pl-2 border py-1">
                  {order.customer?.phoneNumber || "No disponible"}
                </td>
              </tr>
              <tr>
                <td className="pl-2 border w-13 py-1 bg-slate-100 font-light w-56">
                  Fecha de compra
                </td>
                <td className="pl-2 border py-1">
                  {shortLocalizeDate(order.createdAt!)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="overflow-y-auto w-screen md:w-full">
            <table className="table-auto border min-w-[600px] md:w-full mt-8">
              <thead>
              <tr>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Cantidad
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Producto
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Precio
                </th>
                {hasADiscount && (
                  <th className="bg-slate-100 pl-2 border py-1 font-light">
                    Descuento
                  </th>
                )}
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Total
                </th>
              </tr>
              </thead>
              <tbody>
              {order.orderItems.map((orderItem) => (
                <tr key={orderItem.id}>
                  <td className="pl-2 border py-1">
                    {orderItem.quantity} {UNIT_TYPE_MAPPER[orderItem.unitType]}
                  </td>
                  <td className="pl-2 border py-1">{orderItem.productName}</td>
                  <td className="pl-2 border py-1">
                    {formatPrice(orderItem.productPrice)}
                  </td>
                  {hasADiscount && (
                    <td className="pl-2 border py-1">
                      {formatPrice(orderItem.discountAmount)}
                    </td>
                  )}
                  <td className="pl-2 border py-1">
                    {formatPrice(orderItem.total)}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
          <div className="w-full flex justify-between mt-8">
            <table className="table-auto border w-64">
              <thead>
              <tr>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Método de pago
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Monto
                </th>
              </tr>
              </thead>
              <tbody>
              {order.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="pl-2 border py-1">
                    {paymentMethodToText(payment.method)}
                  </td>
                  <td className="pl-2 border py-1">
                    {formatPrice(payment.amount)}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
            <div className="w-56 flex flex-col">
              {order.discount && (
                <>
                  <div className="flex justify-between mt-1">
                    <p className="text-lg">Subtotal</p>
                    <p className="text-lg">{formatPrice(order.netTotal)}</p>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-lg">Descuento</p>
                    <p className="text-lg">
                      {formatPrice(order.discountAmount)}
                    </p>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <p className="font-bold text-2xl">Total</p>
                <p className="font-bold text-2xl">{formatPrice(order.total)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
