import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { type DocType, isDocType } from "@/lib/doc-lists";
import { deleteDocumentFor } from "@/lib/document-delete";
import { fail, requireTeacher } from "@/lib/service-auth";

type Ctx = { params: Promise<{ type: string; id: string }> };

const notFound = () =>
  fail(404, "This document was deleted, or it isn't yours.");

/** One of the teacher's documents with its full content. Always filtered by the teacher's id. */
async function load(type: DocType, id: string, teacherId: string) {
  const where = { id, teacherId };
  switch (type) {
    case "schemes":
      return db.schemeOfWork.findFirst({
        where,
        select: {
          id: true,
          title: true,
          grade: true,
          subject: true,
          term: true,
          year: true,
          content: true,
          checkedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    case "lessons":
      return db.lessonPlan.findFirst({
        where,
        select: {
          id: true,
          topic: true,
          objectives: true,
          grade: true,
          subject: true,
          durationMinutes: true,
          term: true,
          year: true,
          week: true,
          schemeId: true,
          content: true,
          checkedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    case "notes":
      return db.lessonNote.findFirst({
        where,
        select: {
          id: true,
          notes: true,
          resources: true,
          lessonPlanId: true,
          checkedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    case "assessments":
      return db.assessment.findFirst({
        where,
        select: {
          id: true,
          title: true,
          grade: true,
          subject: true,
          type: true,
          term: true,
          year: true,
          schemeId: true,
          content: true,
          checkedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
  }
}

export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireTeacher(req);
  if ("response" in auth) return auth.response;
  const { type, id } = await ctx.params;
  if (!isDocType(type)) return fail(400, "That document type doesn't exist.");

  const doc = await load(type, id, auth.teacher.id);
  if (!doc) return notFound();
  return NextResponse.json({ success: true, data: { type, document: doc } });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await requireTeacher(req);
  if ("response" in auth) return auth.response;
  const { type, id } = await ctx.params;
  if (!isDocType(type)) return fail(400, "That document type doesn't exist.");

  const result = await deleteDocumentFor(auth.teacher.id, type, id);
  if ("error" in result) return fail(404, result.error);
  return NextResponse.json({ success: true, data: { deleted: true } });
}
