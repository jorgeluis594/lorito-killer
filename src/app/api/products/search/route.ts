import { search } from "@/product/db_repository";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const param = searchParams.get("param");

  if (!param)
    return NextResponse.json(
      { success: false, message: "Query is required" },
      { status: 400 },
    );

  const response = await search(param);

  return NextResponse.json(response, { status: response.success ? 201 : 500 });
}
