"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSchoolWelcomeEmail } from "@/lib/email";

type Result = { success: true } | { success: false; error: string };

// The monthly AI token limit each school or account gets (checked before every generation).
const QUOTA = { min: 10_000, max: 1_000_000_000 };

const TenantInput = z.object({
  name: z.string().trim().min(2, "Enter the school's name.").max(120),
  tokenQuota: z.coerce
    .number()
    .int()
    .min(
      QUOTA.min,
      `The monthly limit must be at least ${QUOTA.min.toLocaleString("en-KE")} tokens.`,
    )
    .max(QUOTA.max, "That monthly limit is too high."),
});

async function staff() {
  const session = await auth();
  return session?.userId && session.role === "SUPERADMIN" ? session : null;
}

export async function createSchool(input: {
  name: string;
  tokenQuota: number;
}): Promise<Result> {
  if (!(await staff()))
    return { success: false, error: "Only Elimu staff can do this." };
  const parsed = TenantInput.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  await db.tenant.create({ data: { ...parsed.data, type: "SCHOOL" } });
  revalidatePath("/dashboard/tenants");
  return { success: true };
}

export async function updateTenant(input: {
  id: string;
  name: string;
  tokenQuota: number;
}): Promise<Result> {
  if (!(await staff()))
    return { success: false, error: "Only Elimu staff can do this." };
  const parsed = TenantInput.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  const { count } = await db.tenant.updateMany({
    where: { id: input.id },
    data: parsed.data,
  });
  if (count === 0)
    return {
      success: false,
      error: "That school or account couldn't be found.",
    };
  revalidatePath("/dashboard/tenants");
  return { success: true };
}

const PersonInput = z.object({
  schoolId: z.string().min(1),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  name: z.string().trim().max(120).optional(),
  role: z.enum(["ADMIN", "TEACHER"]),
});

/**
 * Adds a person to a school as its admin or a teacher. Someone who already has an account moves
 * into the school; anyone new gets an account and an email with a link to set their password.
 */
export async function addPersonToSchool(input: {
  schoolId: string;
  email: string;
  name?: string;
  role: "ADMIN" | "TEACHER";
}): Promise<Result & { created?: boolean }> {
  if (!(await staff()))
    return { success: false, error: "Only Elimu staff can do this." };
  const parsed = PersonInput.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  const { schoolId, email, name, role } = parsed.data;

  const school = await db.tenant.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, type: true },
  });
  if (!school || school.type !== "SCHOOL")
    return { success: false, error: "That school couldn't be found." };

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, tenantId: true, schoolName: true },
  });
  if (existing?.role === "SUPERADMIN")
    return {
      success: false,
      error: "That's an Elimu staff account. It can't join a school.",
    };

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { tenantId: school.id, role, schoolName: school.name },
    });
  } else {
    // A random password nobody knows; the emailed link lets them choose their own.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    const token = randomBytes(32).toString("hex");
    await db.$transaction([
      db.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role,
          tenantId: school.id,
          schoolName: school.name,
          emailVerified: new Date(),
        },
      }),
      db.passwordResetToken.create({
        data: {
          email,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    await sendSchoolWelcomeEmail(email, token, school.name);
  }

  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/teachers");
  return { success: true, created: !existing };
}

/**
 * Deletes a school. Its people keep their accounts and their work: each moves to an account of
 * their own as a teacher. Designs the school uploaded for itself are deleted with it, so they
 * never become visible to every school.
 */
export async function deleteSchool(id: string): Promise<Result> {
  if (!(await staff()))
    return { success: false, error: "Only Elimu staff can do this." };
  const school = await db.tenant.findUnique({
    where: { id },
    select: {
      type: true,
      users: { select: { id: true, name: true, email: true } },
    },
  });
  if (!school || school.type !== "SCHOOL")
    return { success: false, error: "That school couldn't be found." };

  await db.$transaction(
    async (tx) => {
      for (const u of school.users) {
        const own = await tx.tenant.create({
          data: {
            name: `${u.name || u.email}'s Workspace`,
            type: "INDEPENDENT_TEACHER",
          },
        });
        await tx.user.update({
          where: { id: u.id },
          data: { tenantId: own.id, role: "TEACHER" },
        });
      }
      await tx.curriculumDocument.deleteMany({ where: { tenantId: id } });
      await tx.tenant.delete({ where: { id } });
    },
    { timeout: 30_000 },
  );

  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/teachers");
  return { success: true };
}
