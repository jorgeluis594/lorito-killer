import { Order, OrderItem, OrderWithBusinessCustomer } from "@/order/types";
import { response } from "@/lib/types";
import { format } from "date-fns";
import axios from "axios";
import { Company } from "@/company/types";
import { Document } from "@/document/types";
import type {
  FactproDocument,
  FactproDocumentItem,
} from "@/document/factpro/types";

const url = process.env.FACTPRO_URL;
const token = process.env.FACTPRO_TOKEN;

// Api documentation https://docs.factpro.la/
export const createInvoice = async (
  order: OrderWithBusinessCustomer,
  company: Company,
): Promise<response<Document>> => {
  try {
    if (!company.invoiceCode) {
      throw new Error("Invoice Code is required");
    }

    const body: FactproDocument = {
      documentType: INVOICE_DOCUMENT_TYPE,
      series: "series",
      number: order.customer.documentNumber,
      operationType: INTERNAL_SALES,
      dateOfIssue: format(order.createdAt!, "dd/MM/yyyy"),
      broadcastTime: format(order.createdAt!, "hh:mm aa"),
      currency: CURRENCY,
      dueDate: "",
      automaticallySendToClient: false,
      issuerData: {
        establishmentCode: company.invoiceCode,
      },
      customer: {
        documentType: RUC_CUSTOMER_DOCUMENT_TYPE,
        documentNumber: order.customer.documentNumber,
        legalName: order.customer.legalName,
        countryCode: COUNTRY_CODE,
        address: order.customer.address,
        email: order.customer.email,
        phoneNumber: order.customer.phoneNumber,
      },
      totals: {
        totalExport: 0.0, // Por el momento no se acepta exportaciones
        totalTaxes: 0.0, // Por el momento no se acepta impuesto, por desarrollar TODO: https://trello.com/c/avRmC8Yq
        totallyUnaffected: 0.0,
        totalExonerated: 0.0,
        totallyFree: 0.0,
        totalTax: 0.0,
        totalSale: order.total,
      },
      items: order.orderItems.map((orderItem) =>
        orderItemToDocumentItem(orderItem),
      ),
      actions: {
        formatPdf: PDF_FORMAT,
      },
      paymentTerm: {
        description: "",
        type: PAYMENT_TYPE,
      },
      paymentMethod: "",
      purchaseOrder: order.id,
      observations: "",
    };

    const response = sendDocument(body);

    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        orderId: order.id!,
        customerId: order.customer.id,
        total: order.total,
        documentType: order.documentType!,
        series: body.series,
        number: body.number,
        dateOfIssue: body.dateOfIssue,
        broadcastTime: body.broadcastTime,
        customer: order.customer,
        observations: body.observations!,
      },
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const createReceipt = async (
  order: Order,
  company: Company,
): Promise<response<Document>> => {
  return { success: false, message: "createReceipt" };
};

const orderItemToDocumentItem = (orderItem: OrderItem): FactproDocumentItem => {
  return {
    unite: UNIT_OF_MEASUREMENT,
    item_code: orderItem.productId,
    description: "",
    quantity: orderItem.quantity,
    unitValue: orderItem.productPrice,
    unitPrice: 0.0,
    taxType: "10",
    totalBaseTax: 0.0,
    taxPercentage: 0.0,
    totalTax: 0.0,
    total: orderItem.total,
  };
};

const sendDocument = async (
  body: FactproDocument,
): Promise<response<FactproDocument>> => {
  try {
    const res = await axios.post(url!, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 200) {
      return {
        success: true,
        data: res.data,
      };
    }
  } catch (error) {
    console.error("Error al emitir la factura:", error);
  }

  return { success: false, message: "not implemented" };
};
