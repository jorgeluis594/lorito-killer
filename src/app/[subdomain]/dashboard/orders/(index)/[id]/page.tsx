import { getSession } from "@/lib/auth";
import { find as findOrder } from "@/order/db_repository";
import OrderData from "@/order/components/order-data";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session.user) return <SignOutRedirection />;
  const orderResponse = await findOrder(params.id, session.user.companyId);
  if (!orderResponse.success) {
    return <p>No se encontro el pedido</p>;
  }

  return <OrderData order={orderResponse.data} />;
}
