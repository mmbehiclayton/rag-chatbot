// One naming rule and one header for every teacher document, used by the
// screen viewers and by /api/export so a printout matches what the teacher saw.
// See docs/strategy/teacher-documents-standard.md, section 6.

export const DOC_LABELS = {
  scheme: "Scheme of work",
  lesson: "Lesson plan",
  notes: "Lesson notes",
  assessment: "Assessment",
  record: "Record of work",
} as const;

export type DocKind = keyof typeof DOC_LABELS;

/** The flag the checking pass adds to a title the teacher should look at. */
export const NEEDS_REVIEW = /^\[Needs Review\]\s*/i;

export function cleanTitle(title?: string | null) {
  return (title ?? "").replace(NEEDS_REVIEW, "").trim();
}

/** What a document's header shows. Anything unknown is left out. */
export type DocContext = {
  school?: string | null;
  teacher?: string | null;
  grade?: string | null;
  subject?: string | null;
  term?: string | null;
  year?: number | string | null;
};

/** "Grade 7 English – Lesson plan – Parts of a plant, lesson 3". */
export function docName(
  kind: DocKind,
  ctx: Pick<DocContext, "grade" | "subject">,
  detail?: string | null,
) {
  const cls = [ctx.grade, ctx.subject].filter(Boolean).join(" ");
  return [cls, DOC_LABELS[kind], cleanTitle(detail)]
    .filter(Boolean)
    .join(" – ");
}

/** School, Teacher, Grade, Learning area, Term and Year, in that order. */
export function docFields(ctx: DocContext) {
  return [
    { label: "School", value: ctx.school },
    { label: "Teacher", value: ctx.teacher },
    { label: "Grade", value: ctx.grade },
    { label: "Learning area", value: ctx.subject },
    { label: "Term", value: ctx.term },
    { label: "Year", value: ctx.year },
  ]
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== "")
    .map((f) => ({ label: f.label, value: String(f.value) }));
}

/** "Grade 7 · English · Term 1 2026", plus any extras, for the line under a title. */
export function docMeta(
  ctx: DocContext,
  ...extras: (string | null | undefined)[]
) {
  const term = [ctx.term, ctx.year].filter(Boolean).join(" ");
  return [ctx.grade, ctx.subject, term, ...extras].filter(Boolean).join(" · ");
}

type Teacher = {
  name?: string | null;
  schoolName?: string | null;
  tenant?: { name?: string | null } | null;
} | null;

/** The teacher's name and school, from their profile, for the header. */
export function teacherContext(teacher?: Teacher) {
  return {
    school: teacher?.schoolName || teacher?.tenant?.name || null,
    teacher: teacher?.name || null,
  };
}
