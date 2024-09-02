import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import { $Enums, Locality as PrismaLocality, Prisma } from "@prisma/client";
import {
  COUNTRY,
  DEPARTMENT,
  DISTRICT,
  Locality,
  LocalityLevelType,
  PROVINCE,
  TypeCountryType,
  TypeDepartmentType,
  TypeDistrictType,
  TypeProvinceType,
  LocalityLevelMap,
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

export const PRISMA_LOCALITY_LEVEL_TYPE_MAPPER: Record<
  LocalityLevelType,
  $Enums.LocalityLevel
> = {
  Country: "COUNTRY",
  Department: "DEPARTMENT",
  Province: "PROVINCE",
  District: "DISTRICT",
} as const;

const prismaToLocality = async (
  prismaLocality: PrismaLocality,
): Promise<Locality> => {
  if (prismaLocality.level === "COUNTRY") {
    return {
      _brand: "Country",
      id: prismaLocality.id,
      geoCode: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      level: COUNTRY,
      parentId: prismaLocality.parentId,
    };
  } else if (prismaLocality.level === "DEPARTMENT") {
    return {
      _brand: "Department",
      id: prismaLocality.id,
      geoCode: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      level: DEPARTMENT,
      parentId: prismaLocality.parentId!,
    };
  } else if (prismaLocality.level === "PROVINCE") {
    return {
      _brand: "Province",
      id: prismaLocality.id,
      geoCode: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      level: PROVINCE,
      parentId: prismaLocality.parentId!,
    };
  } else {
    const foundProvince = await prisma.locality.findUnique({
      where: { idUbigeo: prismaLocality.parentId! },
    });

    const foundDepartment = await prisma.locality.findUnique({
      where: { idUbigeo: foundProvince!.parentId! },
    });

    return {
      _brand: "District",
      id: prismaLocality.id,
      geoCode: prismaLocality.idUbigeo,
      name: prismaLocality.name,
      provinceName: foundProvince!.name,
      departmentName: foundDepartment!.name,
      level: DISTRICT,
      parentId: prismaLocality.parentId!,
    };
  }
};

export const getMany = async ({
  q,
  localityLevel,
}: {
  q?: string | null;
  localityLevel?:
    | TypeCountryType
    | TypeDepartmentType
    | TypeProvinceType
    | TypeDistrictType;
}): Promise<response<Locality[]>> => {
  try {
    const query: Prisma.LocalityFindManyArgs = {
      take: 20,
      orderBy: [{ name: "asc" }],
    };

    if (localityLevel) {
      query.where = {
        ...query.where,
        level: PRISMA_LOCALITY_LEVEL_TYPE_MAPPER[localityLevel],
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
