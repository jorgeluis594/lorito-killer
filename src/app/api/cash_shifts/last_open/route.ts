import { getLastOpenCashShift, userExists } from "@/cash-shift/db_repository";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  const session = await getSession();

  if (!(await userExists((session as any).userId))) {
    return NextResponse.json(
      { success: false, message: "Unathenticated user" },
      { status: 401 },
    );
  }

  const response = await getLastOpenCashShift(session.userId);
  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
