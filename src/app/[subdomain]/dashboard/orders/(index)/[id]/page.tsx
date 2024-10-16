import { getSession } from "@/lib/auth";
import { find as findOrder } from "@/order/db_repository";
import OrderData from "@/order/components/order-data";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getSession();
  const orderResponse = await findOrder(params.id, session.user.companyId);
  if (!orderResponse.success) {
    return <p>No se encontro el pedido</p>;
  }

  return <OrderData order={orderResponse.data} />;
}
