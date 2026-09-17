import { NextResponse } from "next/server";
import { authenticatePrintClient } from "@/printing/clients/authenticate";
import { findPrintJob, recordPrintJobResult } from "@/kitchen/db_repository";
import {
  notifyKitchenChanged,
  notifyPrintJobFailed,
} from "@/kitchen/notifications";
import { getPrintRecoveryPolicy } from "@/kitchen/print-policy";
import { recordPrintResult } from "@/kitchen/use-cases/record-print-result";
import { PrintJobResultSchema } from "@/printing/clients/schema";

export async function POST(
  request: Request,
  props: { params: Promise<{ jobId: string }> },
) {
  const auth = await authenticatePrintClient(
    request.headers.get("authorization"),
  );
  if (!auth.success) return NextResponse.json(auth, { status: 401 });
  const parsed = PrintJobResultSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { success: false, message: "Resultado inválido" },
      { status: 400 },
    );
  const { jobId } = await props.params;
  const result = await recordPrintResult(
    { findJob: findPrintJob, record: recordPrintJobResult },
    {
      ...auth.data,
      clientId: auth.data.id,
      jobId,
      ...parsed.data,
      now: new Date(),
    },
    getPrintRecoveryPolicy(),
  );
  if (result.success && result.data.status === "FAILED" && result.data.applied)
    await notifyPrintJobFailed(jobId).catch(() => undefined);
  if (result.success && result.data.applied)
    await notifyKitchenChanged(auth.data.companyId, "print-job-changed").catch(
      () => undefined,
    );
  return NextResponse.json(
    result.success
      ? {
          success: true,
          data: {
            jobId: result.data.id,
            attemptNumber: result.data.attempts,
            status: result.data.status,
            nextAttemptAt: result.data.nextAttemptAt,
          },
        }
      : result,
    { status: result.success ? 200 : 409 },
  );
}
