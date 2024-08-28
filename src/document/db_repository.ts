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
    const documentResponse = await prisma.document.create({
      data: {
        orderId: document.orderId,
        customerId: document.customerId,
        total: document.total,
        documentType: DocumentTypeToPrismaMapper[document.documentType],
        series: document.series,
        number: document.number,
        dateOfIssue: document.dateOfIssue,
      },
      include: {
        order: true,
      },
    });

    const createdDocument: Document = {
      id: documentResponse.customerId,
      orderId: documentResponse.orderId,
      customerId: documentResponse.customerId,
      total: +documentResponse.total,
      documentType: PrismaDocumentTypeMapper[documentResponse.documentType],
      series: documentResponse.series,
      number: documentResponse.number,
      dateOfIssue: documentResponse.dateOfIssue,
      taxTotal: 0,
      netTotal: +documentResponse.total,
    };

    return { success: true, data: createdDocument };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

async function getBillingCredentialsFor(
  companyId: string,
): Promise<response<BillingCredentials>> {
  const companyData = await prisma.company.findUnique({
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
}
