"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * General teacher actions (Management, Profile, etc.)
 * Note: AI Generation actions have been moved to src/lib/actions/generation.ts
 */

export async function getTeacherProfile() {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  return db.user.findUnique({
    where: { id: session.userId },
    include: { tenant: true },
  });
}

/**
 * Saves the teacher's onboarding answers (school, grades, learning areas) and
 * marks onboarding complete. Also used by the profile page to edit them later.
 */
export async function completeOnboarding(input: {
  name: string;
  schoolName: string;
  gradesTaught: string[];
  subjectsTaught: string[];
}) {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthorized");

  const name = input.name.trim().slice(0, 100);
  const schoolName = input.schoolName.trim().slice(0, 150);
  const clean = (values: string[]) =>
    [...new Set(values.map((v) => v.trim()).filter(Boolean))].slice(0, 20);
  const gradesTaught = clean(input.gradesTaught);
  const subjectsTaught = clean(input.subjectsTaught);

  if (!name) return { error: "Enter your name." };
  if (gradesTaught.length === 0) return { error: "Choose at least one grade." };
  if (subjectsTaught.length === 0)
    return { error: "Choose at least one learning area." };

  await db.user.update({
    where: { id: session.userId },
    data: {
      name,
      schoolName: schoolName || null,
      gradesTaught,
      subjectsTaught,
      onboardedAt: new Date(),
    },
  });

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
