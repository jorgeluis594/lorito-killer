import { CustomerCreateRepository, Document} from "@/document/types"
import {response} from "@/lib/types";
import prisma from "@/lib/prisma";

export const createCustomer = async (
  customer: CustomerCreateRepository
): Promise<response<CustomerCreateRepository>> => {
  try {
    const createdResponse = await prisma.customer.create({data: customer})

    const createdCustomer: CustomerCreateRepository = {
      ...createdResponse,
      orderId: createdResponse.orderId,
      documentType: "ruc",
      documentNumber: createdResponse.documentNumber,
      legalName: createdResponse.legalName,
      countryCode: createdResponse.countyCode,
      address: createdResponse.address,
      email: createdResponse.email,
      phoneNumber: createdResponse.phoneNumber,
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
    const createdCustomerResponse = await createCustomer(customer);

    if (!createdCustomerResponse.success) {
      throw new Error(createdCustomerResponse.message);
    }

    const createdResponse = await prisma.document.create({
      data: {
        ...documentData,
        order: {
          connect: { id: order.id },
        },
        customer: {
          connect: { id: createdCustomerResponse.data.id },
        },
      },
    });
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