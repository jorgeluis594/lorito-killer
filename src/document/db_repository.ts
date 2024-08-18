import {
  Document,
  DocumentType,
  INVOICE,
  RECEIPT,
  TICKET,
} from "@/document/types";
import { find as findOrder } from "@/order/db_repository";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import PrismaDocumentType = $Enums.DocumentType;

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
        customerId: document.customer.id,
        total: document.total,
        documentType: DocumentTypeToPrismaMapper[document.documentType],
        series: document.series,
        number: document.number,
        dateOfIssue: document.dateOfIssue,
        broadcastTime: document.broadcastTime,
        observations: document.observations,
      },
      include: {
        order: true,
      },
    });

    const orderResponse = await findOrder(document.orderId);
    if (!orderResponse.success) return orderResponse;

    const createdDocument: Document = {
      id: documentResponse.customerId,
      orderId: documentResponse.orderId,
      customerId: documentResponse.customerId,
      total: +documentResponse.total,
      documentType: PrismaDocumentTypeMapper[documentResponse.documentType],
      series: documentResponse.series,
      number: documentResponse.number,
      dateOfIssue: documentResponse.dateOfIssue,
      broadcastTime: documentResponse.broadcastTime,
      observations: documentResponse.observations,
      customer: { ...document.customer },
    };

    return { success: true, data: createdDocument };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
