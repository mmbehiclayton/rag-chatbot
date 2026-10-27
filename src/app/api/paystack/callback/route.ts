import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/paystack";
import { siteUrl } from "@/lib/site-url";

/** Paystack sends the teacher back here after checkout. Check the payment, then show the Term pass page. */
export async function GET(req: NextRequest) {
  const reference =
    req.nextUrl.searchParams.get("reference") ??
    req.nextUrl.searchParams.get("trxref");
  const result = reference
    ? await confirmPayment(reference).catch(() => "failed" as const)
    : "failed";
  return NextResponse.redirect(
    new URL(`/dashboard/profile/plan?payment=${result}`, siteUrl()),
  );
}
