import {Order, OrderItem, OrderWithBusinessCustomer} from "@/order/types";
import {errorResponse, response} from "@/lib/types";
import {
  FetchCustomer,
  FormatPdf,
  IssuerData,
  PaymentTerm,
  TotalPay
} from "@/document/types";
import {format} from "date-fns";
import axios from "axios";
import {Company} from "@/company/types";
import {Document} from "@/document/types"
import {BusinessCustomer, NaturalCustomer} from "@/customer/types";

const urlDoument = process.env.FACTPRO_URL_DOCUMENT;
const tokenDocument = process.env.FACTPRO_TOKEN;
const urlDni = process.env.FACTPRO_URL_SEARCH_DNI;
const urlRuc = process.env.FACTPRO_URL_SEARCH_RUC;
const tokenSearh = process.env.FACTPRO_TOKEN_SEARCH;
const INVOICE_DOCUMENT_TYPE = "01"
const RUC_CUSTOMER_DOCUMENT_TYPE = "6"
const INVOICE_SERIES = "F001"
const INTERNAL_SALES = "0101"
const CURRENCY = "PEN"
const COUNTRY_CODE = "PE"
const PDF_FORMAT = "a4"
const PAYMENT_TYPE = "0"
const UNIT_OF_MEASUREMENT = "NIU"

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
  series: string;
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

export const createInvoice = async (order: OrderWithBusinessCustomer, company: Company): Promise<response<Document>> => {
  try {
    if (!company.invoiceCode) {
      throw new Error("Invoice Code is required");
    }

    const body: BodyDocument = {
      documentType: INVOICE_DOCUMENT_TYPE,
      series: INVOICE_SERIES,
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
        phoneNumber: order.customer.phoneNumber
      },
      totals: {
        totalExport: 0.00, // Por el momento no se acepta exportaciones
        totalTaxes: 0.00, // Por el momento no se acepta impuesto, por desarrollar TODO: https://trello.com/c/avRmC8Yq
        totallyUnaffected: 0.00,
        totalExonerated: 0.00,
        totallyFree: 0.00,
        totalTax: 0.00,
        totalSale: order.total,
      },
      items: order.orderItems.map(orderItem => orderItemToDocumentItem(orderItem)),
      actions: {
        formatPdf: PDF_FORMAT
      },
      paymentTerm: {
        description: "",
        type: PAYMENT_TYPE
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
        documentType: order.documentType,
        series: body.series,
        number: body.number,
        dateOfIssue: body.dateOfIssue,
        broadcastTime: body.broadcastTime,
        order: order,
        customer: order.customer,
        observations: body.observations!,
      }
    };
  } catch (e: any) {
    return {success: false, message: e.message};
  }
}

export const createReceipt = async (order: Order, company: Company): Promise<response<Document>> => {
  return {success: false, message: "createReceipt"};
}

const orderItemToDocumentItem = (orderItem: OrderItem): DocumentItem => {
  return {
    unite: UNIT_OF_MEASUREMENT,
    item_code: orderItem.productId,
    description: "",
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
  try {
    const res = await axios.post(urlDoument!, body, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDocument}`
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

type FactproBusinessCustomer = {
  ruc: string // "20337564373",
  nombre: string // "TIENDAS POR DEPARTAMENTO RIPLEY S.A.C.",
  estado: string // "ACTIVO",
  condicion: string // "HABIDO",
  direccion: string // "AV. LAS BEGONIAS NRO. 545 URB. JARDIN",
  direccion_completa: string // "AV. LAS BEGONIAS NRO. 545 URB. JARDIN LIMA LIMA SAN ISIDRO",
  ubigeo: string // "150131",
  departamento: string // "LIMA",
  provincia: string // "LIMA",
  distrito: string // "SAN ISIDRO",
  tipo_via: string // "AV.",
  nombre_via: string // "LAS BEGONIAS",
  codigo_zona: string // "URB.",
  tipo_zona: string // "JARDIN",
  numero: string // "545",
  interior: string // "",
  lote: string // "",
  dpto: string // "",
  manzana: string // "",
  kilometro: string // ""
}

export const fetchCustomerByRuc = async (documentNumber: string): Promise<response<BusinessCustomer>> => {

  const response = await fetch(`${urlDni},${documentNumber}`,{
    method: "GET  ",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenSearh}`
    },
  });

  if(!response.ok) {
    return {success: false, message: "No customers found"};
  }

  const data: FactproBusinessCustomer = await response.json();

  return {
    success: true,
    data: {
      _branch: "BusinessCustomer",
      id: "",
      companyId: "",
      legalName: data.nombre,
      address: data.direccion_completa || '',
      email: "",
      documentNumber: data.ruc,
      documentType: "ruc",
      phoneNumber: "",
      geoCode: data.ubigeo || '',
    },
  }

};

export const fetchCustomerByDNI = async (documentNumber: string): Promise<response<NaturalCustomer>> => {
  const response = await fetch(`${urlRuc},${documentNumber}`,{
    method: "GET",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenSearh}`
    },
  });

  if(!response.ok) {
    return {success: false, message: "No customer found"};
  }

  const data = await response.json();

  return {
    success: true,
    data: {
      _branch: "NaturalCustomer",
      id: "",
      companyId: "",
      fullName: data.nombres,
    }
  }
};