import { Order, OrderItem, OrderWithBusinessCustomer } from "@/order/types";
import { response } from "@/lib/types";
import { format, parse } from "date-fns";
import axios from "axios";
import { Company } from "@/company/types";
import type { Invoice, Receipt, Ticket } from "@/document/types";
import type {
  FactproDocument,
  FactproDocumentItem,
} from "@/document/factpro/types";
import { log } from "@/lib/log";
import { Customer } from "@/customer/types";
import { isBusinessCustomer } from "@/customer/utils";

const url = process.env.FACTPRO_URL;
const token = process.env.FACTPRO_TOKEN;

// Api documentation https://docs.factpro.la/
export const createInvoice = async (
  order: OrderWithBusinessCustomer,
  company: Company,
): Promise<response<Invoice>> => {
  const body: FactproDocument = {
    tipo_documento: "01",
    serie: "NV01", // Falta configurar, primero se debe hacer la prueba de concepto
    numero: "1", // Falta crear algoritmo de asignación de numero
    tipo_operacion: "0101", // By default
    fecha_de_emision: format(order.createdAt!, "dd/MM/yyyy"),
    hora_de_emision: format(order.createdAt!, "hh:mm:ss"),
    moneda: "PEN",
    enviar_automaticamente_al_cliente: false,
    datos_del_emisor: {
      codigo_establecimiento: "0000", // Falta configurar el codigo de establecimiento
    },
    cliente: {
      cliente_tipo_documento: "6", // agregar mapeo segun el tipo de cliente
      cliente_numero_documento: order.customer.documentNumber,
      cliente_denominacion: order.customer.legalName,
      codigo_pais: "PE",
      cliente_direccion: order.customer.address,
      cliente_email: order.customer.email,
      cliente_telefono: order.customer.phoneNumber,
    },
    totales: {
      total_exoneradas: order.total,
      total_tax: 0,
      total_venta: order.total,
    },
    items: order.orderItems.map((orderItem) =>
      orderItemToDocumentItem(orderItem),
    ),
    acciones: {
      formato_pdf: "a4",
    },
    termino_de_pago: {
      descripcion: "Contado",
      tipo: "0",
    },
    metodo_de_pago: "Efectivo", // agregar metodo de pago
  };

  const response = await sendDocument(body, order.id!);
  if (!response.success) {
    return response;
  }

  return {
    success: true,
    data: {
      id: crypto.randomUUID(),
      orderId: order.id!,
      customerId: order.customer.id!,
      netTotal: body.totales.total_exoneradas,
      taxTotal: body.totales.total_tax,
      total: body.totales.total_venta,
      documentType: "invoice",
      series: body.serie,
      number: body.numero,
      dateOfIssue: parse(
        `${body.fecha_de_emision} ${body.hora_de_emision}`,
        "yyyy-MM-dd HH:mm",
        new Date(),
      ),
    },
  };
};

export const createReceipt = async (
  order: Order,
  company: Company,
): Promise<response<Receipt>> => {
  const body: FactproDocument = {
    tipo_documento: "01",
    serie: "NV01", // Falta configurar, primero se debe hacer la prueba de concepto
    numero: "1", // Falta crear algoritmo de asignación de numero
    tipo_operacion: "0101", // By default
    fecha_de_emision: format(order.createdAt!, "dd/MM/yyyy"),
    hora_de_emision: format(order.createdAt!, "hh:mm:ss"),
    moneda: "PEN",
    enviar_automaticamente_al_cliente: false,
    datos_del_emisor: {
      codigo_establecimiento: "0000", // Falta configurar el codigo de establecimiento
    },
    cliente: clientParamsBuilder(order.customer),
    totales: {
      total_exoneradas: order.total,
      total_tax: 0,
      total_venta: order.total,
    },
    items: order.orderItems.map((orderItem) =>
      orderItemToDocumentItem(orderItem),
    ),
    acciones: {
      formato_pdf: "a4",
    },
    termino_de_pago: {
      descripcion: "Contado",
      tipo: "0",
    },
    metodo_de_pago: "Efectivo", // agregar metodo de pago
  };

  const response = await sendDocument(body, order.id!);
  if (!response.success) {
    return response;
  }

  return {
    success: true,
    data: {
      id: crypto.randomUUID(),
      orderId: order.id!,
      customerId: order.customer?.id!,
      netTotal: body.totales.total_exoneradas,
      taxTotal: body.totales.total_tax,
      total: body.totales.total_venta,
      documentType: "receipt",
      series: body.serie,
      number: body.numero,
      dateOfIssue: parse(
        `${body.fecha_de_emision} ${body.hora_de_emision}`,
        "yyyy-MM-dd HH:mm",
        new Date(),
      ),
    },
  };
};

export const createTicket = async (
  order: Order,
  company: Company,
): Promise<response<Ticket>> => {
  return {
    success: true,
    data: {
      id: crypto.randomUUID(),
      orderId: order.id!,
      customerId: order.customer?.id!,
      netTotal: order.total,
      taxTotal: 0,
      total: order.total,
      documentType: "ticket",
      series: "NV01",
      number: "1",
      dateOfIssue: order.createdAt!,
    },
  };
};

function clientParamsBuilder(
  customer: Customer | undefined,
): FactproDocument["cliente"] {
  if (!customer) {
    return {
      cliente_tipo_documento: "0",
      cliente_numero_documento: "00000000",
      cliente_denominacion: "-",
      codigo_pais: "PE",
      cliente_direccion: "-",
    };
  }

  if (isBusinessCustomer(customer)) {
    return {
      cliente_tipo_documento: "6",
      cliente_numero_documento: customer.documentNumber,
      cliente_denominacion: customer.legalName,
      codigo_pais: "PE",
      cliente_direccion: customer.address,
      cliente_email: customer.email,
      cliente_telefono: customer.phoneNumber,
    };
  }

  return {
    cliente_tipo_documento: "1",
    cliente_numero_documento: customer.documentNumber || "00000000",
    cliente_denominacion: customer.fullName,
    codigo_pais: "PE",
    cliente_direccion: customer.address || "-",
    cliente_email: customer.email,
    cliente_telefono: customer.phoneNumber,
  };
}

const orderItemToDocumentItem = (orderItem: OrderItem): FactproDocumentItem => {
  return {
    unidad: "NIU",
    codigo: orderItem.productSku,
    descripcion: orderItem.productName,
    cantidad: orderItem.quantity,
    valor_unitario: orderItem.productPrice,
    precio_unitario: orderItem.productPrice,
    tipo_tax: "20", // Exonerado - Operación Onerosa
    total_base_tax: orderItem.total,
    porcentaje_tax: 0, // All products are exonerated in Pucallpa
    total_tax: 0,
    total: orderItem.total,
  };
};

const sendDocument = async (
  body: FactproDocument,
  orderId: string,
): Promise<response<FactproDocument>> => {
  const res = await axios.post(url!, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 200 && res.data.success) {
    log.info("factpro_document_sent", { document: body, orderId });
    return {
      success: true,
      data: res.data,
    };
  }

  log.error("factpro_document_error", { document: body, orderId });
  return { success: false, message: "Error creating document" };
};
