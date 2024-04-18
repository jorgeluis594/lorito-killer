import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();

  const response = await getLastOpenCashShift(session.userId);
  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
