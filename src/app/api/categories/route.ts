import { NextResponse } from "next/server";
import { getMany } from "@/category/db_respository";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET() {
  const session = await getSession();
  if (!session.user)
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );

  const response = await getMany(session.user.companyId);

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
