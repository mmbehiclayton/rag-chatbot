import { db, withDbRetry } from "@/lib/db";
import { type Access, getAccess } from "@/lib/plans";

/**
 * How many documents a teacher can have Elimu write each month, by plan. Elimu staff set them on
 * the Pilot page. Reused lesson plans are free, and Ask Elimu has its own daily limit. A long
 * document, such as a full scheme of work, counts as one per TOKENS_PER_DOC it used, so the
 * allowance follows what Elimu actually pays. Admins and staff have no allowance.
 */
export type AllowancePlan = "free" | "paid";
export const ALLOWANCE_KEY = "docAllowance";
export const ALLOWANCE_DEFAULTS: Record<AllowancePlan, number> = {
  free: 10,
  paid: 150,
};
export const ALLOWANCE_LIMITS = { min: 1, max: 2000 };
export const TOKENS_PER_DOC = 25_000;

export const PLAN_LABELS: Record<AllowancePlan, string> = {
  free: "free plan",
  paid: "term pass",
};

export async function allowances(): Promise<Record<AllowancePlan, number>> {
  const saved = await withDbRetry(() =>
    db.platformSetting.findUnique({
      where: { key: ALLOWANCE_KEY },
      select: { value: true },
    }),
  ).catch(() => null);
  let parsed: Partial<Record<AllowancePlan, unknown>> = {};
  try {
    parsed = saved ? JSON.parse(saved.value) : {};
  } catch {}
  const pick = (plan: AllowancePlan) => {
    const n = Number(parsed[plan]);
    return Number.isInteger(n) && n > 0 ? n : ALLOWANCE_DEFAULTS[plan];
  };
  return { free: pick("free"), paid: pick("paid") };
}

/** Midnight on the 1st of this month in Kenya, and the same on the 1st of next month. */
export function kenyaMonth(now = new Date()) {
  const EAT = 3 * 60 * 60 * 1000;
  const k = new Date(now.getTime() + EAT);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth();
  return {
    start: new Date(Date.UTC(y, m, 1) - EAT),
    next: new Date(Date.UTC(y, m + 1, 1) - EAT),
  };
}

/** Documents counted against the allowance since `since`. */
export async function documentsUsed(userId: string, since: Date) {
  const logs = await withDbRetry(() =>
    db.generationLog.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        model: { not: "cache" },
        contentType: { not: "CHAT" },
      },
      select: { totalTokens: true },
    }),
  );
  return logs.reduce(
    (sum, l) => sum + Math.max(1, Math.ceil(l.totalTokens / TOKENS_PER_DOC)),
    0,
  );
}

export type Allowance = {
  plan: AllowancePlan;
  limit: number;
  used: number;
  /** When the count starts again. */
  resetsOn: Date;
  /** What a term pass gives, to show free teachers. */
  paidLimit: number;
};

/** A teacher's allowance this month, or null when they have none (admins and staff). */
export async function getAllowance(
  userId: string,
  role: string | null | undefined,
  access?: Access,
): Promise<Allowance | null> {
  if (role !== "TEACHER") return null;
  const { start, next } = kenyaMonth();
  const [a, limits, used] = await Promise.all([
    access ?? getAccess(userId),
    allowances(),
    documentsUsed(userId, start),
  ]);
  // In test mode everyone is "unlimited" on plans; they get the term pass allowance.
  const plan: AllowancePlan = a.kind === "free" ? "free" : "paid";
  return {
    plan,
    limit: limits[plan],
    used,
    resetsOn: next,
    paidLimit: limits.paid,
  };
}

const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "long",
  });

/** What a teacher sees when the month's allowance is used up: a dialog on screen, this text elsewhere. */
export type LimitInfo = {
  plan: AllowancePlan;
  limit: number;
  /** When the count starts again, e.g. "1 November". */
  resetsOn: string;
  /** The term pass on offer, for teachers on the free plan. */
  pass: { price: number; term: string; limit: number } | null;
};

export function limitInfo(a: Allowance, access?: Access): LimitInfo {
  return {
    plan: a.plan,
    limit: a.limit,
    resetsOn: dayLabel(a.resetsOn),
    pass:
      a.plan === "free" && access
        ? { price: access.price, term: access.term.label, limit: a.paidLimit }
        : null,
  };
}

export function allowanceMessage(info: LimitInfo) {
  const more = info.pass
    ? ` A term pass gives you ${info.pass.limit} a month.`
    : "";
  return `You've used this month's ${info.limit} documents on your ${PLAN_LABELS[info.plan]}. More open on ${info.resetsOn}. Everything you've already made still opens.${more}`;
}
