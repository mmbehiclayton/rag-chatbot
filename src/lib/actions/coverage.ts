"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayInKenya } from "@/lib/term-pack";

const name = z.string().trim().min(1).max(300);
const Save = z.object({
  grade: name,
  subject: name,
  stream: z.string().trim().max(60),
  strand: name,
  subStrand: name,
  /** Lessons the teacher has ticked here. Lessons on the record of work aren't sent: they count on their own. */
  lessons: z.array(z.number().int().min(1).max(200)).max(200),
  /** The day newly ticked lessons (and the sub-strand, when it's finished now) were taught. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  covered: z.boolean(),
});

type Result = { success: true } | { success: false; error: string };

/**
 * The teacher checks a sub-strand's lessons and submits them for one class this school year.
 * Ticks live apart from the record of work, which needs a timetable slot for every lesson.
 */
export async function saveSubStrandCoverage(
  input: z.input<typeof Save>,
): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Please sign in again." };
  const parsed = Save.safeParse(input);
  if (!parsed.success)
    return { success: false, error: "That sub-strand couldn't be saved." };

  const { lessons, date, covered, ...where } = parsed.data;
  const today = todayInKenya();
  const year = Number(today.slice(0, 4));
  if (date > today)
    return { success: false, error: "The date can't be later than today." };
  if (Number(date.slice(0, 4)) !== year)
    return { success: false, error: `Pick a date in ${year}.` };

  const key = { teacherId: session.userId, year, ...where };
  const on = new Date(`${date}T00:00:00Z`);
  const ticked = [...new Set(lessons)];

  await db.$transaction(async (tx) => {
    // Lessons unticked go; lessons already ticked keep their first date.
    await tx.coverageLesson.deleteMany({
      where: { ...key, lesson: { notIn: ticked } },
    });
    if (ticked.length)
      await tx.coverageLesson.createMany({
        data: ticked.map((lesson) => ({ ...key, lesson, taughtOn: on })),
        skipDuplicates: true,
      });

    const unique = {
      teacherId_year_grade_subject_stream_strand_subStrand: key,
    };
    if (!covered) {
      await tx.syllabusCoverage.deleteMany({ where: key });
      return;
    }
    const before = await tx.syllabusCoverage.findUnique({
      where: unique,
      select: { status: true, coveredOn: true },
    });
    await tx.syllabusCoverage.upsert({
      where: unique,
      create: { ...key, status: "COVERED", coveredOn: on },
      update: {
        status: "COVERED",
        coveredOn:
          before?.status === "COVERED" && before.coveredOn
            ? before.coveredOn
            : on,
      },
    });
  });

  revalidatePath("/dashboard/coverage", "layout");
  return { success: true };
}
