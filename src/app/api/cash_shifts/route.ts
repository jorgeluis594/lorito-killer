import { getManyCashShifts, userExists } from "@/cash-shift/db_repository";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET(req: Request) {
  const session = await getSession();

  if (!(await userExists(session.user.id))) {
    return NextResponse.json(
      { success: false, message: "Unathenticated user" },
      { status: 401 },
    );
  }

  const response = await getManyCashShifts(session.user.id);

  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}
