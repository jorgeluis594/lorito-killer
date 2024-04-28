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
