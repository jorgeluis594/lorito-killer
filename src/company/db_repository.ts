import prisma from "@/lib/prisma";

import { Company, Logo } from "@/company/types";
import { response } from "@/lib/types";
import { log } from "@/lib/log";
import { BillingCredentials } from "@/document/types";
import type { CreateCompanyWithAdminInput } from "@/company/schemas/create-company-with-admin-schema";

type CreatedCompanyWithAdmin = {
  companyId: string;
  userId: string;
  companyName?: string;
  userEmail: string;
};

const buildBillingCredentials = (
  input: CreateCompanyWithAdminInput,
): Pick<BillingCredentials, "ticketSerialNumber"> & Partial<BillingCredentials> => {
  const billingCredentials: Pick<BillingCredentials, "ticketSerialNumber"> &
    Partial<BillingCredentials> = {
    ticketSerialNumber: input.ticketSerialNumber,
  };

  if (input.billingToken) billingCredentials.billingToken = input.billingToken;
  if (input.customerSearchToken) {
    billingCredentials.customerSearchToken = input.customerSearchToken;
  }
  if (input.invoiceSerialNumber) {
    billingCredentials.invoiceSerialNumber = input.invoiceSerialNumber;
  }
  if (input.invoiceStartsOnNumber) {
    billingCredentials.invoiceStartsOnNumber = input.invoiceStartsOnNumber;
  }
  if (input.receiptSerialNumber) {
    billingCredentials.receiptSerialNumber = input.receiptSerialNumber;
  }
  if (input.receiptStartsOnNumber) {
    billingCredentials.receiptStartsOnNumber = input.receiptStartsOnNumber;
  }
  if (input.establishmentCode) {
    billingCredentials.establishmentCode = input.establishmentCode;
  }

  return billingCredentials;
};

export const createCompany = async (
  company: Company,
): Promise<response<Company>> => {
  try {
    const { logo, ...companyData } = company;
    const storedCompany = await prisma().company.create({
      data: { ...companyData },
    });

    if (logo)
      await prisma().logo.create({
        data: { ...logo, companyId: storedCompany.id },
      });

    return {
      success: true,
      data: {
        ...company,
        ...storedCompany,
        name: storedCompany.name || undefined,
        subName: storedCompany.subName || undefined,
        phone: storedCompany.phone || undefined,
        email: storedCompany.email || undefined,
        department: storedCompany.department || undefined,
        district: storedCompany.district || undefined,
        provincial: storedCompany.provincial || undefined,
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
    const updatedCompany = await prisma().company.update({
      where: { id: company.id },
      data: {
        id: company.id,
        name: company.name,
        subName: company.subName,
        department: company.department,
        district: company.district,
        provincial: company.provincial,
        phone: company.phone,
        email: company.email,
        ruc: company.ruc || undefined,
        address: company.address,
        subdomain: company.subdomain || "some_subdomain",
      },
    });

    return {
      success: true,
      data: {
        ...company,
        ...updatedCompany,
        name: updatedCompany.name || undefined,
        subName: updatedCompany.subName || undefined,
        phone: updatedCompany.phone || undefined,
        email: updatedCompany.email || undefined,
        department: updatedCompany.department || undefined,
        district: updatedCompany.district || undefined,
        provincial: updatedCompany.provincial || undefined,
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

export const createCompanyWithAdmin = async (
  input: CreateCompanyWithAdminInput,
  hashedPassword: string,
): Promise<response<CreatedCompanyWithAdmin>> => {
  try {
    const result = await prisma().$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.name,
          subName: input.subName,
          department: input.department,
          district: input.district,
          provincial: input.provincial,
          phone: input.phone,
          email: input.email,
          ruc: input.ruc,
          address: input.address,
          subdomain: input.subdomain,
          billingCredentials: buildBillingCredentials(input),
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: input.adminName,
          email: input.adminEmail,
          password: hashedPassword,
          role: "ADMIN",
          active: true,
        },
      });

      return {
        companyId: company.id,
        userId: user.id,
        companyName: company.name || undefined,
        userEmail: user.email,
      };
    });

    return { success: true, data: result };
  } catch (e: any) {
    if (e.code === "P2002") {
      const target = Array.isArray(e.meta?.target)
        ? e.meta.target.join(",")
        : String(e.meta?.target || "");

      if (target.includes("email")) {
        return { success: false, message: "El email del administrador ya existe" };
      }

      if (target.includes("subdomain")) {
        return { success: false, message: "El subdominio ya existe" };
      }
    }

    log.error("create_company_with_admin_failed", {
      error_message: e.message,
      subdomain: input.subdomain,
      adminEmail: input.adminEmail,
    });
    return { success: false, message: "No se pudo crear la empresa" };
  }
};

export const getCompany = async (id: string): Promise<response<Company>> => {
  try {
    const company = await prisma().company.findUnique({
      where: { id },
      include: { logos: true },
    });

    if (!company) {
      return { success: false, message: "Company not found" };
    }

    const { billingCredentials, ...companyData } = company;

    return {
      success: true,
      data: {
        ...companyData,
        logo: company.logos[0],
        ruc: company.ruc || undefined,
        name: company.name || undefined,
        subName: company.subName || undefined,
        phone: company.phone || undefined,
        email: company.email || undefined,
        department: company.department || undefined,
        district: company.district || undefined,
        provincial: company.provincial || undefined,
        subdomain: company.subdomain || "some_subdomain",
        active: company.active,
        isBillingActivated:
          !!billingCredentials &&
          !!(billingCredentials as unknown as BillingCredentials)[
            "billingToken"
          ],
      },
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const getLogo = async (
  compnayId: string,
  logoId: string,
): Promise<response<Logo>> => {
  try {
    const logo = await prisma().logo.findUnique({ where: { id: logoId } });
    if (!logo) return { success: false, message: "Logo not found" };
    return { success: true, data: logo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const storeLogo = async (
  companyId: string,
  newLogo: Logo,
): Promise<response<Logo>> => {
  try {
    const logo = await prisma().logo.findFirst({
      where: { companyId: companyId },
    });
    if (logo) {
      await prisma().logo.delete({ where: { id: logo.id } });
    }
    const createdLogo = await prisma().logo.create({
      data: {
        id: newLogo.id,
        key: newLogo.key,
        name: newLogo.name,
        url: newLogo.url,
        type: newLogo.type,
        size: newLogo.size,
        companyId: companyId,
      },
    });
    return { success: true, data: createdLogo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const removeLogo = async (
  companyId: string,
  logoId: string,
): Promise<response<Logo>> => {
  const logoResponse = await getLogo(companyId, logoId);
  if (!logoResponse.success) return logoResponse;

  try {
    await prisma().logo.delete({
      where: { id: logoId, companyId: companyId },
    });
    return { success: true, data: logoResponse.data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
