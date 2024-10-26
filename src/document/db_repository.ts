import {
  BillingCredentials,
  Document,
  DocumentType,
  INVOICE,
  RECEIPT,
  SearchParams,
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

const prismaDocumentToDocument = (prismaDocument: PrismaDocument): Document => {
  let document: Document;
  if (prismaDocument.documentType == "TICKET") {
    document = {
      id: prismaDocument.id,
      companyId: prismaDocument.companyId!,
      orderId: prismaDocument.orderId,
      customerId: prismaDocument.customerId || undefined,
      total: +prismaDocument.total,
      documentType: "ticket",
      series: prismaDocument.series,
      number: prismaDocument.number.toString(),
      dateOfIssue: prismaDocument.dateOfIssue,
      taxTotal: 0,
      netTotal: +prismaDocument.total,
    };
  } else if (prismaDocument.documentType == "RECEIPT") {
    document = {
      id: prismaDocument.id,
      orderId: prismaDocument.orderId,
      companyId: prismaDocument.companyId!,
      customerId: prismaDocument.customerId || undefined,
      total: +prismaDocument.total,
      documentType: "receipt",
      series: prismaDocument.series,
      number: prismaDocument.number.toString(),
      dateOfIssue: prismaDocument.dateOfIssue,
      taxTotal: 0,
      netTotal: +prismaDocument.total,
      qr: prismaDocument.qr!,
      hash: prismaDocument.hash!,
    };
  } else {
    // invoice case
    document = {
      id: prismaDocument.id,
      orderId: prismaDocument.orderId,
      companyId: prismaDocument.companyId!,
      customerId: prismaDocument.customerId!,
      total: +prismaDocument.total,
      documentType: "invoice",
      series: prismaDocument.series,
      number: prismaDocument.number.toString(),
      dateOfIssue: prismaDocument.dateOfIssue,
      taxTotal: 0,
      netTotal: +prismaDocument.total,
      qr: prismaDocument.qr!,
      hash: prismaDocument.hash!,
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
        total: document.total,
        documentType: DocumentTypeToPrismaMapper[document.documentType],
        series: document.series,
        number: parseInt(document.number),
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
  const document = await prisma().document.findUnique({ where: { id } });

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
}: Omit<SearchParams, "pageSize" | "pageNumber">) => {
  return {
    companyId,
    ...(correlative && { number: parseInt(correlative.number) }),
    ...(correlative && { series: correlative.series }),
    ...(startDate && { dateOfIssue: { gte: startDate } }),
    ...(endDate && { dateOfIssue: { lte: endDate } }),
    ...(customerId && { customerId }),
  };
};

export const getTotal = async ({
  companyId,
  correlative,
  startDate,
  endDate,
  customerId,
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
}: SearchParams): Promise<response<(Document & { customer?: Customer })[]>> => {
  const prismaDocuments = await prisma().document.findMany({
    where: buildDocumentQuery({
      companyId,
      correlative,
      startDate,
      endDate,
      customerId,
    }),
    skip: (pageNumber - 1) * pageSize,
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
