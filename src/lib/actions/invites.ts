"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { findInviter, INVITE_COOKIE, newInviteCode } from "@/lib/invites";

type Result = { success: true } | { success: false; error: string };

/** A school admin replaces their school's invite link, for when the old one has been shared too widely. */
export async function resetSchoolInviteLink(): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "ADMIN") return { success: false, error: "Only a school admin can do this." };
  await newInviteCode(session.userId);
  revalidatePath("/dashboard/teachers");
  return { success: true };
}

/**
 * A signed-in teacher accepts the school link they opened. Their own work stays theirs; from now on
 * the school admin sees them and their AI use counts toward the school's monthly limit.
 */
export async function joinSchool(): Promise<Result> {
  const session = await auth();
  if (!session?.userId) return { success: false, error: "Sign in first." };
  if (session.role !== "TEACHER")
    return {
      success: false,
      error: "Only teacher accounts can join a school with a link.",
    };

  const cookieStore = await cookies();
  const inviter = await findInviter(cookieStore.get(INVITE_COOKIE)?.value);
  if (!inviter?.school)
    return {
      success: false,
      error: "This link no longer works. Ask your school admin for a new one.",
    };

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { invitedById: true, schoolName: true },
  });
  await db.user.update({
    where: { id: session.userId },
    data: {
      tenantId: inviter.school.id,
      invitedById: user?.invitedById ?? inviter.id,
      schoolName: user?.schoolName || inviter.school.name,
    },
  });
  cookieStore.delete(INVITE_COOKIE);
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/** The teacher chose not to join the school whose link they opened. */
export async function declineSchool(): Promise<Result> {
  (await cookies()).delete(INVITE_COOKIE);
  return { success: true };
}

/**
 * A school admin takes a teacher out of the school. The teacher keeps their account and all their
 * work, and goes back to an account of their own with its own AI limit.
 */
export async function removeTeacher(teacherId: string): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "ADMIN" || !session.tenantId)
    return { success: false, error: "Only a school admin can do this." };
  if (teacherId === session.userId)
    return { success: false, error: "You can't remove yourself." };

  const teacher = await db.user.findUnique({
    where: { id: teacherId },
    select: { name: true, email: true, role: true, tenantId: true },
  });
  if (!teacher || teacher.tenantId !== session.tenantId)
    return { success: false, error: "This teacher isn't in your school." };
  if (teacher.role !== "TEACHER")
    return {
      success: false,
      error: "Only teachers can be removed. Ask Elimu to change an admin.",
    };

  await db.$transaction(async (tx) => {
    const own = await tx.tenant.create({
      data: {
        name: `${teacher.name || teacher.email}'s Workspace`,
        type: "INDEPENDENT_TEACHER",
      },
    });
    await tx.user.update({
      where: { id: teacherId },
      data: { tenantId: own.id },
    });
  });
  revalidatePath("/dashboard/teachers");
  return { success: true };
}
