"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

const Name = z.string().trim().min(2, "Enter at least 2 letters.").max(120, "That name is too long.");

export async function updateProfile(input: { name: string }): Promise<Result> {
  const session = await auth();
  if (!session?.userId) return { success: false, error: "Please sign in again." };

  const parsed = Name.safeParse(input.name);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check your name." };

  await db.user.update({ where: { id: session.userId }, data: { name: parsed.data } });
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/** A school admin renames their own school. */
export async function updateSchool(input: { name: string }): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "ADMIN") return { success: false, error: "Only a school admin can do this." };

  const parsed = Name.safeParse(input.name);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the school's name." };

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { tenantId: true } });
  if (!user?.tenantId) return { success: false, error: "Your account isn't linked to a school yet." };

  await db.tenant.update({ where: { id: user.tenantId }, data: { name: parsed.data } });
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
