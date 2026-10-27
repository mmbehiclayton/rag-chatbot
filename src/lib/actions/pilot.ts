"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ALLOWANCE_KEY,
  ALLOWANCE_LIMITS,
  type AllowancePlan,
} from "@/lib/allowance";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRIAL_MODELS, trialModelKey } from "@/lib/model-trial";
import { initializeCheckout, paystackOn } from "@/lib/paystack";
import {
  getAccess,
  PRICE_LIMITS,
  TERM_PRICE_KEY,
  TEST_MODE_KEY,
} from "@/lib/plans";
import {
  COMMISSION_KEY,
  COMMISSION_LIMITS,
  recordCommission,
} from "@/lib/referrals";

type Result = { success: true } | { success: false; error: string };

const PaymentInput = z.object({
  mpesaCode: z
    .string()
    .transform((s) => s.replace(/\s+/g, "").toUpperCase())
    .refine(
      (s) => /^[A-Z0-9]{10}$/.test(s),
      "An M-Pesa code has 10 letters and numbers, e.g. SJK3A1B2C4.",
    ),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s-]+/g, ""))
    .refine(
      (s) => s === "" || /^(\+?254|0)[17]\d{8}$/.test(s),
      "Enter the phone number you paid from, e.g. 0712 345 678.",
    ),
});

/** The teacher has paid by Paybill and sends the M-Pesa code. Elimu staff check it, then the pass goes live. */
export async function submitPayment(
  input: z.input<typeof PaymentInput>,
): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Please sign in again." };
  const parsed = PaymentInput.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Check the code and try again.",
    };

  const { term, pass, price } = await getAccess(session.userId);
  if (pass?.status === "ACTIVE")
    return {
      success: false,
      error: `Your term pass for ${term.label} is already active.`,
    };

  const data = {
    method: "MPESA_CODE",
    reference: parsed.data.mpesaCode,
    phone: parsed.data.phone || null,
    amount: price,
    status: "PENDING",
    note: null,
  };
  try {
    await db.termPass.upsert({
      where: {
        teacherId_year_term: {
          teacherId: session.userId,
          year: term.year,
          term: term.term,
        },
      },
      create: {
        teacherId: session.userId,
        year: term.year,
        term: term.term,
        ...data,
      },
      update: { ...data, reviewedAt: null, reviewedById: null },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return {
        success: false,
        error:
          "That M-Pesa code has already been used. Check the code in your M-Pesa message.",
      };
    }
    throw e;
  }
  revalidatePath("/dashboard/profile/plan");
  revalidatePath("/dashboard/pilot");
  return { success: true };
}

/** Open Paystack's checkout for this term's pass. The pass goes live when Paystack confirms the payment. */
export async function startCheckout(): Promise<
  { success: true; url: string } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Please sign in again." };
  if (!paystackOn())
    return { success: false, error: "Online payment isn't switched on yet." };
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user) return { success: false, error: "Please sign in again." };

  const { term, pass, price } = await getAccess(session.userId);
  if (pass?.status === "ACTIVE")
    return {
      success: false,
      error: `Your term pass for ${term.label} is already active.`,
    };

  // A new reference each time, so a teacher who closed the checkout can start again.
  const reference = `elimu-${randomUUID()}`;
  const amount = price;
  const where = {
    teacherId_year_term: {
      teacherId: session.userId,
      year: term.year,
      term: term.term,
    },
  };
  const data = {
    method: "PAYSTACK",
    reference,
    amount,
    status: "PENDING",
    note: null,
    phone: null,
    reviewedAt: null,
    reviewedById: null,
  };
  await db.termPass.upsert({
    where,
    create: {
      teacherId: session.userId,
      year: term.year,
      term: term.term,
      ...data,
    },
    update: data,
  });

  try {
    const url = await initializeCheckout({
      email: user.email,
      amountKes: amount,
      reference,
      metadata: { teacherId: session.userId, year: term.year, term: term.term },
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

/** Test mode on: everything is free. Off: teachers need a trial, their free class or a term pass. */
export async function setTestMode(input: { on: boolean }): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const value = input.on ? "on" : "off";
  await db.platformSetting.upsert({
    where: { key: TEST_MODE_KEY },
    create: { key: TEST_MODE_KEY, value, updatedById: session.userId },
    update: { value, updatedById: session.userId },
  });
  revalidatePath("/", "layout");
  return { success: true };
}

/** Elimu staff set the term pass price for everyone. Teachers who already paid keep their pass. */
export async function setTermPrice(input: { price: number }): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const price = Math.round(Number(input.price));
  if (
    !Number.isFinite(price) ||
    price < PRICE_LIMITS.min ||
    price > PRICE_LIMITS.max
  ) {
    return {
      success: false,
      error: `Enter a price between KES ${PRICE_LIMITS.min} and ${PRICE_LIMITS.max}.`,
    };
  }
  await db.platformSetting.upsert({
    where: { key: TERM_PRICE_KEY },
    create: {
      key: TERM_PRICE_KEY,
      value: String(price),
      updatedById: session.userId,
    },
    update: { value: String(price), updatedById: session.userId },
  });
  revalidatePath("/dashboard/pilot");
  revalidatePath("/dashboard/profile/plan");
  return { success: true };
}

/** Elimu staff set how many documents a month each plan gives. Applies straight away. */
export async function setAllowances(
  input: Record<AllowancePlan, number>,
): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const plans: AllowancePlan[] = ["trial", "free", "paid"];
  const value: Partial<Record<AllowancePlan, number>> = {};
  for (const plan of plans) {
    const n = Math.round(Number(input[plan]));
    if (
      !Number.isFinite(n) ||
      n < ALLOWANCE_LIMITS.min ||
      n > ALLOWANCE_LIMITS.max
    )
      return {
        success: false,
        error: `Enter a number between ${ALLOWANCE_LIMITS.min} and ${ALLOWANCE_LIMITS.max} for each plan.`,
      };
    value[plan] = n;
  }
  const json = JSON.stringify(value);
  await db.platformSetting.upsert({
    where: { key: ALLOWANCE_KEY },
    create: { key: ALLOWANCE_KEY, value: json, updatedById: session.userId },
    update: { value: json, updatedById: session.userId },
  });
  revalidatePath("/dashboard/pilot");
  revalidatePath("/dashboard/profile");
  return { success: true };
}

