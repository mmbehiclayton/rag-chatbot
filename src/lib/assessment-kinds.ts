/** The kinds of assessment Elimu writes. Older assessments have no kind and are written tests. */
export const ASSESSMENT_KINDS = [
  {
    id: "written",
    label: "Written test",
    note: "An opener, mid-term or end of term paper on the term's work.",
  },
  {
    id: "quiz",
    label: "Quiz",
    note: "A short test on one sub-strand, for the end of a topic.",
  },
  {
    id: "practical",
    label: "Practical task",
    note: "A task or project learners do, with a rubric to score it.",
  },
  {
    id: "checklist",
    label: "Checklist",
    note: "What to look for while learners work, with a class list to tick.",
  },
] as const;

export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number]["id"];

export const isAssessmentKind = (v: unknown): v is AssessmentKind =>
  ASSESSMENT_KINDS.some((k) => k.id === v);

/** The kind stored in an assessment's content. */
export function assessmentKind(content: unknown): AssessmentKind {
  const kind = (content as { kind?: unknown } | null)?.kind;
  return isAssessmentKind(kind) ? kind : "written";
}

/** The four CBC performance levels, highest first, with the rubric score for each. */
export const RUBRIC_LEVELS = [
  { key: "exceeding", label: "Exceeding expectations", short: "EE", score: 4 },
  { key: "meeting", label: "Meeting expectations", short: "ME", score: 3 },
  {
    key: "approaching",
    label: "Approaching expectations",
    short: "AE",
    score: 2,
  },
  { key: "below", label: "Below expectations", short: "BE", score: 1 },
] as const;

export type PracticalContent = {
  kind: "practical";
  subStrandsCovered?: string[];
  learningOutcomes?: string[];
  task?: string;
  materials?: string[];
  steps?: string[];
  teacherNotes?: string;
  rubric?: {
    criterion?: string;
    learningOutcome?: string;
    exceeding?: string;
    meeting?: string;
    approaching?: string;
    below?: string;
  }[];
};

export type ChecklistContent = {
  kind: "checklist";
  subStrandsCovered?: string[];
  activity?: string;
  items?: { indicator?: string; learningOutcome?: string }[];
};
