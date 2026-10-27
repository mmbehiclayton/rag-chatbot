/** The four cognitive levels a question can test, lowest first. */
export const COGNITIVE_LEVELS = [
  "Knowledge",
  "Comprehension",
  "Application",
  "Higher order",
] as const;

export type CognitiveLevel = (typeof COGNITIVE_LEVELS)[number];

type SpecQuestion = {
  questionNumber?: string | number;
  learningOutcome?: string;
  level?: string;
  marks?: number | string;
};
type SpecSection = { questions?: SpecQuestion[] };

export type SpecRow = {
  outcome: string;
  questions: string[];
  /** Marks per level, in COGNITIVE_LEVELS order. */
  byLevel: number[];
  marks: number;
};

export type SpecTable = {
  rows: SpecRow[];
  /** Marks per level across the paper, in COGNITIVE_LEVELS order. */
  byLevel: number[];
  total: number;
  /** False for papers made before questions carried a level. */
  hasLevels: boolean;
};

const levelIndex = (level?: string) =>
  COGNITIVE_LEVELS.findIndex(
    (l) => l.toLowerCase() === level?.trim().toLowerCase(),
  );

/**
 * The table of specifications: how the paper's marks spread across learning outcomes and
 * cognitive levels. Questions are grouped by the outcome they test, in the order they first
 * appear on the paper.
 */
export function specTable(sections: unknown): SpecTable {
  const rows = new Map<string, SpecRow>();
  const byLevel = COGNITIVE_LEVELS.map(() => 0);
  let total = 0;
  let hasLevels = false;

  for (const section of Array.isArray(sections)
    ? (sections as SpecSection[])
    : []) {
    const questions = Array.isArray(section?.questions)
      ? section.questions
      : [];
    questions.forEach((q, qi) => {
      const outcome = q.learningOutcome?.trim() || "Outcome not given";
      const marks = Number(q.marks) || 0;
      const row = rows.get(outcome) ?? {
        outcome,
        questions: [],
        byLevel: COGNITIVE_LEVELS.map(() => 0),
        marks: 0,
      };
      row.questions.push(String(q.questionNumber ?? qi + 1));
      row.marks += marks;
      const li = levelIndex(q.level);
      if (li >= 0) {
        hasLevels = true;
        row.byLevel[li] += marks;
        byLevel[li] += marks;
      }
      rows.set(outcome, row);
      total += marks;
    });
  }

  return { rows: [...rows.values()], byLevel, total, hasLevels };
}

/** A share of the paper's marks as a whole percentage. */
export const percent = (marks: number, total: number) =>
  total > 0 ? `${Math.round((marks / total) * 100)}%` : "–";
