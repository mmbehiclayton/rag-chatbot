/**
 * The parts of a lesson plan a teacher can change on their own. Rewriting one part costs a
 * fraction of rewriting the whole plan, and the rest stays exactly as the teacher left it.
 */
export const LESSON_PARTS = [
  { part: "whole", label: "Whole plan" },
  { part: "introduction", label: "Introduction" },
  { part: "steps", label: "Lesson steps" },
  { part: "differentiation", label: "Helping every learner" },
  { part: "conclusion", label: "Conclusion" },
  { part: "resources", label: "Resources" },
  { part: "assessment", label: "Rubric and homework" },
] as const;

export type LessonPart = (typeof LESSON_PARTS)[number]["part"];

export const isLessonPart = (p: unknown): p is LessonPart =>
  LESSON_PARTS.some((l) => l.part === p);
