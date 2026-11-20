import { db } from "@/lib/db";
import type { DocType } from "@/lib/doc-lists";

/**
 * Deletes one of a teacher's own documents. Shared by the dashboard action and the EduPro API,
 * so both follow the same rules: the monthly allowance comes from the generation log, so deleting
 * never gives documents back; deleting a scheme keeps its lesson plans, filed under the same
 * class and term but no longer inside the scheme.
 */
export async function deleteDocumentFor(
  teacherId: string,
  type: DocType,
  id: string,
): Promise<{ ok: true } | { error: string }> {
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
  return { ok: true };
}
