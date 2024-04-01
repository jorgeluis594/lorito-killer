import { getOrders } from "@/order/db_repository";
import { NextResponse } from "next/server";

export async function GET() {
  const response = await getOrders();

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
