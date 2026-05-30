"use server";

import { response } from "@/lib/types";
import { Company, Logo } from "@/company/types";
import { 
  updateCompany as updateCompanyRepository,
  createCompanyWithAdmin as createCompanyWithAdminRepository,
  removeLogo as removeLogoRepository,
  storeLogo as storeLogoRepository,
  getLogo as getLogoRepository,
} from "@/company/db_repository";
import {log} from "@/lib/log";
import { getSession } from "@/lib/auth";
import bcrypt from "bcrypt";
import {
  CreateCompanyWithAdminInput,
  CreateCompanyWithAdminSchema,
} from "@/company/schemas/create-company-with-admin-schema";

type CreatedCompanyWithAdmin = {
  companyId: string;
  userId: string;
  companyName?: string;
  userEmail: string;
};

export const updateCompany = async (
  company: Company,
): Promise<response<Company>> => {
  const response = await updateCompanyRepository(company);
  if (!response.success) {
    return { success: false, message: "No se pudo editar la empresa" };
  }

  return response;
};

export const createCompanyWithAdmin = async (
  input: CreateCompanyWithAdminInput,
): Promise<response<CreatedCompanyWithAdmin>> => {
  const session = await getSession();
  if (!session.user) {
    return { success: false, message: "Debes iniciar sesión" };
  }

  const parsedInput = CreateCompanyWithAdminSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      success: false,
      message: parsedInput.error.issues[0]?.message || "Datos inválidos",
    };
  }

  const hashedPassword = await bcrypt.hash(parsedInput.data.adminPassword, 10);
  return createCompanyWithAdminRepository(parsedInput.data, hashedPassword);
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
