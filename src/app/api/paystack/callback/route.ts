import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmPayment } from "@/lib/paystack";
import { siteUrl } from "@/lib/site-url";

/**
 * Paystack sends the teacher back here after checkout. Check the payment, then show the Term pass
 * page, or for a single document, the document itself (or its download page if it didn't go through).
 */
export async function GET(req: NextRequest) {
  const reference =
    req.nextUrl.searchParams.get("reference") ??
    req.nextUrl.searchParams.get("trxref");
  const result = reference
    ? await confirmPayment(reference).catch(() => "failed" as const)
    : "failed";
  const unlock = reference
    ? await db.documentUnlock
        .findUnique({ where: { reference }, select: { returnPath: true } })
        .catch(() => null)
    : null;
  const back = unlock?.returnPath;
  if (back?.startsWith("/api/export?"))
    return NextResponse.redirect(
      new URL(
        result === "paid"
          ? back
          : `/dashboard/download?${back.slice("/api/export?".length)}&payment=${result}`,
        siteUrl(),
      ),
    );
  return NextResponse.redirect(
    new URL(`/dashboard/profile/plan?payment=${result}`, siteUrl()),
  );
}
