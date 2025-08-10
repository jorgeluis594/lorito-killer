import {
  BillingCredentials,
  Document, DocumentStatus,
  DocumentType,
  INVOICE,
  RECEIPT, Registered,
  SearchParams, StatusAttributes,
  TICKET,
} from "@/document/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums, Document as PrismaDocument } from "@prisma/client";
import PrismaDocumentType = $Enums.DocumentType;
import { errorResponse, isEmpty } from "@/lib/utils";
import { log } from "@/lib/log";
import { Customer } from "@/customer/types";
import { findCustomer } from "@/customer/db_repository";
import {isInvoice, isReceipt} from "@/document/utils";

export const DocumentTypeToPrismaMapper: Record<
  DocumentType,
  PrismaDocumentType
> = {
  [INVOICE]: PrismaDocumentType.INVOICE,
  [RECEIPT]: PrismaDocumentType.RECEIPT,
  [TICKET]: PrismaDocumentType.TICKET,
};
export const PrismaDocumentTypeMapper: Record<
  PrismaDocumentType,
  DocumentType
> = {
  [PrismaDocumentType.INVOICE]: INVOICE,
  [PrismaDocumentType.RECEIPT]: RECEIPT,
  [PrismaDocumentType.TICKET]: TICKET,
};

const STATUS_TO_PRISMA_MAPPER: Record<DocumentStatus, $Enums.DocumentStatus> = {
  registered: "REGISTERED",
  cancelled: "CANCELLED",
  pending_cancellation: "PENDING_CANCELLATION",
};

const PRISMA_TO_STATUS_MAPPER: Record<$Enums.DocumentStatus, DocumentStatus> = {
  REGISTERED: "registered",
  CANCELLED: "cancelled",
  PENDING_CANCELLATION: "pending_cancellation",
};

const statusAttributesForPrismaDocument = (prismaDocument: PrismaDocument): StatusAttributes => {
  if (prismaDocument.status == 'CANCELLED') {
    return { status: 'cancelled', cancellationReason: prismaDocument.cancellationReason! }
  }

  if (prismaDocument.status == 'PENDING_CANCELLATION') {
    return { status: 'pending_cancellation' }
  }

  return { status: "registered" }
}

const prismaDocumentToDocument = (prismaDocument: PrismaDocument): Document => {
  let document: Document;
  if (prismaDocument.documentType == "TICKET") {
    document = {
      id: prismaDocument.id,
      companyId: prismaDocument.companyId!,
      orderId: prismaDocument.orderId,
      customerId: prismaDocument.customerId || undefined,
      discountAmount: +prismaDocument.discountAmount,
      total: +prismaDocument.total,
      documentType: "ticket",
      series: prismaDocument.series,
      number: prismaDocument.number.toString(),
      dateOfIssue: prismaDocument.dateOfIssue,
      taxTotal: 0,
      netTotal: +prismaDocument.netTotal,
      ...statusAttributesForPrismaDocument(prismaDocument)
    };
  } else if (prismaDocument.documentType == "RECEIPT") {
    document = {
      id: prismaDocument.id,
      orderId: prismaDocument.orderId,
      companyId: prismaDocument.companyId!,
      customerId: prismaDocument.customerId || undefined,
      discountAmount: +prismaDocument.discountAmount,
      total: +prismaDocument.total,
      documentType: "receipt",
      series: prismaDocument.series,
      number: prismaDocument.number.toString(),
      dateOfIssue: prismaDocument.dateOfIssue,
      taxTotal: 0,
      netTotal: +prismaDocument.total,
      qr: prismaDocument.qr!,
      hash: prismaDocument.hash!,
      ...statusAttributesForPrismaDocument(prismaDocument)
    };
  } else {
    // invoice case
    document = {
      id: prismaDocument.id,
      orderId: prismaDocument.orderId,
      companyId: prismaDocument.companyId!,
      customerId: prismaDocument.customerId!,
      discountAmount: +prismaDocument.discountAmount,
      total: +prismaDocument.total,
      documentType: "invoice",
      series: prismaDocument.series,
      number: prismaDocument.number.toString(),
      dateOfIssue: prismaDocument.dateOfIssue,
      taxTotal: 0,
      netTotal: +prismaDocument.total,
      qr: prismaDocument.qr!,
      hash: prismaDocument.hash!,
      ...statusAttributesForPrismaDocument(prismaDocument)
    };
  }

  return document;
};

