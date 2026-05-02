import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: "disconnected",
    redis: "disconnected",
  };

  try {
    await prisma().$queryRaw(Prisma.sql`SELECT 1`);
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
  }

  try {
    const { connection } = await import("@/lib/queue/connection");
    const redisResponse = await connection.ping();
    checks.redis = redisResponse === "PONG" ? "connected" : "disconnected";
  } catch {
    checks.redis = "disconnected";
  }

  const healthy = checks.database === "connected" && checks.redis === "connected";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "error",
      ...checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
