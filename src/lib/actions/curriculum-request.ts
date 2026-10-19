"use server";

import { auth } from "@/lib/auth";
import { getGradeOptions } from "@/lib/curriculum-options";
import { db } from "@/lib/db";

/** A teacher tells Elimu they need the curriculum design for one class. Asking twice is fine. */
export async function requestCurriculum(
  grade: string,
  subject: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.userId)
    return {
      ok: false,
      error: "Your session has ended. Please sign in again.",
    };

  // Only real grades and learning areas, so the list staff see stays clean.
  const grades = await getGradeOptions();
  if (
    !grades.some((g) => g.name === grade && g.learningAreas.includes(subject))
  )
    return { ok: false, error: "Choose a grade and learning area first." };

  try {
    await db.curriculumRequest.upsert({
      where: {
        userId_grade_subject: { userId: session.userId, grade, subject },
      },
      update: {},
      create: { userId: session.userId, grade, subject },
    });
    return { ok: true };
  } catch (error) {
    console.error("requestCurriculum failed", error);
    return { ok: false, error: "That didn't send. Please try again." };
  }
}
