import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, requireTeacher } from "@/lib/service-auth";
import { schemeLessons } from "@/lib/term-pack";

/**
 * The lessons inside one of the teacher's own schemes of work (number, week, topic), so EduPro
 * can offer them when planning a lesson. Only the teacher who owns the scheme can read it.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const result = await requireTeacher(req);
  if ("response" in result) return result.response;

  const scheme = await db.schemeOfWork.findFirst({
    where: { id, teacherId: result.teacher.id },
    select: { id: true, title: true, content: true },
  });
  if (!scheme) return fail(404, "We couldn't find that scheme of work.");

  const lessons = schemeLessons(scheme.content).map((l) => ({
    lessonNumber: l.lessonNumber,
    weekNumber: l.weekNumber,
    topic: [l.strand, l.subStrand].filter(Boolean).join(" — "),
  }));
  return NextResponse.json({
    success: true,
    data: { id: scheme.id, title: scheme.title, lessons },
  });
}
