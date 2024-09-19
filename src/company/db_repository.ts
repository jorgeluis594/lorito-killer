import prisma from "@/lib/prisma";

import { Company } from "@/company/types";
import { response } from "@/lib/types";
import { log } from "@/lib/log";

export const createCompany = async (
  company: Company,
): Promise<response<Company>> => {
  try {
    const storedCompany = await prisma.company.create({
      data: company,
    });

    return {
      success: true,
      data: {
        ...storedCompany,
        ruc: storedCompany.ruc || undefined,
        subdomain: storedCompany.subdomain || "some_subdomain",
      },
    };
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

    return {
      success: true,
      data: {
        ...updatedCompany,
        ruc: updatedCompany.ruc || undefined,
        subdomain: company.subdomain || "some_subdomain",
      },
    };
  } catch (e: any) {
    log.error("update_company_failed", {
      company: company,
      error_message: e.message,
    });
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

    return {
      success: true,
      data: {
        ...company,
        ruc: company.ruc || undefined,
        subdomain: company.subdomain || "some_subdomain",
      },
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};
