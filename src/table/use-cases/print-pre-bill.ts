import prisma from "@/lib/prisma";
import type { response } from "@/lib/types";
import { getCompanyPrinterIds } from "@/printing/clients/db_repository";
import { enqueuePrintJob } from "@/printing/jobs/use-cases/enqueue-print-job";

/** Encola la precuenta de una mesa abierta en la impresora de caja. */
export async function printPreBill(
  companyId: string,
  userId: string,
  sessionId: string,
): Promise<response<{ jobId: string }>> {
  const { cashier } = await getCompanyPrinterIds(companyId);
  if (!cashier)
    return {
      success: false,
      message:
        "Configura la impresora de caja en Ajustes → Impresión para imprimir la precuenta.",
    };
  const session = await prisma().tableSession.findFirst({
    where: {
      id: sessionId,
      companyId,
      tableId: { not: null },
      status: { in: ["OPEN", "BILL_REQUESTED"] },
    },
    select: { id: true },
  });
  if (!session)
    return {
      success: false,
      message: "La precuenta solo se imprime en una mesa abierta.",
    };
  const jobId = await enqueuePrintJob({
    companyId,
    sourceType: "PRE_BILL",
    sourceId: session.id,
    printerId: cashier,
    requestedById: userId,
  });
  return { success: true, data: { jobId } };
}
