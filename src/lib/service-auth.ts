import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Sign-in for calls from another trusted service (EduPro), not from a teacher's browser.
 *
 * The caller sends `Authorization: Bearer <EDUPRO_SERVICE_KEY>` and `X-Acting-Email: <teacher>`.
 * Elimu then acts as that teacher, and only that teacher: every query still filters by the
 * teacher's id. The key lives only in the two servers' environments. Staff and school-admin
 * accounts can never be acted as this way.
 */

const MIN_KEY_LENGTH = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Constant-time comparison, so the key can't be guessed from response times. */
function sameKey(given: string, expected: string) {
  return timingSafeEqual(sha256(given), sha256(expected));
}

export function fail(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

export type ServiceCaller = {
  /** The Elimu teacher the call acts as, or null if they have no account yet. */
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    tenantId: string | null;
    schoolName: string | null;
    gradesTaught: string[];
    subjectsTaught: string[];
  } | null;
  email: string;
};

/**
 * Checks the service key and finds the teacher the call is for. Returns the caller, or a
 * ready-made error response to send back.
 */
export async function serviceCaller(
  req: Request,
): Promise<{ caller: ServiceCaller } | { response: NextResponse }> {
  const key = process.env.EDUPRO_SERVICE_KEY?.trim();
  if (!key || key.length < MIN_KEY_LENGTH)
    return { response: fail(503, "The EduPro connection is not switched on.") };

  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given || !sameKey(given, key))
    return { response: fail(401, "This connection is not allowed.") };

  // The teacher is named by their Elimu id, which EduPro stored after the teacher proved they
  // own the email address. An email alone is never enough to act as someone.
  const actingId = (req.headers.get("x-acting-user") ?? "").trim();
  if (!actingId) return { caller: { user: null, email: "" } };
  if (!UUID.test(actingId))
    return { response: fail(400, "Say which teacher this is for.") };

  const user = await db.user.findFirst({
    where: { id: actingId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      schoolName: true,
      gradesTaught: true,
      subjectsTaught: true,
    },
  });
  if (user && user.role !== "TEACHER")
    return {
      response: fail(403, "Only teacher accounts can be used from EduPro."),
    };
  return { caller: { user, email: user?.email ?? "" } };
}

/**
 * Checks only the service key (no teacher). For the one call that creates or finds the account
 * to link: EduPro makes it after the teacher proved they own the email.
 */
export function checkServiceKey(req: Request): NextResponse | null {
  const key = process.env.EDUPRO_SERVICE_KEY?.trim();
  if (!key || key.length < MIN_KEY_LENGTH)
    return fail(503, "The EduPro connection is not switched on.");
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given || !sameKey(given, key))
    return fail(401, "This connection is not allowed.");
  return null;
}

/** For routes that need an existing teacher account. */
export async function requireTeacher(
  req: Request,
): Promise<
  { teacher: NonNullable<ServiceCaller["user"]> } | { response: NextResponse }
> {
  const result = await serviceCaller(req);
  if ("response" in result) return result;
  if (!result.caller.user)
    return {
      response: fail(
        404,
        "This teacher has no Elimu account yet. Connect it first.",
      ),
    };
  return { teacher: result.caller.user };
}
