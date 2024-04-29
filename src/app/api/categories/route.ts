import { NextResponse } from "next/server";
import { getMany } from "@/category/db_respository";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

export async function GET() {
  const session = await getSession();
  const response = await getMany(session.user.companyId);

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
