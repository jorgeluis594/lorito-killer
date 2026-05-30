import { Order, OrderItem, OrderWithBusinessCustomer } from "@/order/types";
import { response } from "@/lib/types";
import {
  Invoice,
  Receipt,
  Ticket,
  Document,
  RegisteredTicket,
  RegisteredInvoince,
  RegisteredReceipt,
} from "@/document/types";
import {
  FactproCancelResponseV3,
  FactproDocumentItemV3,
  FactproDocumentV3,
  FactproResponseV3,
} from "@/document/factpro/types";
import { log } from "@/lib/log";
import {
  BusinessCustomer,
  CARNET_EXTRANJERIA,
  Customer,
  NaturalCustomer,
} from "@/customer/types";
import { isBusinessCustomer } from "@/customer/utils";
import {
  DocumentGateway,
  DocumentMetadata,
} from "@/document/use_cases/create-document";
import { formatInTimeZone } from "date-fns-tz";
import { errorResponse } from "@/lib/utils";
import { update as updateDocument } from "@/document/db_repository";
import { isInvoice, isReceipt } from "@/document/utils";

const url = process.env.FACTPRO_URL;

const factproEndpoint = (path: "documentos" | "anular") => {
  if (!url) return `/${path}`;
  return `${url.replace(/\/$/, "")}/${path}`;
};

const FACTPRO_DOCUMENT_ERROR = "Error al crear el documento en FactPro";

function clientParamsBuilder(
  customer: Customer | undefined,
): FactproDocumentV3["cliente"] {
  if (!customer) {
    return {
      cliente_tipo_documento: "1",
      cliente_numero_documento: "00000000",
      cliente_denominacion: "Clientes Varios",
      cliente_direccion: "-",
      cliente_telefono: "",
      cliente_email: "",
    };
  }

  if (isBusinessCustomer(customer)) {
    return {
      cliente_tipo_documento: "4",
      cliente_numero_documento: customer.documentNumber,
      cliente_denominacion: customer.legalName,
      cliente_direccion: customer.address,
      cliente_email: customer.email,
      cliente_telefono: customer.phoneNumber,
    };
  }

  const clienteTipoDocumento =
    customer.documentType === CARNET_EXTRANJERIA
      ? "3"
      : customer.documentNumber
        ? "2"
        : "1";

  return {
    cliente_tipo_documento: clienteTipoDocumento,
    cliente_numero_documento: customer.documentNumber || "00000000",
    cliente_denominacion: customer.fullName,
    cliente_direccion: customer.address || "-",
    cliente_email: customer.email || "",
    cliente_telefono: customer.phoneNumber || "",
  };
}

const sendDocument = async (
  body: FactproDocumentV3,
  orderId: string,
  token: string,
): Promise<response<FactproResponseV3>> => {
  const startDate = new Date();
  const endpoint = factproEndpoint("documentos");
  log.info("sending_factpro_document", { orderId, document: body });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseBody = await res.text();

  let resJson: FactproResponseV3;
  try {
    resJson = JSON.parse(responseBody) as FactproResponseV3;
  } catch {
    log.error("factpro_document_processed", {
      status: "error",
      document: body,
      orderId,
      time: new Date().getTime() - startDate.getTime(),
      response_body: responseBody,
      error: "format_error",
    });

    return {
      success: false,
      message: "FactPro devolvió una respuesta no JSON",
    };
  }

  if (res.ok && resJson.exito) {
    log.info("factpro_document_processed", {
      status: "success",
      document: body,
      orderId,
      time: new Date().getTime() - startDate.getTime(),
    });
    return {
      success: true,
      data: resJson,
    };
  }

  const errorMessage =
    (!resJson.exito && resJson.mensaje) || FACTPRO_DOCUMENT_ERROR;

  log.error("factpro_document_processed", {
    status: "error",
    document: body,
    orderId,
    time: new Date().getTime() - startDate.getTime(),
    response_body: responseBody,
    error: errorMessage,
    factpro_response: resJson,
  });
  return {
    success: false,
    message: errorMessage,
  };
};

const orderItemToDocumentItem = (
  orderItem: OrderItem,
): FactproDocumentItemV3 => {
  const item: FactproDocumentItemV3 = {
    unidad: "NIU",
    codigo: orderItem.productSku || "",
    descripcion: orderItem.productName,
    cantidad: orderItem.quantity,
    precio: orderItem.productPrice,
    incluye_tax: true,
    tipo_tax: "20", // Exonerado - Operación Onerosa
  };

  if (orderItem.discountAmount) {
    item.descuento = orderItem.discountAmount;
  }

  return item;
};

