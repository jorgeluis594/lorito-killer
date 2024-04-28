import prisma from "@/lib/prisma";

import { Company } from "@/company/types";
import { response } from "@/lib/types";

export const createCompany = async (
  company: Company,
): Promise<response<Company>> => {
  try {
    const storedCompany = await prisma.company.create({
      data: company,
    });

    return { success: true, data: storedCompany };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const updateCompany = async (
  company: Company,
): Promise<response<Company>> => {
  try {
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: company,
    });

    return { success: true, data: updatedCompany };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const getCompany = async (id: string): Promise<response<Company>> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return { success: false, message: "Company not found" };
    }

    return { success: true, data: company };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
