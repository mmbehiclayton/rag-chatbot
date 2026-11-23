import { after, NextResponse } from "next/server";
import {
  generateAssessment,
  generateLessonNotes,
  generateLessonPlan,
  generateQuickLessonPlan,
  generateSchemeOfWork,
  improveDocument,
  undoImprove,
} from "@/lib/actions/generation";
import { isLessonPart } from "@/lib/improve-parts";
import { fail, requireTeacher } from "@/lib/service-auth";
import { runAsTeacher } from "@/lib/service-context";
import {
  canStart,
  createJob,
  finishJob,
  type JobResult,
} from "@/lib/service-jobs";

/**
 * Starts making a document as the teacher and returns a job id straight away. Poll
 * GET /api/v1/jobs/:id for the result. The same rules as on Elimu apply: the teacher's plan,
 * monthly allowance and school settings are checked inside the generator.
 */

type Body = Record<string, unknown>;

const KINDS = {
  scheme: { type: "schemes" },
  lesson: { type: "lessons" },
  "quick-lesson": { type: "lessons" },
  notes: { type: "notes" },
  assessment: { type: "assessments" },
  // These two take the type from the document being changed.
  improve: { type: "schemes" },
  undo: { type: "schemes" },
} as const;

type Kind = keyof typeof KINDS;

const IMPROVE_TYPE = {
  SCHEME: "schemes",
  LESSON: "lessons",
  NOTES: "notes",
} as const;

/** The document type a job produces, so EduPro knows where to open the result. */
function jobType(kind: Kind, b: Body) {
  if (kind !== "improve" && kind !== "undo") return KINDS[kind].type;
  const k = typeof b.kind === "string" ? b.kind : "";
  return Object.hasOwn(IMPROVE_TYPE, k)
    ? IMPROVE_TYPE[k as keyof typeof IMPROVE_TYPE]
    : "schemes";
}

function isKind(v: string): v is Kind {
  return Object.hasOwn(KINDS, v);
}

function text(v: unknown, max = 300) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** A whole number inside a range, or the default when it is missing or not a number. */
function num(v: unknown, fallback: number, min: number, max: number) {
  const n = Number(v);
  return Number.isFinite(n)
    ? Math.min(max, Math.max(min, Math.round(n)))
    : fallback;
}

/** Builds the call for one kind, or returns a message saying what is missing. */
function plan(kind: Kind, b: Body): (() => Promise<JobResult>) | string {
  switch (kind) {
    case "scheme": {
      const grade = text(b.grade);
      const subject = text(b.subject);
      const term = text(b.term, 40);
      if (!grade || !subject || !term)
        return "Choose a class, subject and term.";
      return () =>
        generateSchemeOfWork({
          grade,
          subject,
          term,
          weeks: num(b.weeks, 13, 1, 20),
          holidays: num(b.holidays, 0, 0, 10),
          lessonsPerWeek: num(b.lessonsPerWeek, 5, 1, 12),
          durationMinutes: num(b.durationMinutes, 40, 20, 120),
        }) as Promise<JobResult>;
    }
    case "lesson": {
      const schemeId = text(b.schemeId);
      const topic = text(b.topic);
      const n = Number(b.lessonNumber);
      if (!schemeId || !topic || !Number.isInteger(n) || n < 1)
        return "Choose a scheme, a lesson number and a topic.";
      return () => generateLessonPlan(schemeId, n, topic) as Promise<JobResult>;
    }
    case "quick-lesson": {
      const grade = text(b.grade);
      const subject = text(b.subject);
      const topic = text(b.topic, 200);
      if (!grade || !subject || !topic)
        return "Choose a class, subject and topic.";
      return () =>
        generateQuickLessonPlan({
          grade,
          subject,
          topic,
          durationMinutes: num(b.durationMinutes, 40, 20, 120),
        }) as Promise<JobResult>;
    }
    case "notes": {
      const id = text(b.lessonPlanId);
      if (!id) return "Choose a lesson plan.";
      return () => generateLessonNotes(id) as Promise<JobResult>;
    }
    case "improve":
    case "undo": {
      const docKind = typeof b.kind === "string" ? b.kind : "";
      const id = text(b.id);
      if (!Object.hasOwn(IMPROVE_TYPE, docKind) || !id)
        return "Choose which document to change.";
      const target = docKind as keyof typeof IMPROVE_TYPE;
      if (kind === "undo")
        return () => undoImprove({ kind: target, id }) as Promise<JobResult>;
      const instruction = text(b.instruction, 500);
      if (!instruction || instruction.length < 3)
        return 'Tell Elimu what to change, for example "Add a group activity".';
      const part =
        target === "LESSON" && isLessonPart(b.part) ? b.part : undefined;
      return () =>
        improveDocument({
          kind: target,
          id,
          instruction,
          part,
        }) as Promise<JobResult>;
    }
    case "assessment": {
      const grade = text(b.grade);
      const subject = text(b.subject);
      const term = text(b.term, 40);
      if (!grade || !subject || !term)
        return "Choose a class, subject and term.";
      const topic = text(b.topic, 200) ?? undefined;
      return () =>
        generateAssessment({
          grade,
          subject,
          term,
          type: text(b.type, 80) ?? "End of term assessment",
          totalMarks: num(b.totalMarks, 40, 5, 200),
          durationMinutes: num(b.durationMinutes, 40, 10, 240),
          topic,
        }) as Promise<JobResult>;
    }
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ kind: string }> },
) {
  const { kind } = await ctx.params;
  if (!isKind(kind)) return fail(404, "That kind of document doesn't exist.");

  const result = await requireTeacher(req);
  if ("response" in result) return result.response;
  const { teacher } = result;

  let body: Body;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("shape");
    body = parsed as Body;
  } catch {
    return fail(400, "Fill in the form and try again.");
  }

  const run = plan(kind, body);
  if (typeof run === "string") return fail(400, run);
  if (!canStart(teacher.id))
    return fail(
      429,
      "Two documents are already being made. Wait for one to finish.",
    );

  const type = jobType(kind, body);
  const jobId = createJob(teacher.id, type);
  // Runs after the reply is sent, still as this teacher.
  after(async () => {
    try {
      finishJob(jobId, await runAsTeacher(teacher.id, run));
    } catch {
      finishJob(jobId, {
        ok: false,
        error: "Something went wrong making that. Try again.",
      });
    }
  });

  return NextResponse.json(
    { success: true, data: { jobId, type } },
    { status: 202 },
  );
}
