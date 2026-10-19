import { createHmac, timingSafeEqual } from "node:crypto";
import { db, withDbRetry } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";

/**
 * Term passes paid through Paystack's checkout (M-Pesa or card, in KES).
 * Paystack amounts are in cents. A pass goes live only after we fetch the transaction
 * from Paystack with the secret key, so neither the return link nor the webhook is trusted on its own.
 */
const API = "https://api.paystack.co";

export function paystackOn() {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function appUrl(path = "") {
  return `${siteUrl()}${path}`;
}

type PassMeta = { teacherId: string; year: number; term: number };

export async function initializeCheckout(input: {
  email: string;
  amountKes: number;
  reference: string;
  metadata: PassMeta;
}) {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKes * 100,
      currency: "KES",
      reference: input.reference,
      channels: ["mobile_money", "card"],
      callback_url: appUrl("/api/paystack/callback"),
      metadata: input.metadata,
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url: string };
  } | null;
  if (!res.ok || !json?.status || !json.data)
    throw new Error(json?.message ?? `Paystack returned ${res.status}`);
  return json.data.authorization_url;
}

/** True when the webhook body was signed with our secret key. */
export function validSignature(body: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secret()).update(body).digest("hex");
  return (
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}

type Transaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata: Partial<PassMeta> | string | null;
  customer?: { phone?: string | null };
  authorization?: { mobile_money_number?: string | null };
};

/**
 * Look the payment up on Paystack and, if it went through for the right amount, switch on the pass.
 * Safe to call more than once for the same payment (return link and webhook both do).
 */
export async function confirmPayment(
  reference: string,
): Promise<"paid" | "pending" | "failed"> {
  const res = await fetch(
    `${API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret()}` },
      cache: "no-store",
    },
  );
  const json = (await res.json().catch(() => null)) as {
    status?: boolean;
    data?: Transaction;
  } | null;
  const tx = json?.data;
  if (!res.ok || !json?.status || !tx) return "failed";
  if (tx.status !== "success")
    return ["ongoing", "pending", "processing", "queued"].includes(tx.status)
      ? "pending"
      : "failed";

  const meta = (
    typeof tx.metadata === "string"
      ? JSON.parse(tx.metadata || "{}")
      : (tx.metadata ?? {})
  ) as Partial<PassMeta>;
  if (!meta.teacherId || !meta.year || !meta.term || tx.currency !== "KES")
    return "failed";

  const key = {
    teacherId_year_term: {
      teacherId: meta.teacherId,
      year: Number(meta.year),
      term: Number(meta.term),
    },
  };
  const pass = await withDbRetry(() =>
    db.termPass.findUnique({
      where: key,
      select: { status: true, amount: true },
    }),
  );
  if (pass?.status === "ACTIVE") return "paid";
  if (!pass || tx.amount < pass.amount * 100) return "failed";

  await db.termPass.update({
    where: key,
    data: {
      status: "ACTIVE",
      method: "PAYSTACK",
      reference: tx.reference,
      amount: Math.round(tx.amount / 100),
      phone:
        tx.authorization?.mobile_money_number || tx.customer?.phone || null,
      note: null,
      reviewedAt: new Date(),
    },
  });
  return "paid";
}
