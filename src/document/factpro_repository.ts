import {Order, OrderItem, OrderWithBusinessCustomer} from "@/order/types";
import {response} from "@/lib/types";
import {
  FormatPdf,
  IssuerData,
  PaymentTerm,
  TotalPay
} from "@/document/types";
import {format} from "date-fns";
import axios from "axios";
import {Company} from "@/company/types";

interface DocumentItem {
  unite: string;
  item_code: string;
  description: string;
  sunatProductCode?: string;
  gslProductCode?: string;
  quantity: number;
  unitValue: number;
  unitPrice: number;
  taxType: string;
  totalBaseTax: number;
  taxPercentage: number;
  totalTax: number;
  total: number;
}

interface BodyDocument {
  documentType: string;
  series?: string;
  number: string;
  operationType: string;
  dateOfIssue: string;
  broadcastTime: string;
  currency: string;
  dueDate?: string;
  automaticallySendToClient?: boolean;
  issuerData: IssuerData;
  customer: {};
  totals: TotalPay;
  items: DocumentItem[];
  actions: FormatPdf;
  paymentTerm: PaymentTerm;
  paymentMethod?: string;
  salesChanel?: string;
  purchaseOrder?: string;
  store?: string;
  observations?: string;
}

const INVOICE_DOCUMENT_TYPE = "01"
const RUC_CUSTOMER_DOCUMENT_TYPE = "6"

export const createInvoice = async (order: OrderWithBusinessCustomer, company: Company): Promise<response<Order>> => {
  try {
    if (!company.invoiceCode) {
      throw new Error("Invoice Code is required");
    }

    const body: BodyDocument = {
      documentType: INVOICE_DOCUMENT_TYPE,
      series: "",
      number: "",
      operationType: "0101",
      dateOfIssue: format(order.createdAt!, "dd/MM/yyyy"),
      broadcastTime: format(order.createdAt!, "hh:mm aa"),
      currency: "PEN",
      dueDate: "",
      automaticallySendToClient: false,
      issuerData: {
        establishmentCode: company.invoiceCode,
      },
      customer: {
        documentType: RUC_CUSTOMER_DOCUMENT_TYPE,
        documentNumber: order.customer.documentNumber,
        legalName: order.customer.legalName,
        countyCode: "PE", // solo peru
        address: order.customer.address,
        email: order.customer.email,
        phoneNumber: order.customer.phoneNumber
      },
      totals: {
        totalExport: 0.00, // Por el momento no se acepta exportaciones
        totalTaxes: 0.00, // Por el momento no se acepta impuesto, por desarrollar TODO: link de la tarjeta
        totallyUnaffected: 0.00,
        totalExonerated: 0.00,
        totallyFree: 0.00,
        totalSale: 0.00,
        totalTax: 0.00,
      },
      items: order.orderItems.map(orderItem => orderItemToDocumentItem(orderItem)),
      actions: {
        formatPdf: "a4" //Puedes elegir entre  a4 o ticket para mostrar automáticamente el formato del PDF
      },
      paymentTerm: {
        description: "Contado",
        type: "0" //0= Contado y 1 = Crédito
      },
      paymentMethod: "",
      purchaseOrder: order.id,
      store: "",
      observations: ""
    };

    const response = sendDocument(body);

    return {success: true, data: order};
  } catch (e: any) {
    return {success: false, message: e.message};
  }
}

export const createReceipt = async (order: Order, company: Company): Promise<response<Order>> => {
  return {success: false, message: "createReceipt"};
}

const orderItemToDocumentItem = (orderItem: OrderItem): DocumentItem => {
  return {
    unite: "NIU", //NIU = PRODUCTO ZZ = SERVICIO
    item_code: orderItem.productId,
    description: "",
    sunatProductCode: orderItem.productId,
    gslProductCode: "",
    quantity: orderItem.quantity,
    unitValue: orderItem.productPrice,
    unitPrice: 0.00,
    taxType: "10",
    totalBaseTax: 0.00,
    taxPercentage: 0.00,
    totalTax: 0.00,
    total: orderItem.total,
  }
}

const sendDocument = async (body: BodyDocument): Promise<response<BodyDocument>> => {

  const url = "https://dev.factpro.la/api/v2/documentos";
  const token = "123456789"

  try {
    const res = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    if (res.status === 200) {
      return {
        success: true,
        data: res.data,
      };
    }
  } catch (error) {
    console.error('Error al emitir la factura:', error);
  }

  return {success: false, message: "not implemented"};
}

