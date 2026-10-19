import { db, withDbRetry } from "@/lib/db";
import {
  pickTerm,
  SUGGESTED_TERMS,
  termLabel,
  todayInKenya,
} from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";

/**
 * Plans for the pilot (see docs/strategy/research-and-pilot-plan.md, section 5):
 * - Trial: everything, for the first TRIAL_DAYS after joining.
 * - Free: one class (grade + learning area), with the full Term Pack and printing for it.
 * - Term pass: every class for one term, paid through Paystack (or a typed M-Pesa code staff check).
 * In test mode nothing needs paying. Elimu staff switch test mode on the Pilot page;
 * until they first do, ELIMU_PLANS=on means payments are required.
 */
export const TRIAL_DAYS = 14;
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
  kind: "unlimited" | "trial" | "paid" | "free";
  /** The term a pass is sold for now: the teacher's term in progress or next to open. */
  term: { year: number; term: number; label: string };
  trialEndsOn: Date | null;
  /** Today's term pass price in KES. A checkout already started keeps the price it was opened with. */
  price: number;
  freeClass: ClassRef | null;
  pass: {
    status: string;
    method: string;
    reference: string;
    amount: number;
    note: string | null;
  } | null;
};

/** The term a pass is for: the teacher's own term dates first, else the Ministry calendar. */
async function sellingTerm(userId: string) {
  const today = todayInKenya();
  const mine = (await getTeacherTerms(userId)).filter(
    (t) => t.closesOn >= today,
  );
  const fallbackTerm = SUGGESTED_TERMS[SUGGESTED_TERMS.length - 1];
  const t =
    pickTerm(
      mine.length ? mine : SUGGESTED_TERMS.filter((s) => s.closesOn >= today),
      today,
    ) ?? fallbackTerm;
  return { year: t.year, term: t.term, label: termLabel(t) };
}

/** The class a free-plan teacher keeps: the class of the first scheme, lesson plan or assessment they made. */
async function firstClass(userId: string): Promise<ClassRef | null> {
  const [scheme, lesson, assessment] = await withDbRetry(() =>
    Promise.all([
      db.schemeOfWork.findFirst({
        where: { teacherId: userId },
        orderBy: { createdAt: "asc" },
        select: { grade: true, subject: true, createdAt: true },
      }),
      db.lessonPlan.findFirst({
        where: {
          teacherId: userId,
          grade: { not: null },
          subject: { not: null },
        },
        orderBy: { createdAt: "asc" },
        select: { grade: true, subject: true, createdAt: true },
      }),
      db.assessment.findFirst({
        where: { teacherId: userId },
        orderBy: { createdAt: "asc" },
        select: { grade: true, subject: true, createdAt: true },
      }),
    ]),
  );
  const first = [scheme, lesson, assessment]
    .filter((x): x is NonNullable<typeof x> => !!x?.grade && !!x?.subject)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  if (!first?.grade || !first.subject) return null;
  return { grade: first.grade, subject: first.subject };
}

export async function getAccess(userId: string): Promise<Access> {
  const [user, term, price, paying] = await Promise.all([
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: userId },
        select: { role: true, createdAt: true },
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
  const trialEndsOn = user
    ? new Date(user.createdAt.getTime() + TRIAL_DAYS * 86_400_000)
    : null;
  const base = { term, pass, trialEndsOn, price, freeClass: null };

  if (!paying || !user || user.role !== "TEACHER")
    return { ...base, kind: "unlimited" };
  if (pass?.status === "ACTIVE") return { ...base, kind: "paid" };
  if (trialEndsOn && trialEndsOn > new Date())
    return { ...base, kind: "trial" };
  return { ...base, kind: "free", freeClass: await firstClass(userId) };
}

/** True when the plan covers this class. A free-plan teacher with nothing made yet may start any one class. */
export function coversClass(access: Access, c: ClassRef) {
  if (access.kind !== "free" || !access.freeClass) return true;
  return (
    access.freeClass.grade === c.grade && access.freeClass.subject === c.subject
  );
}

export function freePlanMessage(access: Access) {
  const free = access.freeClass
    ? `${access.freeClass.grade} ${access.freeClass.subject}`
    : "one class";
  return `Your free plan covers ${free}. Get a term pass for KES ${access.price} to plan all your classes: Me, then Term pass.`;
}
