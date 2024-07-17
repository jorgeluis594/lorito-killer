import {Order, OrderItem, OrderWithCustomer} from "@/order/types";
import {response} from "@/lib/types";
import {
  clientDocumentType,
  DomainCustomer,
  DomainDocumentType,
  formatPdf,
  issuerData,
  paymentTerm,
  totalPay
} from "@/document/types";
import {format} from "date-fns";
import axios from "axios";
import {Company} from "@/company/types";

const documentTypeMapper: Record<DomainDocumentType, clientDocumentType> = {
  'ruc': "6",
  'dni': "1",
  'foreign_card': "4",
  'passport': "7",
  "diplomatic_identity_card": "A",
  "sin_ruc": "0",
}

interface DocumentItem {
  unite: string;
  item_code: string;
  description: string;
  sunatProductCode?: string;
  gslProductCode?: string;
  quantity: number;
  unitValue: number;
  priceType: string;
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
  issuerData: issuerData;
  customer: DomainCustomer;
  totals: totalPay;
  items: [DocumentItem];
  actions: formatPdf;
  paymentTerm: paymentTerm;
  paymentMethod?: string;
  salesChanel?: string;
  purchaseOrder?: string;
  store?: string;
  observations?: string;
}

export const createInvoice = async (order: OrderWithCustomer, company: Company): Promise<response<Order>> => {
  try {
    if (!company.invoiceCode) {
      throw new Error("Invoice Code is required");
    }

    const body: BodyDocument = {
      documentType: "01",
      series: order.documentNumeral,
      number: "",
      operationType: "0101",
      dateOfIssue: format(order.createdAt!,"dd/MM/yyyy"),
      broadcastTime: format(order.createdAt!,"hh:mm aa"),
      currency: "PEN",
      dueDate: "",
      automaticallySendToClient: false,
      issuerData: {
        establishmentCode: company.invoiceCode,
      },
      customer: {
        documentType: documentTypeMapper[order.customer.documentType],
        documentNumber: order.customer.documentNumber,
        legalName: order.customer.legalName,
        countyCode: "PE", // solo peru
        address: order.customer.address,
        email: order.customer.email,
        phoneNumber: order.customer.phoneNumber
      },
      totals: {
        total_exportacion: 0.00,
        total_gravadas: 0.00,
        total_inafectas: 0.00,
        total_exoneradas: 0.00,
        total_gratuitas: 0.00,
        total_tax: 0.00,
        total_impuestos: 0.00,
        total_valor: order.total,
        total_venta: order.total,
      },
      items: order.orderItems.map(orderItem => orderItemToDocumentItem(orderItem)),
      actions: {
        formato_pdf: "80mm"
      },
      paymentTerm: {
        description: "Contado",
        type: "0" //0= Contado y 1 = Crédito
      },
      paymentMethod: "",
      purchaseOrder: order.id,
      store: "",
      observations: ""
    }

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
  {}
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

