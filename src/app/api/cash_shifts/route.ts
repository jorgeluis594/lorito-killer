import { getManyCashShifts } from "@/cash-shift/db_repository";
import { authConfig } from "@/lib/auth-config";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authConfig);
  const response = await getManyCashShifts((session as any).userId);

  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}