const orderTotals = (order: Order) => ({
  totalExoneradas: order.total,
  totalTax: 0,
  totalVenta: order.total,
  discountAmount: order.discount ? order.discountAmount : 0,
});

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
    cancellationReason: string,
  ) => Promise<response<Document>>;
} {
  const createInvoice = async (
    order: OrderWithBusinessCustomer,
    documentMetadata: DocumentMetadata,
  ): Promise<response<RegisteredInvoince>> => {
    if (!billingToken) {
      return { success: false, message: "Billing token not found" };
    }

    const totals = orderTotals(order);
    const body: FactproDocumentV3 = {
      serie: documentMetadata.serialNumber,
      numero: documentMetadata.documentNumber.toString(),
      tipo_operacion: "1",
      fecha_de_emision: formatInTimeZone(
        order.createdAt,
        "America/Lima",
        "yyyy-MM-dd",
      ),
      moneda: "PEN",
      enviar_automaticamente_al_cliente: false,
      cliente: clientParamsBuilder(order.customer),
      items: order.orderItems.map((orderItem) =>
        orderItemToDocumentItem(orderItem),
      ),
      condicion_de_pago: [
        {
          tipo_de_condicion: "0",
          forma_de_pago: "0",
          monto: 0,
        },
      ],
      ...(order.discount
        ? { totales: { monto_descuento_global: order.discountAmount } }
        : {}),
      observaciones: "",
      formato_pdf: "a4",
    };

    const response = await sendDocument(body, order.id!, billingToken);
    if (!response.success) return response;
    if (!response.data.exito)
      return {
        success: false,
        message: response.data.mensaje || FACTPRO_DOCUMENT_ERROR,
      };

    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        orderId: order.id!,
        companyId: order.companyId,
        customerId: order.customer.id!,
        netTotal: totals.totalExoneradas,
        taxTotal: totals.totalTax,
        discountAmount: totals.discountAmount,
        total: totals.totalVenta,
        documentType: "invoice",
        series: body.serie,
        number: body.numero,
        xml: response.data.archivos.xml,
        status: "registered",
        qr: response.data.data.qr,
        hash: response.data.data.hash,
        dateOfIssue: order.createdAt,
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

    const totals = orderTotals(order);
    const body: FactproDocumentV3 = {
      serie: documentMetadata.serialNumber,
      numero: documentMetadata.documentNumber.toString(),
      tipo_operacion: "1",
      fecha_de_emision: formatInTimeZone(
        order.createdAt,
        "America/Lima",
        "yyyy-MM-dd",
      ),
      moneda: "PEN",
      enviar_automaticamente_al_cliente: false,
      cliente: clientParamsBuilder(order.customer),
      items: order.orderItems.map((orderItem) =>
        orderItemToDocumentItem(orderItem),
      ),
      condicion_de_pago: [
        {
          tipo_de_condicion: "0",
          forma_de_pago: "0",
          monto: 0,
        },
      ],
      ...(order.discount
        ? { totales: { monto_descuento_global: order.discountAmount } }
        : {}),
      observaciones: "",
      formato_pdf: "a4",
    };

    const response = await sendDocument(body, order.id!, billingToken);
    if (!response.success) return response;
    if (!response.data.exito)
      return {
        success: false,
        message: response.data.mensaje || FACTPRO_DOCUMENT_ERROR,
      };

    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        orderId: order.id!,
        companyId: order.companyId,
        customerId: order.customer?.id!,
        netTotal: totals.totalExoneradas,
        taxTotal: totals.totalTax,
        discountAmount: totals.discountAmount,
        total: totals.totalVenta,
        documentType: "receipt",
        series: body.serie,
        number: body.numero,
        xml: response.data.archivos.xml,
        status: "registered",
        qr: response.data.data.qr,
        hash: response.data.data.hash,
        dateOfIssue: order.createdAt,
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

  const cancelTicket = async (
    document: Ticket,
    cancellationReason: string,
  ): Promise<response<Document>> => {
    const updatedDocument = await updateDocument({
      ...document,
      cancellationReason: cancellationReason,
      status: "cancelled",
    });
    if (!updatedDocument.success) {
      log.error("update_document_failed", { document, updatedDocument });
      return errorResponse("Update document failed");
    }

    return { success: true, data: updatedDocument.data };
  };

  const cancelBillingDocument = async (
    document: Invoice | Receipt,
    cancellationReason: string,
  ): Promise<response<Document>> => {
    if (document.status != "registered") {
      throw new Error(
        "Invalid document, only registered documents are supported",
      );
    }

    const body = {
      serie: document.series,
      numero: document.number,
      motivo: cancellationReason,
    };

    const res = await fetch(factproEndpoint("anular"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${billingToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseBody = await res.text();
    let result: FactproCancelResponseV3;
    try {
      result = JSON.parse(responseBody) as FactproCancelResponseV3;
    } catch {
      log.error("cancel_factpro_document_failed", {
        document,
        response_body: responseBody,
        error: "format_error",
      });
      return errorResponse("FactPro devolvió una respuesta no JSON");
    }

    if (!res.ok || !result.exito) {
      log.error("cancel_factpro_document_failed", { document, result });
      return errorResponse(
        result.mensaje || "Error al anular el documento en FactPro",
      );
    }

    log.info("cancel_factpro_document_succeeded", { document, result });
    return {
      success: true,
      data: {
        ...document,
        status: "cancelled",
        cancellationReason: cancellationReason,
      },
    };
  };

  const cancelDocument = async (
    document: Document,
    cancellationReason: string,
  ): Promise<response<Document>> => {
    if (isReceipt(document) || isInvoice(document))
      return cancelBillingDocument(document, cancellationReason);

    return cancelTicket(document, cancellationReason);
  };

  return {
    createInvoice,
    createReceipt,
    createTicket,
    fetchCustomerByRuc,
    fetchCustomerByDNI,
    cancelDocument,
  };
}
