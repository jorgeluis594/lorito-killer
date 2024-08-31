import {response} from "@/lib/types";
import prisma from "@/lib/prisma";
import PrismaLocalityType = $Enums.LocalityLevel;
import {$Enums} from "@prisma/client";
import {COUNTRY, DEPARTMENT, DISTRICT, Locality, LocalityLevelType, PROVINCE} from "@/locality/types";

const CustomerDocumentTypeToPrismaMapper: Record<
  PrismaLocalityType,
  LocalityLevelType
> = {
  [PrismaLocalityType.COUNTRY]: COUNTRY,
  [PrismaLocalityType.DEPARTMENT]: DEPARTMENT,
  [PrismaLocalityType.PROVINCE]: PROVINCE,
  [PrismaLocalityType.DISTRICT]: DISTRICT,
};

export const find = async (id: string): Promise<response<Locality>> => {
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
}