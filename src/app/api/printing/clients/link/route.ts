import { NextResponse } from "next/server";
import { LinkPrintClientSchema } from "@/printing/clients/schema";
import {
  createCredential,
  hashCredential,
  hashLinkCode,
} from "@/printing/clients/crypto";
import { consumeCode } from "@/printing/clients/db_repository";
import {
  isLinkRateLimited,
  recordInvalidLink,
} from "@/printing/clients/rate-limit";
import { linkPrintClient } from "@/printing/clients/use-cases/link-print-client";

export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip") ?? "unknown";
  if (await isLinkRateLimited(ip)) {
    return NextResponse.json(
      { success: false, message: "Demasiados intentos" },
      { status: 429 },
    );
  }

  const parsed = LinkPrintClientSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    await recordInvalidLink(ip);
    return NextResponse.json(
      { success: false, message: "Codigo invalido o vencido" },
      { status: 400 },
    );
  }

  const result = await linkPrintClient(
    {
      createCredential,
      hashCredential,
      hashCode: hashLinkCode,
      consumeCode,
      now: () => new Date(),
    },
    parsed.data,
  );
  if (!result.success) await recordInvalidLink(ip);
  return NextResponse.json(result, { status: result.success ? 201 : 401 });
}
