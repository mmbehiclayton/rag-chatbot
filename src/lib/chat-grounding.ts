import type { GradeOption } from "@/lib/curriculum-options";

const STOP = new Set(["and", "the", "of", "for", "in", "&"]);
// Short forms teachers use for learning areas.
const ALIASES: Record<string, string> = {
  maths: "mathematics",
  math: "mathematics",
  sst: "social studies",
  cre: "christian religious education",
  ire: "islamic religious education",
  hre: "hindu religious education",
  pe: "physical education",
  pre: "pre technical",
};
const words = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

/**
 * The class a question is about, e.g. "Grade 5" and "Science and Technology" from
 * "outcomes for Grade 5 Science, Living Things". Null unless both a grade and one of
 * its learning areas are named.
 */
export function detectClass(
  question: string,
  grades: GradeOption[],
): { grade: string; subject: string } | null {
  const n = question.match(/\bgrade\s*(\d{1,2})\b/i)?.[1];
  const grade = n
    ? grades.find((g) => g.name.toLowerCase() === `grade ${n}`)
    : undefined;
  if (!grade) return null;

  const asked = new Set(
    words(question).flatMap((w) => (ALIASES[w] ? words(ALIASES[w]) : [w])),
  );
  let best: { subject: string; score: number } | null = null;
  for (const subject of grade.learningAreas) {
    const w = words(subject);
    if (!w.length) continue;
    const score = w.filter((x) => asked.has(x)).length / w.length;
    if (
      score >= 0.5 &&
      (!best ||
        score > best.score ||
        (score === best.score && subject.length < best.subject.length))
    ) {
      best = { subject, score };
    }
  }
  return best ? { grade: grade.name, subject: best.subject } : null;
}

/** "(p. 3, 7)" for the pages that are known, or nothing. */
export function pageLabel(pages: (number | null | undefined)[]) {
  const known = [
    ...new Set(
      pages.filter((p): p is number => typeof p === "number" && p > 0),
    ),
  ].sort((a, b) => a - b);
  return known.length ? ` (p. ${known.join(", ")})` : "";
}
