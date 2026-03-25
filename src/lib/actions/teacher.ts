"use server"

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * General teacher actions (Management, Profile, etc.)
 * Note: AI Generation actions have been moved to src/lib/actions/generation.ts
 */

export async function getTeacherProfile() {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  return db.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true }
  });
}
