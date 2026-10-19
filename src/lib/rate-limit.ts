import { db } from "@/lib/db";

/**
 * Counts one use of `key` in a fixed window and says whether it's over `max`.
 * Keyed on the user only: phones change IP address often, which used to reset the count.
 */
export async function overLimit(key: string, max: number, windowMs: number) {
  const now = new Date();
  await db.rateLimit
    .deleteMany({ where: { expiresAt: { lt: now } } })
    .catch(() => {});

  const hit = await db.rateLimit.upsert({
    where: { key },
    create: { key, expiresAt: new Date(now.getTime() + windowMs), points: 1 },
    update: { points: { increment: 1 } },
  });
  return hit.points > max && hit.expiresAt > now;
}

/** Documents a teacher can create in an hour. */
export const DOCS_PER_HOUR = 20;
/** Questions a teacher can ask Ask Elimu and the lesson copilot in a day. */
export const CHAT_PER_DAY = 50;
