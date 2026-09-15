"use server";

import { protectedAction } from "@/authorization/server";
import type { response } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { generateLinkCode, hashLinkCode } from "./crypto";
import * as repository from "./db_repository";
import { createPrintClientLinkCode } from "./use-cases/create-print-client-link-code";
import { UpdatePrinterSchema } from "./schema";
import { updatePrinter } from "./use-cases/update-printer";
import type { PrinterProfile } from "./types";

export const createLinkCode = protectedAction(
  { roles: ["ADMIN"] },
  async (user): Promise<response<{ code: string; expiresAt: Date }>> =>
    createPrintClientLinkCode(
      {
        createCode: repository.createCode,
        generateCode: generateLinkCode,
        hashCode: hashLinkCode,
        now: () => new Date(),
      },
      { companyId: user.companyId, createdById: user.id },
    ),
);

export const revokeClient = protectedAction(
  { roles: ["ADMIN"] },
  async (user, id: string): Promise<response<{ id: string }>> => {
    const revoked = await repository.revokePrintClient(user.companyId, id);
    if (!revoked) return { success: false, message: "Cliente no encontrado" };
    revalidatePath("/dashboard/settings/printing");
    return { success: true, data: { id } };
  },
);

export const updatePrinterAction = protectedAction(
  { roles: ["ADMIN"] },
  async (user, input: unknown): Promise<response<PrinterProfile>> => {
    const parsed = UpdatePrinterSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Perfil inválido",
      };
    const result = await updatePrinter(
      repository.updatePrinterProfile,
      user.companyId,
      parsed.data,
    );
    if (result.success) revalidatePath("/dashboard/settings/printing");
    return result;
  },
);