export const createDocument = async (
  document: Document,
): Promise<response<Document>> => {
  try {
    const createdDocument = await prisma().document.create({
      data: {
        orderId: document.orderId!,
        companyId: document.companyId,
        customerId: document.customerId,
        discountAmount: document.discountAmount,
        netTotal: document.netTotal,
        total: document.total,
        documentType: DocumentTypeToPrismaMapper[document.documentType],
        series: document.series,
        number: parseInt(document.number),
        status: STATUS_TO_PRISMA_MAPPER[document.status],
        dateOfIssue: document.dateOfIssue,
        qr: document.documentType == "ticket" ? undefined : document.qr,
        hash: document.documentType == "ticket" ? undefined : document.hash,
      },
    });

    return { success: true, data: prismaDocumentToDocument(createdDocument) };
  } catch (e: any) {
    log.error("persist_document_failed", {
      document: document,
      orderId: document.orderId,
      error_message: e.message,
    });
    return { success: false, message: e.message };
  }
};

export const findDocument = async (id: string): Promise<response<Document>> => {
  const document = await prisma().document.findFirst({ where: { orderId: id } });

  if (!document) {
    return errorResponse("document not found");
  }

  return { success: true, data: prismaDocumentToDocument(document) };
};

export const findBillingDocumentFor = async (
  orderId: string,
): Promise<response<Document>> => {
  const document = await prisma().document.findFirst({ where: { orderId } });

  if (!document) {
    return errorResponse("document not found");
  }

  return { success: true, data: prismaDocumentToDocument(document) };
};

