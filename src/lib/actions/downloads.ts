"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DocKind } from "@/lib/documents";
import {
  DOWNLOAD_KINDS,
  DOWNLOAD_PRICE_LIMITS,
  DOWNLOAD_PRICES_KEY,
  docKey,
  downloadAccess,
  exportQuery,
  findDoc,
  parseDocRef,
} from "@/lib/downloads";
import { initializeCheckout, paystackOn } from "@/lib/paystack";

type Result = { success: true } | { success: false; error: string };
type Go = { success: true; url: string } | { success: false; error: string };

/** The document behind a download page's query string, if it is the teacher's own and still locked. */
async function lockedDoc(query: string) {
  const session = await auth();
  if (!session?.userId)
    return { ok: false, error: "Please sign in again." } as const;
  const params = new URLSearchParams(query);
  const ref = parseDocRef(params);
  const doc = ref && (await findDoc(session.userId, ref));
  if (!ref || !doc)
    return { ok: false, error: "We couldn't find that document." } as const;
  const exportPath = `/api/export?${exportQuery(params)}`;
  const state = await downloadAccess(session.userId, ref);
  return {
    ok: true,
    userId: session.userId,
    ref,
    doc,
    exportPath,
    state,
  } as const;
}

/** Uses the teacher's one free download on this document. It then stays open for good. */
export async function claimFreeDownload(query: string): Promise<Go> {
  const d = await lockedDoc(query);
  if (!d.ok) return { success: false, error: d.error };
  if (d.state.open) return { success: true, url: d.exportPath };
  if (!d.state.freeLeft)
    return {
      success: false,
      error: "You've already used your free download.",
    };
  const data = {
    docType: d.ref.type,
    title: d.doc.title.slice(0, 200),
    method: "FREE",
    status: "ACTIVE",
    amount: 0,
    paidAt: new Date(),
  };
  await db.documentUnlock.upsert({
    where: {
      teacherId_docKey: { teacherId: d.userId, docKey: docKey(d.ref) },
    },
    create: { teacherId: d.userId, docKey: docKey(d.ref), ...data },
    update: data,
  });
  revalidatePath("/dashboard/profile/plan");
  return { success: true, url: d.exportPath };
}

/** Opens Paystack's checkout for one document. Paystack sends the teacher back to it once paid. */
export async function startDownloadCheckout(query: string): Promise<Go> {
  if (!paystackOn())
    return { success: false, error: "Online payment isn't switched on yet." };
  const d = await lockedDoc(query);
  if (!d.ok) return { success: false, error: d.error };
  if (d.state.open) return { success: true, url: d.exportPath };
  const user = await db.user.findUnique({
    where: { id: d.userId },
    select: { email: true },
  });
  if (!user) return { success: false, error: "Please sign in again." };

  // A new reference each time, so a teacher who closed the checkout can start again.
  const reference = `elimu-dl-${randomUUID()}`;
  const key = docKey(d.ref);
  const data = {
    docType: d.ref.type,
    title: d.doc.title.slice(0, 200),
    method: "PAYSTACK",
    status: "PENDING",
    amount: d.state.price,
    reference,
    phone: null,
    returnPath: d.exportPath,
  };
  await db.documentUnlock.upsert({
    where: { teacherId_docKey: { teacherId: d.userId, docKey: key } },
    create: { teacherId: d.userId, docKey: key, ...data },
    update: data,
  });

  try {
    const url = await initializeCheckout({
      email: user.email,
      amountKes: d.state.price,
      reference,
      metadata: { kind: "download", teacherId: d.userId, docKey: key },
    });
    return { success: true, url };
  } catch (e) {
    console.error("[paystack] initialize failed", e);
    return {
      success: false,
      error:
        "We couldn't open the payment page. Check your connection and try again.",
    };
  }
}

/** Elimu staff set what each kind of document costs to download. Paid documents stay paid. */
export async function setDownloadPrices(
  input: Record<DocKind, number>,
): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const value: Partial<Record<DocKind, number>> = {};
  for (const kind of DOWNLOAD_KINDS) {
    const n = Math.round(Number(input[kind]));
    if (
      !Number.isFinite(n) ||
      n < DOWNLOAD_PRICE_LIMITS.min ||
      n > DOWNLOAD_PRICE_LIMITS.max
    )
      return {
        success: false,
        error: `Enter a price between KES ${DOWNLOAD_PRICE_LIMITS.min} and ${DOWNLOAD_PRICE_LIMITS.max} for each document.`,
      };
    value[kind] = n;
  }
  const json = JSON.stringify(value);
  await db.platformSetting.upsert({
    where: { key: DOWNLOAD_PRICES_KEY },
    create: {
      key: DOWNLOAD_PRICES_KEY,
      value: json,
      updatedById: session.userId,
    },
    update: { value: json, updatedById: session.userId },
  });
  revalidatePath("/dashboard/pilot");
  revalidatePath("/dashboard/profile/plan");
  return { success: true };
}
