import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Reuse between teachers is copy-on-reuse: the teacher gets their own copy, so their edits never
 * touch anyone else's work. Copies a teacher has checked (and often edited) rank first, then the
 * ones reused most, so the best version of each lesson spreads.
 */
export const BEST_FIRST = [
  { checkedAt: { sort: "desc", nulls: "last" } },
  { sharesCount: "desc" },
  { updatedAt: "desc" },
] satisfies Prisma.LessonPlanOrderByWithRelationInput[];

export const BEST_SCHEME_FIRST = [
  { checkedAt: { sort: "desc", nulls: "last" } },
  { sharesCount: "desc" },
  { createdAt: "desc" },
] satisfies Prisma.SchemeOfWorkOrderByWithRelationInput[];

type ContentType = "SCHEME_OF_WORK" | "LESSON_PLAN" | "LESSON_NOTES";

/** A reuse costs no AI tokens; the log keeps the teacher's monthly count honest and shows time saved. */
export function logReuse(
  session: { userId: string; tenantId?: string | null },
  contentType: ContentType,
) {
  return db.generationLog.create({
    data: {
      userId: session.userId,
      tenantId: session.tenantId,
      contentType,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      model: "cache",
    },
  });
}

/**
 * One more teacher reused this document. Raw SQL so the owner's `updatedAt` (their
 * "recently opened" order) doesn't move.
 */
export function countReuse(table: "LessonPlan" | "SchemeOfWork", id: string) {
  return table === "LessonPlan"
    ? db.$executeRaw`UPDATE "LessonPlan" SET "sharesCount" = "sharesCount" + 1 WHERE "id" = ${id}`
    : db.$executeRaw`UPDATE "SchemeOfWork" SET "sharesCount" = "sharesCount" + 1 WHERE "id" = ${id}`;
}

/** The newest notes on a lesson plan, copied onto another teacher's copy of it. */
async function copyNotes(
  fromPlanId: string,
  toPlanId: string,
  teacherId: string,
) {
  const notes = await db.lessonNote.findFirst({
    where: { lessonPlanId: fromPlanId },
    orderBy: [
      { checkedAt: { sort: "desc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
    select: { notes: true, resources: true },
  });
  if (!notes) return false;
  await db.lessonNote.create({
    data: {
      lessonPlanId: toPlanId,
      notes: notes.notes,
      resources: notes.resources ?? undefined,
      teacherId,
    },
  });
  return true;
}

/**
 * Copies another teacher's lesson plan (and its notes) into this teacher's library.
 * `into` sets where it's filed: a scheme lesson, or a term for a quick plan.
 */
export async function copyLessonPlan(
  sourceId: string,
  session: { userId: string; tenantId?: string | null },
  into: Omit<
    Prisma.LessonPlanUncheckedCreateInput,
    "topic" | "objectives" | "content" | "teacherId"
  >,
) {
  const source = await db.lessonPlan.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      topic: true,
      objectives: true,
      content: true,
      durationMinutes: true,
      teacherId: true,
    },
  });
  if (!source) return null;

  const plan = await db.lessonPlan.create({
    data: {
      durationMinutes: source.durationMinutes,
      ...into,
      topic: source.topic,
      objectives: source.objectives,
      content: source.content as Prisma.InputJsonValue,
      teacherId: session.userId,
    },
  });
  await Promise.all([
    copyNotes(source.id, plan.id, session.userId),
    source.teacherId === session.userId
      ? null
      : countReuse("LessonPlan", source.id),
    logReuse(session, "LESSON_PLAN"),
  ]);
  return plan;
}
