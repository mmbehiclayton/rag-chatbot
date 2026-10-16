import { NextRequest, NextResponse } from "next/server";
import { confirmPayment, validSignature } from "@/lib/paystack";

/** Paystack tells us about payments here too, in case the teacher closed the page before coming back. */
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!validSignature(body, req.headers.get("x-paystack-signature"))) return new NextResponse("Bad signature", { status: 401 });

  const event = JSON.parse(body) as { event?: string; data?: { reference?: string } };
  if (event.event === "charge.success" && event.data?.reference) {
    try {
      await confirmPayment(event.data.reference);
    } catch (e) {
      console.error("[paystack] webhook confirm failed", e);
      return new NextResponse("Retry", { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
