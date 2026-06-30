"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { protectedAction } from "@/authorization/server";
import type { response } from "@/lib/types";
import * as repository from "@/seller/db_repository";
import type { Seller } from "@/seller/types";

const SELLER_CODE_REGEX = /^\d{4}$/;
const MAX_SELLER_CODE_ATTEMPTS = 30;

const createSellerSchema = z.object({
  email: z.string().email("Ingrese un email valido"),
  password: z
    .string()
    .min(6, "La contrasena debe tener al menos 6 caracteres"),
  name: z.string().trim().optional(),
});

const updateSellerCodeSchema = z.object({
  sellerId: z.string().min(1),
  sellerCode: z
    .string()
    .regex(SELLER_CODE_REGEX, "El codigo debe tener exactamente 4 digitos"),
});

const sellerCodeLookupSchema = z
  .string()
  .regex(SELLER_CODE_REGEX, "El codigo debe tener exactamente 4 digitos");

function buildRandomSellerCode(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
}

function failedSellerCodeGeneration(): response<never> {
  return {
    success: false,
    message: "No se pudo asignar un codigo unico de vendedor",
  };
}

async function createSellerWithUniqueCode(input: {
  companyId: string;
  email: string;
  password: string;
  name?: string;
}): Promise<response<Seller>> {
  for (let attempt = 0; attempt < MAX_SELLER_CODE_ATTEMPTS; attempt += 1) {
    const sellerCode = buildRandomSellerCode();
    const existsResponse = await repository.sellerCodeExists(
      input.companyId,
      sellerCode,
    );

    if (!existsResponse.success) return existsResponse;
    if (existsResponse.data) continue;

    const createdSellerResponse = await repository.createSeller({
      ...input,
      sellerCode,
    });

    if (createdSellerResponse.success) return createdSellerResponse;
    if (createdSellerResponse.message === "Ese codigo ya esta asignado") {
      continue;
    }

    return createdSellerResponse;
  }

  return failedSellerCodeGeneration();
}

export const createSeller = protectedAction(
  { resource: "company", action: "update" },
  async (user, input: unknown): Promise<response<Seller>> => {
    const parsedInput = createSellerSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, message: parsedInput.error.errors[0].message };
    }

    const encryptedPassword = await bcrypt.hash(parsedInput.data.password, 10);
    const createdSellerResponse = await createSellerWithUniqueCode({
      companyId: user.companyId,
      email: parsedInput.data.email,
      password: encryptedPassword,
      name: parsedInput.data.name,
    });

    if (!createdSellerResponse.success) return createdSellerResponse;

    revalidatePath("/dashboard/settings/sellers");
    return createdSellerResponse;
  },
);

export const updateSellerCode = protectedAction(
  { resource: "company", action: "update" },
  async (user, input: unknown): Promise<response<Seller>> => {
    const parsedInput = updateSellerCodeSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, message: parsedInput.error.errors[0].message };
    }

    const existsResponse = await repository.sellerCodeExists(
      user.companyId,
      parsedInput.data.sellerCode,
      parsedInput.data.sellerId,
    );
    if (!existsResponse.success) return existsResponse;

    if (existsResponse.data) {
      return {
        success: false,
        message: "Ese codigo ya esta asignado a otro vendedor",
      };
    }

    const updatedSellerResponse = await repository.updateSellerCode(
      user.companyId,
      parsedInput.data.sellerId,
      parsedInput.data.sellerCode,
    );

    if (!updatedSellerResponse.success) return updatedSellerResponse;

    revalidatePath("/dashboard/settings/sellers");
    return updatedSellerResponse;
  },
);

export const findActiveSellerByCode = protectedAction(
  { resource: "orders", action: "create" },
  async (user, input: unknown): Promise<response<Seller>> => {
    const parsedInput = sellerCodeLookupSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, message: parsedInput.error.errors[0].message };
    }

    const sellerResponse = await repository.findActiveSellerByCode(
      user.companyId,
      parsedInput.data,
    );

    if (!sellerResponse.success) return sellerResponse;
    if (!sellerResponse.data) {
      return { success: false, message: "Codigo de seller no encontrado" };
    }

    return { success: true, data: sellerResponse.data };
  },
);
