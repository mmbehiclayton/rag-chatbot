"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { overLimit } from "@/lib/rate-limit";
import {
  JOB_KINDS,
  JOB_STATUS,
  type JobKind,
  KENYA_COUNTIES,
} from "@/lib/staffroom";

type Result = { success: true } | { success: false; error: string };

export type JobInput = {
  title: string;
  school: string;
  county: string;
  kind: JobKind;
  learningAreas?: string;
  details: string;
  howToApply: string;
  /** "YYYY-MM-DD" or empty. */
  closesOn?: string;
};

const clean = (s: string | undefined, max: number) =>
  (s ?? "").trim().slice(0, max);

/** Any teacher can share a job; it shows on the feed once Elimu staff approve it. */
export async function postJob(input: JobInput): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Sign in again to post." };
  const job = {
    title: clean(input.title, 120),
    school: clean(input.school, 120),
    county: clean(input.county, 40),
    kind: input.kind,
    learningAreas: clean(input.learningAreas, 200) || null,
    details: clean(input.details, 3000),
    howToApply: clean(input.howToApply, 1000),
  };
  if (!job.title || !job.school || !job.details || !job.howToApply)
    return {
      success: false,
      error: "Fill in the job title, school, details and how to apply.",
    };
  if (!(KENYA_COUNTIES as readonly string[]).includes(job.county))
    return { success: false, error: "Choose the county." };
  if (!(job.kind in JOB_KINDS))
    return { success: false, error: "Choose the type of job." };
  let closesOn: Date | null = null;
  if (input.closesOn) {
    closesOn = new Date(`${input.closesOn}T23:59:59+03:00`);
    if (Number.isNaN(closesOn.getTime()))
      return { success: false, error: "Check the closing date." };
  }
  if (await overLimit(`jobs:${session.userId}`, 5, 24 * 60 * 60 * 1000))
    return {
      success: false,
      error: "You can share up to 5 jobs a day. Try again tomorrow.",
    };

  await db.jobPost.create({
    data: { ...job, closesOn, postedById: session.userId },
  });
  revalidatePath("/dashboard/jobs");
  return { success: true };
}

/** Elimu staff approve a job for the feed, or turn it down with a note the poster sees. */
export async function reviewJob(input: {
  id: string;
  approve: boolean;
  note?: string;
}): Promise<Result> {
  const session = await auth();
  if (!session?.userId || session.role !== "SUPERADMIN")
    return { success: false, error: "Only Elimu staff can do this." };
  const note = clean(input.note, 300) || null;
  if (!input.approve && !note)
    return {
      success: false,
      error: "Say why, so the teacher knows what to fix.",
    };
  await db.jobPost.update({
    where: { id: input.id },
    data: {
      status: input.approve ? JOB_STATUS.APPROVED : JOB_STATUS.REJECTED,
      reviewNote: input.approve ? null : note,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });
  revalidatePath("/dashboard/jobs");
  return { success: true };
}

/** The poster or Elimu staff take a job down. */
export async function deleteJob(id: string): Promise<Result> {
  const session = await auth();
  if (!session?.userId)
    return { success: false, error: "Sign in again to do this." };
  const isStaff = session.role === "SUPERADMIN";
  const { count } = await db.jobPost.deleteMany({
    where: isStaff ? { id } : { id, postedById: session.userId },
  });
  if (!count) return { success: false, error: "That job is already gone." };
  revalidatePath("/dashboard/jobs");
  return { success: true };
}
