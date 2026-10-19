import { formatDistanceToNow } from "date-fns";
import { getGradeOptions } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";

/** A class is one grade + learning area the teacher teaches, e.g. "Grade 7 · Integrated Science". */
export type TeacherClass = {
  grade: string;
  subject: string;
  schemes: number;
  lessons: number;
  assessments: number;
  updatedAt: Date | null;
};

export function classHref(grade: string, subject: string) {
  return `/dashboard/classes/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`;
}

/** Create-page link pre-filled with this class. */
export function createHref(
  kind: "lesson" | "scheme" | "assessment",
  grade: string,
  subject: string,
) {
  return `/dashboard/create/${kind}?${new URLSearchParams({ grade, subject })}`;
}

/** A learning area's checked curriculum design. */
export function designHref(grade: string, subject: string) {
  return `/dashboard/designs/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`;
}

/** Where clause for a teacher's lesson plans in one class (older scheme lessons only carry grade on the scheme). */
export function classLessonWhere(
  teacherId: string,
  grade: string,
  subject: string,
) {
  return {
    teacherId,
    OR: [
      { grade, subject },
      { grade: null, scheme: { grade, subject } },
    ],
  };
}

/** One line describing what a class already has, e.g. "1 scheme · 12 lesson plans · updated 2 days ago". */
function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function classSummary(c: TeacherClass) {
  const parts = [
    c.schemes > 0 && plural(c.schemes, "scheme", "schemes"),
    c.lessons > 0 && plural(c.lessons, "lesson plan", "lesson plans"),
    c.assessments > 0 && plural(c.assessments, "assessment", "assessments"),
  ].filter(Boolean);
  if (parts.length === 0) return "Nothing prepared yet";
  return [
    ...parts,
    c.updatedAt &&
      `updated ${formatDistanceToNow(c.updatedAt, { addSuffix: true })}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

const key = (grade: string, subject: string) => `${grade}|${subject}`;

/**
 * The teacher's classes: pairs from onboarding that exist in the curriculum structure,
 * plus any grade + learning area they already have documents for.
 */
export async function getTeacherClasses(
  teacherId: string,
): Promise<TeacherClass[]> {
  const [user, grades, schemes, lessons, assessments] = await Promise.all([
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: teacherId },
        select: { gradesTaught: true, subjectsTaught: true },
      }),
    ),
    getGradeOptions(),
    withDbRetry(() =>
      db.schemeOfWork.groupBy({
        by: ["grade", "subject"],
        where: { teacherId },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
    ),
    withDbRetry(() =>
      db.lessonPlan.findMany({
        where: { teacherId },
        select: {
          grade: true,
          subject: true,
          updatedAt: true,
          scheme: { select: { grade: true, subject: true } },
        },
      }),
    ),
    withDbRetry(() =>
      db.assessment.groupBy({
        by: ["grade", "subject"],
        where: { teacherId },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
    ),
  ]);

  const classes = new Map<string, TeacherClass>();
  const get = (grade: string, subject: string) => {
    const k = key(grade, subject);
    let c = classes.get(k);
    if (!c) {
      c = {
        grade,
        subject,
        schemes: 0,
        lessons: 0,
        assessments: 0,
        updatedAt: null,
      };
      classes.set(k, c);
    }
    return c;
  };
  const touch = (c: TeacherClass, at: Date | null | undefined) => {
    if (at && (!c.updatedAt || at > c.updatedAt)) c.updatedAt = at;
  };

  // Onboarding pairs first, in the order the teacher chose them.
  for (const grade of user?.gradesTaught ?? []) {
    const areas = grades.find((g) => g.name === grade)?.learningAreas ?? [];
    for (const subject of user?.subjectsTaught ?? [])
      if (areas.includes(subject)) get(grade, subject);
  }

  for (const s of schemes) {
    const c = get(s.grade, s.subject);
    c.schemes = s._count._all;
    touch(c, s._max.updatedAt);
  }
  for (const l of lessons) {
    const grade = l.grade ?? l.scheme?.grade;
    const subject = l.subject ?? l.scheme?.subject;
    if (!grade || !subject) continue;
    const c = get(grade, subject);
    c.lessons++;
    touch(c, l.updatedAt);
  }
  for (const a of assessments) {
    const c = get(a.grade, a.subject);
    c.assessments = a._count._all;
    touch(c, a._max.updatedAt);
  }

  return [...classes.values()];
}

type SchemeContent = {
  weeks?: {
    weekNumber?: number;
    rows?: { strand?: string; subStrand?: string }[];
  }[];
};

export type NextLesson = {
  schemeId: string;
  lessonNumber: number;
  weekNumber: number;
  topic: string;
  total: number;
  done: number;
};

/**
 * The first lesson in a scheme that has no lesson plan yet. Lesson numbers run across the
 * whole term, one per scheme row, matching the scheme page and getSchemeLessonsStatus.
 */
export function nextLessonInScheme(
  scheme: { id: string; content: unknown },
  planned: Set<number>,
): NextLesson | null {
  const weeks = Array.isArray((scheme.content as SchemeContent | null)?.weeks)
    ? ((scheme.content as SchemeContent).weeks ?? [])
    : [];
  let counter = 0;
  let next: NextLesson | null = null;
  weeks.forEach((week, wi) => {
    for (const row of Array.isArray(week.rows) ? week.rows : []) {
      counter++;
      if (!next && !planned.has(counter)) {
        next = {
          schemeId: scheme.id,
          lessonNumber: counter,
          weekNumber: week.weekNumber ?? wi + 1,
          topic: row.subStrand || row.strand || `Lesson ${counter}`,
          total: 0,
          done: 0,
        };
      }
    }
  });
  if (!next) return null;
  const found = next as NextLesson;
  found.total = counter;
  found.done = [...planned].filter((n) => n >= 1 && n <= counter).length;
  return found;
}
