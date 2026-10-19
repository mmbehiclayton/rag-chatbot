import { getTeacherClasses } from "@/lib/classes";
import {
  autoStatus,
  type CoverageItem,
  type CoverageStatus,
  type CoverageSummary,
  coverageHref,
  coverageKey,
  isCoverageStatus,
  normName,
  summarise,
  yearTerms,
} from "@/lib/coverage";
import { getPublishedMaps, subStrandsWithTerms } from "@/lib/curriculum-map";
import { db, withDbRetry } from "@/lib/db";
import {
  pickTerm,
  schemeLessons,
  streamLabel,
  termNumber,
  todayInKenya,
} from "@/lib/term-pack";
import {
  getTeacherTerms,
  getTimetable,
  streamsFor,
} from "@/lib/term-pack-data";

/** One class (grade, stream and learning area) with its sub-strands and progress for the school year. */
export type ClassCoverage = {
  grade: string;
  subject: string;
  stream: string;
  /** "Grade 7 East · Mathematics" */
  label: string;
  href: string;
  /** "design" when a checked curriculum design is in Elimu; "schemes" when only the teacher's schemes are. */
  source: "design" | "schemes" | null;
  items: CoverageItem[];
  summary: CoverageSummary;
};

type SchemeSub = {
  strand: string;
  name: string;
  term: number;
  lessonNumbers: number[];
};

/** A scheme's lessons grouped by sub-strand, in scheme order. */
function schemeSubStrands(content: unknown, term: string) {
  const subs = new Map<string, SchemeSub>();
  for (const lesson of schemeLessons(content)) {
    const key = normName(lesson.subStrand);
    if (!key) continue;
    const sub = subs.get(key) ?? {
      strand: lesson.strand,
      name: lesson.subStrand.replace(/^[\s\d.:)-]+/, "").trim(),
      term: termNumber(term) ?? 1,
      lessonNumbers: [],
    };
    sub.lessonNumbers.push(lesson.lessonNumber);
    subs.set(key, sub);
  }
  return subs;
}

/**
 * Syllabus coverage for the teacher's classes this school year (or one learning area with `only`).
 * A fixed handful of queries however many classes there are; everything else is worked out here.
 */
export async function getCoverage(
  teacherId: string,
  only?: { grade: string; subject: string },
) {
  const today = todayInKenya();
  const year = Number(today.slice(0, 4));
  const classes = only
    ? [only]
    : (await getTeacherClasses(teacherId)).map(({ grade, subject }) => ({
        grade,
        subject,
      }));
  if (classes.length === 0)
    return {
      year,
      currentTerm: null,
      classes: [] as ClassCoverage[],
      summary: summarise([], [], today),
    };

  const yearStart = new Date(`${year}-01-01T00:00:00Z`);
  const nextYear = new Date(`${year + 1}-01-01T00:00:00Z`);
  const [maps, schemes, marks, timetable, terms] = await Promise.all([
    getPublishedMaps(classes),
    withDbRetry(() =>
      db.schemeOfWork.findMany({
        where: {
          teacherId,
          AND: [
            { OR: classes },
            {
              OR: [
                { year },
                { year: null, createdAt: { gte: yearStart, lt: nextYear } },
              ],
            },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          grade: true,
          subject: true,
          term: true,
          content: true,
        },
      }),
    ),
    withDbRetry(() =>
      db.syllabusCoverage.findMany({
        where: { teacherId, year, ...(only ?? {}) },
        select: {
          grade: true,
          subject: true,
          stream: true,
          strand: true,
          subStrand: true,
          status: true,
        },
      }),
    ),
    getTimetable(teacherId),
    getTeacherTerms(teacherId),
  ]);
  const taughtRows =
    schemes.length === 0
      ? []
      : await withDbRetry(() =>
          db.lessonRecord.findMany({
            where: {
              teacherId,
              status: "TAUGHT",
              schemeId: { in: schemes.map((s) => s.id) },
            },
            select: { schemeId: true, stream: true, lessonNumber: true },
          }),
        );

  const taught = new Map<string, Set<number>>();
  for (const r of taughtRows) {
    const k = `${r.schemeId}|${r.stream}`;
    taught.set(k, (taught.get(k) ?? new Set()).add(r.lessonNumber));
  }
  const manual = new Map<string, CoverageStatus>();
  for (const m of marks)
    if (isCoverageStatus(m.status))
      manual.set(
        `${m.grade}|${m.subject}|${m.stream}|${coverageKey(m.strand, m.subStrand)}`,
        m.status,
      );
  const parsed = schemes.map((s) => ({
    ...s,
    subs: schemeSubStrands(s.content, s.term),
  }));
  const termDates = yearTerms(terms, year);

  const result: ClassCoverage[] = [];
  for (const { grade, subject } of classes) {
    const map = maps.find((m) => m.grade === grade && m.subject === subject);
    const mine = parsed
      .filter((s) => s.grade === grade && s.subject === subject)
      // Earlier terms first, so the fallback list follows the year.
      .sort((a, b) => (termNumber(a.term) ?? 1) - (termNumber(b.term) ?? 1));
    const streams = streamsFor(timetable, grade, subject);

    for (const stream of streams.length ? streams : [""]) {
      // Lessons planned and taught for each sub-strand, across every scheme this year.
      const progress = new Map<string, { planned: number; taught: number }>();
      for (const scheme of mine) {
        const done = taught.get(`${scheme.id}|${stream}`);
        for (const [key, sub] of scheme.subs) {
          const p = progress.get(key) ?? { planned: 0, taught: 0 };
          p.planned += sub.lessonNumbers.length;
          p.taught += sub.lessonNumbers.filter((n) => done?.has(n)).length;
          progress.set(key, p);
        }
      }

      const base = map
        ? subStrandsWithTerms(map).map((s) => ({
            number: s.number,
            strand: s.strand,
            name: s.name,
            lessons: s.lessons,
            term: s.termNumber,
          }))
        : uniqueSchemeSubs(mine).map((s) => ({
            number: "",
            strand: s.strand,
            name: s.name,
            lessons: s.lessonNumbers.length,
            term: s.term,
          }));
      const items: CoverageItem[] = base.map((s) => {
        const p = progress.get(normName(s.name)) ?? { planned: 0, taught: 0 };
        const auto = autoStatus(p.planned, p.taught);
        const own =
          manual.get(
            `${grade}|${subject}|${stream}|${coverageKey(s.strand, s.name)}`,
          ) ?? null;
        return {
          ...s,
          ...p,
          auto,
          manual: own,
          status: own ?? auto ?? "NOT_STARTED",
        };
      });

      result.push({
        grade,
        subject,
        stream,
        label: `${streamLabel(grade, stream)} · ${subject}`,
        href: coverageHref(grade, subject, stream),
        source: map ? "design" : items.length ? "schemes" : null,
        items,
        summary: summarise(items, termDates, today),
      });
    }
  }

  return {
    year,
    /** The term in progress (or next to open), to open the class page on. */
    currentTerm:
      pickTerm(
        termDates.filter((t) => t !== null),
        today,
      )?.term ?? null,
    classes: result,
    summary: summarise(
      result.flatMap((c) => c.items),
      termDates,
      today,
    ),
  };
}

/** Without a checked design, the sub-strands in the teacher's schemes stand in for it. */
function uniqueSchemeSubs(schemes: { subs: Map<string, SchemeSub> }[]) {
  const seen = new Map<string, SchemeSub>();
  for (const scheme of schemes)
    for (const [key, sub] of scheme.subs)
      if (!seen.has(key)) seen.set(key, sub);
  return [...seen.values()];
}
