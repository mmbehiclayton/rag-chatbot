"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSchemeSchedule } from "@/lib/term-pack-data";
import { isIsoDate, teachingWeeks, todayInKenya } from "@/lib/term-pack";

type Result = { success: true } | { success: false; error: string };

const isoDate = z.string().refine(isIsoDate, "Choose a date.");

const TermInput = z
  .object({
    year: z.number().int().min(2024).max(2100),
    term: z.number().int().min(1).max(3),
    opensOn: isoDate,
    closesOn: isoDate,
    breaks: z
      .array(z.object({ from: isoDate, to: isoDate, label: z.string().trim().max(60) }))
      .max(10)
      .refine((bs) => bs.every((b) => b.from <= b.to), "A break must end on or after the day it starts."),
  })
  .refine((t) => t.opensOn < t.closesOn, "The closing date must be after the opening date.")
  .refine((t) => t.breaks.every((b) => b.from >= t.opensOn && b.to <= t.closesOn), "Breaks must fall inside the term.");

export type TermInputData = z.infer<typeof TermInput>;

async function teacherId() {
  const session = await auth();
  return session?.userId ?? null;
}

const date = (d: string) => new Date(`${d}T00:00:00Z`);

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile/term");
}

export async function saveTerm(input: TermInputData): Promise<Result> {
  const userId = await teacherId();
  if (!userId) return { success: false, error: "Please sign in again." };
  const parsed = TermInput.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the dates and try again." };
  const t = parsed.data;
  if (teachingWeeks(t).length < 4) return { success: false, error: "That term has fewer than 4 teaching weeks. Check the dates." };

  const data = { opensOn: date(t.opensOn), closesOn: date(t.closesOn), breaks: t.breaks };
  await db.teacherTerm.upsert({
    where: { teacherId_year_term: { teacherId: userId, year: t.year, term: t.term } },
    create: { teacherId: userId, year: t.year, term: t.term, ...data },
    update: data,
  });
  refresh();
  return { success: true };
}

const TimetableInput = z
  .array(
    z.object({
      grade: z.string().trim().min(1).max(100),
      subject: z.string().trim().min(1).max(100),
      days: z.array(z.number().int().min(1).max(5)).max(15),
    })
  )
  .max(30);

/** Saves how many lessons each class has on each weekday. A class with no lessons is removed. */
export async function saveTimetables(input: z.infer<typeof TimetableInput>): Promise<Result> {
  const userId = await teacherId();
  if (!userId) return { success: false, error: "Please sign in again." };
  const parsed = TimetableInput.safeParse(input);
  if (!parsed.success) return { success: false, error: "Check the timetable and try again." };

  await db.$transaction(
    parsed.data.map((c) => {
      const where = { teacherId_grade_subject: { teacherId: userId, grade: c.grade, subject: c.subject } };
      const days = [...c.days].sort();
      return days.length === 0
        ? db.classTimetable.deleteMany({ where: { teacherId: userId, grade: c.grade, subject: c.subject } })
        : db.classTimetable.upsert({ where, create: { teacherId: userId, grade: c.grade, subject: c.subject, days }, update: { days } });
    })
  );
  refresh();
  return { success: true };
}

/**
 * Marks one timetabled lesson as taught or carried over, or clears the mark (status null).
 * The lesson number comes from the schedule on the server, not from the browser.
 */
export async function markLesson(input: { schemeId: string; date: string; slot: number; status: "TAUGHT" | "CARRIED_OVER" | null }): Promise<Result> {
  const userId = await teacherId();
  if (!userId) return { success: false, error: "Please sign in again." };
  if (!isIsoDate(input.date) || !Number.isInteger(input.slot)) return { success: false, error: "That lesson couldn't be found." };
  if (input.date > todayInKenya()) return { success: false, error: "You can only mark lessons on or before today." };

  const scheme = await db.schemeOfWork.findFirst({
    where: { id: input.schemeId, teacherId: userId },
    select: { id: true, teacherId: true, grade: true, subject: true, term: true, year: true, content: true },
  });
  if (!scheme) return { success: false, error: "That scheme couldn't be found." };

  const key = { schemeId_date_slot: { schemeId: scheme.id, date: date(input.date), slot: input.slot } };
  if (input.status === null) {
    await db.lessonRecord.deleteMany({ where: { schemeId: scheme.id, date: date(input.date), slot: input.slot } });
  } else {
    const schedule = await getSchemeSchedule(scheme);
    const slot = schedule.slots.find((s) => s.date === input.date && s.slot === input.slot);
    if (!slot?.lessonNumber) return { success: false, error: "There is no lesson in the timetable at that time." };
    const data = { lessonNumber: slot.lessonNumber, status: input.status };
    await db.lessonRecord.upsert({
      where: key,
      create: { teacherId: userId, schemeId: scheme.id, date: date(input.date), slot: input.slot, ...data },
      update: data,
    });
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/schemes/${scheme.id}`);
  revalidatePath(`/dashboard/schemes/${scheme.id}/record`);
  return { success: true };
}

/** The teacher's reflection on a taught lesson, printed on the record of work. */
export async function saveLessonRemarks(input: { schemeId: string; date: string; slot: number; remarks: string }): Promise<Result> {
  const userId = await teacherId();
  if (!userId) return { success: false, error: "Please sign in again." };
  if (!isIsoDate(input.date)) return { success: false, error: "That lesson couldn't be found." };
  const remarks = input.remarks.trim().slice(0, 500) || null;
  const { count } = await db.lessonRecord.updateMany({
    where: { schemeId: input.schemeId, teacherId: userId, date: date(input.date), slot: input.slot },
    data: { remarks },
  });
  if (count === 0) return { success: false, error: "Mark the lesson as taught first." };
  revalidatePath(`/dashboard/schemes/${input.schemeId}/record`);
  return { success: true };
}
