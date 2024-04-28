"use server";

import { response } from "@/lib/types";
import { Company } from "@/company/types";
import { updateCompany as updateCompanyRepository } from "@/company/db_repository";

export const updateCompany = async (
  company: Company,
): Promise<response<Company>> => {
  const response = await updateCompanyRepository(company);
  if (!response.success) {
    return { success: false, message: "No se pudo editar la empresa" };
  }

  return response;
};
