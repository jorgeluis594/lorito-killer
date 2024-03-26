import { search } from "@/product/db_repository";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { q }: { q: string | undefined | null } = await req.json();
  if (!q)
    return NextResponse.json(
      { success: false, message: "Query is required" },
      { status: 400 },
    );

  const response = await search(q);

  return NextResponse.json(response, { status: response.success ? 201 : 500 });
}
