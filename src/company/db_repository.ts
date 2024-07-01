import prisma from "@/lib/prisma";

import { Company, Logo } from "@/company/types";
import { response } from "@/lib/types";
import { Company as PrismaCompany } from "@prisma/client";

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
    const { logo, ...companyData } = company

    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: companyData,
    });

    const [foundLogo] = await prisma.logo.findMany({
      where: { companyId: updatedCompany.id },
      orderBy: { createdAt: "desc" },
      take: 1
    })

    if (foundLogo?.id === logo?.id) return { success: true, data: updatedCompany };
    else {
      await prisma.logo.deleteMany({
        where: { companyId: updatedCompany.id },
      })

      await prisma.logo.create({
        data: {...logo!, companyId: company.id},
      })

      return { success: true, data: company };
    }
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

export const deleteCompany = async (
  company: Company,
): Promise<response<Company>> => {
  try {
    const deletedCompany = await prisma.company.delete({
      where: { id: company.id },
    });
    return { success: true, data: deletedCompany };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};



export const find = async (
  id?: string,
): Promise<response<Company>> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { logos: true },
    });

    if (company) {
      return { success: true, data: {...company, logo: company.logos[0]} };
    } else {
      return { success: false, message: "Company not found" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getLogos = async (
  companyId: string,
): Promise<response<Logo[]>> => {
  try {
    const logos = await prisma.logo.findMany({ where: { companyId } });
    return { success: true, data: logos };
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

export const storeLogos = async (
  companyId: string,
  logos: Logo[],
): Promise<response<Logo[]>> => {
  const companyLogosResponse = await getLogos(companyId);

  if (!companyLogosResponse.success)
    return { success: false, message: companyLogosResponse.message };

  const logosToStore = logos.filter(
    (logo) =>
      !(companyLogosResponse.data || []).find((p) => p.key === logo.key),
  );
  try {
    const createdLogos = await Promise.all(
      logosToStore.map((logo) =>
        prisma.logo.create({
          data: {
            ...logo,
            companyId,
          },
        }),
      ),
    );
    return { success: true, data: createdLogos };
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