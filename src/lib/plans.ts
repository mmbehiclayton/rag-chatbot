import { db, withDbRetry } from "@/lib/db";
import {
  DEFAULT_TERMS,
  pickTerm,
  termLabel,
  todayInKenya,
} from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";

/**
 * Plans:
 * - Free: make documents for any class (up to the monthly allowance) and read them in full on
 *   screen. The first download is free; after that each document is paid for once (lib/downloads).
 * - Term pass: every download for one term, paid through Paystack (or a typed M-Pesa code staff check).
 * There is no time-limited trial: teachers made everything they needed inside it, then left or
 * signed up again with another email. Paying at download is what teachers already do on the
 * Kenyan resource sites, and a new account only gets one free download.
 * In test mode nothing needs paying. Elimu staff switch test mode on the Pilot page;
 * until they first do, ELIMU_PLANS=on means payments are required.
 */
export const TEST_MODE_KEY = "testMode";

/** True when teachers must pay (test mode off). */
export async function plansOn() {
  const saved = await withDbRetry(() =>
    db.platformSetting.findUnique({
      where: { key: TEST_MODE_KEY },
      select: { value: true },
    }),
  ).catch(() => null);
  if (saved) return saved.value === "off";
  return process.env.ELIMU_PLANS === "on";
}

export const TERM_PRICE_KEY = "termPrice";
export const PRICE_LIMITS = { min: 50, max: 5000 };

/** The term pass price in KES: set by Elimu staff on the Pilot page, else ELIMU_TERM_PRICE, else 400. */
export async function termPrice() {
  const saved = await withDbRetry(() =>
    db.platformSetting.findUnique({
      where: { key: TERM_PRICE_KEY },
      select: { value: true },
    }),
  ).catch(() => null);
  for (const raw of [saved?.value, process.env.ELIMU_TERM_PRICE]) {
    const n = Number.parseInt(raw ?? "", 10);
    if (n > 0) return n;
  }
  return 400;
}

/** Where teachers pay. Without ELIMU_PAYBILL the pay screen says payment details are coming soon. */
export function paybill() {
  return {
    number: process.env.ELIMU_PAYBILL?.trim() || null,
    account: process.env.ELIMU_PAYBILL_ACCOUNT?.trim() || null,
  };
}

export type ClassRef = { grade: string; subject: string };

export type Access = {
  kind: "unlimited" | "paid" | "free";
  /** The term a pass is sold for now: the teacher's term in progress or next to open. */
  term: { year: number; term: number; label: string };
  /** Today's term pass price in KES. A checkout already started keeps the price it was opened with. */
  price: number;
  pass: {
    status: string;
    method: string;
    reference: string;
    amount: number;
    note: string | null;
  } | null;
};

/** The term a pass is for: the teacher's term in progress or next to open (school calendar or their own dates). */
async function sellingTerm(userId: string) {
  const today = todayInKenya();
  const terms = (await getTeacherTerms(userId)).filter(
    (t) => t.closesOn >= today,
  );
  const t = pickTerm(terms, today) ?? DEFAULT_TERMS[DEFAULT_TERMS.length - 1];
  return { year: t.year, term: t.term, label: termLabel(t) };
}

export async function getAccess(userId: string): Promise<Access> {
  const [user, term, price, paying] = await Promise.all([
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
    ),
    sellingTerm(userId),
    termPrice(),
    plansOn(),
  ]);
  const pass = await withDbRetry(() =>
    db.termPass.findUnique({
      where: {
        teacherId_year_term: {
          teacherId: userId,
          year: term.year,
          term: term.term,
        },
      },
      select: {
        status: true,
        method: true,
        reference: true,
        amount: true,
        note: true,
      },
    }),
  );
  const base = { term, pass, price };

  if (!paying || !user || user.role !== "TEACHER")
    return { ...base, kind: "unlimited" };
  if (pass?.status === "ACTIVE") return { ...base, kind: "paid" };
  return { ...base, kind: "free" };
}
