import { Order, OrderItem, OrderWithBusinessCustomer } from "@/order/types";
import { response } from "@/lib/types";
import { format, parse } from "date-fns";
import { Company } from "@/company/types";
import type { Invoice, Receipt, Ticket } from "@/document/types";
import type {
  FactproDocument,
  FactproDocumentItem,
} from "@/document/factpro/types";
import { log } from "@/lib/log";
import { Customer } from "@/customer/types";
import { isBusinessCustomer } from "@/customer/utils";
import {
  DocumentGateway,
  DocumentMetadata,
} from "@/document/use_cases/create-document";

const url = process.env.FACTPRO_URL;

function clientParamsBuilder(
  customer: Customer | undefined,
): FactproDocument["cliente"] {
  if (!customer) {
    return {
      cliente_tipo_documento: "0",
      cliente_numero_documento: "00000000",
      cliente_denominacion: "-",
      codigo_pais: "PE",
      ubigeo: "",
      cliente_direccion: "-",
    };
  }

  if (isBusinessCustomer(customer)) {
    return {
      cliente_tipo_documento: "6",
      cliente_numero_documento: customer.documentNumber,
      cliente_denominacion: customer.legalName,
      codigo_pais: "PE",
      ubigeo: "",
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
    ubigeo: "150101",
    cliente_direccion: customer.address || "-",
    cliente_email: customer.email,
    cliente_telefono: customer.phoneNumber,
  };
}

const sendDocument = async (
  body: FactproDocument,
  orderId: string,
  token: string,
): Promise<response<FactproDocument>> => {
  const res = await fetch(`${url!}/documentos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const resJson = await res.json();

  if (res.status === 200 && resJson.success) {
    log.info("factpro_document_sent", { document: body, orderId });
    return {
      success: true,
      data: resJson,
    };
  }

  log.error("factpro_document_error", {
    document: body,
    orderId,
    factpro_response: resJson,
  });
  return { success: false, message: "Error creating document" };
};

const orderItemToDocumentItem = (orderItem: OrderItem): FactproDocumentItem => {
  return {
    unidad: "NIU",
    codigo: orderItem.productSku || "",
    descripcion: orderItem.productName,
    cantidad: orderItem.quantity,
    valor_unitario: orderItem.productPrice,
    precio_unitario: orderItem.productPrice,
    codigo_producto_sunat: "",
    codigo_producto_gsl: "",
    tipo_tax: "20", // Exonerado - Operación Onerosa
    total_base_tax: orderItem.total,
    porcentaje_tax: 0, // All products are exonerated in Pucallpa
    total_tax: 0,
    total: orderItem.total,
  };
};

// Api documentation https://docs.factpro.la/
export default function gateway(token: string): DocumentGateway {
  const createInvoice = async (
    order: OrderWithBusinessCustomer,
    documentMetadata: DocumentMetadata,
  ): Promise<response<Invoice>> => {
    const body: FactproDocument = {
      tipo_documento: "01",
      serie: documentMetadata.serialNumber,
      numero: documentMetadata.documentNumber.toString(),
      tipo_operacion: "0101", // By default
      fecha_de_emision: format(order.createdAt!, "yyyy/MM/dd"),
      hora_de_emision: format(order.createdAt!, "hh:mm:ss"),
      moneda: "PEN",
      enviar_automaticamente_al_cliente: false,
      datos_del_emisor: {
        codigo_establecimiento: documentMetadata.establishmentCode,
      },
      cliente: clientParamsBuilder(order.customer),
      totales: {
        total_exoneradas: order.total,
        total_tax: 0,
        total_venta: order.total,
        total_gravadas: 0,
        total_exportacion: 0,
        total_inafectas: 0,
        total_gratuitas: 0,
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
      canal_de_venta: "",
      orden_de_compra: "",
      almacen: "",
      observaciones: "",
      fecha_de_vencimiento: "",
    };

    const response = await sendDocument(body, order.id!, token);
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

  const createReceipt = async (
    order: Order,
    documentMetadata: DocumentMetadata,
  ): Promise<response<Receipt>> => {
    const body: FactproDocument = {
      tipo_documento: "03",
      serie: documentMetadata.serialNumber,
      numero: documentMetadata.documentNumber.toString(),
      tipo_operacion: "0101", // By default
      fecha_de_emision: format(order.createdAt!, "dd/MM/yyyy"),
      hora_de_emision: format(order.createdAt!, "hh:mm:ss"),
      moneda: "PEN",
      enviar_automaticamente_al_cliente: false,
      datos_del_emisor: {
        codigo_establecimiento: documentMetadata.establishmentCode,
      },
      cliente: clientParamsBuilder(order.customer),
      totales: {
        total_exoneradas: order.total,
        total_tax: 0,
        total_venta: order.total,
        total_gravadas: 0,
        total_exportacion: 0,
        total_inafectas: 0,
        total_gratuitas: 0,
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
      canal_de_venta: "",
      orden_de_compra: "",
      almacen: "",
      observaciones: "",
      fecha_de_vencimiento: "",
    };

    const response = await sendDocument(body, order.id!, token);
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

  const createTicket = async (
    order: Order,
    documentMetadata: DocumentMetadata,
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

  return {
    createInvoice,
    createReceipt,
    createTicket,
  };
}
