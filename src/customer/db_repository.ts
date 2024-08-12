import { DocumentType, INVOICE, RECEIPT, TICKET } from "@/order/types";
import {
  BusinessCustomer,
  type Customer,
  CustomerDocumentType,
  DNI,
  NaturalCustomer,
  RUC,
} from "@/customer/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums } from "@prisma/client";
import PrismaCustomerDocumentType = $Enums.CustomerDocumentType;
import PrismaDocumentType = $Enums.DocumentType;

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
export const createCustomer = async (
  customer: Customer,
): Promise<response<Customer>> => {
  try {
    const documentType =
      CustomerDocumentTypeToPrismaMapper[customer.documentType];
    const customerCreatedResponse = await prisma.customer.create({
      data: {
        ...customer,
        documentType: documentType,
        documentNumber: customer.documentNumber,
        legalName:
          documentType == "RUC"
            ? (customer as BusinessCustomer).legalName
            : (customer as NaturalCustomer).fullName,
        address: customer.address,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
      },
    });

    let createdCustomer: Customer;

    if (
      customerCreatedResponse.documentType === PrismaCustomerDocumentType.DNI
    ) {
      const naturalCustomer: NaturalCustomer = {
        id: customerCreatedResponse.id,
        documentType: DNI,
        documentNumber: customerCreatedResponse.documentNumber || undefined,
        fullName: customerCreatedResponse.legalName,
        address: customerCreatedResponse.address || undefined,
        email: customerCreatedResponse.email || undefined,
        phoneNumber: customerCreatedResponse.phoneNumber || undefined,
      };
    } else if (
      createdResponse.documentType === PrismaCustomerDocumentType.RUC
    ) {
      createdCustomer = {
        id: createdResponse.id,
        documentType: PrismaCustomerDocumentTypeMapper.RUC,
        documentNumber: createdResponse.documentNumber!,
        legalName: createdResponse.legalName,
        address: createdResponse.address!,
        email: createdResponse.email!,
        phoneNumber: createdResponse.phoneNumber!,
      };
    } else {
      throw new Error("Unknown document type");
    }

    /*    const createdCustomer: Customer = {
      id: customerResponse.id,
      documentType:
        PrismaCustomerDocumentTypeMapper[customerResponse.documentType],
      documentNumber: customerResponse.documentNumber!,
      legalName: customerResponse.legalName,
      address: customerResponse.address!,
      email: customerResponse.email!,
      phoneNumber: customerResponse.phoneNumber!,
    };*/

    if (!createdCustomer) {
      throw new Error("Unknown document type");
    }

    return { success: true, data: createdCustomer };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
