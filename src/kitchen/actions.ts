"use server";

import { protectedAction } from "@/authorization/server";
import type { response } from "@/lib/types";
import { broadcast } from "@/lib/realtime/broadcast";
import { revalidatePath } from "next/cache";
import { TakeOrderItemSchema } from "@/table/schemas";
import { takePendingOrderItem } from "./db_repository";

export const takeOrderItemAction = protectedAction(
  { resource: "kitchen", action: "update" },
  async (user, orderItemId: string): Promise<response<void>> => {
    const parsed = TakeOrderItemSchema.safeParse({ orderItemId });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.errors[0]?.message ?? "Datos invalidos",
      };
    }

    const result = await takePendingOrderItem({
      orderItemId: parsed.data.orderItemId,
      companyId: user.companyId,
      userId: user.id,
    });
    if (result.success) {
      revalidatePath("/dashboard/kitchen");
      revalidatePath("/dashboard/tables");
      await broadcast(user.companyId, "tables", "order-item-taken", {
        orderItemId: parsed.data.orderItemId,
      });
    }
    return result;
  },
);
