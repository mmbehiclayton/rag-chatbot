import { getTeacherClasses } from "@/lib/classes";
import {
  type CoverageItem,
  type CoverageStatus,
  type CoverageSummary,
  coverageGradeHref,
  coverageHref,
  coverageKey,
  isCoverageStatus,
  itemStatus,
  type LessonTick,
  lessonTitles,
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

/** One class (a grade, or a stream of it) with every learning area the teacher teaches there. */
export type ClassGroup = {
  grade: string;
  stream: string;
  /** "Grade 7 East" */
  label: string;
  href: string;
  areas: ClassCoverage[];
  /** Learning areas with a design or scheme to measure against. */
  tracked: number;
  summary: CoverageSummary;
};

type SchemeSub = {
  strand: string;
  name: string;
  term: number;
  lessonNumbers: number[];
  /** Each lesson's specific learning outcomes, in the same order. */
  outcomes: string[][];
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
      outcomes: [],
    };
    sub.lessonNumbers.push(lesson.lessonNumber);
    sub.outcomes.push(lesson.outcomes);
    subs.set(key, sub);
  }
  return subs;
}

/**
 * Syllabus coverage for the teacher's classes this school year: all of them, one grade (`only.grade`)
 * or one learning area (`only.grade` and `only.subject`).
 * A fixed handful of queries however many classes there are; everything else is worked out here.
 */
