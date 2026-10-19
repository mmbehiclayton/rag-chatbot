import { unstable_cache } from "next/cache";
import { MAP_STATUS } from "@/lib/curriculum-map";
import { getGradeOptions } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";

/**
 * Data for the public curriculum design pages. They show strand and sub-strand names, plus the
 * first sub-strand in full as a sample: the other outcomes, questions and experiences stay inside
 * Elimu for signed-in teachers.
 * Cached for an hour, and refreshed as soon as a curator publishes or changes a map.
 */
export const DESIGNS_TAG = "public-designs";

/** "Grade 7" → "grade-7", "Pre-Technical Studies" → "pre-technical-studies". */
export function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function publicDesignHref(grade: string, subject: string) {
  return `/designs/${slug(grade)}/${slug(subject)}`;
}

export type DesignIndex = {
  level: string;
  grades: {
    name: string;
    subjects: { name: string; ready: boolean; subStrands: number }[];
  }[];
}[];

export const getDesignIndex = unstable_cache(
  async (): Promise<DesignIndex> => {
    const [grades, maps] = await Promise.all([
      getGradeOptions(),
      withDbRetry(() =>
        db.curriculumMap.findMany({
          where: { status: MAP_STATUS.PUBLISHED },
          select: {
            grade: true,
            subject: true,
            strands: { select: { _count: { select: { subStrands: true } } } },
          },
        }),
      ),
    ]);
    const counts = new Map(
      maps.map((m) => [
        `${m.grade}|${m.subject}`,
        m.strands.reduce((n, s) => n + s._count.subStrands, 0),
      ]),
    );
    const levels = [...new Set(grades.map((g) => g.level))];
    return levels.map((level) => ({
      level,
      grades: grades
        .filter((g) => g.level === level)
        .map((g) => ({
          name: g.name,
          subjects: g.learningAreas.map((name) => {
            const subStrands = counts.get(`${g.name}|${name}`) ?? 0;
            return { name, ready: subStrands > 0, subStrands };
          }),
        })),
    }));
  },
  ["public-design-index"],
  { revalidate: 3600, tags: [DESIGNS_TAG] },
);

export type PublicDesign = {
  grade: string;
  subject: string;
  level: string;
  lessonsPerWeek: number | null;
  publishedAt: string | null;
  strands: {
    name: string;
    subStrands: { name: string; lessons: number; term: number | null }[];
  }[];
  /** The first sub-strand in full, so a visitor can see what signing in gives them. */
  sample: {
    name: string;
    outcomes: string[];
    inquiryQuestions: string[];
    learningExperiences: string[];
  } | null;
};

/** A published design found by its URL slugs, or null. */
export const getPublicDesign = unstable_cache(
  async (
    gradeSlug: string,
    subjectSlug: string,
  ): Promise<PublicDesign | null> => {
    const index = await getDesignIndex();
    for (const { level, grades } of index)
      for (const g of grades) {
        if (slug(g.name) !== gradeSlug) continue;
        const subject = g.subjects.find(
          (s) => s.ready && slug(s.name) === subjectSlug,
        );
        if (!subject) return null;
        const map = await withDbRetry(() =>
          db.curriculumMap.findFirst({
            where: {
              grade: g.name,
              subject: subject.name,
              status: MAP_STATUS.PUBLISHED,
            },
            select: {
              lessonsPerWeek: true,
              publishedAt: true,
              strands: {
                orderBy: { order: "asc" },
                select: {
                  name: true,
                  subStrands: {
                    orderBy: { order: "asc" },
                    select: {
                      name: true,
                      lessons: true,
                      term: true,
                      outcomes: true,
                      inquiryQuestions: true,
                      learningExperiences: true,
                    },
                  },
                },
              },
            },
          }),
        );
        if (!map) return null;
        const strands = map.strands.filter((s) => s.subStrands.length > 0);
        const first = strands[0]?.subStrands[0];
        return {
          grade: g.name,
          subject: subject.name,
          level,
          lessonsPerWeek: map.lessonsPerWeek,
          publishedAt: map.publishedAt?.toISOString() ?? null,
          // Only names, lessons and terms leave the server for every sub-strand.
          strands: strands.map((s) => ({
            name: s.name,
            subStrands: s.subStrands.map(({ name, lessons, term }) => ({
              name,
              lessons,
              term,
            })),
          })),
          sample: first
            ? {
                name: first.name,
                outcomes: first.outcomes,
                inquiryQuestions: first.inquiryQuestions,
                learningExperiences: first.learningExperiences,
              }
            : null,
        };
      }
    return null;
  },
  ["public-design"],
  { revalidate: 3600, tags: [DESIGNS_TAG] },
);
