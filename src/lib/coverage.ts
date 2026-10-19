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

/** One sub-strand on a class's coverage list. */
export type CoverageItem = {
  number: string;
  strand: string;
  name: string;
  /** Suggested lessons, used to weight progress so a 12-lesson sub-strand counts more than a 2-lesson one. */
  lessons: number;
  term: number;
  /** Lessons in the teacher's schemes for this sub-strand, and how many are marked Taught. */
  planned: number;
  taught: number;
  /** What the record of work says, when the teacher has a scheme for it. */
  auto: CoverageStatus | null;
  /** What the teacher marked themselves; it wins over the record of work. */
  manual: CoverageStatus | null;
  status: CoverageStatus;
};

/** Status from the record of work: every scheme lesson taught is covered, some is in progress. */
export function autoStatus(
  planned: number,
  taught: number,
): CoverageStatus | null {
  if (planned === 0) return null;
  if (taught >= planned) return "COVERED";
  return taught > 0 ? "IN_PROGRESS" : "NOT_STARTED";
}

export type Pace = "ahead" | "on-track" | "behind";

export type CoverageSummary = {
  subStrands: number;
  covered: number;
  inProgress: number;
  /** Covered share of suggested lessons, 0–100. */
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

const weight = (i: CoverageItem) => Math.max(1, i.lessons);
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
  const done = items
    .filter((i) => i.status === "COVERED")
    .reduce((n, i) => n + weight(i), 0);
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
      const covered = inTerm.filter((i) => i.status === "COVERED");
      return {
        term,
        subStrands: inTerm.length,
        covered: covered.length,
        percent: pct(
          covered.reduce((n, i) => n + weight(i), 0),
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
