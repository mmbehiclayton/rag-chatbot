import { randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { db, withDbRetry } from "@/lib/db";

export const INVITE_COOKIE = "elimu_invite";

// No 0/O or 1/I/L, so a code read out over the phone is typed right.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function inviteUrl(code: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${code}`;
}

/** The teacher's invite code, made the first time they open the invite section. */
export async function getInviteCode(userId: string) {
  const user = await withDbRetry(() => db.user.findUnique({ where: { id: userId }, select: { inviteCode: true } }));
  if (user?.inviteCode) return user.inviteCode;
  return newInviteCode(userId);
}

/** Gives the user a fresh code, so their old link stops working. */
export async function newInviteCode(userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    try {
      await db.user.update({ where: { id: userId }, data: { inviteCode: code } });
      return code;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  throw new Error("Couldn't make an invite code");
}

/**
 * Who an invite code belongs to. When it's a school admin's code, the new teacher joins
 * that school (and uses its monthly AI limit) instead of getting an account of their own.
 */
export async function findInviter(code: string | undefined) {
  if (!code) return null;
  const inviter = await withDbRetry(() =>
    db.user.findUnique({
      where: { inviteCode: code },
      select: { id: true, role: true, tenant: { select: { id: true, name: true, type: true } } },
    })
  );
  if (!inviter) return null;
  const school = inviter.role === "ADMIN" && inviter.tenant?.type === "SCHOOL" ? { id: inviter.tenant.id, name: inviter.tenant.name } : null;
  return { id: inviter.id, school };
}
