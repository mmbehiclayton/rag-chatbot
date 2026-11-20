import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** For the Docker health check and deploy.sh: ok only when the database answers. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json(
      { status: "error", error: "The database isn't reachable." },
      { status: 503 },
    );
  }
}
