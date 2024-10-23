import {
  BusinessCustomer,
  type Customer,
  CustomerDocumentType,
  DNI,
  NaturalCustomer,
  RUC,
  TypeBusinessCustomerType,
  TypeNaturalCustomerType,
} from "@/customer/types";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums, Customer as PrismaCustomer, Prisma } from "@prisma/client";
import { isBusinessCustomer, isNaturalCustomer } from "@/customer/utils";
import PrismaCustomerDocumentType = $Enums.CustomerDocumentType;

const CustomerDocumentTypeToPrismaMapper: Record<
  CustomerDocumentType,
  PrismaCustomerDocumentType
> = {
  [DNI]: PrismaCustomerDocumentType.DNI,
  [RUC]: PrismaCustomerDocumentType.RUC,
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

    const { _branch, fullName, legalName, ...customerData } = {
      fullName: undefined,
      legalName: undefined,
      ...customer,
    };

    const customerCreatedResponse = await prisma().customer.create({
      data: {
        id: customerData.id,
        geoCode: customerData.geoCode,
        documentType: documentType,
        companyId: customer.companyId,
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
        companyId: customerCreatedResponse.companyId,
        documentType: "ruc",
        documentNumber: customerCreatedResponse.documentNumber!,
        legalName: customerCreatedResponse.legalName!,
        address: customerCreatedResponse.address!,
        provinceName: "", // Improve this, find a better way to handle localities and address
        departmentName: "", // Improve this, find a better way to handle localities and address
        districtName: "", // Improve this, find a better way to handle localities and address
        geoCode: customerCreatedResponse.geoCode!,
        email: customerCreatedResponse.email!,
        phoneNumber: customerCreatedResponse.phoneNumber!,
      };

      return { success: true, data: businessCustomer };
    } else if (isNaturalCustomer(customer)) {
      const naturalCustomer: NaturalCustomer = {
        _branch: "NaturalCustomer",
        id: customerCreatedResponse.id,
        companyId: customerCreatedResponse.companyId,
        documentType: "dni",
        documentNumber: customerCreatedResponse.documentNumber!,
        geoCode: customerCreatedResponse.geoCode || undefined,
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

export const findByDocumentNumber = async (
  companyId: string,
  documentNumber: string,
): Promise<response<Customer>> => {
  try {
    const customer = await prisma().customer.findMany({
      where: { documentNumber, companyId },
    });

    if (customer) {
      return { success: true, data: await prismaToCustomer(customer[0]) };
    } else {
      return { success: false, message: "Customer not found" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getMany = async ({
  companyId,
  q,
  customerType,
}: {
  companyId: string;
  q?: string | null;
  customerType?: TypeNaturalCustomerType | TypeBusinessCustomerType;
}): Promise<response<Customer[]>> => {
  try {
    const query: Prisma.CustomerFindManyArgs = {
      where: {
        companyId,
      },
      take: 20,
      orderBy: [{ legalName: "asc" }],
    };

    if (customerType) {
      query.where = {
        ...query.where,
      };
    }

    if (q)
      query.where = {
        ...query.where,
        OR: [
          {
            legalName: { contains: q, mode: "insensitive" },
          },
          {
            documentNumber: { contains: q, mode: "insensitive" },
          },
        ],
      };

    const result = await prisma().customer.findMany({
      ...query,
    });
    const customer = await Promise.all(result.map(prismaToCustomer));

    return { success: true, data: customer };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const prismaToCustomer = async (
  prismaCustomer: PrismaCustomer,
): Promise<Customer> => {
  if (prismaCustomer.documentType === "RUC") {
    return {
      _branch: "BusinessCustomer",
      id: prismaCustomer.id,
      companyId: prismaCustomer.companyId,
      documentType: "ruc",
      documentNumber: prismaCustomer.documentNumber!,
      legalName: prismaCustomer.legalName!,
      address: prismaCustomer.address!,
      geoCode: prismaCustomer.geoCode!,
      email: prismaCustomer.email!,
      provinceName: "", // TODO: Improve this, find a better way to handle localities
      districtName: "", // TODO: Improve this, find a better way to handle localities
      departmentName: "", // TODO: Improve this, find a better way to handle localities
      phoneNumber: prismaCustomer.phoneNumber!,
    };
  } else {
    return {
      _branch: "NaturalCustomer",
      id: prismaCustomer.id,
      companyId: prismaCustomer.companyId,
      documentType: "dni",
      documentNumber: prismaCustomer.documentNumber!,
      fullName: prismaCustomer.legalName!,
      address: prismaCustomer.address!,
      geoCode: prismaCustomer.geoCode || undefined,
      email: prismaCustomer.email!,
      phoneNumber: prismaCustomer.phoneNumber!,
    };
  }
};
