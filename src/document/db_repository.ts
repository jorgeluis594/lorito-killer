import {
  BillingCredentials,
  Document,
  DocumentType,
  INVOICE,
  RECEIPT,
  TICKET,
} from "@/document/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import PrismaDocumentType = $Enums.DocumentType;
import { isEmpty } from "@/lib/utils";
import { log } from "@/lib/log";

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
export const createDocument = async (
  document: Document,
): Promise<response<Document>> => {
  try {
    const documentResponse = await prisma().document.create({
      data: {
        orderId: document.orderId!,
        customerId: document.customerId,
        total: document.total,
        documentType: DocumentTypeToPrismaMapper[document.documentType],
        series: document.series,
        number: document.number,
        dateOfIssue: document.dateOfIssue,
        qr: document.documentType == "ticket" ? undefined : document.qr,
        hash: document.documentType == "ticket" ? undefined : document.hash,
      },
    });

    let createdDocument: Document;
    if (document.documentType == "ticket") {
      createdDocument = {
        id: documentResponse.id,
        orderId: documentResponse.orderId,
        customerId: documentResponse.customerId || undefined,
        total: +documentResponse.total,
        documentType: "ticket",
        series: documentResponse.series,
        number: documentResponse.number,
        dateOfIssue: documentResponse.dateOfIssue,
        taxTotal: 0,
        netTotal: +documentResponse.total,
      };
    } else if (document.documentType == "receipt") {
      createdDocument = {
        id: documentResponse.id,
        orderId: documentResponse.orderId,
        customerId: documentResponse.customerId || undefined,
        total: +documentResponse.total,
        documentType: document.documentType,
        series: documentResponse.series,
        number: documentResponse.number,
        dateOfIssue: documentResponse.dateOfIssue,
        taxTotal: 0,
        netTotal: +documentResponse.total,
        qr: documentResponse.qr!,
        hash: documentResponse.hash!,
      };
    } else {
      // invoice case
      createdDocument = {
        id: documentResponse.id,
        orderId: documentResponse.orderId,
        customerId: documentResponse.customerId!,
        total: +documentResponse.total,
        documentType: document.documentType,
        series: documentResponse.series,
        number: documentResponse.number,
        dateOfIssue: documentResponse.dateOfIssue,
        taxTotal: 0,
        netTotal: +documentResponse.total,
        qr: documentResponse.qr!,
        hash: documentResponse.hash!,
      };
    }

    return { success: true, data: createdDocument };
  } catch (e: any) {
    log.error("persist_document_failed", {
      document: document,
      orderId: document.orderId,
      error_message: e.message,
    });
    return { success: false, message: e.message };
  }
};

export const getLatestDocumentNumber = async (
  serialNumber: string,
): Promise<response<number | undefined>> => {
  try {
    const document = await prisma().document.findFirst({
      where: { series: serialNumber },
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

export const getBillingCredentialsFor = async (
  companyId: string,
): Promise<response<BillingCredentials>> => {
  const companyData = await prisma().company.findUnique({
    where: { id: companyId },
    select: { billingCredentials: true },
  });

  if (!companyData || isEmpty(companyData.billingCredentials)) {
    return { success: false, message: "Credentials not found" };
  }

  const credentials =
    companyData.billingCredentials as unknown as BillingCredentials;

  return {
    success: true,
    data: credentials,
  };
};