export async function getCoverage(
  teacherId: string,
  only?: { grade: string; subject?: string },
) {
  const today = todayInKenya();
  const year = Number(today.slice(0, 4));
  const classes = only?.subject
    ? [{ grade: only.grade, subject: only.subject }]
    : (await getTeacherClasses(teacherId))
        .filter((c) => !only || c.grade === only.grade)
        .map(({ grade, subject }) => ({ grade, subject }));
  if (classes.length === 0)
    return {
      year,
      currentTerm: null,
      classes: [] as ClassCoverage[],
      groups: [] as ClassGroup[],
      summary: summarise([], [], today),
    };

  const yearStart = new Date(`${year}-01-01T00:00:00Z`);
  const nextYear = new Date(`${year + 1}-01-01T00:00:00Z`);
  const [maps, schemes, marks, ticked, timetable, terms] = await Promise.all([
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
          coveredOn: true,
          updatedAt: true,
        },
      }),
    ),
    withDbRetry(() =>
      db.coverageLesson.findMany({
        where: { teacherId, year, ...(only ?? {}) },
        select: {
          grade: true,
          subject: true,
          stream: true,
          strand: true,
          subStrand: true,
          lesson: true,
          taughtOn: true,
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
            select: {
              schemeId: true,
              stream: true,
              lessonNumber: true,
              date: true,
            },
          }),
        );

  const day = (d: Date) => d.toISOString().slice(0, 10);
  // scheme|stream → lesson number → the first day it was taught
  const taught = new Map<string, Map<number, string>>();
  for (const r of taughtRows) {
    const k = `${r.schemeId}|${r.stream}`;
    const lessons = taught.get(k) ?? new Map<number, string>();
    const on = day(r.date);
    if (
      !lessons.has(r.lessonNumber) ||
      on < (lessons.get(r.lessonNumber) ?? "")
    )
      lessons.set(r.lessonNumber, on);
    taught.set(k, lessons);
  }
  const rowKey = (r: {
    grade: string;
    subject: string;
    stream: string;
    strand: string;
    subStrand: string;
  }) =>
    `${r.grade}|${r.subject}|${r.stream}|${coverageKey(r.strand, r.subStrand)}`;
  const legacy = new Map<
    string,
    { status: CoverageStatus | null; coveredOn: string | null }
  >();
  for (const m of marks)
    legacy.set(rowKey(m), {
      status: isCoverageStatus(m.status) ? m.status : null,
      coveredOn:
        // Marks from before dates were kept count from when they were last saved.
        m.status === "COVERED" ? day(m.coveredOn ?? m.updatedAt) : null,
    });
  const mineTicks = new Map<string, LessonTick[]>();
  for (const t of ticked) {
    const k = rowKey(t);
    mineTicks.set(k, [
      ...(mineTicks.get(k) ?? []),
      { lesson: t.lesson, on: day(t.taughtOn), source: "mine" },
    ]);
  }
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
      /**
       * Lessons of a sub-strand taught on the record of work. When it sits in more than one scheme
       * (a term redone), the scheme with the most taught counts, so lessons aren't added twice.
       */
      const fromRecord = (key: string) => {
        let best: {
          planned: number;
          ticks: LessonTick[];
          outcomes: string[][];
        } | null = null;
        for (const scheme of mine) {
          const sub = scheme.subs.get(key);
          if (!sub) continue;
          const done = taught.get(`${scheme.id}|${stream}`);
          const ticks: LessonTick[] = [];
          sub.lessonNumbers.forEach((n, i) => {
            const on = done?.get(n);
            if (on) ticks.push({ lesson: i + 1, on, source: "record" });
          });
          const planned = sub.lessonNumbers.length;
          if (
            !best ||
            ticks.length > best.ticks.length ||
            (ticks.length === best.ticks.length && planned > best.planned)
          )
            best = { planned, ticks, outcomes: sub.outcomes };
        }
        return best ?? { planned: 0, ticks: [], outcomes: [] };
      };

      const base = map
        ? subStrandsWithTerms(map).map((s) => ({
            number: s.number,
            strand: s.strand,
            name: s.name,
            weight: s.lessons,
            term: s.termNumber,
            outcomes: s.outcomes,
          }))
        : uniqueSchemeSubs(mine).map((s) => ({
            number: "",
            strand: s.strand,
            name: s.name,
            weight: s.lessonNumbers.length,
            term: s.term,
            outcomes: [] as string[],
          }));
      const items: CoverageItem[] = base.map(({ outcomes, ...s }) => {
        const record = fromRecord(normName(s.name));
        const lessons = Math.max(1, s.weight, record.planned);
        const k = rowKey({
          grade,
          subject,
          stream,
          strand: s.strand,
          subStrand: s.name,
        });
        const own = (mineTicks.get(k) ?? []).filter(
          (t) =>
            t.lesson <= lessons &&
            !record.ticks.some((r) => r.lesson === t.lesson),
        );
        const ticks = [...record.ticks, ...own].sort(
          (a, b) => a.lesson - b.lesson,
        );
        const mark = legacy.get(k);
        const coveredOn = mark?.coveredOn ?? null;
        return {
          ...s,
          lessons,
          titles: lessonTitles(lessons, record.outcomes, outcomes),
          ticks,
          coveredOn,
          ...itemStatus(lessons, ticks, coveredOn, mark?.status ?? null),
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
    groups: groupByClass(result, termDates, today),
    summary: summarise(
      result.flatMap((c) => c.items),
      termDates,
      today,
    ),
  };
}

/** Learning areas gathered under their class (grade and stream), in the order the classes come. */
function groupByClass(
  areas: ClassCoverage[],
  termDates: Parameters<typeof summarise>[1],
  today: string,
): ClassGroup[] {
  const groups = new Map<string, ClassCoverage[]>();
  for (const a of areas) {
    const k = `${a.grade}|${a.stream}`;
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  return [...groups.values()].map((list) => {
    const { grade, stream } = list[0];
    return {
      grade,
      stream,
      label: streamLabel(grade, stream),
      href: coverageGradeHref(grade, stream),
      areas: list,
      tracked: list.filter((a) => a.source).length,
      summary: summarise(
        list.flatMap((a) => a.items),
        termDates,
        today,
      ),
    };
  });
}

/** Without a checked design, the sub-strands in the teacher's schemes stand in for it. */
function uniqueSchemeSubs(schemes: { subs: Map<string, SchemeSub> }[]) {
  const seen = new Map<string, SchemeSub>();
  for (const scheme of schemes)
    for (const [key, sub] of scheme.subs)
      if (!seen.has(key)) seen.set(key, sub);
  return [...seen.values()];
}
