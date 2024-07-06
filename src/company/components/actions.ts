"use server";

import { response } from "@/lib/types";
import { Company, Logo } from "@/company/types";
import { 
  updateCompany as updateCompanyRepository,
  removeLogo as removeLogoRepository,
  storeLogos as storeLogosRepository
} from "@/company/db_repository";

export const updateCompany = async (
  company: Company,
): Promise<response<Company>> => {
  const response = await updateCompanyRepository(company);
  if (!response.success) {
    return { success: false, message: "No se pudo editar la empresa" };
  }

  return response;
};

export const removeLogo = async (
  companyId: string,
  logoId: string,
): Promise<response<Logo>> => {
  const response = await removeLogoRepository(companyId, logoId)
  if (!response.success) {
    return {success: false, message: "No se pudo eliminar el logo"};
  }

  return response;
}

export const storeLogos = async (
  companyId: string,
  logos: Logo[]
): Promise<response<Logo[]>> => {
  const response = await storeLogosRepository(companyId, logos)
  if(!response.success) {
    return {success: false, message: "No se pudo subir el logo"};
  }

  return response;
}