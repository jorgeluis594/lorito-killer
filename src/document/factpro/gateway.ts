import { Order, OrderItem, OrderWithBusinessCustomer } from "@/order/types";
import { response } from "@/lib/types";
import { format, parse } from "date-fns";
import {
  Invoice,
  Receipt,
  Ticket,
  Document,
  RegisteredTicket,
  RegisteredInvoince,
  RegisteredReceipt
} from "@/document/types";
import {
  FactproDocument,
  FactproDocumentItem,
  FactproResponse,
} from "@/document/factpro/types";
import { log } from "@/lib/log";
import { BusinessCustomer, Customer, NaturalCustomer } from "@/customer/types";
import { isBusinessCustomer } from "@/customer/utils";
import {
  DocumentGateway,
  DocumentMetadata,
} from "@/document/use_cases/create-document";
import {div, errorResponse} from "@/lib/utils";
import {findDocument, update as updateDocument} from "@/document/db_repository";
import {isInvoice, isReceipt} from "@/document/utils";

const url = process.env.FACTPRO_URL;

function clientParamsBuilder(
  customer: Customer | undefined,
): FactproDocument["cliente"] {
  if (!customer) {
    return {
      cliente_tipo_documento: "1",
      cliente_numero_documento: "00000000",
      cliente_denominacion: "aaaa",
      codigo_pais: "PE",
      ubigeo: "",
      cliente_direccion: "-",
      cliente_telefono: "",
      cliente_email: "",
    };
  }

  if (isBusinessCustomer(customer)) {
    return {
      cliente_tipo_documento: "6",
      cliente_numero_documento: customer.documentNumber,
      cliente_denominacion: customer.legalName,
      codigo_pais: "PE",
      ubigeo: customer.geoCode,
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
    ubigeo: customer.geoCode || "",
    cliente_direccion: customer.address || "-",
    cliente_email: customer.email || "",
    cliente_telefono: customer.phoneNumber || "",
  };
}

const sendDocument = async (
  body: FactproDocument,
  orderId: string,
  token: string,
): Promise<response<FactproResponse>> => {
  const startDate = new Date();
  log.info("sending_factpro_document", { orderId, document: body });
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
    log.info("factpro_document_sent", {
      document: body,
      orderId,
      time: new Date().getTime() - startDate.getTime(),
    });
    return {
      success: true,
      data: resJson,
    };
  }

  log.error("send_factpro_document_failed", {
    document: body,
    orderId,
    time: new Date().getTime() - startDate.getTime(),
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
export default function gateway({
  billingToken,
  customerSearchToken,
}: {
  billingToken?: string;
  customerSearchToken?: string;
}): DocumentGateway & {
  fetchCustomerByRuc: (
    documentNumber: string,
  ) => Promise<response<BusinessCustomer>>;
  fetchCustomerByDNI: (
    documentNumber: string,
  ) => Promise<response<NaturalCustomer>>;
  cancelDocument: (
    document: Document,
    cancellationReason: string
  ) => Promise<response<Document>>;
} {
  const createInvoice = async (
    order: OrderWithBusinessCustomer,
    documentMetadata: DocumentMetadata,
  ): Promise<response<RegisteredInvoince>> => {
    if (!billingToken) {
      return { success: false, message: "Billing token not found" };
    }

    const body: FactproDocument = {
      tipo_documento: "01",
      serie: documentMetadata.serialNumber,
      numero: documentMetadata.documentNumber.toString(),
      tipo_operacion: "0101", // By default
      fecha_de_emision: format(order.createdAt!, "yyyy-MM-dd"),
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
        descuentos: order.discount && {
          codigo: "02",
          descripcion: "Descuento general",
          porcentaje: div(order.discountAmount)(order.netTotal),
          monto: order.discountAmount,
          base: order.netTotal,
        },
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

    const response = await sendDocument(body, order.id!, billingToken);
    if (!response.success) return response;
    if (!response.data.success)
      return { success: false, message: "Error creating document" };

    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        orderId: order.id!,
        companyId: order.companyId,
        customerId: order.customer.id!,
        netTotal: body.totales.total_exoneradas,
        taxTotal: body.totales.total_tax,
        discountAmount: body.totales.descuentos?.monto || 0,
        total: body.totales.total_venta,
        documentType: "invoice",
        series: body.serie,
        number: body.numero,
        status: "registered",
        qr: response.data.data.qr,
        hash: response.data.data.hash,
        dateOfIssue: parse(
          `${body.fecha_de_emision} ${body.hora_de_emision}`,
          "yyyy-MM-dd hh:mm:ss",
          new Date(),
        ),
      },
    };
  };

  const createReceipt = async (
    order: Order,
    documentMetadata: DocumentMetadata,
  ): Promise<response<RegisteredReceipt>> => {
    if (!billingToken) {
      return { success: false, message: "Billing token not found" };
    }

    const body: FactproDocument = {
      tipo_documento: "03",
      serie: documentMetadata.serialNumber,
      numero: documentMetadata.documentNumber.toString(),
      tipo_operacion: "0101", // By default
      fecha_de_emision: format(order.createdAt!, "yyyy-MM-dd"),
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
        descuentos: order.discount && {
          codigo: "02",
          descripcion: "Descuento general",
          porcentaje: div(order.discountAmount)(order.netTotal),
          monto: order.discountAmount,
          base: order.netTotal,
        },
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

    const response = await sendDocument(body, order.id!, billingToken);
    if (!response.success) return response;
    if (!response.data.success)
      return { success: false, message: "Error creating document" };

    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        orderId: order.id!,
        companyId: order.companyId,
        customerId: order.customer?.id!,
        netTotal: body.totales.total_exoneradas,
        taxTotal: body.totales.total_tax,
        discountAmount: body.totales.descuentos?.monto || 0,
        total: body.totales.total_venta,
        documentType: "receipt",
        series: body.serie,
        number: body.numero,
        status: "registered",
        qr: response.data.data.qr,
        hash: response.data.data.hash,
        dateOfIssue: parse(
          `${body.fecha_de_emision} ${body.hora_de_emision}`,
          "yyyy-MM-dd hh:mm:ss",
          new Date(),
        ),
      },
    };
  };

  const createTicket = async (
    order: Order,
    documentMetadata: Omit<DocumentMetadata, "establishmentCode">,
  ): Promise<response<RegisteredTicket>> => {
    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        companyId: order.companyId,
        orderId: order.id!,
        customerId: order.customer?.id,
        netTotal: order.netTotal,
        taxTotal: 0,
        discountAmount: order.discountAmount,
        total: order.total,
        status: "registered",
        documentType: "ticket",
        series: documentMetadata.serialNumber,
        number: documentMetadata.documentNumber.toString(),
        dateOfIssue: order.createdAt!,
      },
    };
  };

  type FactproBusinessCustomer = {
    ruc: string; // "20337564373",
    nombre: string; // "TIENDAS POR DEPARTAMENTO RIPLEY S.A.C.",
    estado: string; // "ACTIVO",
    condicion: string; // "HABIDO",
    direccion: string; // "AV. LAS BEGONIAS NRO. 545 URB. JARDIN",
    direccion_completa: string; // "AV. LAS BEGONIAS NRO. 545 URB. JARDIN LIMA LIMA SAN ISIDRO",
    ubigeo: string; // "150131",
    departamento: string; // "LIMA",
    provincia: string; // "LIMA",
    distrito: string; // "SAN ISIDRO",
    tipo_via: string; // "AV.",
    nombre_via: string; // "LAS BEGONIAS",
    codigo_zona: string; // "URB.",
    tipo_zona: string; // "JARDIN",
    numero: string; // "545",
    interior: string; // "",
    lote: string; // "",
    dpto: string; // "",
    manzana: string; // "",
    kilometro: string; // ""
  };

  const fetchCustomerByRuc = async (
    documentNumber: string,
  ): Promise<response<BusinessCustomer>> => {
    const response = await fetch(
      `https://consultas.factpro.la/api/v1/ruc/${documentNumber}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerSearchToken}`,
        },
      },
    );

    if (!response.ok) {
      log.error("search_customer_failed", {
        documentNumber,
        response: await response.json(),
      });
      return { success: false, message: "No customers found" };
    }

    const data: FactproBusinessCustomer = await response.json();

    return {
      success: true,
      data: {
        _branch: "BusinessCustomer",
        id: "",
        companyId: "",
        legalName: data.nombre,
        address: data.direccion || "",
        email: "",
        documentNumber: data.ruc,
        districtName: data.distrito,
        provinceName: data.provincia,
        departmentName: data.departamento,
        documentType: "ruc",
        phoneNumber: "",
        geoCode: data.ubigeo || "",
      },
    };
  };

  const fetchCustomerByDNI = async (
    documentNumber: string,
  ): Promise<response<NaturalCustomer>> => {
    const response = await fetch(
      `https://consultas.factpro.la/api/v1/dni/${documentNumber}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerSearchToken}`,
        },
      },
    );

    if (!response.ok) {
      log.error("search_customer_failed", {
        documentNumber,
        data: await response.json(),
      });
      return { success: false, message: "No customer found" };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        _branch: "NaturalCustomer",
        id: "",
        companyId: "",
        fullName: data.nombres,
      },
    };
  };

  const cancelTicket = async (document: Ticket, cancellationReason: string): Promise<response<Document>> => {
    const updatedDocument = await updateDocument({...document,cancellationReason: cancellationReason, status: 'cancelled'})
    if(!updatedDocument.success){
      log.error("update_document_failed",{document, updatedDocument})
      return errorResponse('Update document failed')
    }

    return {success: true, data: updatedDocument.data}
  }

  const cancelBillingDocument = async (document: Invoice | Receipt, cancellationReason: string): Promise<response<Document>> => {
    if (document.status != 'registered') {
      throw new Error('Invalid document, only registered documents are supported')
    }

    const body = {
      fecha_de_emision_de_documentos: document.dateOfIssue,
      codigo_tipo_proceso: isInvoice(document) ? "01" : '03',
      documentos: [
        {
          correlativo: `${document.series}-${document.number}`,
          motivo_anulacion: cancellationReason,
        },
      ],
    };

    const res = await fetch(`${url!}/resumenes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${billingToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!result.success) {
      log.error('cancel_factpro_document_failed', { document, result });
      return errorResponse(result.message);
    }

    log.info('cancel_factpro_document_succeeded', { document, result });
    return { success: true, data: { ...document, status: 'cancelled' } };
  };

  const cancelDocument = async (document: Document, cancellationReason: string): Promise<response<Document>> => {
    if (isReceipt(document) || isInvoice(document)) return cancelBillingDocument(document, cancellationReason)

    return cancelTicket(document, cancellationReason)
  }

  return {
    createInvoice,
    createReceipt,
    createTicket,
    fetchCustomerByRuc,
    fetchCustomerByDNI,
    cancelDocument
  };
}
