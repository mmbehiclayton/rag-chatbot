import { db, withDbRetry } from "@/lib/db";

export type GradeOption = { name: string; level: string; learningAreas: string[] };

/** Grades in curriculum order, each with the learning areas taught in it. */
export async function getGradeOptions(): Promise<GradeOption[]> {
  const levels = await withDbRetry(() =>
    db.curriculumLevel.findMany({
      orderBy: { order: "asc" },
      select: {
        name: true,
        grades: {
          orderBy: { order: "asc" },
          select: {
            name: true,
            learningAreas: { select: { learningArea: { select: { name: true, order: true } } } },
          },
        },
      },
    })
  );

  return levels.flatMap((level) =>
    level.grades.map((grade) => ({
      name: grade.name,
      level: level.name,
      learningAreas: grade.learningAreas
        .map((la) => la.learningArea)
        .sort((a, b) => a.order - b.order)
        .map((la) => la.name),
    }))
  );
}

/** The signed-in teacher's onboarding profile, used to pre-fill create forms. */
export async function getTeachingProfile(userId: string) {
  return withDbRetry(() =>
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, schoolName: true, gradesTaught: true, subjectsTaught: true, onboardedAt: true },
    })
  );
}

/** "Grade|Learning area" keys for every curriculum design indexed for this tenant. */
export async function getIndexedCurricula(tenantId?: string | null) {
  const docs = await withDbRetry(() =>
    db.curriculumDocument.findMany({
      where: { status: "completed", OR: [{ tenantId: tenantId ?? null }, { tenantId: null }] },
      select: { gradeLevel: true, subject: true },
    })
  );
  return [...new Set(docs.map((d) => `${d.gradeLevel}|${d.subject}`))];
}

/** Puts a class passed in the URL (?grade=&subject=) ahead of the teacher's own choices so the form opens on it. */
export function preferClass(list: string[] | undefined, value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  const items = list ?? [];
  return v ? [v, ...items.filter((i) => i !== v)] : items;
}
