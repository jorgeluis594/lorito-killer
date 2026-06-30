import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import type { CreateSellerParams, Seller } from "@/seller/types";

const sellerSelect = {
  id: true,
  companyId: true,
  name: true,
  email: true,
  active: true,
  sellerCode: true,
} as const;

const toSeller = (seller: {
  id: string;
  companyId: string | null;
  name: string | null;
  email: string;
  active: boolean;
  sellerCode: string | null;
}): Seller => ({
  ...seller,
  companyId: seller.companyId ?? "",
  sellerCode: seller.sellerCode ?? "",
});

export async function findSellers(companyId: string): Promise<response<Seller[]>> {
  try {
    const sellers = await prisma().user.findMany({
      where: { companyId, role: "SELLER" },
      orderBy: [{ active: "desc" }, { name: "asc" }, { email: "asc" }],
      select: sellerSelect,
    });

    return { success: true, data: sellers.map(toSeller) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function sellerCodeExists(
  companyId: string,
  sellerCode: string,
  excludedSellerId?: string,
): Promise<response<boolean>> {
  try {
    const seller = await prisma().user.findFirst({
      where: {
        companyId,
        sellerCode,
        ...(excludedSellerId ? { id: { not: excludedSellerId } } : {}),
      },
      select: { id: true },
    });

    return { success: true, data: Boolean(seller) };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function findActiveSellerByCode(
  companyId: string,
  sellerCode: string,
): Promise<response<Seller | null>> {
  try {
    const seller = await prisma().user.findFirst({
      where: {
        companyId,
        role: "SELLER",
        active: true,
        sellerCode,
      },
      select: sellerSelect,
    });

    return { success: true, data: seller ? toSeller(seller) : null };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createSeller(
  seller: CreateSellerParams,
): Promise<response<Seller>> {
  try {
    const createdSeller = await prisma().user.create({
      data: {
        companyId: seller.companyId,
        email: seller.email,
        password: seller.password,
        name: seller.name?.trim() || "",
        role: "SELLER",
        sellerCode: seller.sellerCode,
      },
      select: sellerSelect,
    });

    return { success: true, data: toSeller(createdSeller) };
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target
        : [];

      if (target.includes("email")) {
        return { success: false, message: "El usuario ya existe" };
      }

      if (target.includes("companyId") && target.includes("sellerCode")) {
        return { success: false, message: "Ese codigo ya esta asignado" };
      }

      return {
        success: false,
        message: "Ya existe un usuario o codigo de vendedor con esos datos",
      };
    }

    return { success: false, message: error.message };
  }
}

export async function updateSellerCode(
  companyId: string,
  sellerId: string,
  sellerCode: string,
): Promise<response<Seller>> {
  try {
    const updatedSeller = await prisma().user.update({
      where: { id: sellerId, companyId, role: "SELLER" },
      data: { sellerCode },
      select: sellerSelect,
    });

    return { success: true, data: toSeller(updatedSeller) };
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Ese codigo ya esta asignado a otro vendedor",
      };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Vendedor no encontrado" };
    }

    return { success: false, message: error.message };
  }
}
