import {response} from "@/lib/types";
import {Order} from "@/order/types";

interface DocumentRepository {
    createInvoice: (order: Order) => Promise<response<Order>>;
    createReceipt: (order: Order) => Promise<response<Order>>;
}

export const createDocument = async (
    repository: DocumentRepository,
    order: Order,
): Promise<response<Order>> => {
    if (order.documentType === "invoice") {
        return repository.createInvoice(order);
    } else if(order.documentType === "receipt") {
        return repository.createReceipt(order);
    } else {
        return { success: false, message: "not implemented"};
    }
};