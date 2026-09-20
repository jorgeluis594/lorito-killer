import { NextResponse } from "next/server";
import { authenticatePrintClient } from "@/printing/clients/authenticate";
import { authorizePrintJob, findPrintJob } from "@/kitchen/db_repository";
import { getPrintRecoveryPolicy } from "@/kitchen/print-policy";
import { authorizePrintAttempt } from "@/kitchen/use-cases/authorize-print-attempt";

export async function POST(
  request: Request,
  props: { params: Promise<{ jobId: string }> },
) {
  const auth = await authenticatePrintClient(
    request.headers.get("authorization"),
  );
  if (!auth.success) return NextResponse.json(auth, { status: 401 });
  const { jobId } = await props.params;
  const result = await authorizePrintAttempt(
    { findJob: findPrintJob, authorize: authorizePrintJob },
    { ...auth.data, clientId: auth.data.id, jobId, now: new Date() },
    getPrintRecoveryPolicy(),
  );
  if (!result.success) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({
    success: true,
    data: {
      ...result.data,
      content: undefined,
      contentBase64: Buffer.from(result.data.content).toString("base64"),
    },
  });
}
