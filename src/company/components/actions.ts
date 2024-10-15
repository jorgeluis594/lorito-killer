"use server";

import { response } from "@/lib/types";
import { Company, Logo } from "@/company/types";
import { 
  updateCompany as updateCompanyRepository,
  removeLogo as removeLogoRepository,
  storeLogo as storeLogoRepository,
  getLogo as getLogoRepository,
} from "@/company/db_repository";
import {log} from "@/lib/log";

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
    log.error("logo_removed", {
      logoId,
      response
    });
    return {success: false, message: "No se pudo eliminar el logo"};
  }

  return response;
}

export const storeLogo = async (
  companyId: string,
  logo: Logo
): Promise<response<Logo>> => {
  const response = await storeLogoRepository(companyId, logo)
  if(!response.success) {
    log.error("logo_added", {
      logo,
      response
    })
    return {success: false, message: "No se pudo subir el logo"};
  }

  return response;
}