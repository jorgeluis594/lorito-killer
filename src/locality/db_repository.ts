import {response} from "@/lib/types";
import prisma from "@/lib/prisma";
import {$Enums, Locality as PrismaLocality, Prisma} from "@prisma/client";
import {
  COUNTRY,
  DEPARTMENT,
  DISTRICT,
  Locality,
  LocalityLevelType,
  PROVINCE,
  TypecountryType,
  TypeDepartmentType,
  TypeDistrictType,
  TypeProvinceType
} from "@/locality/types";
import PrismaLocalityType = $Enums.LocalityLevel;

const CustomerDocumentTypeToPrismaMapper: Record<
  PrismaLocalityType,
  LocalityLevelType
> = {
  [PrismaLocalityType.COUNTRY]: COUNTRY,
  [PrismaLocalityType.DEPARTMENT]: DEPARTMENT,
  [PrismaLocalityType.PROVINCE]: PROVINCE,
  [PrismaLocalityType.DISTRICT]: DISTRICT,
};

const prismaToLocality = async (
  prismaLocality: PrismaLocality,
): Promise<Locality> => {
  if (prismaLocality.level === "COUNTRY") {
    return {
      _branch: "COUNTRY",
      id: prismaLocality.id,
      idUbigeo: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      code: prismaLocality.code,
      tag: prismaLocality.tag,
      searchValue: prismaLocality.searchValue,
      level: COUNTRY,
      parentId: prismaLocality.parentId,
    };
  } else if (prismaLocality.level === "DEPARTMENT"){
    return {
      _branch: "DEPARTMENT",
      id: prismaLocality.id,
      idUbigeo: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      code: prismaLocality.code,
      tag: prismaLocality.tag,
      searchValue: prismaLocality.searchValue,
      level: DEPARTMENT,
      parentId: prismaLocality.parentId,
    };
  } else if (prismaLocality.level === "PROVINCE"){
    return {
      _branch: "PROVINCE",
      id: prismaLocality.id,
      idUbigeo: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      code: prismaLocality.code,
      tag: prismaLocality.tag,
      searchValue: prismaLocality.searchValue,
      level: PROVINCE,
      parentId: prismaLocality.parentId,
    };
  } else{
    return {
      _branch: "DISTRICT",
      id: prismaLocality.id,
      idUbigeo: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      code: prismaLocality.code,
      tag: prismaLocality.tag,
      searchValue: prismaLocality.searchValue,
      level: DISTRICT,
      parentId: prismaLocality.parentId,
    };
  }
};


export const getMany = async ({
  q,
  localityLevel,
}: {
  q?: string | null;
  localityLevel?: TypecountryType | TypeDepartmentType | TypeProvinceType | TypeDistrictType;
}): Promise<response<Locality[]>> => {
  try {
    const query: Prisma.LocalityFindManyArgs = {
      take: 20,
      orderBy: [{ name: "asc" }],
    };

    if (localityLevel) {
      query.where = {
        ...query.where,
      };
    }

    if (q)
      query.where = {
        ...query.where,
        name: { contains: q, mode: "insensitive" },
      };

    const result = await prisma.locality.findMany({
      ...query,
    });
    const locality = await Promise.all(result.map(prismaToLocality));

    return { success: true, data: locality };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/*export const find = async (id: string): Promise<response<Locality>> => {
  try {
    const findLocality = await prisma.locality.findUnique({ where: { id: id } });
    if (!findLocality) {
      return { success: false, message: "Order not found" };
    }

    const responseLocality: Locality = {
      id: findLocality.id,
      idUbigeo: findLocality.idUbigeo,
      name: findLocality.name,
      code: findLocality.code,
      tag: findLocality.tag,
      searchValue: findLocality.searchValue,
      level: CustomerDocumentTypeToPrismaMapper[findLocality.level],
      parentId: findLocality.parentId || null,
    }

    return { success: true, data: responseLocality };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}*/