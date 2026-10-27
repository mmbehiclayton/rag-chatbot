"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DocType } from "@/lib/doc-lists";
import { TERMS } from "@/lib/kicd-constants";

/**
 * Deletes one of the teacher's own documents. The monthly allowance comes from the generation
 * log, so deleting never gives documents back. Deleting a scheme keeps its lesson plans: they
 * stay filed under the same class and term, just no longer inside the scheme.
 */
export async function deleteDocument(
  type: DocType,
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.userId) return { error: "Sign in again, then try once more." };
  const teacherId = session.userId;
  const gone = {
    error: "This document was already deleted, or it isn't yours.",
  };

  try {
    if (type === "schemes") {
      const scheme = await db.schemeOfWork.findFirst({
        where: { id, teacherId },
        select: { grade: true, subject: true, term: true, year: true },
      });
      if (!scheme) return gone;
      await db.$transaction([
        db.lessonPlan.updateMany({
          where: { schemeId: id, term: null },
          data: { term: scheme.term, year: scheme.year },
        }),
        db.lessonPlan.updateMany({
          where: { schemeId: id },
          data: {
            schemeId: null,
            grade: scheme.grade,
            subject: scheme.subject,
          },
        }),
        db.schemeOfWork.delete({ where: { id } }),
      ]);
    } else {
      const where = { id, teacherId };
      const { count } =
        type === "lessons"
          ? await db.lessonPlan.deleteMany({ where })
          : type === "notes"
            ? await db.lessonNote.deleteMany({ where })
            : await db.assessment.deleteMany({ where });
      if (count === 0) return gone;
    }
  } catch {
    return {
      error: "Elimu couldn't delete it. Check your connection and try again.",
    };
  }

  revalidatePath(`/dashboard/${type}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const json = (v: Prisma.JsonValue) => (v ?? {}) as Prisma.InputJsonValue;

/**
 * Copies a scheme, lesson plan or assessment to another term or year, for example to reuse
 * last year's Term 1 this year. Nothing is generated, so the allowance isn't touched. Copies
 * start as drafts: the dates around them change, so the teacher checks them again. A scheme
 * can bring its lesson plans and their notes; a lesson plan always brings its notes.
 */
export async function copyDocument(
  type: Exclude<DocType, "notes">,
  id: string,
  target: { term: string; year: number },
  withLessons = false,
): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.userId) return { error: "Sign in again, then try once more." };
  const teacherId = session.userId;
  const { term, year } = target;
  if (
    !TERMS.includes(term) ||
    !Number.isInteger(year) ||
    year < 2020 ||
    year > 2100
  )
    return { error: "Choose a term and a year." };
  const gone = { error: "This document was deleted, or it isn't yours." };

  try {
    if (type === "schemes") {
      const scheme = await db.schemeOfWork.findFirst({
        where: { id, teacherId },
      });
      if (!scheme) return gone;
      const plans = withLessons
        ? await db.lessonPlan.findMany({
            where: { schemeId: id, teacherId },
            include: { lessonNotes: true },
          })
        : [];
      const copy = await db.schemeOfWork.create({
        data: {
          title: scheme.title,
          grade: scheme.grade,
          subject: scheme.subject,
          term,
          year,
          content: json(scheme.content),
          curriculumId: scheme.curriculumId,
          teacherId,
          lessonPlans: {
            create: plans.map((p) => ({
              lessonNumber: p.lessonNumber,
              topic: p.topic,
              objectives: p.objectives,
              content: json(p.content),
              grade: p.grade,
              subject: p.subject,
              durationMinutes: p.durationMinutes,
              term,
              year,
              week: p.week,
              teacherId,
              lessonNotes: {
                create: p.lessonNotes.map((n) => ({
                  notes: n.notes,
                  resources: n.resources ?? undefined,
                  teacherId,
                })),
              },
            })),
          },
        },
        select: { id: true },
      });
      return done(type, copy.id);
    }

    if (type === "lessons") {
      const plan = await db.lessonPlan.findFirst({
        where: { id, teacherId },
        include: { lessonNotes: true, scheme: true },
      });
      if (!plan) return gone;
      // The copy stands on its own: the scheme belongs to the old term.
      const copy = await db.lessonPlan.create({
        data: {
          lessonNumber: plan.lessonNumber,
          topic: plan.topic,
          objectives: plan.objectives,
          content: json(plan.content),
          grade: plan.grade ?? plan.scheme?.grade,
          subject: plan.subject ?? plan.scheme?.subject,
          durationMinutes: plan.durationMinutes,
          term,
          year,
          week: plan.week,
          teacherId,
          lessonNotes: {
            create: plan.lessonNotes.map((n) => ({
              notes: n.notes,
              resources: n.resources ?? undefined,
              teacherId,
            })),
          },
        },
        select: { id: true },
      });
      return done(type, copy.id);
    }

    const test = await db.assessment.findFirst({ where: { id, teacherId } });
    if (!test) return gone;
    // Linked to the teacher's scheme for that class and term, as a new assessment would be.
    const scheme = await db.schemeOfWork.findFirst({
      where: {
        teacherId,
        grade: test.grade,
        subject: test.subject,
        term,
        OR: [{ year }, { year: null }],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    const copy = await db.assessment.create({
      data: {
        title: test.title,
        grade: test.grade,
        subject: test.subject,
        type: test.type,
        content: json(test.content),
        term,
        year,
        schemeId: scheme?.id,
        teacherId,
      },
      select: { id: true },
    });
    return done(type, copy.id);
  } catch {
    return {
      error:
        "Elimu couldn't make the copy. Check your connection and try again.",
    };
  }
}

function done(type: DocType, id: string) {
  revalidatePath(`/dashboard/${type}`);
  revalidatePath("/dashboard");
  return { id };
}
