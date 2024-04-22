import { getManyCashShifts, userExists } from "@/cash-shift/db_repository";
import { authConfig } from "@/lib/auth-config";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(req: Request) {
  const session = await getServerSession(authConfig);
  if (!(await userExists((session as any).userId))) {
    return NextResponse.json(
      { success: false, message: "Unathenticated user" },
      { status: 401 },
    );
  }

  const response = await getManyCashShifts((session as any).userId);

  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}
