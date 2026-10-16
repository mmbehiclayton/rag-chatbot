"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccess, termPrice } from "@/lib/plans";

type Result = { success: true } | { success: false; error: string };

const PaymentInput = z.object({
  mpesaCode: z
    .string()
    .transform((s) => s.replace(/\s+/g, "").toUpperCase())
    .refine((s) => /^[A-Z0-9]{10}$/.test(s), "An M-Pesa code has 10 letters and numbers, e.g. SJK3A1B2C4."),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s-]+/g, ""))
    .refine((s) => s === "" || /^(\+?254|0)[17]\d{8}$/.test(s), "Enter the phone number you paid from, e.g. 0712 345 678."),
});

/** The teacher has paid by Paybill and sends the M-Pesa code. Elimu staff check it, then the pass goes live. */
export async function submitPayment(input: z.input<typeof PaymentInput>): Promise<Result> {
  const session = await auth();
  if (!session?.userId) return { success: false, error: "Please sign in again." };
  const parsed = PaymentInput.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the code and try again." };

  const { term, pass } = await getAccess(session.userId);
  if (pass?.status === "ACTIVE") return { success: false, error: `Your term pass for ${term.label} is already active.` };

  const data = { mpesaCode: parsed.data.mpesaCode, phone: parsed.data.phone || null, amount: termPrice(), status: "PENDING", note: null };
  try {
    await db.termPass.upsert({
      where: { teacherId_year_term: { teacherId: session.userId, year: term.year, term: term.term } },
      create: { teacherId: session.userId, year: term.year, term: term.term, ...data },
      update: { ...data, reviewedAt: null, reviewedById: null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "That M-Pesa code has already been used. Check the code in your M-Pesa message." };
    }
    throw e;
  }
  revalidatePath("/dashboard/profile/plan");
  revalidatePath("/dashboard/pilot");
  return { success: true };
}

/** Elimu staff confirm a payment against the M-Pesa statement, or turn it down with a reason the teacher sees. */
export async function reviewPayment(input: { id: string; approve: boolean; note?: string }): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN") return { success: false, error: "Only Elimu staff can do this." };
  const note = input.note?.trim().slice(0, 200) || null;
  if (!input.approve && !note) return { success: false, error: "Say why, so the teacher knows what to fix." };

  const { count } = await db.termPass.updateMany({
    where: { id: input.id, status: "PENDING" },
    data: { status: input.approve ? "ACTIVE" : "REJECTED", note: input.approve ? null : note, reviewedById: session.userId, reviewedAt: new Date() },
  });
  if (count === 0) return { success: false, error: "Someone has already checked this payment." };
  revalidatePath("/dashboard/pilot");
  return { success: true };
}

const Answer = z.enum(["ACCEPTED", "CHANGES", "NOT_YET"]);
const Kind = z.enum(["SCHEME", "RECORD"]);

/** "Did your head teacher accept this?" for a scheme or its record of work. */
export async function answerHeadReview(input: { schemeId: string; kind: string; answer: string }): Promise<Result> {
  const session = await auth();
  if (!session?.userId) return { success: false, error: "Please sign in again." };
  const kind = Kind.safeParse(input.kind);
  const answer = Answer.safeParse(input.answer);
  if (!kind.success || !answer.success) return { success: false, error: "Choose an answer." };

  const scheme = await db.schemeOfWork.findFirst({ where: { id: input.schemeId, teacherId: session.userId }, select: { id: true } });
  if (!scheme) return { success: false, error: "That scheme couldn't be found." };
  await db.headReview.upsert({
    where: { schemeId_kind: { schemeId: scheme.id, kind: kind.data } },
    create: { teacherId: session.userId, schemeId: scheme.id, kind: kind.data, answer: answer.data },
    update: { answer: answer.data },
  });
  revalidatePath(`/dashboard/schemes/${scheme.id}`);
  revalidatePath(`/dashboard/schemes/${scheme.id}/record`);
  return { success: true };
}
