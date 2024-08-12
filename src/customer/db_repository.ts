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
import { isBusinessCustomer, isNaturalCustomer } from "@/customer/utils";

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
    const documentType = customer.documentType
      ? CustomerDocumentTypeToPrismaMapper[customer.documentType]
      : undefined;

    let customerName: string;
    if (isBusinessCustomer(customer)) {
      customerName = customer.legalName;
    } else if (isNaturalCustomer(customer)) {
      customerName = customer.fullName;
    } else {
      return { success: false, message: "Unknown customer type" };
    }

    const customerCreatedResponse = await prisma.customer.create({
      data: {
        ...customer,
        documentType: documentType,
        documentNumber: customer.documentNumber,
        legalName: customerName,
        address: customer.address,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
      },
    });

    if (isBusinessCustomer(customer)) {
      const businessCustomer: BusinessCustomer = {
        _branch: "BusinessCustomer",
        id: customerCreatedResponse.id,
        documentType: "ruc",
        documentNumber: customerCreatedResponse.documentNumber!,
        legalName: customerCreatedResponse.legalName!,
        address: customerCreatedResponse.address!,
        geoCode: "",
        email: customerCreatedResponse.email!,
        phoneNumber: customerCreatedResponse.phoneNumber!,
      };

      return { success: true, data: businessCustomer };
    } else if (isNaturalCustomer(customer)) {
      const naturalCustomer: NaturalCustomer = {
        _branch: "NaturalCustomer",
        id: customerCreatedResponse.id,
        documentType: "dni",
        documentNumber: customerCreatedResponse.documentNumber!,
        geoCode: "",
        fullName: customerCreatedResponse.legalName!,
        address: customerCreatedResponse.address!,
        email: customerCreatedResponse.email!,
        phoneNumber: customerCreatedResponse.phoneNumber!,
      };

      return { success: true, data: naturalCustomer };
    } else {
      return { success: false, message: "Unknown customer type" };
    }
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
