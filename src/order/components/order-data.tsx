import { Order } from "@/order/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, localizeDate } from "@/lib/utils";

export default function OrderData({ order }: { order: Order }) {
  console.log({ order });

  return (
    <div className="h-full items-center flex justify-center">
      <Card className={"w-11/12"}>
        <CardHeader>
          <CardTitle>Pedido {order.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="table-auto border w-full">
            <tbody>
              <tr>
                <td className="pl-2 border w-13 py-1 bg-slate-100">Cliente</td>
                <td className="pl-2 border py-1">Cliente 1</td>
              </tr>
              <tr>
                <td className="pl-2 border w-13 py-1 bg-slate-100">Email</td>
                <td className="pl-2 border py-1">Cliente email</td>
              </tr>
              <tr>
                <td className="pl-2 border w-13 py-1 bg-slate-100">Teléfono</td>
                <td className="pl-2 border py-1">+51 997997854</td>
              </tr>
              <tr>
                <td className="pl-2 border w-13 py-1 bg-slate-100">Creación</td>
                <td className="pl-2 border py-1">
                  {localizeDate(order.createdAt!)}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="table-auto border w-full mt-8">
            <thead>
              <tr>
                <th className="bg-slate-100 pl-2 border py-1 font-medium">
                  Producto
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-medium">
                  Precio
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-medium">
                  Cantidad
                </th>
                <th className="bg-slate-100 pl-2 border py-1 font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems.map((orderItem) => (
                <tr key={orderItem.id}>
                  <td className="pl-2 border py-1">{orderItem.product.name}</td>
                  <td className="pl-2 border py-1">
                    {formatPrice(orderItem.product.price)}
                  </td>
                  <td className="pl-2 border py-1">{orderItem.quantity}</td>
                  <td className="pl-2 border py-1">
                    {formatPrice(orderItem.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
