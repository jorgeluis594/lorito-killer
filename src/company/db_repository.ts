import prisma from "@/lib/prisma";

import { Company, Logo } from "@/company/types";
import { response } from "@/lib/types";
import { log } from "@/lib/log";
import { BillingCredentials } from "@/document/types";

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
        subName: company.subName || undefined,
        phone: company.phone || undefined,
        email: company.email || undefined,
        department: company.department || undefined,
        district: company.district || undefined,
        provincial: company.provincial || undefined,
        subdomain: company.subdomain || "some_subdomain",
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
