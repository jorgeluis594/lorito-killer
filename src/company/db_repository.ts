import prisma from "@/lib/prisma";

import { Company, Logo } from "@/company/types";
import { response } from "@/lib/types";

export const createCompany = async (
  company: Company,
): Promise<response<Company>> => {
  try {
    const { logo, ...companyData } = company
    const storedCompany = await prisma.company.create({
      data: { ...companyData },
    });

    if (logo) await prisma.logo.create({ data: { ...logo, companyId: storedCompany.id } })

    return { success: true, data: storedCompany };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const updateCompany = async (
  company: Company,
): Promise<response<Company>> => {
  try {
    //debugger
    const { logo, ...companyData } = company

    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: companyData,
    });

    // const [foundLogo] = await prisma.logo.findMany({
    //   where: { companyId: updatedCompany.id },
    //   orderBy: { createdAt: "asc" },
    //   take: 1
    // })

    // if (foundLogo?.id === logo?.id) {
    //   return { success: true, data: updatedCompany };
    // } else {
    //   await prisma.logo.deleteMany({
    //     where: { companyId: updatedCompany.id },
    //   })
    //
    //   await prisma.logo.create({
    //     data: { ...logo!, companyId: company.id },
    //   })
    //
    //   return { success: true, data: company };
    // }

    return { success: true, data: updatedCompany };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const getCompany = async (id: string): Promise<response<Company>> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { logos: true},
    });

    if (!company) {
      return { success: false, message: "Company not found" };
    }

    const companyResponse: Company = {
      id: company.id,
      address: company.address,
      name: company.name,
      email: company.email,
      phone: company.phone,
      logo: company.logos[0],
    }

    return { success: true, data: companyResponse };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};

export const find = async (
  id: string,
): Promise<response<Company>> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { logos: true },
    });

    if (company) {
      return { success: true, data: { ...company, logo: company.logos[0] } };
    } else {
      return { success: false, message: "Company not found" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getLogo = async (
  compnayId: string,
  logoId: string,
): Promise<response<Logo>> => {
  try {
    const logo = await prisma.logo.findUnique({ where: { id: logoId } });
    if (!logo) return { success: false, message: "Logo not found" };
    return { success: true, data: logo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getStoreLogo = async (
  companyId: string,
): Promise<response<Logo>> => {
  try {
    const logo = await prisma.logo.findFirst({ where: { companyId } });
    if (!logo) return { success: false, message: "Logo not found" };
    return { success: true, data: logo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const storeLogo = async (
  companyId: string,
  logo: Logo,
): Promise<response<Logo>> => {
  debugger
  try {
    const logoResponse = await getStoreLogo(companyId);
    if (logoResponse.success) {
      return {
      success: true,
      data: {
        id: logoResponse.data.id,
        name: logoResponse.data.name,
        size: logoResponse.data.size,
        type: logoResponse.data.type,
        url: logoResponse.data.url,
        key: logoResponse.data.key,
      },};
    }else {
    const createdLogo = await prisma.logo.create({
          data: {
            name: logo.name,
            size: logo.size,
            type: logo.type,
            url: logo.url,
            key: logo.key,
            companyId,
          },
        })
    return { success: true, data: createdLogo };}
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
    await prisma.logo.delete({
      where: { id: logoId, companyId: companyId },
    });
    return { success: true, data: logoResponse.data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};