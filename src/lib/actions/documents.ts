"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DocType } from "@/lib/doc-lists";

/**
 * Deletes one of the teacher's own documents. The monthly allowance comes from the generation
 * log, so deleting never gives documents back. Deleting a scheme keeps its lesson plans: they
 * stay filed under the same class and term, just no longer inside the scheme.
 */
export async function deleteDocument(
  type: DocType,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.userId) return { error: "Sign in again, then try once more." };
  const teacherId = session.userId;
  const gone = {
    error: "This document was already deleted, or it isn't yours.",
  };

  try {
    if (type === "schemes") {
      const scheme = await db.schemeOfWork.findFirst({
        where: { id, teacherId },
        select: { grade: true, subject: true, term: true, year: true },
      });
      if (!scheme) return gone;
      await db.$transaction([
        db.lessonPlan.updateMany({
          where: { schemeId: id, term: null },
          data: { term: scheme.term, year: scheme.year },
        }),
        db.lessonPlan.updateMany({
          where: { schemeId: id },
          data: {
            schemeId: null,
            grade: scheme.grade,
            subject: scheme.subject,
          },
        }),
        db.schemeOfWork.delete({ where: { id } }),
      ]);
    } else {
      const where = { id, teacherId };
      const { count } =
        type === "lessons"
          ? await db.lessonPlan.deleteMany({ where })
          : type === "notes"
            ? await db.lessonNote.deleteMany({ where })
            : await db.assessment.deleteMany({ where });
      if (count === 0) return gone;
    }
  } catch {
    return {
      error: "Elimu couldn't delete it. Check your connection and try again.",
    };
  }

  revalidatePath(`/dashboard/${type}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
