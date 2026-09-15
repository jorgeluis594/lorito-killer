"use server";

import { protectedAction } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { notifyPrintJobAvailable } from "@/kitchen/notifications";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FulfillmentRoundSchema } from "./fulfillment-schema";
import { submitFulfillmentRound } from "./fulfillment-repository";

export const confirmFulfillmentRound = protectedAction(
  { resource: "delivery", action: "create" },
  async (user, input: unknown) => {
    const feature = await requireFeature(user.companyId, "restaurants");
    if (!feature.success) return feature;
    const parsed = FulfillmentRoundSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Revisa el pedido.",
      };
    const result = await submitFulfillmentRound(
      user.companyId,
      user.id,
      parsed.data,
    );
    if (result.success) {
      const jobs = await prisma().kitchetTicketPrintJob.findMany({
        where: {
          id: { in: result.data.printJobIds },
          companyId: user.companyId,
        },
        select: { id: true, printer: { select: { printClientId: true } } },
      });
      await Promise.allSettled(
        jobs.map((job) =>
          notifyPrintJobAvailable(job.printer.printClientId, job.id),
        ),
      );
      revalidatePath("/[subdomain]/dashboard/orders", "layout");
    }
    return result;
  },
);
