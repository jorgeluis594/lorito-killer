import { Order } from "@/order/types";
import { response } from "@/lib/types";
import { getMany } from "@/stock-transfer/db_repository";

const cancel = async (order: Order): Promise<response<Order>> => {
  const stockTransfers = await getMany({
    companyId: order.companyId,
    orderId: order.id!,
  });

  return { success: false, message: "hola bru" };
};
