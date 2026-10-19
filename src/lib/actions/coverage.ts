"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { COVERAGE_STATUSES } from "@/lib/coverage";
import { db } from "@/lib/db";
import { todayInKenya } from "@/lib/term-pack";

const name = z.string().trim().min(1).max(300);
const Mark = z.object({
  grade: name,
  subject: name,
  stream: z.string().trim().max(60),
  strand: name,
  subStrand: name,
  // null hands the sub-strand back to the record of work
  status: z.enum(COVERAGE_STATUSES).nullable(),
});

type Result = { success: true } | { success: false; error: string };

/** The teacher marks a sub-strand's coverage for one class this school year. */
export async function markCoverage(
  input: z.input<typeof Mark>,
): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Please sign in again." };
  const parsed = Mark.safeParse(input);
  if (!parsed.success)
    return { success: false, error: "That sub-strand couldn't be saved." };

  const { status, ...where } = parsed.data;
  const key = {
    teacherId: session.userId,
    year: Number(todayInKenya().slice(0, 4)),
    ...where,
  };
  if (status === null) await db.syllabusCoverage.deleteMany({ where: key });
  else
    await db.syllabusCoverage.upsert({
      where: { teacherId_year_grade_subject_stream_strand_subStrand: key },
      create: { ...key, status },
      update: { status },
    });

  revalidatePath("/dashboard/coverage", "layout");
  return { success: true };
}
