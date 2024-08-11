import { Document } from "@/document/types";
import { DocumentType, INVOICE, RECEIPT, TICKET } from "@/order/types";
import { find as findOrder } from "@/order/db_repository";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import PrismaCustomerDocumentType = $Enums.CustomerDocumentType;
import PrismaDocumentType = $Enums.DocumentType;
import {
  type Customer,
  type CustomerDocumentType,
  DNI,
  RUC,
} from "@/customer/types";

const CustomerDocumentTypeToPrismaMapper: Record<
  CustomerDocumentType,
  PrismaCustomerDocumentType
> = {
  [DNI]: PrismaCustomerDocumentType.DNI,
  [RUC]: PrismaCustomerDocumentType.RUC,
};

const PrismaCustomerDocumentTypeMapper: Record<
  PrismaCustomerDocumentType,
  CustomerDocumentType
> = {
  [PrismaCustomerDocumentType.DNI]: DNI,
  [PrismaCustomerDocumentType.RUC]: RUC,
};

const DocumentTypeToPrismaMapper: Record<DocumentType, PrismaDocumentType> = {
  [INVOICE]: PrismaDocumentType.INVOICE,
  [RECEIPT]: PrismaDocumentType.RECEIPT,
  [TICKET]: PrismaDocumentType.TICKET,
};

const PrismaDocumentTypeMapper: Record<PrismaDocumentType, DocumentType> = {
  [PrismaDocumentType.INVOICE]: INVOICE,
  [PrismaDocumentType.RECEIPT]: RECEIPT,
  [PrismaDocumentType.TICKET]: TICKET,
};

export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => {
  try {
    const customerResponse = await prisma.customer.create({
      data: {
        ...customer,
        documentType: CustomerDocumentTypeToPrismaMapper[customer.documentType],
        documentNumber: customer.documentNumber,
        legalName: customer.legalName,
        address: customer.address,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
      },
    });

    /*let createdCustomer: Customer;

    if (createdResponse.documentType === PrismaCustomerDocumentType.DNI) {
      createdCustomer = {
        id: createdResponse.id,
        orderId: customer.orderId,
        documentType: PrismaCustomerDocumentTypeMapper.DNI,
        documentNumber: createdResponse.documentNumber!,
        legalName: createdResponse.legalName,
        address: createdResponse.address!,
        email: createdResponse.email!,
        phoneNumber: createdResponse.phoneNumber!
      }
    } else if (createdResponse.documentType === PrismaCustomerDocumentType.RUC) {
      createdCustomer = {
        id: createdResponse.id,
        orderId: customer.orderId,
        documentType: PrismaCustomerDocumentTypeMapper.RUC,
        documentNumber: createdResponse.documentNumber!,
        legalName: createdResponse.legalName,
        address: createdResponse.address!,
        email: createdResponse.email!,
        phoneNumber: createdResponse.phoneNumber!
      }
    } else {
      throw new Error('Unknown document type');
    }*/

    const createdCustomer: Customer = {
      id: customerResponse.id,
      orderId: customer.orderId,
      documentType:
        PrismaCustomerDocumentTypeMapper[customerResponse.documentType],
      documentNumber: customerResponse.documentNumber!,
      legalName: customerResponse.legalName,
      address: customerResponse.address!,
      email: customerResponse.email!,
      phoneNumber: customerResponse.phoneNumber!,
    };

    if (!createdCustomer) {
      throw new Error("Unknown document type");
    }

    return { success: true, data: createdCustomer };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const createdDocument = async (
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
        customer: true,
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
      order: orderResponse.data,
      customer: { ...document.customer },
    };

    return { success: true, data: createdDocument };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
