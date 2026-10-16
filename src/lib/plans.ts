import { db, withDbRetry } from "@/lib/db";
import { getTeacherTerms } from "@/lib/term-pack-data";
import { SUGGESTED_TERMS, pickTerm, termLabel, todayInKenya } from "@/lib/term-pack";

/**
 * Plans for the pilot (see docs/strategy/research-and-pilot-plan.md, section 5):
 * - Trial: everything, for the first TRIAL_DAYS after joining.
 * - Free: one class (grade + learning area), with the full Term Pack and printing for it.
 * - Term pass: every class for one term, paid by M-Pesa Paybill and checked by Elimu staff.
 * Limits apply only when ELIMU_PLANS=on, so nobody is locked out before the pilot starts.
 */
export const TRIAL_DAYS = 14;

export function plansOn() {
  return process.env.ELIMU_PLANS === "on";
}

export function termPrice() {
  const n = Number.parseInt(process.env.ELIMU_TERM_PRICE ?? "", 10);
  return n > 0 ? n : 400;
}

/** Where teachers pay. Without ELIMU_PAYBILL the pay screen says payment details are coming soon. */
export function paybill() {
  return { number: process.env.ELIMU_PAYBILL?.trim() || null, account: process.env.ELIMU_PAYBILL_ACCOUNT?.trim() || null };
}

export type ClassRef = { grade: string; subject: string };

export type Access = {
  kind: "unlimited" | "trial" | "paid" | "free";
  /** The term a pass is sold for now: the teacher's term in progress or next to open. */
  term: { year: number; term: number; label: string };
  trialEndsOn: Date | null;
  freeClass: ClassRef | null;
  pass: { status: string; mpesaCode: string; amount: number; note: string | null } | null;
};

/** The term a pass is for: the teacher's own term dates first, else the Ministry calendar. */
async function sellingTerm(userId: string) {
  const today = todayInKenya();
  const mine = (await getTeacherTerms(userId)).filter((t) => t.closesOn >= today);
  const t = pickTerm(mine.length ? mine : SUGGESTED_TERMS.filter((s) => s.closesOn >= today), today) ?? SUGGESTED_TERMS.at(-1)!;
  return { year: t.year, term: t.term, label: termLabel(t) };
}

/** The class a free-plan teacher keeps: the class of the first scheme, lesson plan or assessment they made. */
async function firstClass(userId: string): Promise<ClassRef | null> {
  const [scheme, lesson, assessment] = await withDbRetry(() =>
    Promise.all([
      db.schemeOfWork.findFirst({ where: { teacherId: userId }, orderBy: { createdAt: "asc" }, select: { grade: true, subject: true, createdAt: true } }),
      db.lessonPlan.findFirst({
        where: { teacherId: userId, grade: { not: null }, subject: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { grade: true, subject: true, createdAt: true },
      }),
      db.assessment.findFirst({ where: { teacherId: userId }, orderBy: { createdAt: "asc" }, select: { grade: true, subject: true, createdAt: true } }),
    ])
  );
  const first = [scheme, lesson, assessment]
    .filter((x): x is NonNullable<typeof x> => !!x?.grade && !!x?.subject)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  return first ? { grade: first.grade!, subject: first.subject! } : null;
}

export async function getAccess(userId: string): Promise<Access> {
  const [user, term] = await Promise.all([
    withDbRetry(() => db.user.findUnique({ where: { id: userId }, select: { role: true, createdAt: true } })),
    sellingTerm(userId),
  ]);
  const pass = await withDbRetry(() =>
    db.termPass.findUnique({
      where: { teacherId_year_term: { teacherId: userId, year: term.year, term: term.term } },
      select: { status: true, mpesaCode: true, amount: true, note: true },
    })
  );
  const trialEndsOn = user ? new Date(user.createdAt.getTime() + TRIAL_DAYS * 86_400_000) : null;
  const base = { term, pass, trialEndsOn, freeClass: null };

  if (!plansOn() || !user || user.role !== "TEACHER") return { ...base, kind: "unlimited" };
  if (pass?.status === "ACTIVE") return { ...base, kind: "paid" };
  if (trialEndsOn && trialEndsOn > new Date()) return { ...base, kind: "trial" };
  return { ...base, kind: "free", freeClass: await firstClass(userId) };
}

/** True when the plan covers this class. A free-plan teacher with nothing made yet may start any one class. */
export function coversClass(access: Access, c: ClassRef) {
  if (access.kind !== "free" || !access.freeClass) return true;
  return access.freeClass.grade === c.grade && access.freeClass.subject === c.subject;
}

export function freePlanMessage(access: Access) {
  const free = access.freeClass ? `${access.freeClass.grade} ${access.freeClass.subject}` : "one class";
  return `Your free plan covers ${free}. Get a term pass for KES ${termPrice()} to plan all your classes: Me, then Term pass.`;
}