/** Elimu staff confirm a payment against the M-Pesa statement, or turn it down with a reason the teacher sees. */
export async function reviewPayment(input: {
  id: string;
  approve: boolean;
  note?: string;
}): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const note = input.note?.trim().slice(0, 200) || null;
  if (!input.approve && !note)
    return {
      success: false,
      error: "Say why, so the teacher knows what to fix.",
    };

  const { count } = await db.termPass.updateMany({
    where: { id: input.id, status: "PENDING", method: "MPESA_CODE" },
    data: {
      status: input.approve ? "ACTIVE" : "REJECTED",
      note: input.approve ? null : note,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });
  if (count === 0)
    return {
      success: false,
      error: "Someone has already checked this payment.",
    };
  if (input.approve) await recordCommission(input.id);
  revalidatePath("/dashboard/pilot");
  return { success: true };
}

/** Elimu staff set the share of each term payment that goes to the teacher who invited the payer. */
export async function setCommissionPercent(input: {
  percent: number;
}): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const percent = Math.round(Number(input.percent));
  if (
    !Number.isFinite(percent) ||
    percent < COMMISSION_LIMITS.min ||
    percent > COMMISSION_LIMITS.max
  )
    return {
      success: false,
      error: `Enter a percentage between ${COMMISSION_LIMITS.min} and ${COMMISSION_LIMITS.max}.`,
    };
  await db.platformSetting.upsert({
    where: { key: COMMISSION_KEY },
    create: {
      key: COMMISSION_KEY,
      value: String(percent),
      updatedById: session.userId,
    },
    update: { value: String(percent), updatedById: session.userId },
  });
  revalidatePath("/dashboard/pilot");
  revalidatePath("/dashboard/profile");
  return { success: true };
}

/**
 * Elimu staff sent a teacher what they're owed: the commissions they saw are marked paid. Only those,
 * so one earned while staff were sending the money stays owed.
 */
export async function markCommissionsPaid(input: {
  referrerId: string;
  ids: string[];
  payoutRef: string;
}): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const payoutRef = input.payoutRef.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6,20}$/.test(payoutRef))
    return {
      success: false,
      error: "Enter the M-Pesa code of the payment you sent.",
    };
  const { count } = await db.referralCommission.updateMany({
    where: {
      id: { in: input.ids.slice(0, 500) },
      referrerId: input.referrerId,
      status: "PENDING",
    },
    data: {
      status: "PAID",
      payoutRef,
      paidAt: new Date(),
      paidById: session.userId,
    },
  });
  if (count === 0)
    return { success: false, error: "Nothing is owed to this teacher now." };
  revalidatePath("/dashboard/pilot");
  return { success: true };
}

const Answer = z.enum(["ACCEPTED", "CHANGES", "NOT_YET"]);
const Kind = z.enum(["SCHEME", "RECORD"]);

/** "Did your head teacher accept this?" for a scheme or its record of work. */
export async function answerHeadReview(input: {
  schemeId: string;
  kind: string;
  answer: string;
}): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Please sign in again." };
  const kind = Kind.safeParse(input.kind);
  const answer = Answer.safeParse(input.answer);
  if (!kind.success || !answer.success)
    return { success: false, error: "Choose an answer." };

  const scheme = await db.schemeOfWork.findFirst({
    where: { id: input.schemeId, teacherId: session.userId },
    select: { id: true },
  });
  if (!scheme)
    return { success: false, error: "That scheme couldn't be found." };
  await db.headReview.upsert({
    where: { schemeId_kind: { schemeId: scheme.id, kind: kind.data } },
    create: {
      teacherId: session.userId,
      schemeId: scheme.id,
      kind: kind.data,
      answer: answer.data,
    },
    update: { answer: answer.data },
  });
  revalidatePath(`/dashboard/schemes/${scheme.id}`);
  revalidatePath(`/dashboard/schemes/${scheme.id}/record`);
  return { success: true };
}

/** Staff try a cheaper writing model on their own documents. null goes back to the normal model. */
export async function setTrialModel(model: string | null): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const key = trialModelKey(session.userId);
  if (!model) {
    await db.platformSetting.deleteMany({ where: { key } });
  } else {
    if (!(TRIAL_MODELS as readonly string[]).includes(model))
      return { success: false, error: "Pick one of the models in the list." };
    await db.platformSetting.upsert({
      where: { key },
      create: { key, value: model, updatedById: session.userId },
      update: { value: model, updatedById: session.userId },
    });
  }
  revalidatePath("/dashboard/settings");
  return { success: true };
}
