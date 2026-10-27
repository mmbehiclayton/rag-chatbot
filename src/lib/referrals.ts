import { db, withDbRetry } from "@/lib/db";

/**
 * Referral commission: when a teacher someone invited pays for a term, the inviter earns a share of
 * that payment. Elimu staff set the share on the Pilot page; at 0 nothing is earned. Every term the
 * invited teacher pays counts, not just the first. Staff pay it out by M-Pesa and mark it paid.
 */
export const COMMISSION_KEY = "referralPercent";
export const COMMISSION_LIMITS = { min: 0, max: 50 };

/** The commission rate in percent, 0 until staff set one. */
export async function commissionPercent() {
  const saved = await withDbRetry(() =>
    db.platformSetting.findUnique({
      where: { key: COMMISSION_KEY },
      select: { value: true },
    }),
  ).catch(() => null);
  const n = Number.parseInt(saved?.value ?? "", 10);
  return n > 0 ? Math.min(n, COMMISSION_LIMITS.max) : 0;
}

/**
 * Records what the inviter earns from a term pass that has just been paid for. Safe to call more
 * than once for the same pass. Never throws: a payment must not fail because of this.
 */
export async function recordCommission(passId: string) {
  try {
    const percent = await commissionPercent();
    if (!percent) return;
    const pass = await withDbRetry(() =>
      db.termPass.findUnique({
        where: { id: passId },
        select: {
          status: true,
          amount: true,
          teacherId: true,
          teacher: { select: { invitedById: true } },
        },
      }),
    );
    const referrerId = pass?.teacher.invitedById;
    if (
      !pass ||
      pass.status !== "ACTIVE" ||
      !referrerId ||
      referrerId === pass.teacherId
    )
      return;
    const amount = Math.round((pass.amount * percent) / 100);
    if (amount <= 0) return;
    await db.referralCommission.upsert({
      where: { passId },
      create: {
        referrerId,
        referredId: pass.teacherId,
        passId,
        passAmount: pass.amount,
        percent,
        amount,
      },
      update: {},
    });
  } catch (e) {
    console.error("Couldn't record referral commission", passId, e);
  }
}

/** A teacher's invites and earnings, for their profile. */
export async function referralSummary(userId: string) {
  const [joined, paidBy, earned] = await withDbRetry(() =>
    Promise.all([
      db.user.count({ where: { invitedById: userId } }),
      db.referralCommission.findMany({
        where: { referrerId: userId },
        distinct: ["referredId"],
        select: { referredId: true },
      }),
      db.referralCommission.groupBy({
        by: ["status"],
        where: { referrerId: userId },
        _sum: { amount: true },
      }),
    ]),
  );
  const sum = (status: string) =>
    earned.find((e) => e.status === status)?._sum.amount ?? 0;
  const pending = sum("PENDING");
  const paid = sum("PAID");
  return {
    joined,
    paying: paidBy.length,
    total: pending + paid,
    pending,
    paid,
  };
}