export const getLatestDocumentNumber = async (
  companyId: string,
  serialNumber: string,
): Promise<response<number | undefined>> => {
  try {
    const document = await prisma().document.findFirst({
      where: { series: serialNumber, companyId: companyId },
      orderBy: { number: "desc" },
    });

    if (!document) {
      return { success: true, data: undefined };
    }

    return { success: true, data: +document.number };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

const defaultCredentials: BillingCredentials = {
  customerSearchToken: process.env.CUSTOMER_SEARCH_TOKEN!,
  ticketSerialNumber: "NV01",
};

export const getBillingCredentialsFor = async (
  companyId: string,
): Promise<response<BillingCredentials>> => {
  const companyData = await prisma().company.findUnique({
    where: { id: companyId },
    select: { billingCredentials: true },
  });

  if (!companyData || isEmpty(companyData.billingCredentials)) {
    return { success: true, data: { ...defaultCredentials } };
  }

  const credentials =
    companyData.billingCredentials as unknown as BillingCredentials;

  return {
    success: true,
    data: { ...defaultCredentials, ...credentials },
  };
};

const buildDocumentQuery = ({
  companyId,
  correlative,
  startDate,
  endDate,
  customerId,
  ticket,
  invoice,
  receipt,
  orderId,
}: Omit<SearchParams, "pageSize" | "pageNumber">) => {
  const documentTypes: { documentType: PrismaDocumentType }[] = [];

  if (ticket) {
    documentTypes.push({ documentType: PrismaDocumentType.TICKET });
  }

  if (invoice) {
    documentTypes.push({ documentType: PrismaDocumentType.INVOICE });
  }

  if (receipt) {
    documentTypes.push({ documentType: PrismaDocumentType.RECEIPT });
  }

  let orderQuery: string | { in: string[] } | undefined;
  if (typeof orderId === "string") {
    orderQuery = orderId;
  }

  if (Array.isArray(orderId)) {
    orderQuery = { in: orderId };
  }

  return {
    companyId,
    ...(correlative && { number: parseInt(correlative.number) }),
    ...(correlative && { series: correlative.series }),
    ...(startDate && { dateOfIssue: { gte: startDate } }),
    ...(endDate && { dateOfIssue: { lte: endDate } }),
    ...(customerId && { customerId }),
    ...((ticket || invoice || receipt) && { OR: documentTypes }),
    ...(orderQuery && { orderId: orderQuery }),
  };
};

export const getTotal = async ({
  companyId,
  correlative,
  startDate,
  endDate,
  customerId,
  ticket,
  invoice,
  receipt,
}: Omit<SearchParams, "pageSize" | "pageNumber">): Promise<
  response<number>
> => {
  try {
    const total = await prisma().document.count({
      where: buildDocumentQuery({
        companyId,
        correlative,
        startDate,
        endDate,
        customerId,
        ticket,
        invoice,
        receipt,
      }),
    });

    return { success: true, data: total };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const getMany = async ({
  companyId,
  correlative,
  startDate,
  endDate,
  customerId,
  pageNumber,
  pageSize,
  ticket,
  invoice,
  receipt,
  orderId,
}: SearchParams): Promise<response<(Document & { customer?: Customer })[]>> => {
  log.info("get_many_documents", {
    startDate,
    endDate,
    localizedStart: startDate?.toLocaleString(),
    localizedEnd: endDate?.toLocaleString(),
  });
  const prismaDocuments = await prisma().document.findMany({
    where: buildDocumentQuery({
      companyId,
      correlative,
      startDate,
      endDate,
      customerId,
      ticket,
      invoice,
      receipt,
      orderId,
    }),
    skip: pageNumber && pageSize && (pageNumber - 1) * pageSize,
    take: pageSize,
    orderBy: { dateOfIssue: "desc" },
  });

  const customerIds = prismaDocuments
    .map((doc) => doc.customerId)
    .filter((id): id is string => !!id);
  const uniqueCustomerIds = Array.from(customerIds);

  const customers = await Promise.all(
    uniqueCustomerIds.map((id) => findCustomer(id)),
  );

  const customersMap: Record<string, Customer> = {};
  customers.forEach((customer) => {
    if (customer.success) {
      customersMap[customer.data.id] = customer.data;
    }
  });

  const documents = prismaDocuments.map(
    (prismaDocument): Document & { customer?: Customer } => {
      const customerId = prismaDocument.customerId || undefined;
      const document: Document & { customer?: Customer } = {
        ...prismaDocumentToDocument(prismaDocument),
      };

      if (customerId) {
        document.customer = customersMap[customerId];
      }

      return document;
    },
  );

  return { success: true, data: documents };
};

export const update = async (document: Document): Promise<response<Document>> => {
  try {
    const updatedDocument = await prisma().document.update({
      where: { id: document.id },
      data: {
        orderId: document.orderId!,
        companyId: document.companyId,
        customerId: document.customerId,
        discountAmount: document.discountAmount,
        netTotal: document.netTotal,
        total: document.total,
        documentType: DocumentTypeToPrismaMapper[document.documentType],
        series: document.series,
        number: parseInt(document.number),
        status: STATUS_TO_PRISMA_MAPPER[document.status],
        cancellationReason: document.status === "cancelled" ? document.cancellationReason : "",
        dateOfIssue: document.dateOfIssue,
        qr: document.documentType == "ticket" ? undefined : document.qr,
        hash: document.documentType == "ticket" ? undefined : document.hash,
      },
    });

    return { success: true, data: prismaDocumentToDocument(updatedDocument) };
  } catch (e: any) {
    log.error("update_document_failed", {
      document: document,
      orderId: document.orderId,
      error_message: e.message,
    });
    return { success: false, message: e.message };
  }
}

export const updateDocument = async (
  documentId: string,
  data: {
    issuedToTaxEntity?: boolean;
    issuedAt?: Date;
    qr?: string;
    hash?: string;
  }
): Promise<response<Document>> => {
  try {
    const updatedDocument = await prisma().document.update({
      where: { id: documentId },
      data: {
        issuedToTaxEntity: data.issuedToTaxEntity,
        issuedAt: data.issuedAt,
        qr: data.qr,
        hash: data.hash,
      },
    });

    return { success: true, data: prismaDocumentToDocument(updatedDocument) };
  } catch (e: any) {
    log.error("update_document_status_failed", {
      documentId,
      data,
      error_message: e.message,
    });
    return { success: false, message: e.message };
  }
}

export const findDocumentById = async (documentId: string): Promise<response<Document>> => {
  try {
    const document = await prisma().document.findUnique({ 
      where: { id: documentId } 
    });

    if (!document) {
      return errorResponse("Document not found");
    }

    return { success: true, data: prismaDocumentToDocument(document) };
  } catch (e: any) {
    log.error("find_document_by_id_failed", {
      documentId,
      error_message: e.message,
    });
    return { success: false, message: e.message };
  }
}
