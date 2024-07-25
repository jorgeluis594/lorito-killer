import {Customer, Document, DocumentType, DNI, RUC} from "@/document/types"
import {response} from "@/lib/types";
import prisma from "@/lib/prisma";
import {$Enums} from "@prisma/client";
import PrismaCustomerDocumentType = $Enums.CustomerDocumentType

const CustomerDocumentTypeToPrismaMapper: Record<DocumentType, PrismaCustomerDocumentType> = {
  [DNI]: PrismaCustomerDocumentType.DNI,
  [RUC]: PrismaCustomerDocumentType.RUC
}

const PrismaCustomerDocumentTypeMapper: Record<PrismaCustomerDocumentType, DocumentType> = {
  [PrismaCustomerDocumentType.DNI]: DNI,
  [PrismaCustomerDocumentType.RUC]: RUC,
}

export const createCustomer = async (
  customer: Customer
): Promise<response<Customer>> => {
  try {
    const createdResponse = await prisma.customer.create({data: {
      ...customer,
        documentType: CustomerDocumentTypeToPrismaMapper[customer.documentType],
        documentNumber: customer.documentNumber,
        legalName: customer.legalName,
        address: customer.address,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
    }})

    let createdCustomer: Customer;

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
    } else if(createdResponse.documentType === PrismaCustomerDocumentType.RUC) {
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
    }else {
      throw new Error('Unknown document type');
    }

    return {success: true, data: createdCustomer};

  } catch (e: any) {
    return {success: false, message: e.message};
  }
};

export const create = async (
  document: Document
): Promise<response<Document>> => {
  try {
    const {customer, order, ...documentData} = document

    const createdResponse = await prisma.document.create({data: document})

    const createdDocument: Document = {
      ...createdResponse,
      total: order.total,
      order: order,
      customer: customer,
    }


    return {success: true, data: createdDocument};

  } catch (e: any) {
    return {success: false, message: e.message};
  }
};