import { Order } from "@/order/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { formatPrice, localizeDate, paymentMethodToText } from "@/lib/utils";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/shared/components/ui/button";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { fullName } from "@/customer/utils";

export default function OrderData({ order }: { order: Order }) {
  return (
    <div className="h-full mt-8 flex justify-center">
      <Card className={"w-11/12"}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
          <CardTitle>
            {order.documentType === "receipt"
              ? "Boleta Electrónica"
              : order.documentType === "invoice"
                ? "Factura Electrónica"
                : "Nota de venta"}{" "}
            ({order.id!.substring(0, 8)})
          </CardTitle>
          <a
            className={buttonVariants({ variant: "ghost" })}
            href={`/api/orders/${order.id}/documents`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Printer className="cursor-pointer h-4 w-4" />
          </a>
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
                  {localizeDate(order.createdAt!)}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="table-auto border w-full mt-8">
            <thead>
              <tr>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Producto
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Precio
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Cantidad
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-light">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems.map((orderItem) => (
                <tr key={orderItem.id}>
                  <td className="pl-2 border py-1">{orderItem.productName}</td>
                  <td className="pl-2 border py-1">
                    {formatPrice(orderItem.productPrice)}
                  </td>
                  <td className="pl-2 border py-1">
                    {orderItem.quantity} {UNIT_TYPE_MAPPER[orderItem.unitType]}
                  </td>
                  <td className="pl-2 border py-1">
                    {formatPrice(orderItem.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <div className="w-56 flex justify-between">
              <p className="font-bold text-xl">Total</p>
              <p className="font-bold text-xl">{formatPrice(order.total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
