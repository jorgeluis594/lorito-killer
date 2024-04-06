import { NextResponse } from "next/server";
import { getMany } from "@/category/db_respository";

export const revalidate = 0;

export async function GET() {
  const response = await getMany();

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
