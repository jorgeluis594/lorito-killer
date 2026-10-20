import { NextResponse } from "next/server";
import { authenticatePrintClient } from "@/printing/clients/authenticate";
import {
  authorizePrintJob,
  failUnrenderablePrintJob,
  findPrintJob,
  renderPrintJobContent,
} from "@/printing/jobs/db_repository";
import { notifyKitchenChanged } from "@/kitchen/notifications";
import { notifyPrintJobFailed } from "@/printing/jobs/notifications";
import { getPrintRecoveryPolicy } from "@/printing/jobs/policy";
import { authorizePrintAttempt } from "@/printing/jobs/use-cases/authorize-print-attempt";
import { log } from "@/lib/log";

export async function POST(
  request: Request,
  props: { params: Promise<{ jobId: string }> },
) {
  const auth = await authenticatePrintClient(
    request.headers.get("authorization"),
  );
  if (!auth.success) return NextResponse.json(auth, { status: 401 });
  const { jobId } = await props.params;
  // Se renderiza antes de autorizar para que el render no consuma el timeout del intento.
  let content: Uint8Array;
  try {
    content = await renderPrintJobContent(jobId);
  } catch (error) {
    log.warn("print_job_render_failed", { jobId, error });
    const failed = await failUnrenderablePrintJob({
      jobId,
      clientId: auth.data.id,
      error: `No se pudo generar el ticket: ${error instanceof Error ? error.message : String(error)}`,
    });
    if (failed) {
      await notifyPrintJobFailed(jobId).catch(() => undefined);
      await notifyKitchenChanged(
        auth.data.companyId,
        "print-job-changed",
      ).catch(() => undefined);
    }
    return NextResponse.json(
      { success: false, message: "Trabajo no disponible" },
      { status: 409 },
    );
  }
  const result = await authorizePrintAttempt(
    { findJob: findPrintJob, authorize: authorizePrintJob },
    { ...auth.data, clientId: auth.data.id, jobId, now: new Date() },
    getPrintRecoveryPolicy,
  );
  if (!result.success) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({
    success: true,
    data: {
      ...result.data,
      contentBase64: Buffer.from(content).toString("base64"),
    },
  });
}
