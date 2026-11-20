import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkServiceKey, fail } from "@/lib/service-auth";

/**
 * Finds, or creates, the Elimu teacher account for an email and returns its id.
 *
 * EduPro calls this only after the teacher proved they own the address (a code sent to their
 * inbox). EduPro then stores the id and sends it on every later call. A new account gets a
 * random password nobody knows; the teacher can set one with "forgot password" if they want
 * to sign in on Elimu directly.
 */
export async function POST(req: Request) {
  const denied = checkServiceKey(req);
  if (denied) return denied;

  let body: { email?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Say which teacher to connect.");
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !email.includes("@"))
    return fail(400, "Say which teacher to connect.");
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : null;

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, role: true },
  });
  if (existing) {
    if (existing.role !== "TEACHER")
      return fail(403, "Only teacher accounts can be used from EduPro.");
    return NextResponse.json({
      success: true,
      data: { elimuUserId: existing.id, created: false },
    });
  }

  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "TEACHER",
      emailVerified: new Date(),
      signupSource: "edupro",
    },
    select: { id: true },
  });
  return NextResponse.json({
    success: true,
    data: { elimuUserId: user.id, created: true },
  });
}
