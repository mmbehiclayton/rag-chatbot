/**
 * Syllabus coverage: how much of a class's curriculum design the teacher has covered this school year.
 * Pure functions so the numbers are the same on every page. See docs/strategy/syllabus-coverage.md.
 */
import { SUGGESTED_TERMS, type TermDates, teachingDays } from "@/lib/term-pack";

export const COVERAGE_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COVERED",
] as const;
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];

export const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COVERED: "Covered",
};

/** A class's coverage page; `stream` is "" for a grade taught as one class. */
export function coverageHref(grade: string, subject: string, stream = "") {
  const base = `/dashboard/coverage/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`;
  return stream ? `${base}?${new URLSearchParams({ stream })}` : base;
}

/** A class's page: every learning area the teacher teaches in one grade (and stream). */
export function coverageGradeHref(grade: string, stream = "") {
  const base = `/dashboard/coverage/${encodeURIComponent(grade)}`;
  return stream ? `${base}?${new URLSearchParams({ stream })}` : base;
}

export function isCoverageStatus(value: unknown): value is CoverageStatus {
  return COVERAGE_STATUSES.includes(value as CoverageStatus);
}

/** Matches a sub-strand across the design, schemes and marks: "1.2 Whole  Numbers." → "whole numbers". */
export function normName(name: string) {
  return name
    .toLowerCase()
    .replace(/^[\s\d.:)-]+/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export const coverageKey = (strand: string, subStrand: string) =>
  `${normName(strand)}|${normName(subStrand)}`;

/** A lesson of a sub-strand that is done: ticked on this page, or marked Taught on the record of work. */
export type LessonTick = {
  lesson: number;
  /** "YYYY-MM-DD" */
  on: string;
  source: "record" | "mine";
};

/** One sub-strand on a class's coverage list. */
export type CoverageItem = {
  number: string;
  strand: string;
  name: string;
  /** Lessons on the checklist: the design's suggested lessons, or more when the scheme has more. */
  lessons: number;
  /** Suggested lessons in the design, so a 12-lesson sub-strand counts more than a 2-lesson one. */
  weight: number;
  term: number;
  /** What each lesson is about, lesson 1 first; "" when neither the scheme nor the design says. */
  titles: string[];
  ticks: LessonTick[];
  /** The day the teacher confirmed the whole sub-strand as covered. */
  coveredOn: string | null;
  status: CoverageStatus;
  /** When it was finished: the confirmed day, or the last lesson once every lesson is done. */
  doneOn: string | null;
};

/** "By the end of the lesson, the learner should be able to: a) name members of the family." → "Name members of the family" */
export function outcomeTitle(text: string) {
  const line =
    text
      .replace(
        /^\s*by the end of the [^,:]*,?\s*(the )?learners? (should|will) be able to\s*:?\s*/i,
        "",
      )
      .split(/\n/)
      .map((l) =>
        l.replace(/^\s*(\(?[a-z]\)|[a-z]\.|\d+[.)]|[-•*])\s+/i, "").trim(),
      )
      .find(Boolean) ?? "";
  const t = line.replace(/[.;,:\s]+$/, "").slice(0, 160);
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

/**
 * A name for each of a sub-strand's lessons: the outcome on that lesson's row of the teacher's scheme,
 * else the design's outcomes spread over the lessons in order. A lesson that carries on the one before says so.
 */
export function lessonTitles(
  lessons: number,
  schemeOutcomes: string[][],
  designOutcomes: string[],
) {
  const design = designOutcomes.map(outcomeTitle).filter(Boolean);
  const titles: string[] = [];
  let previous = "";
  for (let k = 0; k < lessons; k++) {
    const title =
      (schemeOutcomes[k] ?? []).map(outcomeTitle).find(Boolean) ??
      design[Math.floor((k * design.length) / lessons)] ??
      "";
    titles.push(title && title === previous ? `${title} (continued)` : title);
    previous = title;
  }
  return titles;
}

/**
 * Covered when the teacher confirms it or every lesson is done; in progress once any lesson is done.
 * `legacy` is a status marked before lessons could be ticked.
 */
export function itemStatus(
  lessons: number,
  ticks: LessonTick[],
  coveredOn: string | null,
  legacy: CoverageStatus | null = null,
): { status: CoverageStatus; doneOn: string | null } {
  const last =
    ticks
      .map((t) => t.on)
      .sort()
      .at(-1) ?? null;
  if (coveredOn) return { status: "COVERED", doneOn: coveredOn };
  if (legacy === "COVERED") return { status: "COVERED", doneOn: last };
  if (lessons > 0 && ticks.length >= lessons)
    return { status: "COVERED", doneOn: last };
  if (ticks.length > 0 || legacy === "IN_PROGRESS")
    return { status: "IN_PROGRESS", doneOn: null };
  return { status: "NOT_STARTED", doneOn: null };
}

/** Share of a sub-strand done, 0–1: lessons done, or all of it once covered. */
export function itemDone(i: CoverageItem) {
  if (i.status === "COVERED") return 1;
  return i.lessons > 0 ? Math.min(1, i.ticks.length / i.lessons) : 0;
}

export type Pace = "ahead" | "on-track" | "behind";

export type CoverageSummary = {
  subStrands: number;
  covered: number;
  inProgress: number;
  /** Share of the design's suggested lessons done, 0–100. Lessons ticked count before a sub-strand is finished. */
  percent: number;
  /** Where the class should be by today, from the term dates, 0–100; null without term dates. */
  expected: number | null;
  pace: Pace | null;
  terms: {
    term: number;
    subStrands: number;
    covered: number;
    percent: number;
  }[];
};

const weight = (i: CoverageItem) => Math.max(1, i.weight);
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Share of a term's teaching days gone by on `today`, 0–1. */
export function termElapsed(term: TermDates, today: string) {
  if (today < term.opensOn) return 0;
  if (today > term.closesOn) return 1;
  const days = teachingDays(term);
  if (days.length === 0) return 1;
  return days.filter((d) => d <= today).length / days.length;
}

/** The teacher's dates for each term of `year`, falling back to the Ministry calendar we know. */
export function yearTerms(terms: TermDates[], year: number) {
  return [1, 2, 3].map(
    (n) =>
      terms.find((t) => t.year === year && t.term === n) ??
      SUGGESTED_TERMS.find((t) => t.year === year && t.term === n) ??
      null,
  );
}

/** Ten points either side of where the class should be counts as on track. */
const PACE_MARGIN = 10;

export function summarise(
  items: CoverageItem[],
  terms: (TermDates | null)[],
  today: string,
): CoverageSummary {
  const total = items.reduce((n, i) => n + weight(i), 0);
  const done = items.reduce((n, i) => n + weight(i) * itemDone(i), 0);
  const percent = pct(done, total);

  const known = terms.length === 3 && terms.every(Boolean);
  const expected =
    known && total > 0
      ? pct(
          items.reduce(
            (n, i) =>
              n +
              weight(i) * termElapsed(terms[i.term - 1] as TermDates, today),
            0,
          ),
          total,
        )
      : null;
  const pace =
    expected === null || expected === 0
      ? null
      : percent < expected - PACE_MARGIN
        ? "behind"
        : percent > expected + PACE_MARGIN
          ? "ahead"
          : "on-track";

  return {
    subStrands: items.length,
    covered: items.filter((i) => i.status === "COVERED").length,
    inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
    percent,
    expected,
    pace,
    terms: [1, 2, 3].map((term) => {
      const inTerm = items.filter((i) => i.term === term);
      return {
        term,
        subStrands: inTerm.length,
        covered: inTerm.filter((i) => i.status === "COVERED").length,
        percent: pct(
          inTerm.reduce((n, i) => n + weight(i) * itemDone(i), 0),
          inTerm.reduce((n, i) => n + weight(i), 0),
        ),
      };
    }),
  };
}

export const PACE_LABELS: Record<Pace, string> = {
  ahead: "Ahead",
  "on-track": "On track",
  behind: "Behind",
};

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

/** "2026-10-12" → "12 Oct", the same on the server and the phone. */
export function shortDate(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1] ?? ""}`.trim();
}
