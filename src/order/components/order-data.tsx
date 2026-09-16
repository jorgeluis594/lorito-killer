import { walletPaymentReference } from "@/order/wallet-payment";
import { Order } from "@/order/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  formatPrice,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";
import { FileCode } from "lucide-react";
import { buttonVariants } from "@/shared/components/ui/button";
import { UNIT_TYPE_MAPPER } from "@/product/constants";
import { fullName } from "@/customer/utils";
import CancelOrderButton from "@/order/components/cancel-order-button";
import { findBillingDocumentFor } from "@/document/db_repository";
import { correlative } from "@/document/utils";
import { Badge } from "@/shared/components/ui/badge";
import ReceiptPrintButton from "@/printing/components/receipt-print-button";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/authorization/helpers";
import { canCancelOrder } from "@/order/use-cases/can-cancel-order";
import DeliveryActions from "@/delivery/components/delivery-actions";
import { findFulfillmentCashShift } from "@/order/fulfillment-payment-repository";
import { getDeliveryDetails } from "@/delivery/db_repository";
import { findOrderRounds } from "@/order/rounds/db_repository";
import { CancelOrderItemDialog } from "@/table/components/cancel-order-item-dialog";

export default async function OrderData({ order }: { order: Order }) {
  const session = await getSession();
  const documentResponse = await findBillingDocumentFor(
    order.id!,
    order.companyId,
  );

  const fulfillment =
    order.orderType === "TAKE_AWAY" || order.orderType === "DELIVERY";
  const cashShift = fulfillment
    ? await findFulfillmentCashShift(order.companyId)
    : null;
  const delivery =
    order.orderType === "DELIVERY"
      ? await getDeliveryDetails(order.companyId, order.id!)
      : null;
  const deliveryView = delivery
    ? {
        ...delivery,
        dispatchedAt:
          delivery.dispatchedAt?.toLocaleString("es-PE", {
            timeZone: "America/Lima",
          }) ?? null,
        deliveredAt:
          delivery.deliveredAt?.toLocaleString("es-PE", {
            timeZone: "America/Lima",
          }) ?? null,
      }
    : null;
  const rounds = fulfillment
    ? await findOrderRounds(order.id!, order.companyId)
    : [];

  const hasADiscount = order.orderItems.some(
    (orderItem) => orderItem.discountAmount > 0,
  );

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
                : fulfillment
                  ? order.orderType === "DELIVERY"
                    ? "Pedido Delivery"
                    : "Pedido para llevar"
                  : "documento no encontrado"}
            </span>
            {order.status === "cancelled" && (
              <Badge variant="destructive" className="mt-2">
                Venta anulada
              </Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2">
            {documentResponse.success && (
              <ReceiptPrintButton orderId={order.id!} />
            )}
            {documentResponse.success &&
              (documentResponse.data.documentType === "invoice" ||
                documentResponse.data.documentType === "receipt") && (
                <a
                  className={buttonVariants({ variant: "ghost", size: "icon" })}
                  href={`${documentResponse.data.xml}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileCode />
                </a>
              )}
            {documentResponse.success &&
              session.user &&
              canCancelOrder({
                hasPermission: hasPermission(
                  session.user.role,
                  "orders",
                  "delete",
                ),
                orderStatus: order.status,
                paymentStatus: order.paymentStatus,
                hasDishProduct: order.hasDishProduct ?? false,
                documentStatus: documentResponse.data.status,
                orderCreatedAt: order.createdAt,
              }) && (
                <CancelOrderButton
                  orderId={order.id!}
                  label={correlative(documentResponse.data)}
                />
              )}
          </div>
        </CardHeader>
        <CardContent>
          {fulfillment && (
            <div className="mb-6">
              <DeliveryActions
                orderId={order.id!}
                orderType={order.orderType as "TAKE_AWAY" | "DELIVERY"}
                paymentStatus={order.paymentStatus ?? "pending"}
                orderVersion={(
                  order.updatedAt ?? order.createdAt
                ).toISOString()}
                total={order.total}
                cashShiftId={cashShift?.id}
                delivery={deliveryView}
              />
            </div>
          )}
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
                      {orderItem.quantity}{" "}
                      {UNIT_TYPE_MAPPER[orderItem.unitType]}
                    </td>
                    <td className="pl-2 border py-1">
                      {orderItem.productName}
                    </td>
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
          {fulfillment && rounds.length > 0 && (
            <section className="mt-8 space-y-4" aria-label="Rondas enviadas">
              <h4 className="text-lg font-semibold">Rondas y comandas</h4>
              {rounds.map((round) => (
                <div key={round.id} className="rounded-lg border p-4">
                  <p className="mb-2 font-medium">
                    Ronda {round.number} ·{" "}
                    {round.responsible.name ?? "Responsable"}
                  </p>
                  <ul className="space-y-2">
                    {round.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="min-w-0 flex-1">
                          {item.currentQuantity} × {item.productName}
                          {item.kitchen
                            ? ` · ${item.kitchen.name}`
                            : " · Sin Kitchen"}
                          {item.notes ? ` · ${item.notes}` : ""}
                          {item.cancelledQuantity > 0
                            ? ` · ${item.cancelledQuantity} cancelado(s)`
                            : ""}
                        </span>
                        {order.paymentStatus === "pending" &&
                          item.currentQuantity > 0 && (
                            <CancelOrderItemDialog
                              channel="fulfillment"
                              orderRoundItemId={item.id}
                              availableQuantity={item.currentQuantity}
                            />
                          )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
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
                      {walletPaymentReference(payment) && (
                        <p className="text-sm break-all">
                          {walletPaymentReference(payment)}
                        </p>
                      )}
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
