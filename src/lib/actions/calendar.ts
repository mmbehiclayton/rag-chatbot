"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import {
  AcademicYearSchema,
  CALENDAR_KEY,
  checkYear,
  savedYears,
} from "@/lib/academic-calendar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachingWeeks } from "@/lib/term-pack";

type Result = { success: true } | { success: false; error: string };

async function staffId() {
  const session = await auth();
  return session?.userId && session.role === "SUPERADMIN"
    ? session.userId
    : null;
}

async function store(years: z.infer<typeof AcademicYearSchema>[], by: string) {
  const value = JSON.stringify({
    years: [...years].sort((a, b) => a.year - b.year),
  });
  await db.platformSetting.upsert({
    where: { key: CALENDAR_KEY },
    create: { key: CALENDAR_KEY, value, updatedById: by },
    update: { value, updatedById: by },
  });
  // Term dates feed schemes, the timetable, coverage and filing across the app.
  revalidatePath("/", "layout");
}

/** Elimu staff save one school year's terms, breaks and public holidays for every teacher. */
export async function saveAcademicYear(
  input: z.infer<typeof AcademicYearSchema>,
): Promise<Result> {
  const userId = await staffId();
  if (!userId)
    return { success: false, error: "Only Elimu staff can do this." };
  const parsed = AcademicYearSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Check the dates and try again.",
    };
  const year = parsed.data;
  const problems = checkYear(year);
  if (problems.length) return { success: false, error: problems[0] };
  const holidays = year.holidays.map((h) => h.date);
  const short = year.terms.find(
    (t) => teachingWeeks({ ...t, year: year.year, holidays }).length < 4,
  );
  if (short)
    return {
      success: false,
      error: `Term ${short.term} has fewer than 4 teaching weeks. Check the dates.`,
    };

  const others = (await savedYears()).filter((y) => y.year !== year.year);
  await store([...others, year], userId);
  return { success: true };
}

/** Drop a saved year, so it goes back to Elimu's built-in dates (or disappears if there are none). */
export async function removeAcademicYear(input: {
  year: number;
}): Promise<Result> {
  const userId = await staffId();
  if (!userId)
    return { success: false, error: "Only Elimu staff can do this." };
  const years = await savedYears();
  await store(
    years.filter((y) => y.year !== input.year),
    userId,
  );
  return { success: true };
}
